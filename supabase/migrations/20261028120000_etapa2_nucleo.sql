-- Etapa 2 — núcleo de valor: perfil do cliente montado na conversa, recomendações, consentimento por
-- imobiliária, lead com retrato do perfil, rodízio, conversa cliente–corretor, assistente virtual da
-- imobiliária (docs/DECISOES.md), sugestões da IA e tempo até a primeira resposta humana.
--
-- Princípios (docs/PLANO.md, seção 3):
--   * A imobiliária nunca lê as tabelas do cliente. Recebe leads.profile_snapshot, gravado no
--     consentimento e atualizado só enquanto ele estiver ativo.
--   * O que a IA ou o sistema escrevem para o lead (assistente, avisos, resumo, sugestões, log) é gravado
--     pelo servidor com a chave secreta (papel service_role), nunca pelo navegador.
--   * Nenhuma mensagem sai em nome do corretor sem que ele mesmo a envie (regra 3).

-- ---------------------------------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------------------------------
create type public.client_purpose as enum ('comprar', 'alugar');
create type public.client_goal as enum ('morar', 'investir', 'ambos');
create type public.client_property_kind as enum ('apartamento', 'casa', 'tanto_faz');
create type public.client_lifestyle as enum ('tranquilidade', 'meio_termo', 'movimento');
create type public.client_pets as enum ('nenhum', 'pequeno', 'grande');
create type public.client_timeline as enum ('ate_3_meses', 'ate_6_meses', 'pesquisando');
create type public.chat_author as enum ('cliente', 'ia', 'sistema');
create type public.lead_stage as enum (
  'novo', 'em_atendimento', 'qualificado', 'visita_agendada', 'proposta', 'negociacao', 'fechado', 'perdido'
);
create type public.lost_reason as enum ('preco', 'localizacao', 'desistiu', 'comprou_com_outro', 'sem_resposta', 'outro');
create type public.message_sender as enum ('cliente', 'corretor', 'assistente', 'sistema');
create type public.suggestion_status as enum ('pendente', 'aprovada', 'editada', 'descartada');
create type public.question_status as enum ('encaminhada', 'respondida');
create type public.distribution_mode as enum ('rodizio', 'manual');

-- ---------------------------------------------------------------------------------------------------
-- Perfil do cliente (preenchido pela conversa e editável em C-05)
-- ---------------------------------------------------------------------------------------------------
alter table public.client_profiles
  add column purpose public.client_purpose,
  add column goal public.client_goal,
  add column budget_min numeric(14, 2) check (budget_min is null or budget_min >= 0),
  add column budget_max numeric(14, 2) check (budget_max is null or budget_max > 0),
  add column property_kind public.client_property_kind,
  add column bedrooms_min smallint check (bedrooms_min is null or bedrooms_min between 0 and 10),
  add column parking_min smallint check (parking_min is null or parking_min between 0 and 10),
  add column priorities text[] not null default '{}'
    check (priorities <@ array['servicos_a_pe', 'praia', 'lazer_no_predio']),
  add column work_neighborhood text check (work_neighborhood is null or char_length(btrim(work_neighborhood)) between 2 and 60),
  add column works_from_home boolean,
  add column commute_max_min smallint check (commute_max_min is null or commute_max_min between 5 and 180),
  add column lifestyle public.client_lifestyle,
  add column has_children boolean,
  add column pets public.client_pets,
  add column timeline public.client_timeline,
  add column neighborhoods text[] not null default '{}' check (cardinality(neighborhoods) <= 10),
  add column extras text[] not null default '{}' check (cardinality(extras) <= 8),
  add constraint client_profiles_budget_order check (budget_min is null or budget_max is null or budget_min <= budget_max);

-- Conversa do cliente com a IA da Konexya (C-04). Só o próprio cliente lê.
create table public.profile_chat_messages (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  author public.chat_author not null,
  body text not null check (char_length(body) between 1 and 4000),
  quick_replies text[] not null default '{}',
  -- Cartões de recomendação: [{ "property_id": uuid, "score": int }]
  cards jsonb check (cards is null or jsonb_typeof(cards) = 'array'),
  created_at timestamptz not null default now()
);
alter table public.profile_chat_messages enable row level security;
create index profile_chat_messages_user_idx on public.profile_chat_messages (user_id, id);

