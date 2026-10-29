-- SÓ NO PROJETO DE TESTE (Supabase xjxfqerqrscejpxqxspw). NUNCA em produção.
-- Movimento de exemplo para demonstração: 30 leads dos últimos 55 dias em várias etapas, conversas,
-- visitas nesta semana, propostas, sugestões da IA e visualizações/salvos dos imóveis [EXEMPLO].
-- Tudo marcado: clientes com "(exemplo)" no nome e e-mail @exemplo.invalid.
-- Pré-requisito: rodar antes o teste-imoveis.sql (imóveis [EXEMPLO]).
-- Uso: SQL Editor do projeto de teste > colar > Run. Para apagar: teste-demonstracao-apagar.sql.
do $$
declare
  v_email text := '28s.patricio28+imob@gmail.com';
  v_agency uuid;
  v_members uuid[];
  v_props uuid[];
  v_titles text[];
  v_names text[] := array[
    'Marina Souza', 'Rafael Duarte', 'Júlia Sampaio', 'Otto Ramalho', 'Bia Lins', 'Davi Holanda', 'Ana Clara Mota',
    'Pedro Arruda', 'Larissa Bezerra', 'Caio Matos', 'Renata Freire', 'Thiago Pinheiro', 'Camila Rocha', 'Lucas Veras',
    'Fernanda Aguiar', 'Gustavo Leitão', 'Patrícia Mendes', 'Bruno Cavalcante', 'Isabela Nogueira', 'Felipe Moura',
    'Natália Barreto', 'Rodrigo Sales', 'Aline Castro', 'Marcelo Brito', 'Vanessa Lima', 'Diego Teixeira',
    'Priscila Gomes', 'André Holanda', 'Tatiana Viana', 'Henrique Costa'];
  -- Etapa final de cada lead (os mais antigos andaram mais).
  v_stages text[] := array[
    'novo', 'novo', 'em_atendimento', 'novo', 'em_atendimento', 'qualificado', 'em_atendimento', 'perdido',
    'qualificado', 'visita_agendada', 'em_atendimento', 'visita_agendada', 'qualificado', 'perdido', 'visita_agendada',
    'proposta', 'em_atendimento', 'qualificado', 'perdido', 'proposta', 'negociacao', 'visita_agendada', 'perdido',
    'fechado', 'negociacao', 'qualificado', 'perdido', 'fechado', 'proposta', 'fechado'];
  v_reasons text[] := array['preco', 'comprou_com_outro', 'preco', 'sem_resposta', 'localizacao', 'desistiu'];
  v_hoods text[] := array['Aldeota', 'Meireles', 'Cocó', 'Varjota', 'Dionísio Torres', 'Fátima'];
  v_pay text[] := array['Financiamento', 'Financiamento com FGTS', 'À vista', 'Ainda não sei'];
  i int;
  n int;
  v_user uuid;
  v_lead uuid;
  v_created timestamptz;
  v_first timestamptz;
  v_t timestamptz;
  v_stage text;
  v_path text[];
  v_step int;
  v_prop uuid;
  v_price numeric;
  v_body text;
  v_lost int := 0;
  v_monday date;
  v_visit_no int := 0;
  v_conflict_broker uuid;
  v_broker uuid;
