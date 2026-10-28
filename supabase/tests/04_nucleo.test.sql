-- Etapa 2: consentimento e lead (regra 1), endereços (regra 2), mensagens em nome do corretor (regra 3),
-- isolamento entre imobiliárias (regra 5), rodízio, primeira resposta humana e assistente.
begin;
select plan(40);

-- Cenário -------------------------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'gestor.a@a.test'),
  ('00000000-0000-0000-0000-0000000000a2', 'corretor1.a@a.test'),
  ('00000000-0000-0000-0000-0000000000a3', 'corretor2.a@a.test'),
  ('00000000-0000-0000-0000-00000000000b', 'gestor.b@b.test'),
  ('00000000-0000-0000-0000-0000000000c1', 'cliente1@c.test'),
  ('00000000-0000-0000-0000-0000000000c2', 'cliente2@c.test');

insert into public.agencies (id, legal_name, cnpj, creci, manager_name, manager_email, whatsapp, status, created_by) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'Imobiliária A Ltda.', '11111111000111', 'J-1', 'Gestor A', 'gestor.a@a.test', '85900000001', 'aprovada', '00000000-0000-0000-0000-00000000000a'),
  ('bbbbbbbb-0000-0000-0000-000000000000', 'Imobiliária B Ltda.', '22222222000122', 'J-2', 'Gestor B', 'gestor.b@b.test', '85900000002', 'aprovada', '00000000-0000-0000-0000-00000000000b');
-- O gestor da A está fora do rodízio; os dois corretores entram.
insert into public.agency_members (agency_id, user_id, role, name, email, in_rotation, last_lead_at) values
  ('aaaaaaaa-0000-0000-0000-000000000000', '00000000-0000-0000-0000-00000000000a', 'gestor', 'Gestor A', 'gestor.a@a.test', false, null),
  ('aaaaaaaa-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000a2', 'corretor', 'Corretor 1', 'corretor1.a@a.test', true, now() - interval '1 hour'),
  ('aaaaaaaa-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000a3', 'corretor', 'Corretor 2', 'corretor2.a@a.test', true, now() - interval '2 hours'),
  ('bbbbbbbb-0000-0000-0000-000000000000', '00000000-0000-0000-0000-00000000000b', 'gestor', 'Gestor B', 'gestor.b@b.test', true, null);

insert into public.properties (id, agency_id, title, price, neighborhood, status) values
  ('a0000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', 'Imóvel A1', 800000, 'Aldeota', 'publicado'),
  ('a0000000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000000', 'Imóvel A2', 700000, 'Cocó', 'publicado'),
  ('b0000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000000', 'Imóvel B1', 600000, 'Meireles', 'publicado');

insert into public.client_profiles (user_id, name, purpose, budget_max, pets, work_neighborhood) values
  ('00000000-0000-0000-0000-0000000000c1', 'Ana', 'comprar', 900000, 'grande', 'Aldeota'),
  ('00000000-0000-0000-0000-0000000000c2', 'Bia', 'alugar', 4000, null, null);
insert into public.consents (user_id, kind, document_version) values
  ('00000000-0000-0000-0000-0000000000c1', 'termos', 'v1'),
  ('00000000-0000-0000-0000-0000000000c2', 'termos', 'v1');

-- Configuração padrão da assistente ----------------------------------------------------------------
select is(
  (select count(*)::int from public.agency_assistant_settings),
  2,
  'toda imobiliária nasce com a assistente configurada'
);
select ok(
  (select enabled and name = 'Lia' from public.agency_assistant_settings where agency_id = 'aaaaaaaa-0000-0000-0000-000000000000'),
  'a assistente vem ligada por padrão'
);

-- Regra 1: sem consentimento, nada chega à imobiliária ---------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
select is_empty('select 1 from public.leads', 'sem consentimento, a imobiliária não tem lead');
select is_empty('select 1 from public.client_profiles', 'a imobiliária nunca lê o perfil do cliente');
select is_empty('select 1 from public.profile_chat_messages', 'a imobiliária nunca lê a conversa com a IA');