create policy "cliente lê a própria conversa" on public.profile_chat_messages
  for select to authenticated using (user_id = auth.uid());
create policy "cliente grava na própria conversa" on public.profile_chat_messages
  for insert to authenticated with check (user_id = auth.uid());

-- Imóveis vistos e salvos (base do "imóveis vistos e salvos" do lead)
create table public.property_views (
  user_id uuid not null references auth.users (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  first_viewed_at timestamptz not null default now(),
  last_viewed_at timestamptz not null default now(),
  primary key (user_id, property_id)
);
alter table public.property_views enable row level security;
create policy "cliente lê os próprios vistos" on public.property_views
  for select to authenticated using (user_id = auth.uid());

create function public.mark_property_viewed(p_property uuid) returns void
language sql security definer set search_path = '' as $$
  insert into public.property_views (user_id, property_id)
  select auth.uid(), p.id from public.properties p
  where p.id = p_property and p.status = 'publicado' and auth.uid() is not null
  on conflict (user_id, property_id) do update set last_viewed_at = now();
$$;

create table public.favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, property_id)
);
alter table public.favorites enable row level security;
create policy "cliente lê os próprios salvos" on public.favorites
  for select to authenticated using (user_id = auth.uid());
create policy "cliente salva" on public.favorites
  for insert to authenticated with check (user_id = auth.uid());
create policy "cliente tira dos salvos" on public.favorites
  for delete to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------------------------------------
-- Configurações (uma linha só): pesos da nota, limite diário de IA, bônus do selo, nota mínima de alerta
-- ---------------------------------------------------------------------------------------------------
create table public.platform_settings (
  id smallint primary key default 1 check (id = 1),
  score_weights jsonb not null default
    '{"orcamento": 30, "tipo": 15, "quartos": 15, "vagas": 10, "pets": 15, "localizacao": 15, "lazer": 10}'::jsonb
    check (jsonb_typeof(score_weights) = 'object'),
  score_weights_version smallint not null default 1,
  seal_rank_bonus smallint not null default 2 check (seal_rank_bonus between 0 and 10),
  ai_daily_limit smallint not null default 60 check (ai_daily_limit between 1 and 1000),
  alert_min_score smallint not null default 85 check (alert_min_score between 0 and 100),
  updated_at timestamptz not null default now()
);
alter table public.platform_settings enable row level security;
insert into public.platform_settings (id) values (1);
create policy "usuários leem as configurações" on public.platform_settings for select to authenticated using (true);
create policy "admin edita as configurações" on public.platform_settings
  for update to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());

-- ---------------------------------------------------------------------------------------------------
-- Assistente virtual da imobiliária (P-10, docs/DECISOES.md)
-- ---------------------------------------------------------------------------------------------------
create table public.agency_assistant_settings (
  agency_id uuid primary key references public.agencies (id) on delete cascade,
  enabled boolean not null default true,
  name text not null default 'Lia' check (char_length(btrim(name)) between 2 and 30),
  welcome_message text not null check (char_length(btrim(welcome_message)) between 10 and 600),
  farewell_message text not null check (char_length(btrim(farewell_message)) between 10 and 600),
  -- [{ "id": "pagamento" | "c_<uuid>", "kind": "padrao" | "propria", "text": string, "enabled": bool }]
  -- A validação completa (até 8 ligadas, textos) fica no servidor; aqui só o formato e um teto.
  questions jsonb not null check (jsonb_typeof(questions) = 'array' and jsonb_array_length(questions) <= 13),
  distribution public.distribution_mode not null default 'rodizio',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);
alter table public.agency_assistant_settings enable row level security;
create trigger agency_assistant_settings_updated_at before update on public.agency_assistant_settings
  for each row execute function public.set_updated_at();

