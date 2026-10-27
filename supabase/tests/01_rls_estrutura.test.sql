-- Estrutura de segurança: toda tabela do schema public tem RLS e nada fica aberto sem querer.
begin;
select plan(4);

select is(
  (select count(*)::int from pg_tables t
   join pg_class c on c.relname = t.tablename and c.relnamespace = 'public'::regnamespace
   where t.schemaname = 'public' and not c.relrowsecurity),
  0,
  'toda tabela do schema public tem RLS ligado'
);

select is(
  (select array_agg(table_name::text order by table_name) from information_schema.role_table_grants
   where grantee = 'anon' and table_schema = 'public' and privilege_type <> 'SELECT'),
  null,
  'o visitante anônimo não grava em nenhuma tabela'
);

select is(
  (select array_agg(distinct table_name::text order by table_name::text) from information_schema.role_table_grants
   where grantee = 'anon' and table_schema = 'public'),
  array['properties', 'property_photos', 'seal_rules'],
  'o visitante anônimo só pode consultar imóveis, fotos e a regra do selo'
);

select ok(
  not exists (
    select 1 from information_schema.role_table_grants
    where grantee in ('anon', 'authenticated') and table_schema = 'public'
      and table_name in ('agencies', 'agency_members', 'agency_invites') and privilege_type = 'INSERT'
  ),
  'imobiliária, equipe e convites só são criados pelas funções de negócio'
);

select * from finish();
rollback;
