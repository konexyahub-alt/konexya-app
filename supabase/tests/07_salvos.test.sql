-- Salvos: cada cliente vê só os próprios; imóvel que saiu do ar aparece como indisponível.
begin;
select plan(4);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'gestor.a@a.test'),
  ('00000000-0000-0000-0000-0000000000c1', 'cliente1@c.test'),
  ('00000000-0000-0000-0000-0000000000c2', 'cliente2@c.test');
insert into public.agencies (id, legal_name, cnpj, creci, manager_name, manager_email, whatsapp, status, created_by) values
  ('aaaaaaaa-0000-0000-0000-000000000000', 'Imobiliária A Ltda', '11111111000111', 'J-1', 'Gestor A', 'gestor.a@a.test', '85900000001', 'aprovada', '00000000-0000-0000-0000-00000000000a');
insert into public.properties (id, agency_id, title, price, neighborhood, status) values
  ('a0000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', 'Publicado', 700000, 'Cocó', 'publicado'),
  ('a0000000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000000', 'Vendido', 900000, 'Aldeota', 'vendido'),
  ('a0000000-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000000', 'Rascunho', 500000, 'Meireles', 'rascunho');
insert into public.favorites (user_id, property_id) values
  ('00000000-0000-0000-0000-0000000000c1', 'a0000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-0000000000c1', 'a0000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-0000000000c2', 'a0000000-0000-0000-0000-000000000003');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true);
select results_eq(
  $$select title, available from public.my_saved_properties() order by title$$,
  $$values ('Publicado', true), ('Vendido', false)$$,
  'o cliente vê os próprios salvos, com o que saiu do ar marcado como indisponível'
);
select is(
  (select count(*)::int from public.properties where id = 'a0000000-0000-0000-0000-000000000002'),
  0,
  'o imóvel vendido continua fora da busca normal'
);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated"}', true);
select results_eq(
  $$select title from public.my_saved_properties()$$,
  $$values ('Rascunho')$$,
  'outro cliente não vê os salvos de ninguém além dos próprios'
);
reset role;
set local role anon;
select throws_ok($$select * from public.my_saved_properties()$$, '42501', null, 'sem login não há salvos');

select * from finish();
rollback;