create function public.default_assistant_questions() returns jsonb
language sql immutable set search_path = '' as $$
  select '[
    {"id": "pagamento", "kind": "padrao", "text": "Como você pretende pagar?", "enabled": true},
    {"id": "credito", "kind": "padrao", "text": "Você já tem crédito aprovado no banco?", "enabled": true},
    {"id": "fgts", "kind": "padrao", "text": "Vai usar o FGTS na compra?", "enabled": true},
    {"id": "vender_imovel", "kind": "padrao", "text": "Você precisa vender outro imóvel para comprar este?", "enabled": false},
    {"id": "horario", "kind": "padrao", "text": "Qual o melhor horário para o corretor falar com você?", "enabled": true}
  ]'::jsonb;
$$;

create function public.agencies_after_insert_assistant() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.agency_assistant_settings (agency_id, welcome_message, farewell_message, questions)
  values (
    new.id,
    'Oi, [nome do cliente]! Sou a [nome da assistente], assistente virtual da ' || new.legal_name
      || '. Um corretor já recebeu seu perfil e vai falar com você em breve. Enquanto isso, posso te fazer algumas perguntas rápidas?',
    'Obrigada, [nome do cliente]! O corretor já tem tudo o que precisa e fala com você em breve.',
    public.default_assistant_questions()
  )
  on conflict (agency_id) do nothing;
  return null;
end;
$$;
create trigger agencies_after_insert_assistant after insert on public.agencies
  for each row execute function public.agencies_after_insert_assistant();

-- Imobiliárias que já existem ganham a configuração padrão.
insert into public.agency_assistant_settings (agency_id, welcome_message, farewell_message, questions)
select
  a.id,
  'Oi, [nome do cliente]! Sou a [nome da assistente], assistente virtual da ' || a.legal_name
    || '. Um corretor já recebeu seu perfil e vai falar com você em breve. Enquanto isso, posso te fazer algumas perguntas rápidas?',
  'Obrigada, [nome do cliente]! O corretor já tem tudo o que precisa e fala com você em breve.',
  public.default_assistant_questions()
from public.agencies a
on conflict (agency_id) do nothing;

create policy "membro lê a configuração da assistente" on public.agency_assistant_settings
  for select to authenticated using (public.is_agency_member(agency_id) or public.is_platform_admin());
create policy "gestor edita a configuração da assistente" on public.agency_assistant_settings
  for update to authenticated
  using (public.is_agency_manager(agency_id)) with check (public.is_agency_manager(agency_id));

-- ---------------------------------------------------------------------------------------------------
-- Leads
-- ---------------------------------------------------------------------------------------------------
-- Consentimentos de compartilhamento passam a ser gravados só pela função share_profile.
-- client_id fica nulo se o cliente excluir a conta: a imobiliária mantém o que já recebeu.
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  client_id uuid references auth.users (id) on delete set null,
  consent_id uuid references public.consents (id) on delete set null,
  broker_id uuid references auth.users (id) on delete set null,
  stage public.lead_stage not null default 'novo',
  lost_reason public.lost_reason,
  lost_note text check (lost_note is null or char_length(lost_note) <= 300),
  client_name text not null,
  profile_snapshot jsonb not null,
  ai_summary text check (ai_summary is null or char_length(ai_summary) <= 1200),
  -- Respostas às perguntas padrão da assistente: { "pagamento": { "value": "...", "label": "...", "at": ts } }
  qualification jsonb not null default '{}'::jsonb check (jsonb_typeof(qualification) = 'object'),
  -- Respostas às perguntas escritas pela imobiliária: [{ "question": "...", "answer": "...", "at": ts }]
  custom_answers jsonb not null default '[]'::jsonb check (jsonb_typeof(custom_answers) = 'array'),
  origin_property_id uuid references public.properties (id) on delete set null,
  interest_property_ids uuid[] not null default '{}',
  assistant_active boolean not null default false,
  -- Perguntas que ainda faltam, na ordem (ids de agency_assistant_settings.questions)
  assistant_queue text[] not null default '{}',
  assistant_finished_at timestamptz,
  created_at timestamptz not null default now(),
  first_human_response_at timestamptz,
  stage_changed_at timestamptz not null default now(),
  consent_revoked_at timestamptz,
  last_message_at timestamptz not null default now(),
  unique (agency_id, client_id),
  check (stage <> 'perdido' or lost_reason is not null)
);
alter table public.leads enable row level security;
create index leads_agency_stage_idx on public.leads (agency_id, stage);
create index leads_broker_idx on public.leads (broker_id);
create index leads_client_idx on public.leads (client_id);

