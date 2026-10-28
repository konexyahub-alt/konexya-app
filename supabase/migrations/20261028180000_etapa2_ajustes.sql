-- Etapa 2 — ajustes: nomes de empresa terminados em ponto ("Ltda.") geravam "Ltda.." nas mensagens.

create or replace function public.agencies_after_insert_assistant() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.agency_assistant_settings (agency_id, welcome_message, farewell_message, questions)
  values (
    new.id,
    'Oi, [nome do cliente]! Sou a [nome da assistente], assistente virtual da ' || rtrim(new.legal_name, '.')
      || '. Um corretor já recebeu seu perfil e vai falar com você em breve. Enquanto isso, posso te fazer algumas perguntas rápidas?',
    'Obrigada, [nome do cliente]! O corretor já tem tudo o que precisa e fala com você em breve.',
    public.default_assistant_questions()
  )
  on conflict (agency_id) do nothing;
  return null;
end;
$$;

-- Corrige as mensagens padrão que ninguém editou ainda.
update public.agency_assistant_settings s
set welcome_message = replace(s.welcome_message, a.legal_name || '.', rtrim(a.legal_name, '.') || '.')
from public.agencies a
where a.id = s.agency_id and a.legal_name like '%.' and s.welcome_message like '%' || a.legal_name || '.%';

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
  values (v_lead.id, 'sistema', 'Você autorizou compartilhar seu perfil com a ' || rtrim(v_agency.legal_name, '.') || '.');
  return v_lead.id;
end;
$$;
