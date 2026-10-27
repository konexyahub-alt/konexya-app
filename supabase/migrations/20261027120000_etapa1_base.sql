-- Etapa 1 — base: admin da plataforma, cliente (nome e termos), imobiliárias, equipe, convites,
-- imóveis, fotos e selo "Anúncio completo".
--
-- Regras de acesso (docs/PLANO.md, seção 3):
--   * Toda tabela tem RLS. Nada é exposto à API sem GRANT explícito (o projeto não expõe tabelas novas
--     automaticamente).
--   * A imobiliária nunca lê dados do cliente. Uma imobiliária nunca lê imóveis não publicados de outra.
--   * Operações que tocam várias tabelas (cadastro de parceiro, aprovação, convite) passam por funções
--     SECURITY DEFINER com as verificações dentro delas.

-- ---------------------------------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------------------------------
create type public.agency_status as enum ('pendente', 'aprovada', 'recusada', 'suspensa');
create type public.member_role as enum ('gestor', 'corretor');
create type public.property_purpose as enum ('venda', 'aluguel');
create type public.property_type as enum ('apartamento', 'casa', 'cobertura', 'studio', 'sala_comercial', 'terreno');
create type public.property_status as enum ('rascunho', 'publicado', 'pausado', 'vendido', 'alugado');
create type public.pets_policy as enum ('nao', 'pequeno', 'qualquer');
create type public.consent_kind as enum ('termos', 'compartilhamento', 'whatsapp');

-- ---------------------------------------------------------------------------------------------------
-- Utilitário: updated_at
-- ---------------------------------------------------------------------------------------------------
create function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------------------------------
-- Admin da plataforma (Konexya). Linhas inseridas manualmente, por SQL, pelo dono do projeto.
-- ---------------------------------------------------------------------------------------------------
create table public.platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.platform_admins enable row level security;

create function public.is_platform_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.platform_admins where user_id = auth.uid());
$$;

create policy "admin lê o próprio registro" on public.platform_admins
  for select to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------------------------------------