create table public.lead_messages (
  id bigint generated always as identity primary key,
  lead_id uuid not null references public.leads (id) on delete cascade,
  sender public.message_sender not null,
  author_id uuid references auth.users (id) on delete set null,
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  quick_replies text[] not null default '{}',
  created_at timestamptz not null default now(),
  check (author_id is null or sender in ('cliente', 'corretor'))
);
alter table public.lead_messages enable row level security;
create index lead_messages_lead_idx on public.lead_messages (lead_id, id);

create table public.ai_suggestions (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  status public.suggestion_status not null default 'pendente',
  final_body text,
  decided_by uuid references auth.users (id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.ai_suggestions enable row level security;
create index ai_suggestions_lead_idx on public.ai_suggestions (lead_id, created_at desc);

-- "Dúvidas do cliente" que a assistente encaminhou ao corretor
create table public.lead_questions (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  status public.question_status not null default 'encaminhada',
  created_at timestamptz not null default now(),
  answered_at timestamptz
);
alter table public.lead_questions enable row level security;
create index lead_questions_lead_idx on public.lead_questions (lead_id, created_at);

create table public.internal_notes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  author_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);
alter table public.internal_notes enable row level security;
create index internal_notes_lead_idx on public.internal_notes (lead_id, created_at);

-- Registro de toda ação da IA (regra 10) e base do limite diário (regra 11). Só o servidor grava.
create table public.ai_action_log (
  id bigint generated always as identity primary key,
  actor text not null check (actor in ('konexya_chat', 'assistente', 'resumo_lead', 'sugestao_mensagem')),
  client_id uuid references auth.users (id) on delete set null,
  agency_id uuid references public.agencies (id) on delete set null,
  lead_id uuid references public.leads (id) on delete set null,
  model text,
  status text not null check (status in ('ok', 'erro', 'invalido', 'limite')),
  reached_client boolean not null default false,
  input_tokens integer,
  output_tokens integer,
  output jsonb,
  created_at timestamptz not null default now()
);
alter table public.ai_action_log enable row level security;
create index ai_action_log_client_day_idx on public.ai_action_log (client_id, created_at);
create policy "admin lê o log da IA" on public.ai_action_log
  for select to authenticated using (public.is_platform_admin());

-- ---------------------------------------------------------------------------------------------------
-- Funções de acesso ao lead
-- ---------------------------------------------------------------------------------------------------
-- Equipe que atende o lead: gestor da imobiliária ou corretor responsável (ativo).
create function public.is_lead_staff(p_lead uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.leads l
    where l.id = p_lead
      and (public.is_agency_manager(l.agency_id) or (l.broker_id = auth.uid() and public.is_agency_member(l.agency_id)))
  );
$$;

create function public.is_lead_client(p_lead uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.leads l where l.id = p_lead and l.client_id = auth.uid());
$$;

create function public.is_lead_open(p_lead uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.leads l where l.id = p_lead and l.consent_revoked_at is null and l.client_id is not null
  );
$$;

create policy "equipe lê os leads que atende" on public.leads
  for select to authenticated
  using (
    public.is_agency_manager(agency_id)
    or (broker_id = auth.uid() and public.is_agency_member(agency_id))
    or public.is_platform_admin()
  );
create policy "equipe atualiza os leads que atende" on public.leads
  for update to authenticated
  using (public.is_agency_manager(agency_id) or (broker_id = auth.uid() and public.is_agency_member(agency_id)))
  with check (public.is_agency_manager(agency_id) or (broker_id = auth.uid() and public.is_agency_member(agency_id)));

create policy "cliente e equipe leem as mensagens" on public.lead_messages
  for select to authenticated
  using (public.is_lead_client(lead_id) or public.is_lead_staff(lead_id) or public.is_platform_admin());
-- Regra 3: o cliente escreve como cliente; só a equipe do lead escreve como corretor, com o próprio usuário.
-- Assistente e avisos do sistema só pelo servidor (service_role).
create policy "cliente escreve como cliente" on public.lead_messages
  for insert to authenticated
  with check (sender = 'cliente' and author_id = auth.uid() and public.is_lead_client(lead_id) and public.is_lead_open(lead_id));
create policy "equipe escreve como corretor" on public.lead_messages
  for insert to authenticated
  with check (sender = 'corretor' and author_id = auth.uid() and public.is_lead_staff(lead_id) and public.is_lead_open(lead_id));

create policy "equipe lê as sugestões" on public.ai_suggestions
  for select to authenticated using (public.is_lead_staff(lead_id) or public.is_platform_admin());
create policy "equipe decide as sugestões" on public.ai_suggestions
  for update to authenticated using (public.is_lead_staff(lead_id)) with check (public.is_lead_staff(lead_id));

create policy "equipe lê as dúvidas" on public.lead_questions
  for select to authenticated using (public.is_lead_staff(lead_id) or public.is_platform_admin());
create policy "equipe marca dúvidas como respondidas" on public.lead_questions
  for update to authenticated using (public.is_lead_staff(lead_id)) with check (public.is_lead_staff(lead_id));

create policy "equipe lê as anotações" on public.internal_notes
  for select to authenticated using (public.is_lead_staff(lead_id) or public.is_platform_admin());
create policy "equipe anota" on public.internal_notes
  for insert to authenticated with check (author_id = auth.uid() and public.is_lead_staff(lead_id));

-- ---------------------------------------------------------------------------------------------------
-- Gatilhos do lead
-- ---------------------------------------------------------------------------------------------------
-- Troca de corretor só pelo gestor e só para alguém ativo da equipe; data da mudança de etapa.
create function public.leads_before_update() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.broker_id is distinct from old.broker_id then
    if auth.role() = 'authenticated' and not public.is_agency_manager(old.agency_id) then
      raise exception 'Só o gestor troca o corretor responsável.' using errcode = '42501';
    end if;
    if new.broker_id is not null and not exists (
      select 1 from public.agency_members
      where agency_id = old.agency_id and user_id = new.broker_id and active
    ) then
      raise exception 'O corretor precisa ser da equipe da imobiliária.' using errcode = '23514';
    end if;
  end if;
  if new.stage is distinct from old.stage then
    new.stage_changed_at := now();
    if new.stage <> 'perdido' then
      new.lost_reason := null;
      new.lost_note := null;
    end if;
  end if;
  return new;
end;
$$;
create trigger leads_before_update before update on public.leads
  for each row execute function public.leads_before_update();

-- Mensagem do corretor: registra a primeira resposta humana (métrica central), tira o lead de "Novo"
-- e desliga a assistente (ela para quando o corretor envia a primeira mensagem).
create function public.lead_messages_after_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.leads l set
    last_message_at = new.created_at,
    first_human_response_at = case
      when new.sender = 'corretor' and l.first_human_response_at is null then new.created_at
      else l.first_human_response_at end,
    stage = case when new.sender = 'corretor' and l.stage = 'novo' then 'em_atendimento' else l.stage end,
    stage_changed_at = case when new.sender = 'corretor' and l.stage = 'novo' then now() else l.stage_changed_at end,
    assistant_active = case when new.sender = 'corretor' then false else l.assistant_active end
  where l.id = new.lead_id;
  if new.sender = 'corretor' then
    update public.lead_questions set status = 'respondida', answered_at = now()
    where lead_id = new.lead_id and status = 'encaminhada' and created_at <= new.created_at;
  end if;
  return null;
end;
$$;
create trigger lead_messages_after_insert after insert on public.lead_messages
  for each row execute function public.lead_messages_after_insert();

create function public.ai_suggestions_before_update() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status is distinct from old.status and old.status <> 'pendente' then
    raise exception 'Esta sugestão já foi decidida.' using errcode = '22023';
  end if;
  if new.status is distinct from old.status then
    new.decided_by := auth.uid();
    new.decided_at := now();
  end if;
  return new;
end;
$$;
create trigger ai_suggestions_before_update before update on public.ai_suggestions
  for each row execute function public.ai_suggestions_before_update();

-- ---------------------------------------------------------------------------------------------------
-- Retrato do perfil (o que a imobiliária recebe). Sem endereços: só bairros e preferências.
-- ---------------------------------------------------------------------------------------------------
create function public.build_profile_snapshot(p_user uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'name', c.name,
    'purpose', c.purpose,
    'goal', c.goal,
    'budget_min', c.budget_min,
    'budget_max', c.budget_max,
    'property_kind', c.property_kind,
    'bedrooms_min', c.bedrooms_min,
    'parking_min', c.parking_min,
    'priorities', to_jsonb(c.priorities),
    'work_neighborhood', c.work_neighborhood,
    'works_from_home', c.works_from_home,
    'commute_max_min', c.commute_max_min,
    'lifestyle', c.lifestyle,
    'has_children', c.has_children,
    'pets', c.pets,
    'timeline', c.timeline,
    'neighborhoods', to_jsonb(c.neighborhoods),
    'extras', to_jsonb(c.extras),
    'updated_at', c.updated_at
  )
  from public.client_profiles c
  where c.user_id = p_user;
$$;

-- Enquanto o consentimento estiver ativo, o retrato acompanha o perfil (regra 1).
create function public.client_profiles_after_update_snapshot() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.leads l
  set profile_snapshot = public.build_profile_snapshot(new.user_id),
      client_name = coalesce(new.name, l.client_name)
  where l.client_id = new.user_id and l.consent_revoked_at is null;
  return null;
end;
$$;
create trigger client_profiles_after_update_snapshot after update on public.client_profiles
  for each row execute function public.client_profiles_after_update_snapshot();

-- ---------------------------------------------------------------------------------------------------
-- Rodízio: corretor ativo, no rodízio, que recebeu lead há mais tempo (ou nunca recebeu).
-- ---------------------------------------------------------------------------------------------------
create function public.pick_broker(p_agency uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid;
begin
  if (select distribution from public.agency_assistant_settings where agency_id = p_agency) = 'manual' then
    return null;
  end if;
  select user_id into v_uid from public.agency_members
  where agency_id = p_agency and active and in_rotation
  order by last_lead_at nulls first, created_at, user_id
  limit 1
  for update;
  if v_uid is not null then
    update public.agency_members set last_lead_at = now() where agency_id = p_agency and user_id = v_uid;
  end if;
  return v_uid;
end;
$$;

-- ---------------------------------------------------------------------------------------------------
-- Consentimento (C-10, fluxo F4) e revogação (C-05)
-- ---------------------------------------------------------------------------------------------------
create function public.share_profile(p_property uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_prop public.properties;
  v_agency public.agencies;
  v_profile public.client_profiles;
  v_settings public.agency_assistant_settings;
  v_lead public.leads;
  v_consent uuid;
  v_snapshot jsonb;
  v_queue text[];
begin
  if v_uid is null then
    raise exception 'Entre na sua conta para falar com o corretor.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.consents where user_id = v_uid and kind = 'termos' and revoked_at is null) then
    raise exception 'Aceite os termos de uso antes de continuar.' using errcode = '42501';
  end if;
  select * into v_profile from public.client_profiles where user_id = v_uid;
  if not found or v_profile.name is null then
    raise exception 'Conte como podemos te chamar antes de continuar.' using errcode = '22023';
  end if;
  select * into v_prop from public.properties where id = p_property and status = 'publicado';
  if not found then
    raise exception 'Este imóvel não está mais disponível.' using errcode = 'P0002';
  end if;
  select * into v_agency from public.agencies where id = v_prop.agency_id and status = 'aprovada';
  if not found then
    raise exception 'Este imóvel não está mais disponível.' using errcode = 'P0002';
  end if;

  select * into v_lead from public.leads where agency_id = v_agency.id and client_id = v_uid for update;

  -- Já compartilhado e ativo: só acrescenta o imóvel à lista de interesse.
  if found and v_lead.consent_revoked_at is null then
    update public.leads
    set interest_property_ids = case
      when p_property = any (interest_property_ids) then interest_property_ids
      else interest_property_ids || p_property end
    where id = v_lead.id;
    return v_lead.id;
  end if;

  v_snapshot := public.build_profile_snapshot(v_uid);
  insert into public.consents (user_id, kind, agency_id, document_version, shared_snapshot)
  values (v_uid, 'compartilhamento', v_agency.id, 'v1', jsonb_build_object(
    'perfil', v_snapshot,
    'imovel_de_origem', p_property,
    'itens', jsonb_build_array('perfil', 'imoveis_vistos_e_salvos_desta_imobiliaria', 'conversa_com_a_assistente')
  ))
  returning id into v_consent;

  select * into v_settings from public.agency_assistant_settings where agency_id = v_agency.id;
  -- Fila da assistente: perguntas ligadas, na ordem configurada. Para aluguel, as perguntas de compra
  -- (pagamento, crédito, FGTS, vender outro imóvel) não fazem sentido.
  select coalesce(array_agg(q ->> 'id' order by ord), '{}') into v_queue
  from jsonb_array_elements(coalesce(v_settings.questions, '[]'::jsonb)) with ordinality as t(q, ord)
  where (q ->> 'enabled')::boolean
    and not (v_profile.purpose = 'alugar' and q ->> 'id' in ('pagamento', 'credito', 'fgts', 'vender_imovel'));

  if v_lead.id is not null then
    -- Lead que já existiu e teve o consentimento revogado: reabre com o novo consentimento.
    update public.leads set
      consent_id = v_consent,
      consent_revoked_at = null,
      profile_snapshot = v_snapshot,
      client_name = v_profile.name,
      interest_property_ids = case
        when p_property = any (interest_property_ids) then interest_property_ids
        else interest_property_ids || p_property end,
      assistant_active = false,
      last_message_at = now()
    where id = v_lead.id;
  else
    insert into public.leads (
      agency_id, client_id, consent_id, broker_id, client_name, profile_snapshot,
      origin_property_id, interest_property_ids, assistant_active, assistant_queue
    ) values (
      v_agency.id, v_uid, v_consent, public.pick_broker(v_agency.id), v_profile.name, v_snapshot,
      p_property, array[p_property], coalesce(v_settings.enabled, false) and cardinality(v_queue) > 0, v_queue
    )
    returning * into v_lead;
  end if;

  insert into public.lead_messages (lead_id, sender, body)
  values (v_lead.id, 'sistema', 'Você autorizou compartilhar seu perfil com a ' || v_agency.legal_name || '.');
  return v_lead.id;
end;
$$;

create function public.revoke_share(p_agency uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_lead uuid;
begin
  if v_uid is null then
    raise exception 'Entre na sua conta.' using errcode = '42501';
  end if;
  update public.consents set revoked_at = now()
  where user_id = v_uid and kind = 'compartilhamento' and agency_id = p_agency and revoked_at is null;
  update public.leads set consent_revoked_at = now(), assistant_active = false
  where client_id = v_uid and agency_id = p_agency and consent_revoked_at is null
  returning id into v_lead;
  if v_lead is null then
    raise exception 'Seu perfil não está compartilhado com esta imobiliária.' using errcode = 'P0002';
  end if;
  insert into public.lead_messages (lead_id, sender, body)
  values (v_lead, 'sistema', 'O cliente revogou o compartilhamento do perfil. Novos dados não serão enviados.');
end;
$$;

-- Conversas do cliente com as imobiliárias (C-11). O cliente não lê a tabela de leads: recebe só isto.
create function public.my_conversations()
returns table (
  lead_id uuid,
  agency_id uuid,
  agency_name text,
  broker_name text,
  broker_creci text,
  assistant_name text,
  assistant_active boolean,
  origin_property_id uuid,
  revoked boolean,
  shared_at timestamptz,
  last_message_at timestamptz
)
language sql stable security definer set search_path = '' as $$
  select l.id, a.id, a.legal_name, m.name, m.creci, s.name, l.assistant_active, l.origin_property_id,
    l.consent_revoked_at is not null, c.granted_at, l.last_message_at
  from public.leads l
  join public.agencies a on a.id = l.agency_id
  left join public.agency_members m on m.agency_id = l.agency_id and m.user_id = l.broker_id
  left join public.agency_assistant_settings s on s.agency_id = l.agency_id
  left join public.consents c on c.id = l.consent_id
  where l.client_id = auth.uid()
  order by l.last_message_at desc;
$$;

-- Imóveis desta imobiliária que o cliente viu e salvou. Só para a equipe do lead e só com consentimento
-- ativo; nunca mostra imóveis de outras imobiliárias.
create function public.lead_property_activity(p_lead uuid)
returns table (property_id uuid, viewed_at timestamptz, saved boolean)
language sql stable security definer set search_path = '' as $$
  select p.id, v.last_viewed_at, f.user_id is not null
  from public.leads l
  join public.properties p on p.agency_id = l.agency_id
  left join public.property_views v on v.property_id = p.id and v.user_id = l.client_id
  left join public.favorites f on f.property_id = p.id and f.user_id = l.client_id
  where l.id = p_lead
    and public.is_lead_staff(p_lead)
    and l.consent_revoked_at is null
    and (v.user_id is not null or f.user_id is not null);
$$;

-- Nomes da equipe do lead (para mostrar quem é o corretor sem expor e-mails).
create function public.agency_team(p_agency uuid)
returns table (user_id uuid, name text, role public.member_role, active boolean, in_rotation boolean)
language sql stable security definer set search_path = '' as $$
  select m.user_id, m.name, m.role, m.active, m.in_rotation
  from public.agency_members m
  where m.agency_id = p_agency and public.is_agency_member(p_agency)
  order by m.name;
$$;

-- ---------------------------------------------------------------------------------------------------
-- Permissões da API
-- ---------------------------------------------------------------------------------------------------
revoke all on public.profile_chat_messages, public.property_views, public.favorites, public.platform_settings,
  public.agency_assistant_settings, public.leads, public.lead_messages, public.ai_suggestions,
  public.lead_questions, public.internal_notes, public.ai_action_log from anon, authenticated;

grant select, insert on public.profile_chat_messages to authenticated;
grant select on public.property_views to authenticated;
grant select, insert, delete on public.favorites to authenticated;
grant select on public.platform_settings to authenticated;
grant update (score_weights, score_weights_version, seal_rank_bonus, ai_daily_limit, alert_min_score)
  on public.platform_settings to authenticated;
grant select, update (enabled, name, welcome_message, farewell_message, questions, distribution, updated_by)
  on public.agency_assistant_settings to authenticated;
grant select, update (stage, lost_reason, lost_note, broker_id) on public.leads to authenticated;
grant select, insert (lead_id, sender, author_id, body) on public.lead_messages to authenticated;
grant select, update (status, final_body) on public.ai_suggestions to authenticated;
grant select, update (status, answered_at) on public.lead_questions to authenticated;
grant select, insert (lead_id, body) on public.internal_notes to authenticated;
grant select on public.ai_action_log to authenticated;

grant update (purpose, goal, budget_min, budget_max, property_kind, bedrooms_min, parking_min, priorities,
  work_neighborhood, works_from_home, commute_max_min, lifestyle, has_children, pets, timeline, neighborhoods,
  extras) on public.client_profiles to authenticated;

grant execute on function public.is_lead_staff(uuid), public.is_lead_client(uuid), public.is_lead_open(uuid)
  to authenticated;
grant execute on function public.mark_property_viewed(uuid), public.share_profile(uuid), public.revoke_share(uuid), public.my_conversations(),
  public.lead_property_activity(uuid), public.agency_team(uuid) to authenticated;

-- Só o servidor (service_role) usa estas.
revoke execute on function public.pick_broker(uuid), public.build_profile_snapshot(uuid),
  public.default_assistant_questions() from public, anon, authenticated;
revoke execute on function public.agencies_after_insert_assistant(), public.leads_before_update(),
  public.lead_messages_after_insert(), public.ai_suggestions_before_update(),
  public.client_profiles_after_update_snapshot() from public, anon, authenticated;

grant all on public.profile_chat_messages, public.property_views, public.favorites, public.platform_settings,
  public.agency_assistant_settings, public.leads, public.lead_messages, public.ai_suggestions,
  public.lead_questions, public.internal_notes, public.ai_action_log to service_role;
grant execute on function public.pick_broker(uuid), public.build_profile_snapshot(uuid) to service_role;
