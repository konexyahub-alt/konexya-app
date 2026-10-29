-- Métricas: histórico de etapas automático e totais por imóvel só para o gestor da própria imobiliária.
begin;
select plan(6);

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
  ('a0000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', 'Imóvel A1', 885000, 'Cocó', 'publicado');
insert into public.property_views (user_id, property_id) values ('00000000-0000-0000-0000-0000000000c1', 'a0000000-0000-0000-0000-000000000001');
insert into public.favorites (user_id, property_id) values ('00000000-0000-0000-0000-0000000000c1', 'a0000000-0000-0000-0000-000000000001');
insert into public.leads (id, agency_id, client_id, broker_id, client_name, profile_snapshot) values
  ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a2', 'Ana', '{}');
update public.leads set stage = 'em_atendimento' where id = '11111111-0000-0000-0000-000000000001';
update public.leads set stage = 'qualificado' where id = '11111111-0000-0000-0000-000000000001';

select results_eq(
  $$select stage::text from public.lead_stage_events where lead_id = '11111111-0000-0000-0000-000000000001' order by id$$,
  $$values ('novo'), ('em_atendimento'), ('qualificado')$$,
  'cada mudança de etapa fica no histórico'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);
select is((select count(*)::int from public.lead_stage_events), 3, 'o corretor do lead vê o histórico');
select is(
  (select count(*)::int from public.agency_property_stats('aaaaaaaa-0000-0000-0000-000000000000', now() - interval '1 day', now() + interval '1 day')),
  0, 'corretor não vê os totais por imóvel (só o gestor)'
);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
select results_eq(
  $$select views, saves from public.agency_property_stats('aaaaaaaa-0000-0000-0000-000000000000', now() - interval '1 day', now() + interval '1 day')$$,
  $$values (1::bigint, 1::bigint)$$,
  'o gestor vê só os totais de visualizações e salvos'
);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);
select is((select count(*)::int from public.lead_stage_events), 0, 'outra imobiliária não vê o histórico');
select is(
  (select count(*)::int from public.agency_property_stats('aaaaaaaa-0000-0000-0000-000000000000', now() - interval '1 day', now() + interval '1 day')),
  0, 'outra imobiliária não vê os totais da A'
);

select * from finish();
rollback;