begin
  select id into v_agency from public.agencies where manager_email = v_email and status = 'aprovada';
  if v_agency is null then
    raise exception 'Imobiliária de teste não encontrada ou não aprovada.';
  end if;
  if exists (select 1 from public.leads where agency_id = v_agency and client_name like '%(exemplo)') then
    raise notice 'O movimento de exemplo já existe. Para recriar, rode antes o teste-demonstracao-apagar.sql.';
    return;
  end if;
  select array_agg(user_id order by role desc, name) into v_members from public.agency_members where agency_id = v_agency and active;
  select array_agg(id order by title), array_agg(title order by title) into v_props, v_titles
  from public.properties where agency_id = v_agency and title like '[EXEMPLO]%' and purpose = 'venda' and status = 'publicado';
  if v_props is null then
    raise exception 'Rode antes o teste-imoveis.sql (imóveis [EXEMPLO]).';
  end if;
  perform setseed(0.42);
  v_monday := (now() at time zone 'America/Fortaleza')::date;

  for i in 1 .. array_length(v_names, 1) loop
    -- Cliente de exemplo (sem login real: e-mail inválido de propósito).
    v_user := gen_random_uuid();
    insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, created_at, updated_at)
    values (v_user, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'cliente.exemplo' || lpad(i::text, 2, '0') || '@exemplo.invalid', now(), now(), now());

    -- Chegada: leads novos são recentes; horário quase sempre comercial, alguns à noite.
    v_stage := v_stages[i];
    v_created := ((date_trunc('day', now() at time zone 'America/Fortaleza')
      - make_interval(days => case when v_stage = 'novo' then (i % 2) else 1 + floor(random() * 54)::int end)
      + make_interval(hours => case when i % 6 = 0 then 19 + (i % 4) else 8 + floor(random() * 10)::int end,
                      mins => floor(random() * 60)::int)) at time zone 'America/Fortaleza');
    if v_created > now() - interval '20 minutes' then v_created := now() - interval '3 hours'; end if;
    v_prop := v_props[1 + (i % array_length(v_props, 1))];
    select price into v_price from public.properties where id = v_prop;

    insert into public.leads (agency_id, client_id, broker_id, stage, lost_reason, client_name, profile_snapshot, qualification,
      origin_property_id, interest_property_ids, assistant_active, assistant_finished_at, created_at, stage_changed_at, last_message_at)
    values (v_agency, v_user, v_members[1 + (i % array_length(v_members, 1))], v_stage::public.lead_stage,
      case when v_stage = 'perdido' then v_reasons[1 + (v_lost % array_length(v_reasons, 1))]::public.lost_reason end,
      v_names[i] || ' (exemplo)',
      jsonb_build_object('name', split_part(v_names[i], ' ', 1), 'purpose', 'comprar', 'property_kind', 'apartamento',
        'budget_max', (700 + 100 * (i % 5)) * 1000, 'bedrooms_min', 2 + (i % 2), 'parking_min', 1,
        'pets', case when i % 3 = 0 then 'grande' when i % 3 = 1 then 'nenhum' end,
        'neighborhoods', jsonb_build_array(v_hoods[1 + (i % 6)], v_hoods[1 + ((i + 2) % 6)]),
        'timeline', case when i % 2 = 0 then 'ate_3_meses' else 'ate_6_meses' end),
      case when i % 4 <> 0 then jsonb_build_object('pagamento', jsonb_build_object('value', v_pay[1 + (i % 4)], 'label', v_pay[1 + (i % 4)], 'at', v_created + interval '2 minutes'))
        else '{}'::jsonb end
        || case when i % 3 = 0 then jsonb_build_object('fgts', jsonb_build_object('value', 'Sim', 'label', 'Sim', 'at', v_created + interval '3 minutes')) else '{}'::jsonb end,
      v_prop, array[v_prop], false, v_created + interval '4 minutes', v_created, v_created, v_created)
    returning id into v_lead;
    if v_stage = 'perdido' then v_lost := v_lost + 1; end if;

    -- Conversa: boas-vindas da assistente, pergunta, resposta do cliente e o corretor.
    insert into public.lead_messages (lead_id, sender, body, created_at) values
      (v_lead, 'assistente', 'Oi, ' || split_part(v_names[i], ' ', 1) || '! Sou a assistente virtual da imobiliária. Seu perfil já está com o corretor.', v_created + interval '10 seconds'),
      (v_lead, 'assistente', 'Como você pretende pagar?', v_created + interval '20 seconds');
    if i % 4 <> 0 then
      insert into public.lead_messages (lead_id, sender, body, created_at) values (v_lead, 'cliente', v_pay[1 + (i % 4)], v_created + interval '2 minutes');
    end if;
    if v_stage <> 'novo' then
      -- Primeira resposta humana: a maioria em minutos, algumas demoram.
      v_first := v_created + make_interval(mins => 2 + floor(power(random(), 2.2) * 150)::int);
      v_body := 'Oi, ' || split_part(v_names[i], ' ', 1) || '! Aqui é da imobiliária. Vi que você gostou do '
        || (select title from public.properties where id = v_prop) || '. Quer marcar uma visita?';
      insert into public.lead_messages (lead_id, sender, body, created_at) values (v_lead, 'corretor', v_body, v_first);
      insert into public.ai_suggestions (lead_id, body, status, final_body, decided_at, created_at)
      values (v_lead, v_body,
        (case when i % 5 in (0, 1, 2) then 'aprovada' when i % 5 = 3 then 'editada' else 'descartada' end)::public.suggestion_status,
        case when i % 5 in (0, 1, 2, 3) then v_body end, v_first, v_created + interval '1 minute');
      insert into public.lead_messages (lead_id, sender, body, created_at) values
        (v_lead, 'cliente', 'Quero sim! Pode ser no fim de semana?', v_first + make_interval(mins => 5 + floor(random() * 90)::int));
      if i % 3 <> 0 then
        insert into public.lead_messages (lead_id, sender, body, created_at) values
          (v_lead, 'corretor', 'Combinado, já te mando os horários.', v_first + make_interval(mins => 100 + floor(random() * 200)::int));
      end if;
    end if;
    -- Movimento recente nos leads em aberto (poucos ficam parados há 48 h+; alguns esperam resposta).
    if v_stage in ('em_atendimento', 'qualificado', 'visita_agendada', 'proposta', 'negociacao') and i % 7 <> 0 then
      v_t := greatest(v_created + interval '1 hour', now() - make_interval(hours => 1 + floor(random() * 36)::int));
      if i % 3 = 0 then
        insert into public.lead_messages (lead_id, sender, body, created_at) values (v_lead, 'cliente', 'Consegue me mandar mais fotos da área de lazer?', v_t);
      else
        insert into public.lead_messages (lead_id, sender, body, created_at) values (v_lead, 'cliente', 'Obrigada! Vou ver com a família e te falo.', v_t - interval '30 minutes'),
          (v_lead, 'corretor', 'Perfeito, qualquer dúvida estou por aqui.', v_t);
      end if;
    end if;
    if i in (3, 11) then
      insert into public.lead_questions (lead_id, body, created_at) values (v_lead, 'O condomínio aceita reforma na cozinha?', v_created + interval '5 minutes');
    end if;

    -- Histórico de etapas (o insert gravou só a etapa final; refaz o caminho com datas).
    delete from public.lead_stage_events where lead_id = v_lead;
    v_path := case v_stage
      when 'novo' then array['novo']
      when 'em_atendimento' then array['novo', 'em_atendimento']
      when 'qualificado' then array['novo', 'em_atendimento', 'qualificado']
      when 'visita_agendada' then array['novo', 'em_atendimento', 'qualificado', 'visita_agendada']
      when 'proposta' then array['novo', 'em_atendimento', 'qualificado', 'visita_agendada', 'proposta']
      when 'negociacao' then array['novo', 'em_atendimento', 'qualificado', 'visita_agendada', 'proposta', 'negociacao']
      when 'fechado' then array['novo', 'em_atendimento', 'qualificado', 'visita_agendada', 'proposta', 'negociacao', 'fechado']
      else case i % 3
        when 0 then array['novo', 'em_atendimento', 'perdido']
        when 1 then array['novo', 'em_atendimento', 'qualificado', 'perdido']
        else array['novo', 'em_atendimento', 'qualificado', 'visita_agendada', 'perdido'] end
    end;
    v_t := v_created;
    for v_step in 1 .. array_length(v_path, 1) loop
      if v_step = 2 then v_t := coalesce(v_first, v_t + interval '30 minutes');
      elsif v_step > 2 then v_t := v_t + make_interval(hours => 12 + floor(random() * 84)::int);
      end if;
      if v_t > now() - interval '10 minutes' then v_t := now() - make_interval(mins => 10 + array_length(v_path, 1) - v_step); end if;
      insert into public.lead_stage_events (lead_id, stage, at) values (v_lead, v_path[v_step]::public.lead_stage, v_t);
    end loop;
    update public.leads set stage_changed_at = v_t where id = v_lead;

    -- Visitas: as de "visita agendada" caem nos próximos dias; as que avançaram já foram realizadas.
    if v_stage = 'visita_agendada' then
      -- Próximos dias: duas aguardando confirmação; a 2ª e a 3ª no mesmo horário com o mesmo corretor
      -- (mostra o "Horário duplicado" na agenda).
      v_visit_no := v_visit_no + 1;
      select broker_id into v_broker from public.leads where id = v_lead;
      if v_visit_no = 2 then v_conflict_broker := v_broker; end if;
      if v_visit_no = 3 then
        v_broker := v_conflict_broker;
        update public.leads set broker_id = v_broker where id = v_lead;
      end if;
      insert into public.visits (lead_id, agency_id, broker_id, property_id, starts_at, status, requested_by, confirmed_at)
      values (v_lead, v_agency, v_broker, v_prop,
        ((v_monday + case v_visit_no when 1 then 1 when 2 then 2 when 3 then 2 else 3 end)::timestamp
          + make_interval(hours => case v_visit_no when 1 then 10 when 4 then 11 else 17 end)) at time zone 'America/Fortaleza',
        (case when v_visit_no in (1, 3) then 'pedida' else 'confirmada' end)::public.visit_status, 'cliente',
        case when v_visit_no in (1, 3) then null else now() end);
    elsif v_stage in ('proposta', 'negociacao', 'fechado') or (v_stage = 'perdido' and i % 3 = 2) then
      insert into public.visits (lead_id, agency_id, broker_id, property_id, starts_at, status, requested_by, confirmed_at)
      values (v_lead, v_agency, v_members[1 + (i % array_length(v_members, 1))], v_prop,
        least(v_created + interval '4 days', now() - interval '1 day'),
        (case when v_stage = 'perdido' and i = 23 then 'nao_compareceu' else 'realizada' end)::public.visit_status, 'cliente', v_created + interval '2 days');
    end if;

    -- Propostas.
    if v_stage in ('proposta', 'negociacao', 'fechado') or (v_stage = 'perdido' and i % 3 = 2 and i <> 23) then
      insert into public.proposals (lead_id, agency_id, property_id, amount, status, counter_amount, made_by, forwarded_at, answered_at, client_accepted_at, created_at)
      values (v_lead, v_agency, v_prop, round(v_price * 0.95, -3),
        (case
          when v_stage = 'proposta' and i = 16 then 'recebida'
          when v_stage = 'proposta' then 'encaminhada'
          when v_stage = 'negociacao' then 'contraproposta'
          when v_stage = 'fechado' then 'aceita'
          else 'recusada' end)::public.proposal_status,
        case when v_stage in ('negociacao', 'fechado') then round(v_price * 0.98, -3) end,
        'cliente',
        case when v_stage = 'proposta' and i = 16 then null else least(v_created + interval '6 days', now() - interval '2 hours') end,
        case when v_stage in ('negociacao', 'fechado', 'perdido') then least(v_created + interval '8 days', now() - interval '1 hour') end,
        case when v_stage = 'negociacao' and i = 25 then now() - interval '40 minutes' end,
        least(v_created + interval '5 days', now() - interval '3 hours'));
    end if;

    -- Visualizações e salvos (só totais chegam à imobiliária).
    for n in 1 .. 1 + (i % 4) loop
      insert into public.property_views (user_id, property_id, first_viewed_at, last_viewed_at)
      values (v_user, v_props[1 + ((i + n) % array_length(v_props, 1))], v_created - make_interval(hours => n * 5), v_created)
      on conflict do nothing;
    end loop;
    if i % 2 = 0 then
      insert into public.favorites (user_id, property_id, created_at) values (v_user, v_prop, v_created - interval '1 hour') on conflict do nothing;
    end if;
  end loop;
  raise notice 'Movimento de exemplo criado: % leads.', array_length(v_names, 1);
end $$;