-- Cliente 1 vê o imóvel e autoriza o compartilhamento com a A
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
select lives_ok($$select public.mark_property_viewed('a0000000-0000-0000-0000-000000000002')$$, 'cliente registra o imóvel visto');
insert into public.favorites (user_id, property_id) values
  ('00000000-0000-0000-0000-0000000000c1', 'a0000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-0000000000c1', 'b0000000-0000-0000-0000-000000000001');
select is_empty('select 1 from public.leads', 'o cliente não lê a tabela de leads diretamente');
create temporary table tmp_lead on commit drop as
  select public.share_profile('a0000000-0000-0000-0000-000000000001') as id;
grant select on tmp_lead to authenticated;
select is(
  (select count(*)::int from public.my_conversations()),
  1,
  'o cliente vê a conversa com a imobiliária autorizada'
);
select is(
  public.share_profile('a0000000-0000-0000-0000-000000000002'),
  (select id from tmp_lead),
  'segundo imóvel da mesma imobiliária entra no mesmo lead'
);
select throws_ok(
  $$insert into public.consents (user_id, kind, agency_id) values ('00000000-0000-0000-0000-0000000000c1', 'compartilhamento', 'bbbbbbbb-0000-0000-0000-000000000000')$$,
  '42501', null, 'o consentimento de compartilhamento só nasce pelo fluxo de autorização'
);

reset role;
select results_eq(
  $$select broker_id, stage::text, assistant_active, cardinality(interest_property_ids) from public.leads$$,
  $$values ('00000000-0000-0000-0000-0000000000a3'::uuid, 'novo', true, 2)$$,
  'rodízio entrega ao corretor que recebeu lead há mais tempo; lead nasce Novo com a assistente ligada'
);
select results_eq(
  $$select assistant_queue from public.leads$$,
  $$values (array['pagamento', 'credito', 'fgts', 'horario'])$$,
  'a fila da assistente segue as perguntas ligadas, na ordem'
);
select is(
  (select count(*)::int from public.consents where kind = 'compartilhamento' and agency_id = 'aaaaaaaa-0000-0000-0000-000000000000'),
  1,
  'um consentimento registrado para a imobiliária A'
);

-- Regra 2: o retrato não tem endereço, só bairros e preferências
select is(
  (select array_agg(k order by k) from public.leads, jsonb_object_keys(profile_snapshot) k),
  array['bedrooms_min', 'budget_max', 'budget_min', 'commute_max_min', 'extras', 'goal', 'has_children', 'lifestyle',
    'name', 'neighborhoods', 'parking_min', 'pets', 'priorities', 'property_kind', 'purpose', 'timeline',
    'updated_at', 'work_neighborhood', 'works_from_home'],
  'o retrato do perfil não leva endereços'
);

-- Imobiliária B não recebe nada (o consentimento vale para uma imobiliária)
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);
select is_empty('select 1 from public.leads', 'imobiliária B não vê o lead da A');
select is_empty('select 1 from public.lead_messages', 'imobiliária B não vê as mensagens do lead da A');
select is_empty(
  $$select * from public.lead_property_activity((select id from tmp_lead))$$,
  'imobiliária B não vê os imóveis vistos e salvos do lead da A'
);
select throws_ok(
  $$insert into public.lead_messages (lead_id, sender, author_id, body) values ((select id from tmp_lead), 'corretor', '00000000-0000-0000-0000-00000000000b', 'oi')$$,
  '42501', null, 'imobiliária B não escreve no lead da A'
);

-- Corretor 1 (não atribuído) não vê; gestor vê tudo da A
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);
select is_empty('select 1 from public.leads', 'corretor vê só os leads atribuídos a ele');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
select is((select count(*)::int from public.leads), 1, 'gestor vê os leads da imobiliária');
select results_eq(
  $$select property_id, saved from public.lead_property_activity((select id from tmp_lead)) order by property_id$$,
  $$values ('a0000000-0000-0000-0000-000000000002'::uuid, true)$$,
  'o lead mostra só os imóveis desta imobiliária que o cliente viu ou salvou'
);

