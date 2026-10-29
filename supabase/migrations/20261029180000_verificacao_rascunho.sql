-- Verificação de anunciantes (docs/DECISOES.md, 2026-10-29).
-- 1) Resultado da conferência automática (CNPJ na Receita via BrasilAPI). Só o servidor grava; o admin lê.
alter table public.agencies
  add column verification jsonb;

-- 2) Cadastro pendente já pode montar rascunhos (cadastrar e importar imóveis). Publicar continua exigindo a
--    aprovação: com a imobiliária pendente, o imóvel só existe como rascunho.
create function public.agency_can_draft(p_agency uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.agencies where id = p_agency and status in ('aprovada', 'pendente'));
$$;
revoke execute on function public.agency_can_draft(uuid) from public, anon;
grant execute on function public.agency_can_draft(uuid) to authenticated, service_role;

drop policy "membro cadastra imóvel na própria imobiliária aprovada" on public.properties;
create policy "membro cadastra imóvel (pendente: só rascunho)" on public.properties
  for insert to authenticated
  with check (
    public.is_agency_member(agency_id)
    and (public.is_agency_approved(agency_id) or (public.agency_can_draft(agency_id) and status = 'rascunho'))
  );

drop policy "membro edita imóvel da própria imobiliária aprovada" on public.properties;
create policy "membro edita imóvel (pendente: só rascunho)" on public.properties
  for update to authenticated
  using (public.is_agency_member(agency_id) and public.agency_can_draft(agency_id))
  with check (
    public.is_agency_member(agency_id)
    and (public.is_agency_approved(agency_id) or (public.agency_can_draft(agency_id) and status = 'rascunho'))
  );

create or replace function public.can_edit_property(p_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.properties p
    where p.id = p_id and public.is_agency_member(p.agency_id) and public.agency_can_draft(p.agency_id)
  );
$$;
