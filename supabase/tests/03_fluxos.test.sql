-- Fluxos da etapa 1: cadastro de parceiro, aprovação, convite e selo "Anúncio completo" (regra 9).
begin;
select plan(17);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'gestor@nova.test'),
  ('00000000-0000-0000-0000-0000000000a2', 'corretora@nova.test'),
  ('00000000-0000-0000-0000-0000000000e1', 'outra@pessoa.test'),
  ('00000000-0000-0000-0000-0000000000ad', 'admin@konexya.test');
insert into public.platform_admins (user_id) values ('00000000-0000-0000-0000-0000000000ad');

-- Cadastro de parceiro ------------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","email":"gestor@nova.test","role":"authenticated"}', true);

select lives_ok(
  $$select public.register_agency('Nova Imobiliária Ltda.', '33333333000133', 'J-3', 'Gestora Nova', '85911112222')$$,
  'gestor cadastra a imobiliária'
);
select results_eq(
  $$select status::text, manager_email from public.agencies$$,
  $$values ('pendente', 'gestor@nova.test')$$,
  'imobiliária nasce pendente, com o e-mail da sessão'
);
select lives_ok(
  $$insert into public.properties (agency_id, title) select id, 'rascunho antes da aprovação' from public.agencies$$,
  'imobiliária pendente já cadastra imóveis como rascunho'
);
select throws_ok(
  $$insert into public.properties (agency_id, title, status) select id, 'publicado antes da aprovação', 'publicado' from public.agencies$$,
  '42501', null, 'imobiliária pendente não publica imóveis'
);
select throws_ok(
  $$select public.register_agency('Outra Ltda.', '44444444000144', 'J-4', 'Gestora Nova', '85911112222')$$,
  '23505', null, 'o mesmo e-mail não abre duas imobiliárias'
);

-- Aprovação -----------------------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000ad","email":"admin@konexya.test","role":"authenticated"}', true);
select lives_ok(
  $$select public.review_agency((select id from public.agencies), 'aprovada')$$,
  'admin aprova a imobiliária'
);

-- Convite -------------------------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","email":"gestor@nova.test","role":"authenticated"}', true);
create temporary table tmp_token on commit drop as
  select public.create_agency_invite((select id from public.agencies), 'Corretora@Nova.test', 'corretor') as token;
grant select on tmp_token to authenticated;

select results_eq(
  $$select email, extract(day from expires_at - created_at)::int from public.agency_invites$$,
  $$values ('corretora@nova.test', 7)$$,
  'convite guarda o e-mail em minúsculas e vale 7 dias'
);
select is(
  (select count(*)::int from public.agency_invites where token_hash = (select token from tmp_token)),
  0,
  'o token em claro não fica salvo no banco'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","email":"outra@pessoa.test","role":"authenticated"}', true);
select throws_ok(
  $$select public.accept_agency_invite((select token from tmp_token), 'Outra', null)$$,
  '42501', null, 'convite não serve para outro e-mail'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","email":"corretora@nova.test","role":"authenticated"}', true);
select lives_ok(
  $$select public.accept_agency_invite((select token from tmp_token), 'Corretora', '12345-F')$$,
  'pessoa convidada aceita o convite'
);
select results_eq(
  $$select role::text, creci from public.agency_members where user_id = '00000000-0000-0000-0000-0000000000a2'$$,
  $$values ('corretor', '12345-F')$$,
  'pessoa entra na equipe com o papel do convite'
);
select throws_ok(
  $$select public.accept_agency_invite((select token from tmp_token), 'Corretora', null)$$,
  'P0002', null, 'convite não pode ser usado duas vezes'
);

reset role;
update public.agency_invites set accepted_at = null, expires_at = now() - interval '1 minute';
set local role authenticated;
select throws_ok(
  $$select public.accept_agency_invite((select token from tmp_token), 'Corretora', null)$$,
  '22023', null, 'convite vencido não é aceito'
);

-- Selo "Anúncio completo" ---------------------------------------------------------------------------
create temporary table tmp_prop on commit drop as
  select '00000000-0000-0000-0000-00000000f00d'::uuid as id;
reset role;
insert into public.properties (id, agency_id, title, price, neighborhood, condo_fee, iptu_monthly, area_m2, description, lat, lng, pin_confirmed)
select '00000000-0000-0000-0000-00000000f00d', id, 'Selo', 500000, 'Aldeota', 700, 150, 90, repeat('a', 200), -3.73, -38.5, true
from public.agencies;
insert into public.property_photos (property_id, source_url, position)
select '00000000-0000-0000-0000-00000000f00d', 'https://exemplo.test/' || g || '.jpg', g from generate_series(1, 4) g;

select is((select has_seal from public.properties where id = '00000000-0000-0000-0000-00000000f00d'), false,
  'sem a 5ª foto não há selo');

insert into public.property_photos (property_id, source_url, position)
values ('00000000-0000-0000-0000-00000000f00d', 'https://exemplo.test/5.jpg', 5);
select is((select has_seal from public.properties where id = '00000000-0000-0000-0000-00000000f00d'), true,
  'com 5 fotos e todos os campos, ganha o selo');

update public.properties set description = 'curta' where id = '00000000-0000-0000-0000-00000000f00d';
select is((select has_seal from public.properties where id = '00000000-0000-0000-0000-00000000f00d'), false,
  'descrição curta tira o selo');

update public.properties set description = repeat('a', 200) where id = '00000000-0000-0000-0000-00000000f00d';
update public.seal_rules set min_photos = 6;
select is((select has_seal from public.properties where id = '00000000-0000-0000-0000-00000000f00d'), false,
  'mudar a regra recalcula o selo de todos os imóveis');

select * from finish();
rollback;