-- Regra 3: ninguém escreve como corretor ou assistente no lugar de outro --------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
select throws_ok(
  $$insert into public.lead_messages (lead_id, sender, author_id, body) values ((select id from tmp_lead), 'corretor', '00000000-0000-0000-0000-0000000000c1', 'falso')$$,
  '42501', null, 'cliente não escreve como corretor'
);
select throws_ok(
  $$insert into public.lead_messages (lead_id, sender, body) values ((select id from tmp_lead), 'assistente', 'falso')$$,
  '42501', null, 'cliente não escreve como assistente'
);
select lives_ok(
  $$insert into public.lead_messages (lead_id, sender, author_id, body) values ((select id from tmp_lead), 'cliente', '00000000-0000-0000-0000-0000000000c1', 'Oi!')$$,
  'cliente escreve como cliente'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}', true);
select throws_ok(
  $$insert into public.lead_messages (lead_id, sender, body) values ((select id from tmp_lead), 'assistente', 'falso')$$,
  '42501', null, 'corretor não escreve como assistente'
);
select throws_ok(
  $$insert into public.lead_messages (lead_id, sender, author_id, body) values ((select id from tmp_lead), 'corretor', '00000000-0000-0000-0000-00000000000a', 'falso')$$,
  '42501', null, 'corretor não escreve em nome de outra pessoa da equipe'
);
select throws_ok(
  $$update public.leads set broker_id = '00000000-0000-0000-0000-0000000000a2'$$,
  '42501', null, 'corretor não troca o responsável pelo lead'
);
select is(
  (select first_human_response_at from public.leads), null, 'antes do corretor, não há primeira resposta humana'
);
select lives_ok(
  $$insert into public.lead_messages (lead_id, sender, author_id, body) values ((select id from tmp_lead), 'corretor', '00000000-0000-0000-0000-0000000000a3', 'Oi, Ana!')$$,
  'corretor responde o lead'
);
select results_eq(
  $$select first_human_response_at is not null, stage::text, assistant_active from public.leads$$,
  $$values (true, 'em_atendimento', false)$$,
  'a mensagem do corretor registra a primeira resposta, move para Em atendimento e para a assistente'
);
select throws_ok(
  $$update public.leads set stage = 'perdido'$$,
  '23514', null, 'Perdido exige o motivo'
);

-- Revogação (regra 1): o retrato para de acompanhar o perfil e a conversa fecha --------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
select lives_ok($$select public.revoke_share('aaaaaaaa-0000-0000-0000-000000000000')$$, 'cliente revoga o compartilhamento');
update public.client_profiles set budget_max = 1200000 where user_id = '00000000-0000-0000-0000-0000000000c1';
select throws_ok(
  $$insert into public.lead_messages (lead_id, sender, author_id, body) values ((select id from tmp_lead), 'cliente', '00000000-0000-0000-0000-0000000000c1', 'ainda aí?')$$,
  '42501', null, 'com o consentimento revogado, a conversa fica fechada'
);

reset role;
select is(
  (select (profile_snapshot ->> 'budget_max')::numeric from public.leads),
  900000::numeric,
  'depois da revogação, o retrato não recebe dados novos'
);
select ok(
  (select revoked_at is not null from public.consents where kind = 'compartilhamento'),
  'a revogação fica registrada no consentimento'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
select is_empty(
  $$select * from public.lead_property_activity((select id from tmp_lead))$$,
  'depois da revogação, a imobiliária não vê mais o que o cliente viu ou salvou'
);

-- Novo consentimento reabre o mesmo lead com os dados atuais
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
select is(
  public.share_profile('a0000000-0000-0000-0000-000000000001'),
  (select id from tmp_lead),
  'autorizar de novo reabre o mesmo lead'
);
reset role;
select is(
  (select (profile_snapshot ->> 'budget_max')::numeric from public.leads),
  1200000::numeric,
  'o novo consentimento leva o perfil atual'
);

-- Aluguel: a assistente não faz perguntas de compra ------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated"}', true);
select lives_ok($$select public.share_profile('a0000000-0000-0000-0000-000000000001')$$, 'outro cliente autoriza');
reset role;
select results_eq(
  $$select assistant_queue, broker_id from public.leads where client_id = '00000000-0000-0000-0000-0000000000c2'$$,
  $$values (array['horario'], '00000000-0000-0000-0000-0000000000a2'::uuid)$$,
  'para aluguel, só as perguntas que fazem sentido; o rodízio passa para o próximo corretor'
);

select * from finish();
rollback;
