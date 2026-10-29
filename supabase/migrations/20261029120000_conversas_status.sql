-- 1) Boas-vindas padrão da assistente: "podemos começar a conversar sobre o imóvel?" no lugar de
--    "posso te fazer algumas perguntas rápidas?" (pedido do dono do produto, 2026-10-29).
create or replace function public.agencies_after_insert_assistant() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.agency_assistant_settings (agency_id, welcome_message, farewell_message, questions)
  values (
    new.id,
    'Oi, [nome do cliente]! Sou a [nome da assistente], assistente virtual da ' || rtrim(new.legal_name, '.')
      || '. Um corretor já recebeu seu perfil e vai falar com você em breve. Enquanto isso, podemos começar a conversar sobre o imóvel?',
    'Obrigada, [nome do cliente]! O corretor já tem tudo o que precisa e fala com você em breve.',
    public.default_assistant_questions()
  )
  on conflict (agency_id) do nothing;
  return null;
end;
$$;
revoke execute on function public.agencies_after_insert_assistant() from public, anon, authenticated;

-- Só troca onde a imobiliária ainda usa o texto padrão; mensagens editadas ficam como estão.
update public.agency_assistant_settings
set welcome_message = replace(welcome_message, 'Enquanto isso, posso te fazer algumas perguntas rápidas?',
  'Enquanto isso, podemos começar a conversar sobre o imóvel?')
where welcome_message like '%Enquanto isso, posso te fazer algumas perguntas rápidas?%';

-- 2) Lista de conversas do cliente (C-11): o imóvel de origem e se o corretor já respondeu.
drop function public.my_conversations();
create function public.my_conversations()
returns table (
  lead_id uuid,
  agency_id uuid,
  agency_name text,
  broker_name text,
  broker_creci text,
  assistant_name text,
  assistant_active boolean,
  origin_property_id uuid,
  origin_property_title text,
  revoked boolean,
  shared_at timestamptz,
  last_message_at timestamptz,
  broker_replied boolean
)
language sql stable security definer set search_path = '' as $$
  select l.id, a.id, a.legal_name, m.name, m.creci, s.name, l.assistant_active, l.origin_property_id,
    p.title, l.consent_revoked_at is not null, c.granted_at, l.last_message_at,
    l.first_human_response_at is not null
  from public.leads l
  join public.agencies a on a.id = l.agency_id
  left join public.agency_members m on m.agency_id = l.agency_id and m.user_id = l.broker_id
  left join public.agency_assistant_settings s on s.agency_id = l.agency_id
  left join public.consents c on c.id = l.consent_id
  left join public.properties p on p.id = l.origin_property_id
  where l.client_id = auth.uid()
  order by l.last_message_at desc;
$$;
revoke execute on function public.my_conversations() from public, anon;
grant execute on function public.my_conversations() to authenticated, service_role;
