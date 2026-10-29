-- Lista de conversas (C-11): última mensagem (quem mandou e o texto) para o cliente ver que a assistente
-- já falou e que ele pode responder, mesmo antes do corretor.
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
  broker_replied boolean,
  last_sender public.message_sender,
  last_body text
)
language sql stable security definer set search_path = '' as $$
  select l.id, a.id, a.legal_name, m.name, m.creci, s.name, l.assistant_active, l.origin_property_id,
    p.title, l.consent_revoked_at is not null, c.granted_at, l.last_message_at,
    l.first_human_response_at is not null, lm.sender, lm.body
  from public.leads l
  join public.agencies a on a.id = l.agency_id
  left join public.agency_members m on m.agency_id = l.agency_id and m.user_id = l.broker_id
  left join public.agency_assistant_settings s on s.agency_id = l.agency_id
  left join public.consents c on c.id = l.consent_id
  left join public.properties p on p.id = l.origin_property_id
  left join lateral (
    select x.sender, x.body from public.lead_messages x
    where x.lead_id = l.id and x.sender <> 'sistema'
    order by x.id desc limit 1
  ) lm on true
  where l.client_id = auth.uid()
  order by l.last_message_at desc;
$$;
revoke execute on function public.my_conversations() from public, anon;
grant execute on function public.my_conversations() to authenticated, service_role;
