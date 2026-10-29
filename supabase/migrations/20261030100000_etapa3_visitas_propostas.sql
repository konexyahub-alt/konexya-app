-- Etapa 3 (sem mapa): visitas (F6, P-05) e propostas (F7). docs/DECISOES.md, 2026-10-29.
-- Regra 4: só o corretor confirma visitas; propostas sempre passam pelo corretor antes do proprietário.
-- Tudo que muda visita ou proposta passa por funções (security definer) que conferem quem pode o quê; as
-- tabelas não aceitam escrita direta do app.

create type public.visit_status as enum ('pedida', 'confirmada', 'realizada', 'nao_compareceu', 'cancelada');
create type public.proposal_status as enum ('recebida', 'encaminhada', 'aceita', 'recusada', 'contraproposta');

-- Mensagem com dados estruturados (horários de visita sugeridos pelo corretor). Só funções gravam.
alter table public.lead_messages add column meta jsonb;

create table public.visits (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  agency_id uuid not null references public.agencies (id) on delete cascade,
  broker_id uuid references auth.users (id) on delete set null,
  property_id uuid references public.properties (id) on delete set null,
  starts_at timestamptz not null,
  duration_min smallint not null default 60 check (duration_min between 15 and 240),
  status public.visit_status not null default 'pedida',
  requested_by public.message_sender not null check (requested_by in ('cliente', 'corretor')),
  confirmed_by uuid references auth.users (id) on delete set null,
  confirmed_at timestamptz,
  note text check (note is null or char_length(note) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.visits enable row level security;
create index visits_agency_time_idx on public.visits (agency_id, starts_at);
create index visits_broker_time_idx on public.visits (broker_id, starts_at);
create index visits_lead_idx on public.visits (lead_id);

create table public.proposals (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  agency_id uuid not null references public.agencies (id) on delete cascade,
  property_id uuid references public.properties (id) on delete set null,
  amount numeric(14, 2) not null check (amount > 0),
  payment_note text check (payment_note is null or char_length(payment_note) <= 300),
  status public.proposal_status not null default 'recebida',
  counter_amount numeric(14, 2) check (counter_amount is null or counter_amount > 0),
  made_by public.message_sender not null check (made_by in ('cliente', 'corretor')),
  created_by uuid references auth.users (id) on delete set null,
  forwarded_at timestamptz,
  answered_at timestamptz,
  created_at timestamptz not null default now(),
  check (status <> 'contraproposta' or counter_amount is not null)
);
alter table public.proposals enable row level security;
create index proposals_lead_idx on public.proposals (lead_id);
create index proposals_agency_idx on public.proposals (agency_id, created_at);

create policy "cliente e equipe leem as visitas" on public.visits
  for select to authenticated
  using (public.is_lead_client(lead_id) or public.is_lead_staff(lead_id) or public.is_platform_admin());
create policy "cliente e equipe leem as propostas" on public.proposals
  for select to authenticated
  using (public.is_lead_client(lead_id) or public.is_lead_staff(lead_id) or public.is_platform_admin());

-- Mensagens escritas pelo app (cliente ou corretor) nunca trazem dados estruturados: só as funções.
drop policy "cliente escreve como cliente" on public.lead_messages;
create policy "cliente escreve como cliente" on public.lead_messages
  for insert to authenticated
  with check (sender = 'cliente' and author_id = auth.uid() and meta is null
    and public.is_lead_client(lead_id) and public.is_lead_open(lead_id));
drop policy "equipe escreve como corretor" on public.lead_messages;
create policy "equipe escreve como corretor" on public.lead_messages
  for insert to authenticated
  with check (sender = 'corretor' and author_id = auth.uid() and meta is null
    and public.is_lead_staff(lead_id) and public.is_lead_open(lead_id));

-- ---------------------------------------------------------------------------------------------------
-- Formatação para as mensagens de sistema (fuso de Fortaleza, português)
-- ---------------------------------------------------------------------------------------------------
create function public.fmt_when(p_at timestamptz) returns text
language sql immutable set search_path = '' as $$
  select (array['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'])[extract(dow from p_at at time zone 'America/Fortaleza')::int + 1]
    || ', ' || to_char(p_at at time zone 'America/Fortaleza', 'DD/MM')
    || ', ' || case
      when extract(minute from p_at at time zone 'America/Fortaleza') = 0
        then to_char(p_at at time zone 'America/Fortaleza', 'FMHH24') || 'h'
      else to_char(p_at at time zone 'America/Fortaleza', 'FMHH24"h"MI') end;
$$;

create function public.fmt_brl(p_value numeric) returns text
language sql immutable set search_path = '' as $$
  select 'R$ ' || replace(to_char(round(p_value), 'FM999,999,999,990'), ',', '.');
$$;

create function public.lead_system_message(p_lead uuid, p_body text) returns void
language sql security definer set search_path = '' as $$
  insert into public.lead_messages (lead_id, sender, body) values (p_lead, 'sistema', p_body);
$$;

-- Avança a etapa do lead só para frente (nunca volta uma etapa já passada nem reabre encerrado).
create function public.advance_lead_stage(p_lead uuid, p_stage public.lead_stage) returns void
language sql security definer set search_path = '' as $$
  update public.leads set stage = p_stage
  where id = p_lead
    and stage not in ('fechado', 'perdido')
    and array_position(array['novo', 'em_atendimento', 'qualificado', 'visita_agendada', 'proposta', 'negociacao']::public.lead_stage[], stage)
      < array_position(array['novo', 'em_atendimento', 'qualificado', 'visita_agendada', 'proposta', 'negociacao']::public.lead_stage[], p_stage);
$$;

-- ---------------------------------------------------------------------------------------------------
-- Visitas
-- ---------------------------------------------------------------------------------------------------
-- O corretor sugere até 3 horários num imóvel; a mensagem sai em nome dele (é ele quem envia).
create function public.suggest_visit_slots(p_lead uuid, p_property uuid, p_slots timestamptz[]) returns bigint
language plpgsql security definer set search_path = '' as $$
declare
  v_lead public.leads;
  v_title text;
  v_id bigint;
begin
  select * into v_lead from public.leads where id = p_lead;
  if not found or not public.is_lead_staff(p_lead) then
    raise exception 'Só a equipe do lead sugere horários.' using errcode = '42501';
  end if;
  if not public.is_lead_open(p_lead) then
    raise exception 'O cliente revogou o compartilhamento.' using errcode = '42501';
  end if;
  if coalesce(cardinality(p_slots), 0) not between 1 and 3 then
    raise exception 'Sugira de 1 a 3 horários.' using errcode = '22023';
  end if;
  if exists (select 1 from unnest(p_slots) s where s < now()) then
    raise exception 'Escolha horários no futuro.' using errcode = '22023';
  end if;
  select coalesce(title, 'o imóvel') into v_title from public.properties where id = p_property and agency_id = v_lead.agency_id;
  if v_title is null then
    raise exception 'Imóvel não encontrado.' using errcode = 'P0002';
  end if;
  insert into public.lead_messages (lead_id, sender, author_id, body, quick_replies, meta)
  values (
    p_lead, 'corretor', auth.uid(),
    'Posso te mostrar ' || v_title || '. Qual destes horários fica melhor?',
    (select array_agg(public.fmt_when(s) order by s) from unnest(p_slots) s),
    jsonb_build_object('kind', 'visit_slots', 'property_id', p_property,
      'slots', (select jsonb_agg(s order by s) from unnest(p_slots) s))
  )
  returning id into v_id;
  return v_id;
end;
$$;

-- O cliente escolhe um dos horários sugeridos: a visita nasce "pedida" e espera a confirmação do corretor.
create function public.request_visit(p_message bigint, p_slot int) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_msg public.lead_messages;
  v_lead public.leads;
  v_at timestamptz;
  v_id uuid;
begin
  select * into v_msg from public.lead_messages where id = p_message;
  if not found or v_msg.meta ->> 'kind' is distinct from 'visit_slots' or not public.is_lead_client(v_msg.lead_id) then
    raise exception 'Horário não encontrado.' using errcode = 'P0002';
  end if;
  if not public.is_lead_open(v_msg.lead_id) then
    raise exception 'O compartilhamento foi revogado.' using errcode = '42501';
  end if;
  v_at := (v_msg.meta -> 'slots' ->> p_slot)::timestamptz;
  if v_at is null or v_at < now() then
    raise exception 'Esse horário não está mais disponível. Peça outro ao corretor.' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.visits
    where lead_id = v_msg.lead_id and status in ('pedida', 'confirmada') and starts_at = v_at
  ) then
    raise exception 'Você já pediu esse horário.' using errcode = '23505';
  end if;
  select * into v_lead from public.leads where id = v_msg.lead_id;
  insert into public.visits (lead_id, agency_id, broker_id, property_id, starts_at, requested_by)
  values (v_lead.id, v_lead.agency_id, coalesce(v_lead.broker_id, v_msg.author_id),
    (v_msg.meta ->> 'property_id')::uuid, v_at, 'cliente')
  returning id into v_id;
  insert into public.lead_messages (lead_id, sender, author_id, body)
  values (v_lead.id, 'cliente', auth.uid(), public.fmt_when(v_at));
  return v_id;
end;
$$;

-- O corretor marca uma visita direto (já confirmada: quem confirma é ele).
create function public.schedule_visit(p_lead uuid, p_property uuid, p_at timestamptz) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_lead public.leads;
  v_id uuid;
begin
  select * into v_lead from public.leads where id = p_lead;
  if not found or not public.is_lead_staff(p_lead) then
    raise exception 'Só a equipe do lead marca visitas.' using errcode = '42501';
  end if;
  if not public.is_lead_open(p_lead) then
    raise exception 'O cliente revogou o compartilhamento.' using errcode = '42501';
  end if;
  if p_at < now() then
    raise exception 'Escolha um horário no futuro.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.properties where id = p_property and agency_id = v_lead.agency_id) then
    raise exception 'Imóvel não encontrado.' using errcode = 'P0002';
  end if;
  insert into public.visits (lead_id, agency_id, broker_id, property_id, starts_at, status, requested_by, confirmed_by, confirmed_at)
  values (p_lead, v_lead.agency_id, coalesce(v_lead.broker_id, auth.uid()), p_property, p_at, 'confirmada', 'corretor', auth.uid(), now())
  returning id into v_id;
  perform public.lead_system_message(p_lead, 'Visita confirmada pelo corretor: ' || public.fmt_when(p_at) || '.');
  perform public.advance_lead_stage(p_lead, 'visita_agendada');
  return v_id;
end;
$$;

-- Regra 4: só a equipe do lead (corretor responsável ou gestor) confirma.
create function public.confirm_visit(p_visit uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v public.visits;
begin
  select * into v from public.visits where id = p_visit for update;
  if not found or not public.is_lead_staff(v.lead_id) then
    raise exception 'Só o corretor confirma visitas.' using errcode = '42501';
  end if;
  if v.status <> 'pedida' then
    raise exception 'Esta visita não está aguardando confirmação.' using errcode = '22023';
  end if;
  if not public.is_lead_open(v.lead_id) then
    raise exception 'O cliente revogou o compartilhamento.' using errcode = '42501';
  end if;
  update public.visits set status = 'confirmada', confirmed_by = auth.uid(), confirmed_at = now(), updated_at = now()
  where id = p_visit;
  perform public.lead_system_message(v.lead_id, 'Visita confirmada pelo corretor: ' || public.fmt_when(v.starts_at) || '.');
  perform public.advance_lead_stage(v.lead_id, 'visita_agendada');
end;
$$;

create function public.reschedule_visit(p_visit uuid, p_at timestamptz) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v public.visits;
begin
  select * into v from public.visits where id = p_visit for update;
  if not found or not public.is_lead_staff(v.lead_id) then
    raise exception 'Só o corretor remarca visitas.' using errcode = '42501';
  end if;
  if v.status not in ('pedida', 'confirmada') then
    raise exception 'Esta visita já foi encerrada.' using errcode = '22023';
  end if;
  if p_at < now() then
    raise exception 'Escolha um horário no futuro.' using errcode = '22023';
  end if;
  update public.visits
  set starts_at = p_at, status = 'confirmada', confirmed_by = auth.uid(), confirmed_at = now(), updated_at = now()
  where id = p_visit;
  perform public.lead_system_message(v.lead_id, 'Visita remarcada pelo corretor para ' || public.fmt_when(p_at) || '.');
  perform public.advance_lead_stage(v.lead_id, 'visita_agendada');
end;
$$;

-- Fecha a visita: realizada, não compareceu ou cancelada. O cliente só cancela a própria.
create function public.close_visit(p_visit uuid, p_status public.visit_status, p_note text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v public.visits;
  v_client boolean;
begin
  select * into v from public.visits where id = p_visit for update;
  if not found then
    raise exception 'Visita não encontrada.' using errcode = 'P0002';
  end if;
  v_client := public.is_lead_client(v.lead_id);
  if not (public.is_lead_staff(v.lead_id) or (v_client and p_status = 'cancelada')) then
    raise exception 'Você não pode mudar esta visita.' using errcode = '42501';
  end if;
  if p_status not in ('realizada', 'nao_compareceu', 'cancelada') then
    raise exception 'Situação inválida.' using errcode = '22023';
  end if;
  if v.status not in ('pedida', 'confirmada') then
    raise exception 'Esta visita já foi encerrada.' using errcode = '22023';
  end if;
  if p_status in ('realizada', 'nao_compareceu') and (v.status <> 'confirmada' or v.starts_at > now()) then
    raise exception 'Só dá para marcar depois do horário de uma visita confirmada.' using errcode = '22023';
  end if;
  update public.visits set status = p_status, note = left(nullif(btrim(p_note), ''), 300), updated_at = now()
  where id = p_visit;
  perform public.lead_system_message(v.lead_id, case p_status
    when 'realizada' then 'Visita realizada: ' || public.fmt_when(v.starts_at) || '.'
    when 'nao_compareceu' then 'Visita não realizada (cliente não compareceu): ' || public.fmt_when(v.starts_at) || '.'
    else 'Visita cancelada ' || case when v_client then 'pelo cliente' else 'pelo corretor' end || ': ' || public.fmt_when(v.starts_at) || '.' end);
end;
$$;

-- ---------------------------------------------------------------------------------------------------
-- Propostas (regra 4: sempre passam pelo corretor antes do proprietário)
-- ---------------------------------------------------------------------------------------------------
create function public.make_proposal(p_lead uuid, p_property uuid, p_amount numeric, p_note text default null) returns uuid
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
  if exists (select 1 from public.proposals where lead_id = p_lead and property_id = p_property and status in ('recebida', 'encaminhada')) then
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

create function public.forward_proposal(p_proposal uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v public.proposals;
begin
  select * into v from public.proposals where id = p_proposal for update;
  if not found or not public.is_lead_staff(v.lead_id) then
    raise exception 'Só o corretor encaminha propostas.' using errcode = '42501';
  end if;
  if v.status <> 'recebida' then
    raise exception 'Esta proposta já foi encaminhada.' using errcode = '22023';
  end if;
  update public.proposals set status = 'encaminhada', forwarded_at = now() where id = p_proposal;
  perform public.lead_system_message(v.lead_id, 'Proposta de ' || public.fmt_brl(v.amount) || ' encaminhada ao proprietário.');
  perform public.advance_lead_stage(v.lead_id, 'proposta');
end;
$$;

create function public.answer_proposal(p_proposal uuid, p_status public.proposal_status, p_counter numeric default null) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v public.proposals;
begin
  select * into v from public.proposals where id = p_proposal for update;
  if not found or not public.is_lead_staff(v.lead_id) then
    raise exception 'Só o corretor registra a resposta do proprietário.' using errcode = '42501';
  end if;
  if v.status <> 'encaminhada' then
    raise exception 'Encaminhe a proposta ao proprietário antes de registrar a resposta.' using errcode = '22023';
  end if;
  if p_status not in ('aceita', 'recusada', 'contraproposta') then
    raise exception 'Resposta inválida.' using errcode = '22023';
  end if;
  if p_status = 'contraproposta' and (p_counter is null or p_counter <= 0) then
    raise exception 'Informe o valor da contraproposta.' using errcode = '22023';
  end if;
  update public.proposals
  set status = p_status, counter_amount = case when p_status = 'contraproposta' then round(p_counter, 2) end, answered_at = now()
  where id = p_proposal;
  perform public.lead_system_message(v.lead_id, case p_status
    when 'aceita' then 'O proprietário aceitou a proposta de ' || public.fmt_brl(v.amount) || '.'
    when 'recusada' then 'O proprietário recusou a proposta de ' || public.fmt_brl(v.amount) || '.'
    else 'O proprietário fez uma contraproposta de ' || public.fmt_brl(p_counter) || '.' end);
  if p_status in ('aceita', 'contraproposta') then
    perform public.advance_lead_stage(v.lead_id, 'negociacao');
  end if;
end;
$$;

-- ---------------------------------------------------------------------------------------------------
-- Permissões
-- ---------------------------------------------------------------------------------------------------
revoke all on public.visits, public.proposals from anon, authenticated;
grant select on public.visits, public.proposals to authenticated;
grant all on public.visits, public.proposals to service_role;

revoke execute on function public.fmt_when(timestamptz), public.fmt_brl(numeric), public.lead_system_message(uuid, text),
  public.advance_lead_stage(uuid, public.lead_stage) from public, anon, authenticated;
grant execute on function public.fmt_when(timestamptz), public.fmt_brl(numeric) to authenticated;

revoke execute on function public.suggest_visit_slots(uuid, uuid, timestamptz[]), public.request_visit(bigint, int),
  public.schedule_visit(uuid, uuid, timestamptz), public.confirm_visit(uuid), public.reschedule_visit(uuid, timestamptz),
  public.close_visit(uuid, public.visit_status, text), public.make_proposal(uuid, uuid, numeric, text),
  public.forward_proposal(uuid), public.answer_proposal(uuid, public.proposal_status, numeric) from public, anon;
grant execute on function public.suggest_visit_slots(uuid, uuid, timestamptz[]), public.request_visit(bigint, int),
  public.schedule_visit(uuid, uuid, timestamptz), public.confirm_visit(uuid), public.reschedule_visit(uuid, timestamptz),
  public.close_visit(uuid, public.visit_status, text), public.make_proposal(uuid, uuid, numeric, text),
  public.forward_proposal(uuid), public.answer_proposal(uuid, public.proposal_status, numeric) to authenticated;
