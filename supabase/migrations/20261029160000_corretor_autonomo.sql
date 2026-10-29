-- Corretor autônomo (docs/DECISOES.md, 2026-10-29): anunciante de uma pessoa só, com CRECI de pessoa física,
-- sem CNPJ e sem CPF. Usa a mesma estrutura da imobiliária (uma "imobiliária de uma pessoa"): o mesmo login é
-- gestor e corretor, sem equipe nem rodízio. Todas as regras (consentimento, isolamento, métricas) valem iguais.

create type public.advertiser_kind as enum ('imobiliaria', 'autonomo');

alter table public.agencies
  add column kind public.advertiser_kind not null default 'imobiliaria',
  alter column cnpj drop not null,
  add constraint agencies_documento_por_tipo check (
    (kind = 'imobiliaria' and cnpj is not null) or (kind = 'autonomo' and cnpj is null)
  );

-- Cadastro do corretor autônomo (P-01, opção "Corretor autônomo"). Quem tem convite pendente de uma
-- imobiliária não pode se cadastrar como autônomo: entra pelo link do convite que o gestor mandou.
create function public.register_autonomous(p_name text, p_creci text, p_whatsapp text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_id uuid;
begin
  if v_uid is null or v_email = '' then
    raise exception 'Entre com seu e-mail antes de fazer o cadastro.' using errcode = '42501';
  end if;
  if exists (select 1 from public.agency_members where user_id = v_uid and active) then
    raise exception 'Este e-mail já tem cadastro de anunciante na Konexya.' using errcode = '23505';
  end if;
  if exists (
    select 1 from public.agency_invites
    where email = v_email and accepted_at is null and expires_at > now()
  ) then
    raise exception 'Você tem um convite de uma imobiliária. Entre pelo link do convite que chegou no seu e-mail.'
      using errcode = 'P0001';
  end if;
  insert into public.agencies (kind, legal_name, cnpj, creci, manager_name, manager_email, whatsapp, created_by)
  values ('autonomo', btrim(p_name), null, btrim(p_creci), btrim(p_name), v_email, p_whatsapp, v_uid)
  returning id into v_id;
  insert into public.agency_members (agency_id, user_id, role, name, email, creci)
  values (v_id, v_uid, 'gestor', btrim(p_name), v_email, btrim(p_creci));
  return v_id;
end;
$$;
revoke execute on function public.register_autonomous(text, text, text) from public, anon;
grant execute on function public.register_autonomous(text, text, text) to authenticated;

-- Autônomo não tem equipe: não convida ninguém.
create or replace function public.agency_is_autonomous(p_agency uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.agencies where id = p_agency and kind = 'autonomo');
$$;
revoke execute on function public.agency_is_autonomous(uuid) from public, anon;
grant execute on function public.agency_is_autonomous(uuid) to authenticated;

create function public.agency_invites_block_autonomous() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if public.agency_is_autonomous(new.agency_id) then
    raise exception 'Corretor autônomo não tem equipe para convidar.' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke execute on function public.agency_invites_block_autonomous() from public, anon, authenticated;
create trigger agency_invites_block_autonomous before insert on public.agency_invites
  for each row execute function public.agency_invites_block_autonomous();

-- Boas-vindas padrão: "assistente virtual de [nome]" para o autônomo; "da [imobiliária]" para a imobiliária.
create or replace function public.agencies_after_insert_assistant() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.agency_assistant_settings (agency_id, welcome_message, farewell_message, questions)
  values (
    new.id,
    'Oi, [nome do cliente]! Sou a [nome da assistente], assistente virtual '
      || case new.kind when 'autonomo' then 'de ' || btrim(new.legal_name) || ', corretor(a) autônomo(a)'
         else 'da ' || rtrim(new.legal_name, '.') end
      || '. ' || case new.kind when 'autonomo' then 'Já recebi seu perfil e vou falar com você em breve.'
         else 'Um corretor já recebeu seu perfil e vai falar com você em breve.' end
      || ' Enquanto isso, podemos começar a conversar sobre o imóvel?',
    'Obrigada, [nome do cliente]! O corretor já tem tudo o que precisa e fala com você em breve.',
    public.default_assistant_questions()
  )
  on conflict (agency_id) do nothing;
  return null;
end;
$$;
revoke execute on function public.agencies_after_insert_assistant() from public, anon, authenticated;

-- Ficha e cartões: o tipo do anunciante, para mostrar "corretor(a) autônomo(a)".
drop function public.property_public_info(uuid);
create function public.property_public_info(p_id uuid)
returns table (agency_name text, agency_creci text, broker_name text, broker_creci text, agency_kind public.advertiser_kind)
language sql stable security definer set search_path = '' as $$
  select a.legal_name, a.creci, m.name, m.creci, a.kind
  from public.properties p
  join public.agencies a on a.id = p.agency_id and a.status = 'aprovada'
  left join public.agency_members m on m.agency_id = p.agency_id and m.user_id = p.broker_id
  where p.id = p_id and (p.status = 'publicado' or public.is_agency_member(p.agency_id));
$$;
revoke execute on function public.property_public_info(uuid) from public;
grant execute on function public.property_public_info(uuid) to anon, authenticated, service_role;

-- Aviso do compartilhamento com o artigo certo para pessoa ou empresa.
create or replace function public.share_profile(p_property uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_prop public.properties;
  v_agency public.agencies;
  v_profile public.client_profiles;
  v_settings public.agency_assistant_settings;
  v_lead public.leads;
  v_consent uuid;
  v_snapshot jsonb;
  v_queue text[];
begin
  if v_uid is null then
    raise exception 'Entre na sua conta para falar com o corretor.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.consents where user_id = v_uid and kind = 'termos' and revoked_at is null) then
    raise exception 'Aceite os termos de uso antes de continuar.' using errcode = '42501';
  end if;
  select * into v_profile from public.client_profiles where user_id = v_uid;
  if not found or v_profile.name is null then
    raise exception 'Conte como podemos te chamar antes de continuar.' using errcode = '22023';
  end if;
  select * into v_prop from public.properties where id = p_property and status = 'publicado';
  if not found then
    raise exception 'Este imóvel não está mais disponível.' using errcode = 'P0002';
  end if;
  select * into v_agency from public.agencies where id = v_prop.agency_id and status = 'aprovada';
  if not found then
    raise exception 'Este imóvel não está mais disponível.' using errcode = 'P0002';
  end if;

  select * into v_lead from public.leads where agency_id = v_agency.id and client_id = v_uid for update;

  -- Já compartilhado e ativo: só acrescenta o imóvel à lista de interesse.
  if found and v_lead.consent_revoked_at is null then
    update public.leads
    set interest_property_ids = case
      when p_property = any (interest_property_ids) then interest_property_ids
      else interest_property_ids || p_property end
    where id = v_lead.id;
    return v_lead.id;
  end if;

  v_snapshot := public.build_profile_snapshot(v_uid);
  insert into public.consents (user_id, kind, agency_id, document_version, shared_snapshot)
  values (v_uid, 'compartilhamento', v_agency.id, 'v1', jsonb_build_object(
    'perfil', v_snapshot,
    'imovel_de_origem', p_property,
    'itens', jsonb_build_array('perfil', 'imoveis_vistos_e_salvos_desta_imobiliaria', 'conversa_com_a_assistente')
  ))
  returning id into v_consent;

  select * into v_settings from public.agency_assistant_settings where agency_id = v_agency.id;
  -- Fila da assistente: perguntas ligadas, na ordem configurada. Para aluguel, as perguntas de compra
  -- (pagamento, crédito, FGTS, vender outro imóvel) não fazem sentido.
  select coalesce(array_agg(q ->> 'id' order by ord), '{}') into v_queue
  from jsonb_array_elements(coalesce(v_settings.questions, '[]'::jsonb)) with ordinality as t(q, ord)
  where (q ->> 'enabled')::boolean
    and not (v_profile.purpose = 'alugar' and q ->> 'id' in ('pagamento', 'credito', 'fgts', 'vender_imovel'));

  if v_lead.id is not null then
    -- Lead que já existiu e teve o consentimento revogado: reabre com o novo consentimento.
    update public.leads set
      consent_id = v_consent,
      consent_revoked_at = null,
      profile_snapshot = v_snapshot,
      client_name = v_profile.name,
      interest_property_ids = case
        when p_property = any (interest_property_ids) then interest_property_ids
        else interest_property_ids || p_property end,
      assistant_active = false,
      last_message_at = now()
    where id = v_lead.id;
  else
    insert into public.leads (
      agency_id, client_id, consent_id, broker_id, client_name, profile_snapshot,
      origin_property_id, interest_property_ids, assistant_active, assistant_queue
    ) values (
      v_agency.id, v_uid, v_consent, public.pick_broker(v_agency.id), v_profile.name, v_snapshot,
      p_property, array[p_property], coalesce(v_settings.enabled, false) and cardinality(v_queue) > 0, v_queue
    )
    returning * into v_lead;
  end if;

  insert into public.lead_messages (lead_id, sender, body)
  values (v_lead.id, 'sistema', case v_agency.kind
    when 'autonomo' then 'Você autorizou compartilhar seu perfil com ' || btrim(v_agency.legal_name) || ', corretor(a) autônomo(a).'
    else 'Você autorizou compartilhar seu perfil com a ' || rtrim(v_agency.legal_name, '.') || '.' end);
  return v_lead.id;
end;
$$;
