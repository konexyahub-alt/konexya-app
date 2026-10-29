-- Corretor autônomo (docs/DECISOES.md, 2026-10-29): cadastro sem CNPJ, sem equipe, e quem tem convite de
-- imobiliária não se cadastra como autônomo.
begin;
select plan(9);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000b1', 'autonomo@corretor.test'),
  ('00000000-0000-0000-0000-0000000000b2', 'gestor@imob.test'),
  ('00000000-0000-0000-0000-0000000000b3', 'convidada@imob.test'),
  ('00000000-0000-0000-0000-0000000000ad', 'admin@konexya.test');
insert into public.platform_admins (user_id) values ('00000000-0000-0000-0000-0000000000ad');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","email":"autonomo@corretor.test","role":"authenticated"}', true);

select lives_ok(
  $$select public.register_autonomous('Ana Corretora', 'CRECI 12345-F', '85911113333')$$,
  'corretor autônomo se cadastra sem CNPJ'
);
select results_eq(
  $$select kind::text, cnpj, status::text from public.agencies where manager_email = 'autonomo@corretor.test'$$,
  $$values ('autonomo', null::text, 'pendente')$$,
  'nasce como autônomo, sem CNPJ e pendente de aprovação'
);
select results_eq(
  $$select role::text, creci from public.agency_members where user_id = '00000000-0000-0000-0000-0000000000b1'$$,
  $$values ('gestor', 'CRECI 12345-F')$$,
  'o mesmo login é gestor, com o CRECI de pessoa física'
);
select throws_ok(
  $$select public.register_autonomous('Ana Corretora', 'CRECI 12345-F', '85911113333')$$,
  '23505', null, 'o mesmo e-mail não se cadastra duas vezes'
);

-- Admin aprova; autônomo não convida ninguém.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000ad","email":"admin@konexya.test","role":"authenticated"}', true);
select public.review_agency((select id from public.agencies where kind = 'autonomo'), 'aprovada');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b1","email":"autonomo@corretor.test","role":"authenticated"}', true);
select throws_ok(
  $$select public.create_agency_invite((select id from public.agencies where kind = 'autonomo'), 'alguem@x.test', 'corretor')$$,
  '42501', null, 'corretor autônomo não tem equipe para convidar'
);

-- Imobiliária continua exigindo CNPJ.
reset role;
select throws_ok(
  $$insert into public.agencies (kind, legal_name, cnpj, creci, manager_name, manager_email, whatsapp, created_by)
    values ('imobiliaria', 'Sem CNPJ Ltda', null, 'J-1', 'Fulano', 'x@x.test', '85911114444', '00000000-0000-0000-0000-0000000000b2')$$,
  '23514', null, 'imobiliária sem CNPJ é recusada'
);

-- Quem tem convite pendente de uma imobiliária não se cadastra como autônomo.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2","email":"gestor@imob.test","role":"authenticated"}', true);
select public.register_agency('Imob Teste Ltda', '55555555000155', 'J-5', 'Gestor', '85911115555');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000ad","email":"admin@konexya.test","role":"authenticated"}', true);
select public.review_agency((select id from public.agencies where cnpj = '55555555000155'), 'aprovada');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b2","email":"gestor@imob.test","role":"authenticated"}', true);
select lives_ok(
  $$select public.create_agency_invite((select id from public.agencies where cnpj = '55555555000155'), 'convidada@imob.test', 'corretor')$$,
  'imobiliária convida a corretora'
);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000b3","email":"convidada@imob.test","role":"authenticated"}', true);
select throws_ok(
  $$select public.register_autonomous('Convidada', 'CRECI 999-F', '85911116666')$$,
  'P0001', null, 'quem tem convite pendente entra pelo convite, não como autônomo'
);
select is(
  (select count(*)::int from public.agencies where manager_email = 'convidada@imob.test'),
  0, 'nenhum cadastro de autônomo foi criado para a convidada'
);

select * from finish();
rollback;
