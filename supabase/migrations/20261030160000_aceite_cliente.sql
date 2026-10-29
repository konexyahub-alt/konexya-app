-- Cliente aceita a contraproposta pelo app (docs/DECISOES.md, 2026-10-29). Regra 4: o aceite vai ao corretor,
-- nunca ao proprietário; só o corretor registra que o proprietário confirmou (ou não manteve) o valor.
alter table public.proposals add column client_accepted_at timestamptz;

create function public.accept_counter(p_proposal uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v public.proposals;
begin
  select * into v from public.proposals where id = p_proposal for update;
  if not found or not public.is_lead_client(v.lead_id) then
    raise exception 'Proposta não encontrada.' using errcode = 'P0002';
  end if;
  if not public.is_lead_open(v.lead_id) then
    raise exception 'O compartilhamento foi revogado.' using errcode = '42501';
  end if;
  if v.status <> 'contraproposta' or v.client_accepted_at is not null then
    raise exception 'Esta contraproposta não está mais aberta.' using errcode = '22023';
  end if;
  update public.proposals set client_accepted_at = now() where id = p_proposal;
  insert into public.lead_messages (lead_id, sender, author_id, body)
  values (v.lead_id, 'cliente', auth.uid(), 'Aceito a contraproposta de ' || public.fmt_brl(v.counter_amount) || '.');
  perform public.lead_system_message(v.lead_id, 'Aceite enviado ao corretor, que confirma com o proprietário.');
end;
$$;

-- O corretor registra a resposta do proprietário ao aceite do cliente.
create function public.confirm_counter(p_proposal uuid, p_confirmed boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v public.proposals;
begin
  select * into v from public.proposals where id = p_proposal for update;
  if not found or not public.is_lead_staff(v.lead_id) then
    raise exception 'Só o corretor registra a resposta do proprietário.' using errcode = '42501';
  end if;
  if v.status <> 'contraproposta' or v.client_accepted_at is null then
    raise exception 'O cliente ainda não aceitou esta contraproposta.' using errcode = '22023';
  end if;
  update public.proposals set status = case when p_confirmed then 'aceita' else 'recusada' end::public.proposal_status, answered_at = now()
  where id = p_proposal;
  perform public.lead_system_message(v.lead_id, case when p_confirmed
    then 'O proprietário confirmou o valor de ' || public.fmt_brl(v.counter_amount) || '. O corretor combina os próximos passos.'
    else 'O proprietário não manteve a contraproposta de ' || public.fmt_brl(v.counter_amount) || '.' end);
  if p_confirmed then
    perform public.advance_lead_stage(v.lead_id, 'negociacao');
  end if;
end;
$$;

-- Nova proposta fica bloqueada enquanto o aceite do cliente espera o corretor.
create or replace function public.make_proposal(p_lead uuid, p_property uuid, p_amount numeric, p_note text default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_lead public.leads;
  v_client boolean;
  v_id uuid;
begin
  select * into v_lead from public.leads where id = p_lead;
  v_client := found and public.is_lead_client(p_lead);
  if not found or not (v_client or public.is_lead_staff(p_lead)) then
    raise exception 'Lead não encontrado.' using errcode = 'P0002';
  end if;
  if not public.is_lead_open(p_lead) then
    raise exception 'O compartilhamento foi revogado.' using errcode = '42501';
  end if;
  if p_amount is null or p_amount <= 0 or p_amount > 1000000000 then
    raise exception 'Informe um valor válido.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.properties where id = p_property and agency_id = v_lead.agency_id) then
    raise exception 'Imóvel não encontrado.' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.proposals where lead_id = p_lead and property_id = p_property
             and (status in ('recebida', 'encaminhada') or (status = 'contraproposta' and client_accepted_at is not null))) then
    raise exception 'Já existe uma proposta em andamento para este imóvel.' using errcode = '23505';
  end if;
  insert into public.proposals (lead_id, agency_id, property_id, amount, payment_note, made_by, created_by)
  values (p_lead, v_lead.agency_id, p_property, round(p_amount, 2), left(nullif(btrim(p_note), ''), 300),
    (case when v_client then 'cliente' else 'corretor' end)::public.message_sender, auth.uid())
  returning id into v_id;
  perform public.lead_system_message(p_lead, case when v_client
    then 'Proposta de ' || public.fmt_brl(p_amount) || ' enviada ao corretor.'
    else 'Proposta de ' || public.fmt_brl(p_amount) || ' registrada pelo corretor.' end);
  return v_id;
end;
$$;


revoke execute on function public.accept_counter(uuid), public.confirm_counter(uuid, boolean) from public, anon;
grant execute on function public.accept_counter(uuid), public.confirm_counter(uuid, boolean) to authenticated;
