-- Etapa 3: visitas e propostas. Regra 4 (só o corretor confirma visitas; propostas passam pelo corretor) e
-- regra 5 (uma imobiliária nunca vê visitas ou propostas de outra).
begin;
select plan(30);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'gestor.a@a.test'),
  ('00000000-0000-0000-0000-0000000000a2', 'corretor.a@a.test'),
  ('00000000-0000-0000-0000-00000000000b', 'gestor.b@b.test'),
  ('00000000-0000-0000-0000-0000000000c1', 'cliente@c.test');
insert into public.agencies (id, legal_name, cnpj, creci, manager_name, manager_email, whatsapp, status, created_by) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'Imobiliária A Ltda', '11111111000111', 'J-1', 'Gestor A', 'gestor.a@a.test', '85900000001', 'aprovada', '00000000-0000-0000-0000-00000000000a'),
  ('bbbbbbbb-0000-0000-0000-000000000000', 'Imobiliária B Ltda', '22222222000122', 'J-2', 'Gestor B', 'gestor.b@b.test', '85900000002', 'aprovada', '00000000-0000-0000-0000-00000000000b');
insert into public.agency_members (agency_id, user_id, role, name, email, in_rotation) values
  ('aaaaaaaa-0000-0000-0000-000000000000', '00000000-0000-0000-0000-00000000000a', 'gestor', 'Gestor A', 'gestor.a@a.test', false),
  ('aaaaaaaa-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000a2', 'corretor', 'Corretor A', 'corretor.a@a.test', true),
  ('bbbbbbbb-0000-0000-0000-000000000000', '00000000-0000-0000-0000-00000000000b', 'gestor', 'Gestor B', 'gestor.b@b.test', true);
insert into public.properties (id, agency_id, title, price, neighborhood, status) values
  ('a0000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', 'Imóvel A1', 885000, 'Cocó', 'publicado'),
  ('b0000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000000', 'Imóvel B1', 600000, 'Meireles', 'publicado');
insert into public.client_profiles (user_id, name, purpose, budget_max) values ('00000000-0000-0000-0000-0000000000c1', 'Ana', 'comprar', 900000);
insert into public.consents (user_id, kind, document_version) values ('00000000-0000-0000-0000-0000000000c1', 'termos', 'v1');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
select public.share_profile('a0000000-0000-0000-0000-000000000001');
reset role;
create temp table t_lead as select id from public.leads;
grant select on t_lead to authenticated;
set local role authenticated;

-- Corretor sugere horários -------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);
select throws_ok(
  $$insert into public.lead_messages (lead_id, sender, author_id, body, meta)
    select id, 'corretor', '00000000-0000-0000-0000-0000000000a2', 'x', '{"kind":"visit_slots"}' from t_lead$$,
  '42501', null, 'o app não grava horários estruturados direto na mensagem'
);
select lives_ok(
  $$select public.suggest_visit_slots((select id from t_lead), 'a0000000-0000-0000-0000-000000000001',
    array[now() + interval '2 days', now() + interval '3 days'])$$,
  'o corretor sugere horários'
);
select ok(
  (select cardinality(quick_replies) = 2 and meta ->> 'kind' = 'visit_slots' from public.lead_messages where meta is not null),
  'a mensagem leva os horários como botões'
);
select ok((select first_human_response_at is not null from public.leads), 'sugerir horários conta como primeira resposta do corretor');

-- Cliente escolhe um horário: visita pedida ---------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
select lives_ok(
  $$select public.request_visit((select id from public.lead_messages where meta is not null), 0)$$,
  'o cliente escolhe um horário'
);
select is((select status::text from public.visits), 'pedida', 'a visita escolhida pelo cliente nasce aguardando confirmação');
select throws_ok(
  $$select public.confirm_visit((select id from public.visits))$$,
  '42501', null, 'regra 4: o cliente não confirma a própria visita'
);

