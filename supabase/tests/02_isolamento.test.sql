-- Regra 5: uma imobiliária nunca lê leads, imóveis não publicados ou dados de outra.
-- Regra 1 (base): a imobiliária nunca lê as tabelas do cliente.
-- Testado contra o banco, com os papéis reais da API (anon e authenticated).
begin;
select plan(24);

-- Cenário -------------------------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'gestor.a@a.test'),
  ('00000000-0000-0000-0000-00000000000b', 'gestor.b@b.test'),
  ('00000000-0000-0000-0000-0000000000c1', 'cliente@c.test'),
  ('00000000-0000-0000-0000-0000000000ad', 'admin@konexya.test'),
  ('00000000-0000-0000-0000-0000000000a2', 'corretor.a@a.test');
insert into public.platform_admins (user_id) values ('00000000-0000-0000-0000-0000000000ad');

insert into public.agencies (id, legal_name, cnpj, creci, manager_name, manager_email, whatsapp, status, created_by) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'Imobiliária A Ltda.', '11111111000111', 'J-1', 'Gestor A', 'gestor.a@a.test', '85900000001', 'aprovada', '00000000-0000-0000-0000-00000000000a'),
  ('bbbbbbbb-0000-0000-0000-000000000000', 'Imobiliária B Ltda.', '22222222000122', 'J-2', 'Gestor B', 'gestor.b@b.test', '85900000002', 'aprovada', '00000000-0000-0000-0000-00000000000b');
insert into public.agency_members (agency_id, user_id, role, name, email) values
  ('aaaaaaaa-0000-0000-0000-000000000000', '00000000-0000-0000-0000-00000000000a', 'gestor', 'Gestor A', 'gestor.a@a.test'),
  ('aaaaaaaa-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000a2', 'corretor', 'Corretor A', 'corretor.a@a.test'),
  ('bbbbbbbb-0000-0000-0000-000000000000', '00000000-0000-0000-0000-00000000000b', 'gestor', 'Gestor B', 'gestor.b@b.test');

insert into public.properties (id, agency_id, title, price, neighborhood, status) values
  ('a0000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', 'A publicado', 500000, 'Aldeota', 'publicado'),
  ('a0000000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000000', 'A rascunho', null, null, 'rascunho'),
  ('a0000000-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000000', 'A pausado', 400000, 'Meireles', 'pausado');

insert into public.client_profiles (user_id, name) values ('00000000-0000-0000-0000-0000000000c1', 'Cliente');
insert into public.consents (user_id, kind, document_version) values ('00000000-0000-0000-0000-0000000000c1', 'termos', 'v1');
insert into public.agency_invites (agency_id, email, role, token_hash, created_by) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'novo@a.test', 'corretor', 'hash-a', '00000000-0000-0000-0000-00000000000a');

-- Visitante anônimo ---------------------------------------------------------------------------------
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select results_eq(
  'select title from public.properties order by title',
  array['A publicado'],
  'anônimo vê só imóveis publicados'
);
select throws_ok('select * from public.agencies', '42501', null, 'anônimo não consulta imobiliárias');

-- Gestor da imobiliária B ---------------------------------------------------------------------------
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","email":"gestor.b@b.test","role":"authenticated"}', true);

select results_eq(
  'select title from public.properties order by title',
  array['A publicado'],
  'imobiliária B não vê rascunhos nem pausados da A'
);
select is_empty(
  $$select 1 from public.agencies where id = 'aaaaaaaa-0000-0000-0000-000000000000'$$,
  'imobiliária B não lê o cadastro da A'
);
select is_empty(
  $$select 1 from public.agency_members where agency_id = 'aaaaaaaa-0000-0000-0000-000000000000'$$,
  'imobiliária B não lê a equipe da A'
);
select is_empty(
  $$select 1 from public.agency_invites where agency_id = 'aaaaaaaa-0000-0000-0000-000000000000'$$,
  'imobiliária B não lê os convites da A'
);
select is_empty('select 1 from public.client_profiles', 'imobiliária não lê perfis de clientes');
select is_empty('select 1 from public.consents', 'imobiliária não lê consentimentos de clientes');

-- Tentativas de escrita na imobiliária A
update public.properties set price = 1 where id = 'a0000000-0000-0000-0000-000000000001';
select throws_ok(
  $$insert into public.properties (agency_id, title) values ('aaaaaaaa-0000-0000-0000-000000000000', 'invasão')$$,
  '42501', null, 'imobiliária B não cadastra imóvel na A'
);
select is_empty(
  $$delete from public.properties where id = 'a0000000-0000-0000-0000-000000000001' returning id$$,
  'imobiliária B não exclui imóvel da A'
);
select throws_ok(
  $$select public.create_agency_invite('aaaaaaaa-0000-0000-0000-000000000000', 'x@b.test', 'corretor')$$,
  '42501', null, 'imobiliária B não convida pessoas para a A'
);
select throws_ok(
  $$select public.review_agency('bbbbbbbb-0000-0000-0000-000000000000', 'aprovada')$$,
  '42501', null, 'gestor não aprova imobiliária'
);

-- Corretor da A -------------------------------------------------------------------------------------
reset role;
select is(
  (select price from public.properties where id = 'a0000000-0000-0000-0000-000000000001'),
  500000.00::numeric,
  'o update da imobiliária B não alterou o imóvel da A'
);
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","email":"corretor.a@a.test","role":"authenticated"}', true);

select results_eq(
  'select count(*)::int from public.properties',
  array[3],
  'corretor da A vê todos os imóveis da A, inclusive rascunho e pausado'
);
select is_empty('select 1 from public.agency_invites', 'corretor não vê convites (só o gestor)');
select is_empty(
  $$update public.agency_members set active = false where user_id = '00000000-0000-0000-0000-00000000000a' returning user_id$$,
  'corretor não desativa o gestor'
);
select throws_ok(
  $$update public.properties set has_seal = true where id = 'a0000000-0000-0000-0000-000000000002'$$,
  '42501', null, 'ninguém marca o selo à mão'
);

-- Gestor da A ---------------------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","email":"gestor.a@a.test","role":"authenticated"}', true);
select results_eq(
  'select count(*)::int from public.agency_invites',
  array[1],
  'gestor da A vê os convites da A'
);
select isnt_empty(
  $$update public.agency_members set in_rotation = false where user_id = '00000000-0000-0000-0000-0000000000a2' returning user_id$$,
  'gestor tira corretor do rodízio'
);
select is_empty(
  $$update public.agency_members set role = 'corretor' where user_id = '00000000-0000-0000-0000-00000000000a' returning user_id$$,
  'gestor não muda o próprio papel'
);

-- Cliente -------------------------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","email":"cliente@c.test","role":"authenticated"}', true);
select results_eq('select name from public.client_profiles', array['Cliente'], 'cliente lê o próprio perfil');
select is_empty('select 1 from public.agencies', 'cliente não lê cadastros de imobiliárias');
select throws_ok(
  $$insert into public.consents (user_id, kind, agency_id) values ('00000000-0000-0000-0000-0000000000c1', 'compartilhamento', 'aaaaaaaa-0000-0000-0000-000000000000')$$,
  '42501', null, 'compartilhamento não é registrado direto pela API (etapa 2, com fluxo próprio)'
);

-- Admin da Konexya ----------------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000ad","email":"admin@konexya.test","role":"authenticated"}', true);
select results_eq('select count(*)::int from public.agencies', array[2], 'admin vê todas as imobiliárias');

select * from finish();
rollback;