-- Cliente
-- ---------------------------------------------------------------------------------------------------
create table public.client_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  name text check (name is null or char_length(btrim(name)) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.client_profiles enable row level security;
create trigger client_profiles_updated_at before update on public.client_profiles
  for each row execute function public.set_updated_at();

create policy "cliente lê o próprio perfil" on public.client_profiles
  for select to authenticated using (user_id = auth.uid());
create policy "cliente cria o próprio perfil" on public.client_profiles
  for insert to authenticated with check (user_id = auth.uid());
create policy "cliente edita o próprio perfil" on public.client_profiles
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "cliente exclui o próprio perfil" on public.client_profiles
  for delete to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------------------------------------
-- Imobiliárias
-- ---------------------------------------------------------------------------------------------------
create table public.agencies (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null check (char_length(btrim(legal_name)) between 2 and 160),
  cnpj text not null unique check (cnpj ~ '^[0-9]{14}$'),
  creci text not null check (char_length(btrim(creci)) between 2 and 30),
  manager_name text not null check (char_length(btrim(manager_name)) between 2 and 120),
  manager_email text not null check (manager_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  whatsapp text not null check (whatsapp ~ '^[0-9]{10,13}$'),
  status public.agency_status not null default 'pendente',
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete set null,
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now()
);
alter table public.agencies enable row level security;

create table public.agency_members (
  agency_id uuid not null references public.agencies (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.member_role not null,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  email text not null,
  creci text check (creci is null or char_length(btrim(creci)) between 2 and 30),
  active boolean not null default true,
  in_rotation boolean not null default true,
  last_lead_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (agency_id, user_id)
);
alter table public.agency_members enable row level security;
create index agency_members_user_idx on public.agency_members (user_id);

-- Funções de pertencimento. SECURITY DEFINER para não depender das políticas de agency_members
-- (evita recursão) e para ficarem estáveis dentro das políticas.
create function public.is_agency_member(p_agency uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.agency_members
    where agency_id = p_agency and user_id = auth.uid() and active
  );
$$;

create function public.is_agency_manager(p_agency uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.agency_members
    where agency_id = p_agency and user_id = auth.uid() and active and role = 'gestor'
  );
$$;

create function public.is_agency_approved(p_agency uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.agencies where id = p_agency and status = 'aprovada');
$$;

create policy "membro lê a própria imobiliária" on public.agencies
  for select to authenticated using (public.is_agency_member(id) or public.is_platform_admin());

create policy "membro lê a equipe da própria imobiliária" on public.agency_members
  for select to authenticated using (public.is_agency_member(agency_id) or public.is_platform_admin());

-- O gestor muda papel, CRECI, rodízio e ativo de outras pessoas da equipe, nunca de si mesmo
-- (evita que a imobiliária fique sem gestor por engano).
create policy "gestor edita a equipe" on public.agency_members
  for update to authenticated
  using (public.is_agency_manager(agency_id) and user_id <> auth.uid())
  with check (public.is_agency_manager(agency_id) and user_id <> auth.uid());

-- Convites
create table public.agency_invites (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  email text not null check (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  role public.member_role not null default 'corretor',
  token_hash text not null unique,
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.agency_invites enable row level security;
create index agency_invites_agency_idx on public.agency_invites (agency_id);

create policy "gestor lê convites" on public.agency_invites
  for select to authenticated using (public.is_agency_manager(agency_id));
create policy "gestor cancela convites" on public.agency_invites
  for delete to authenticated using (public.is_agency_manager(agency_id) and accepted_at is null);

-- ---------------------------------------------------------------------------------------------------
-- Consentimentos (etapa 1 usa só "termos"; compartilhamento e WhatsApp entram depois)
-- ---------------------------------------------------------------------------------------------------
create table public.consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind public.consent_kind not null,
  agency_id uuid references public.agencies (id) on delete cascade,
  document_version text,
  shared_snapshot jsonb,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  check ((kind = 'compartilhamento') = (agency_id is not null))
);
alter table public.consents enable row level security;
create index consents_user_idx on public.consents (user_id, kind);

create policy "cliente lê os próprios consentimentos" on public.consents
  for select to authenticated using (user_id = auth.uid());
create policy "cliente registra o aceite dos termos" on public.consents
  for insert to authenticated
  with check (user_id = auth.uid() and kind = 'termos' and agency_id is null and revoked_at is null);

-- ---------------------------------------------------------------------------------------------------
-- Selo "Anúncio completo": regra configurável (uma linha só)
-- ---------------------------------------------------------------------------------------------------
create table public.seal_rules (
  id smallint primary key default 1 check (id = 1),
  min_photos smallint not null default 5 check (min_photos >= 0),
  min_description_chars smallint not null default 200 check (min_description_chars >= 0),
  updated_at timestamptz not null default now()
);
alter table public.seal_rules enable row level security;
insert into public.seal_rules (id) values (1);

create policy "todos leem a regra do selo" on public.seal_rules for select using (true);
create policy "admin edita a regra do selo" on public.seal_rules
  for update to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());

-- ---------------------------------------------------------------------------------------------------
-- Imóveis
-- ---------------------------------------------------------------------------------------------------
create table public.properties (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  broker_id uuid references auth.users (id) on delete set null,
  external_ref text check (external_ref is null or char_length(external_ref) between 1 and 60),
  title text check (title is null or char_length(btrim(title)) between 2 and 120),
  purpose public.property_purpose not null default 'venda',
  type public.property_type not null default 'apartamento',
  street text,
  street_number text,
  complement text,
  neighborhood text,
  city text not null default 'Fortaleza',
  state text not null default 'CE' check (state ~ '^[A-Z]{2}$'),
  postal_code text check (postal_code is null or postal_code ~ '^[0-9]{8}$'),
  lat double precision check (lat is null or lat between -90 and 90),
  lng double precision check (lng is null or lng between -180 and 180),
  pin_confirmed boolean not null default false,
  price numeric(14, 2) check (price is null or price > 0),
  condo_fee numeric(12, 2) check (condo_fee is null or condo_fee >= 0),
  iptu_monthly numeric(12, 2) check (iptu_monthly is null or iptu_monthly >= 0),
  area_m2 numeric(10, 2) check (area_m2 is null or area_m2 > 0),
  bedrooms smallint check (bedrooms is null or bedrooms between 0 and 50),
  suites smallint check (suites is null or suites between 0 and 50),
  bathrooms smallint check (bathrooms is null or bathrooms between 0 and 50),
  parking_spots smallint check (parking_spots is null or parking_spots between 0 and 50),
  pets public.pets_policy,
  furnished boolean,
  floor smallint,
  view text check (view is null or char_length(view) <= 80),
  amenities text[] not null default '{}',
  description text check (description is null or char_length(description) <= 5000),
  tour_url text check (tour_url is null or tour_url ~ '^https://'),
  status public.property_status not null default 'rascunho',
  has_seal boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agency_id, external_ref),
  check (pin_confirmed = false or (lat is not null and lng is not null)),
  -- Publicar exige o mínimo para o cliente entender o anúncio.
  check (status = 'rascunho' or (title is not null and price is not null and neighborhood is not null))
);
alter table public.properties enable row level security;
create index properties_agency_idx on public.properties (agency_id, status);
create index properties_published_idx on public.properties (status) where status = 'publicado';
create trigger properties_updated_at before update on public.properties
  for each row execute function public.set_updated_at();

create table public.property_photos (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  storage_path text,
  source_url text check (source_url is null or source_url ~ '^https://'),
  position smallint not null default 0,
  is_cover boolean not null default false,
  alt_text text check (alt_text is null or char_length(alt_text) <= 200),
  created_at timestamptz not null default now(),
  check ((storage_path is null) <> (source_url is null))
);
alter table public.property_photos enable row level security;
create index property_photos_property_idx on public.property_photos (property_id, position);
create unique index property_photos_one_cover on public.property_photos (property_id) where is_cover;

-- Corretor responsável precisa ser da mesma imobiliária. Datas de publicação automáticas.
create function public.properties_before_write() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.broker_id is not null and not exists (
    select 1 from public.agency_members
    where agency_id = new.agency_id and user_id = new.broker_id and active
  ) then
    raise exception 'O corretor responsável precisa ser da equipe da imobiliária.' using errcode = '23514';
  end if;
  if tg_op = 'UPDATE' and new.agency_id <> old.agency_id then
    raise exception 'Um imóvel não pode mudar de imobiliária.' using errcode = '23514';
  end if;
  if new.status = 'publicado' and (tg_op = 'INSERT' or old.status <> 'publicado') then
    new.published_at := now();
  end if;
  return new;
end;
$$;
create trigger properties_before_write before insert or update on public.properties
  for each row execute function public.properties_before_write();

-- Cálculo do selo. Fonte única da regra no banco; a tela mostra o mesmo checklist.
create function public.compute_property_seal(p_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((
    select
      (select count(*) from public.property_photos f where f.property_id = p.id) >= r.min_photos
      and p.area_m2 is not null
      and p.price is not null
      and p.condo_fee is not null
      and p.iptu_monthly is not null
      and char_length(coalesce(btrim(p.description), '')) >= r.min_description_chars
      and p.pin_confirmed
    from public.properties p, public.seal_rules r
    where p.id = p_id and r.id = 1
  ), false);
$$;

-- Recalcula depois da gravação (para enxergar os valores novos) sem recursão infinita.
create function public.properties_after_write_seal() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v boolean := public.compute_property_seal(new.id);
begin
  if v is distinct from new.has_seal then
    update public.properties set has_seal = v where id = new.id;
  end if;
  return null;
end;
$$;
create trigger properties_after_write_seal after insert or update on public.properties
  for each row execute function public.properties_after_write_seal();

create function public.photos_after_change_seal() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  pid uuid := coalesce(new.property_id, old.property_id);
  v boolean := public.compute_property_seal(pid);
begin
  update public.properties set has_seal = v where id = pid and has_seal is distinct from v;
  return null;
end;
$$;
create trigger photos_after_change_seal after insert or update or delete on public.property_photos
  for each row execute function public.photos_after_change_seal();

-- Mudança na regra recalcula todos os imóveis.
create function public.seal_rules_after_update() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.properties p set has_seal = public.compute_property_seal(p.id)
  where p.has_seal is distinct from public.compute_property_seal(p.id);
  return null;
end;
$$;
create trigger seal_rules_after_update after update on public.seal_rules
  for each statement execute function public.seal_rules_after_update();

-- Políticas de imóveis
create policy "todos leem imóveis publicados de imobiliárias aprovadas" on public.properties
  for select using (status = 'publicado' and public.is_agency_approved(agency_id));
create policy "membro lê todos os imóveis da própria imobiliária" on public.properties
  for select to authenticated using (public.is_agency_member(agency_id) or public.is_platform_admin());
create policy "membro cadastra imóvel na própria imobiliária aprovada" on public.properties
  for insert to authenticated
  with check (public.is_agency_member(agency_id) and public.is_agency_approved(agency_id));
create policy "membro edita imóvel da própria imobiliária aprovada" on public.properties
  for update to authenticated
  using (public.is_agency_member(agency_id) and public.is_agency_approved(agency_id))
  with check (public.is_agency_member(agency_id) and public.is_agency_approved(agency_id));
create policy "gestor exclui imóvel" on public.properties
  for delete to authenticated using (public.is_agency_manager(agency_id));

-- Políticas de fotos: seguem as do imóvel.
create function public.can_edit_property(p_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.properties p
    where p.id = p_id and public.is_agency_member(p.agency_id) and public.is_agency_approved(p.agency_id)
  );
$$;

create policy "fotos visíveis com o imóvel" on public.property_photos
  for select using (exists (select 1 from public.properties p where p.id = property_id));
create policy "membro adiciona fotos" on public.property_photos
  for insert to authenticated with check (public.can_edit_property(property_id));
create policy "membro edita fotos" on public.property_photos
  for update to authenticated
  using (public.can_edit_property(property_id)) with check (public.can_edit_property(property_id));
create policy "membro remove fotos" on public.property_photos
  for delete to authenticated using (public.can_edit_property(property_id));

-- ---------------------------------------------------------------------------------------------------
-- Funções de negócio
-- ---------------------------------------------------------------------------------------------------

-- Cadastro de parceiro: cria a imobiliária (pendente) e o usuário atual como gestor.
create function public.register_agency(
  p_legal_name text, p_cnpj text, p_creci text, p_manager_name text, p_whatsapp text
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_id uuid;
begin
  if v_uid is null or v_email = '' then
    raise exception 'Entre com seu e-mail antes de cadastrar a imobiliária.' using errcode = '42501';
  end if;
  if exists (select 1 from public.agency_members where user_id = v_uid and active) then
    raise exception 'Este e-mail já faz parte de uma imobiliária.' using errcode = '23505';
  end if;
  insert into public.agencies (legal_name, cnpj, creci, manager_name, manager_email, whatsapp, created_by)
  values (btrim(p_legal_name), p_cnpj, btrim(p_creci), btrim(p_manager_name), v_email, p_whatsapp, v_uid)
  returning id into v_id;
  insert into public.agency_members (agency_id, user_id, role, name, email)
  values (v_id, v_uid, 'gestor', btrim(p_manager_name), v_email);
  return v_id;
end;
$$;

-- Aprovação pelo admin da Konexya.
create function public.review_agency(p_agency uuid, p_status public.agency_status) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Apenas o admin da Konexya revisa imobiliárias.' using errcode = '42501';
  end if;
  if p_status = 'pendente' then
    raise exception 'Escolha aprovar, recusar ou suspender.' using errcode = '22023';
  end if;
  update public.agencies
  set status = p_status, reviewed_at = now(), reviewed_by = auth.uid()
  where id = p_agency;
  if not found then
    raise exception 'Imobiliária não encontrada.' using errcode = 'P0002';
  end if;
end;
$$;

-- Convite: o gestor gera; o token em claro só existe na resposta (no banco fica o hash).
create function public.create_agency_invite(p_agency uuid, p_email text, p_role public.member_role)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_token text := encode(extensions.gen_random_bytes(24), 'hex');
  v_email text := lower(btrim(p_email));
begin
  if not public.is_agency_manager(p_agency) then
    raise exception 'Apenas o gestor convida pessoas para a equipe.' using errcode = '42501';
  end if;
  if not public.is_agency_approved(p_agency) then
    raise exception 'A imobiliária ainda não foi aprovada.' using errcode = '42501';
  end if;
  if exists (
    select 1 from public.agency_members m join auth.users u on u.id = m.user_id
    where m.agency_id = p_agency and lower(u.email) = v_email
  ) then
    raise exception 'Esta pessoa já faz parte da equipe.' using errcode = '23505';
  end if;
  -- Um convite pendente por e-mail: o novo substitui o anterior.
  delete from public.agency_invites where agency_id = p_agency and email = v_email and accepted_at is null;
  insert into public.agency_invites (agency_id, email, role, token_hash, created_by)
  values (p_agency, v_email, p_role, encode(extensions.digest(v_token, 'sha256'), 'hex'), auth.uid());
  return v_token;
end;
$$;

-- Aceite: o e-mail da sessão precisa ser o do convite.
create function public.accept_agency_invite(p_token text, p_name text, p_creci text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_inv public.agency_invites;
begin
  if v_uid is null then
    raise exception 'Entre com seu e-mail para aceitar o convite.' using errcode = '42501';
  end if;
  select * into v_inv from public.agency_invites
  where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
  for update;
  if not found or v_inv.accepted_at is not null then
    raise exception 'Convite inválido ou já usado.' using errcode = 'P0002';
  end if;
  if v_inv.expires_at < now() then
    raise exception 'Este convite expirou. Peça ao gestor para reenviar.' using errcode = '22023';
  end if;
  if v_inv.email <> v_email then
    raise exception 'Este convite foi enviado para outro e-mail.' using errcode = '42501';
  end if;
  if exists (select 1 from public.agency_members where user_id = v_uid and active and agency_id <> v_inv.agency_id) then
    raise exception 'Este e-mail já faz parte de outra imobiliária.' using errcode = '23505';
  end if;
  insert into public.agency_members (agency_id, user_id, role, name, email, creci)
  values (v_inv.agency_id, v_uid, v_inv.role, btrim(p_name), v_email, nullif(btrim(p_creci), ''))
  on conflict (agency_id, user_id) do update set active = true, role = excluded.role;
  update public.agency_invites set accepted_at = now() where id = v_inv.id;
  return v_inv.agency_id;
end;
$$;

-- Dados públicos da ficha: imóvel publicado + imobiliária e corretor responsáveis (CRECI obrigatório
-- no anúncio). Não expõe e-mails nem a tabela de equipe.
create function public.property_public_info(p_id uuid)
returns table (agency_name text, agency_creci text, broker_name text, broker_creci text)
language sql stable security definer set search_path = '' as $$
  select a.legal_name, a.creci, m.name, m.creci
  from public.properties p
  join public.agencies a on a.id = p.agency_id and a.status = 'aprovada'
  left join public.agency_members m on m.agency_id = p.agency_id and m.user_id = p.broker_id
  where p.id = p_id and (p.status = 'publicado' or public.is_agency_member(p.agency_id));
$$;

-- ---------------------------------------------------------------------------------------------------
-- Permissões da API (nada é exposto sem GRANT)
-- ---------------------------------------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;

grant select on public.properties, public.property_photos, public.seal_rules to anon, authenticated;
-- Colunas calculadas (has_seal, published_at) e a imobiliária dona não são graváveis pela API.
grant insert (agency_id, broker_id, external_ref, title, purpose, type, street, street_number, complement, neighborhood, city, state, postal_code, lat, lng, pin_confirmed, price, condo_fee, iptu_monthly, area_m2, bedrooms, suites, bathrooms, parking_spots, pets, furnished, floor, view, amenities, description, tour_url, status) on public.properties to authenticated;
grant update (broker_id, external_ref, title, purpose, type, street, street_number, complement, neighborhood, city, state, postal_code, lat, lng, pin_confirmed, price, condo_fee, iptu_monthly, area_m2, bedrooms, suites, bathrooms, parking_spots, pets, furnished, floor, view, amenities, description, tour_url, status) on public.properties to authenticated;
grant delete on public.properties to authenticated;
grant insert, update, delete on public.property_photos to authenticated;
grant select on public.platform_admins to authenticated;
grant select, insert, update, delete on public.client_profiles to authenticated;
grant select, insert on public.consents to authenticated;
grant select on public.agencies to authenticated;
grant select, update (role, creci, active, in_rotation) on public.agency_members to authenticated;
grant select, delete on public.agency_invites to authenticated;
grant update (min_photos, min_description_chars) on public.seal_rules to authenticated;

grant execute on function public.is_platform_admin() to authenticated;
grant execute on function public.is_agency_member(uuid) to anon, authenticated;
grant execute on function public.is_agency_manager(uuid) to authenticated;
grant execute on function public.is_agency_approved(uuid) to anon, authenticated;
grant execute on function public.can_edit_property(uuid) to authenticated;
grant execute on function public.compute_property_seal(uuid) to anon, authenticated;
grant execute on function public.register_agency(text, text, text, text, text) to authenticated;
grant execute on function public.review_agency(uuid, public.agency_status) to authenticated;
grant execute on function public.create_agency_invite(uuid, text, public.member_role) to authenticated;
grant execute on function public.accept_agency_invite(text, text, text) to authenticated;
grant execute on function public.property_public_info(uuid) to anon, authenticated;

-- Funções usadas só por gatilhos não são chamáveis pela API.
revoke execute on function public.set_updated_at(), public.properties_before_write(),
  public.properties_after_write_seal(),
  public.photos_after_change_seal(), public.seal_rules_after_update() from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------------
-- Storage: fotos dos imóveis. Leitura pública (as URLs não são adivinháveis); escrita só por membros
-- da imobiliária dona do imóvel. Caminho: {agency_id}/{property_id}/{arquivo}
-- ---------------------------------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('imoveis', 'imoveis', true, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "membro envia fotos do imóvel" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'imoveis'
    and public.can_edit_property(((storage.foldername(name))[2])::uuid)
    and (storage.foldername(name))[1] = (
      select p.agency_id::text from public.properties p where p.id = ((storage.foldername(name))[2])::uuid
    )
  );
create policy "membro remove fotos do imóvel" on storage.objects
  for delete to authenticated
  using (bucket_id = 'imoveis' and public.can_edit_property(((storage.foldername(name))[2])::uuid));