-- Outra imobiliária não vê nem confirma ---------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);
select is_empty('select 1 from public.visits', 'regra 5: a imobiliária B não vê visitas da A');
select throws_ok(
  $$select public.confirm_visit((select id from public.visits limit 1))$$,
  '42501', null, 'a imobiliária B não confirma visita da A (nem a encontra)'
);

-- Corretor confirma ----------------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);
select lives_ok($$select public.confirm_visit((select id from public.visits))$$, 'o corretor confirma a visita');
select is((select stage::text from public.leads), 'visita_agendada', 'confirmar a visita leva o lead para Visita agendada');
select ok(
  exists (select 1 from public.lead_messages where sender = 'sistema' and body like 'Visita confirmada pelo corretor:%'),
  'o cliente vê o aviso de visita confirmada'
);
select throws_ok(
  $$select public.close_visit((select id from public.visits), 'realizada')$$,
  '22023', null, 'não dá para marcar como realizada antes do horário'
);

-- Proposta: cliente faz, corretor encaminha e registra a resposta -----------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
select lives_ok(
  $$select public.make_proposal((select id from t_lead), 'a0000000-0000-0000-0000-000000000001', 850000, 'Financiamento')$$,
  'o cliente faz uma proposta'
);
select is((select status::text from public.proposals), 'recebida', 'a proposta fica com o corretor (recebida)');
select throws_ok(
  $$select public.forward_proposal((select id from public.proposals))$$,
  '42501', null, 'regra 4: o cliente não encaminha a proposta ao proprietário'
);
select throws_ok(
  $$select public.make_proposal((select id from t_lead), 'a0000000-0000-0000-0000-000000000001', 860000)$$,
  '23505', null, 'não abre duas propostas em andamento no mesmo imóvel'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);
select throws_ok(
  $$select public.answer_proposal((select id from public.proposals), 'aceita')$$,
  '22023', null, 'não registra resposta antes de encaminhar'
);
select lives_ok($$select public.forward_proposal((select id from public.proposals))$$, 'o corretor encaminha ao proprietário');
select is((select stage::text from public.leads), 'proposta', 'encaminhar leva o lead para Proposta');
select lives_ok(
  $$select public.answer_proposal((select id from public.proposals), 'contraproposta', 870000)$$,
  'o corretor registra a contraproposta'
);
select is((select stage::text from public.leads), 'negociacao', 'contraproposta leva o lead para Negociação');

-- Cliente aceita a contraproposta: vai ao corretor; só o corretor registra a confirmação do proprietário.
select throws_ok(
  $$select public.confirm_counter((select id from public.proposals), true)$$,
  '22023', null, 'o corretor não confirma um aceite que o cliente não deu'
);
select throws_ok(
  $$select public.accept_counter((select id from public.proposals))$$,
  'P0002', null, 'só o cliente aceita a contraproposta'
);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
select lives_ok($$select public.accept_counter((select id from public.proposals))$$, 'o cliente aceita a contraproposta');
select results_eq(
  $$select status::text, client_accepted_at is not null from public.proposals$$,
  $$values ('contraproposta', true)$$,
  'o aceite não fecha a proposta: ela espera o corretor (regra 4)'
);
select is(
  (select body from public.lead_messages where sender = 'cliente' order by id desc limit 1),
  'Aceito a contraproposta de R$ 870.000.',
  'o aceite vira mensagem do cliente para o corretor'
);
select throws_ok(
  $$select public.make_proposal((select id from t_lead), 'a0000000-0000-0000-0000-000000000001', 860000)$$,
  '23505', null, 'sem nova proposta enquanto o aceite espera o corretor'
);
select throws_ok(
  $$select public.confirm_counter((select id from public.proposals), true)$$,
  '42501', null, 'o cliente não registra a confirmação do proprietário'
);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);
select lives_ok($$select public.confirm_counter((select id from public.proposals), true)$$, 'o corretor registra que o proprietário confirmou');

select * from finish();
rollback;
