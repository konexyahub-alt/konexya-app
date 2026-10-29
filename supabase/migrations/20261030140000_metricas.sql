-- Métricas (P-09). Duas peças que o banco ainda não guardava:
-- 1) histórico de etapas do lead, para o tempo médio em cada etapa e o funil (conta a partir desta migração;
--    os leads que já existiam entram com a etapa atual);
-- 2) visualizações e salvos por imóvel, só em totais: a imobiliária nunca vê quem viu ou salvou (regra 1).

create table public.lead_stage_events (
  id bigint generated always as identity primary key,
  lead_id uuid not null references public.leads (id) on delete cascade,
  stage public.lead_stage not null,
  at timestamptz not null default now()
);
alter table public.lead_stage_events enable row level security;
create index lead_stage_events_lead_idx on public.lead_stage_events (lead_id, at);
create policy "equipe lê o histórico dos leads que atende" on public.lead_stage_events
  for select to authenticated using (public.is_lead_staff(lead_id) or public.is_platform_admin());

create function public.leads_after_write_stage_event() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' or new.stage is distinct from old.stage then
    insert into public.lead_stage_events (lead_id, stage, at)
    values (new.id, new.stage, case when tg_op = 'INSERT' then new.created_at else new.stage_changed_at end);
  end if;
  return null;
end;
$$;
create trigger leads_after_write_stage_event after insert or update of stage on public.leads
  for each row execute function public.leads_after_write_stage_event();
revoke execute on function public.leads_after_write_stage_event() from public, anon, authenticated;

-- Leads que já existiam: entrada como "novo" e, se já andaram, a etapa atual.
insert into public.lead_stage_events (lead_id, stage, at) select id, 'novo', created_at from public.leads;
insert into public.lead_stage_events (lead_id, stage, at)
  select id, stage, stage_changed_at from public.leads where stage <> 'novo';

revoke all on public.lead_stage_events from public, anon, authenticated;
grant select on public.lead_stage_events to authenticated;
grant all on public.lead_stage_events to service_role;

-- Totais por imóvel no período, só para quem é da imobiliária (gestor). Nada identifica o cliente.
create function public.agency_property_stats(p_agency uuid, p_from timestamptz, p_to timestamptz)
returns table (property_id uuid, views bigint, saves bigint)
language sql stable security definer set search_path = '' as $$
  select p.id,
    (select count(*) from public.property_views v where v.property_id = p.id and v.first_viewed_at >= p_from and v.first_viewed_at < p_to),
    (select count(*) from public.favorites f where f.property_id = p.id and f.created_at >= p_from and f.created_at < p_to)
  from public.properties p
  where p.agency_id = p_agency and public.is_agency_manager(p_agency);
$$;
revoke execute on function public.agency_property_stats(uuid, timestamptz, timestamptz) from public, anon;
grant execute on function public.agency_property_stats(uuid, timestamptz, timestamptz) to authenticated;
