<!-- Texto extraído automaticamente de PROMPT.pdf. O PDF é o original; tabelas podem ter perdido a formatação. -->

    Prompt para o Claude Code — MVP da Konexya
       Como usar: crie uma pasta para o projeto, coloque dentro dela uma pasta docs/ com os
       arquivos mvp.md e prototipo.html , abra o Claude Code nessa pasta e cole tudo o que
       está abaixo da linha.

    Você vai construir o MVP da Konexya. Antes de escrever qualquer código:

     1. Leia este prompt inteiro.
     2. Leia docs/mvp.md (documento do MVP, a FONTE DA VERDADE para escopo, regras e
       telas).
     3. Abra docs/prototipo.html (protótipo navegável, a REFERÊNCIA VISUAL: layout,
       tipografia, componentes, textos de interface).
     4. Leia docs/PLANO.md . Ele já foi aprovado e tem prioridade sobre este prompt onde os
       dois diferirem (decisões nas seções 6, 7 e 8).
     5. Comece pela etapa 0. Ao fim de cada etapa, pare e espere minha aprovação.

    Quando o documento e o protótipo discordarem, vale o documento. O protótipo foi feito
    antes e mostra coisas que saíram do escopo. As divergências conhecidas estão na seção 5.

    1. Produto e objetivo
    Konexya é um assistente imobiliário com IA. Para a imobiliária, é "o SDR dentro de um
    sistema só": busca, atendimento, qualificação e CRM no mesmo lugar. Para o comprador, é
    um assistente que entende o que ele precisa e encontra o imóvel certo.

    O MVP existe para provar uma tese: a imobiliária responde mais rápido e fecha mais quando
    o lead chega qualificado, no mesmo sistema onde estão os imóveis e o funil. Não é o
    produto final. Piloto em Fortaleza, com 3 a 5 imobiliárias parceiras e leads reais. O que não
    ajuda a provar a tese fica fora.

    Modelo: o cliente usa o app da Konexya (chat com IA, Mapa Vivo, salvos, comparação). Ao
    tocar "Falar com o corretor" e autorizar (LGPD), o lead chega qualificado no painel daquela
    imobiliária. A Konexya NÃO é um bot no WhatsApp da imobiliária, nem um link que o
    corretor manda ao cliente. O WhatsApp serve só para alertas que trazem o usuário de volta
    ao app.
    2. Stack (proponha alternativa só se justificar custo e prazo)
      Front-end: um único PWA em Next.js (App Router) + TypeScript + Tailwind. App do
      cliente em /app , painel da imobiliária em /painel , área interna em /admin , com rotas
      e permissões separadas. Sem apps nativos: um código só.
      Backend e banco: Supabase (Postgres, Auth, Storage, Edge Functions, cron). O
      isolamento entre imobiliárias é garantido por Row Level Security no banco, não só na
      interface.
      IA: API da Anthropic (Claude), chamada sempre no servidor, com saída estruturada (tool
      use / JSON schema) e validação do que voltar antes de gravar. O protótipo já mostra o
      padrão: a IA devolve reply + updates do perfil, e o app valida os valores (ver
       aiPrompt e sanitize no protótipo).

      Mapas e rotas: Google Maps Platform (Maps JS, Places para autocompletar e pontos
      de interesse, Routes para carro e transporte público). O protótipo usa
      Leaflet/OpenStreetMap com dados ilustrativos; troque por dados reais.
      WhatsApp: Cloud API oficial da Meta, somente com templates aprovados.
      E-mail: Resend.
      Hospedagem: Vercel. Ambientes de teste e produção separados desde o início.
      Segredos: todas as chaves em variáveis de ambiente. Nada de chave no código ou no
      repositório.

    3. Modelo de dados (refine e mostre no plano antes de criar)
       users (Supabase Auth) e client_profiles : compra ou aluguel, morar/investir/ambos,
      faixa de valor, tipo, quartos, vagas, prioridades, tempo máximo de trajeto no pico,
      tranquilidade/meio-termo/movimento, filhos, pets (porte), prazo de mudança, extras.
       routine_addresses : rótulo (Trabalho, Escola), endereço, lat/lng. NUNCA são enviados à
      imobiliária; ela recebe só os tempos de deslocamento.
       profile_chat_messages : conversa do cliente com a IA da Konexya.

       agencies : razão social, CNPJ, CRECI jurídico, status (pendente/aprovada).

       agency_members : papel gestor ou corretor, CRECI, ativo, no rodízio.

       agency_ai_settings : permissões, tom (3 opções), distribuição (rodízio ou manual).

       properties : todos os campos de P-07, status (rascunho/publicado/pausado/vendido-
      alugado), corretor responsável, has_seal calculado. property_photos à parte.
       favorites , property_events (visto/salvo/comparado), comparisons (imóveis +
      parecer da IA).
       match_scores : perfil × imóvel, nota e motivos por critério, em cache. commute_cache :
       imóvel × endereço × modo → minutos.
        consents : tipo (termos | compartilhamento com uma imobiliária | WhatsApp), snapshot
       do que foi compartilhado, concedido_em, revogado_em.
        leads : imobiliária, cliente, imóvel de origem, corretor, etapa, prontidão
       (curioso/pesquisando/pronto para visitar), resumo da IA, motivo de perda, created_at ,
        first_human_response_at , stage_changed_at .

        messages (remetente: cliente | corretor | ia_imobiliaria | sistema; texto; anexos) e
        ai_suggestions (pendente/aprovada/editada/descartada).

        visits : horários propostos, horário confirmado, status
       (pedida/confirmada/realizada/não compareceu/cancelada).
        proposals : valor, status, contraproposta. internal_notes .

        notification_log e ai_action_log : auditoria de tudo que a IA ou os alertas enviam.

    4. Telas e fluxos
    As especificações completas (objetivo, layout, ações, estados, textos) estão em
    docs/mvp.md , seções "Mapa de telas" a "Padrões de interface". Os fluxos F1 a F8 devem
    funcionar de ponta a ponta.

    Cliente (celular de 360 a 430 px; no computador, coluna central estreita; 5 abas fixas:
    Conversa, Mapa, Salvos, Corretor, Perfil):
    C-01 Boas-vindas · C-02 Entrar · C-03 Código · C-04 Conversa · C-05 Perfil · C-06 Mapa
    Vivo · C-07 Ficha do imóvel · C-08 Comparação · C-09 Salvos · C-10 Consentimento · C-11
    Corretor.
    No protótipo: splash e login ( renderAuth ), chat com faixa "Seu perfil" ( renderChat ), ficha
    e consentimento ( renderOverlay ), Salvos, Corretor, Perfil e Mapa.

    Painel (computador a partir de 1280 px com menu lateral; no celular, barra inferior, tabelas
    viram cartões, Lead aberto vira abas):
    P-01 Acesso e cadastro de parceiro · P-02 Painel · P-03 Funil kanban · P-04 Lead aberto ·
    P-05 Agenda de visitas · P-06 Imóveis anunciados · P-07 Cadastro de imóvel · P-08
    Importar planilha · P-09 Métricas · P-10 IA da imobiliária · P-11 Equipe.
    Não existem no protótipo e você vai desenhar do zero, seguindo docs/mvp.md : P-07, P-08,
    P-11 e o checklist do selo.

    Admin Konexya (o documento não detalha): uma tela simples para aprovar imobiliárias, ver
    uso por imobiliária e consultar os logs de IA. Proponha o layout mínimo no plano.

    5. Divergências entre protótipo e documento (siga a decisão
    abaixo)

     Tema                Protótipo       O que construir

                         Chave que
     Primeira                            Item travado e sempre desligado. Só a boas-vindas
                         permite a IA
     mensagem do                         automática, identificada como IA, pode sair sozinha, e
                         enviar sem
     corretor                            só se a imobiliária ativar
                         aprovação

     Boas-vindas da      Sempre          Só com a opção ativada; senão, mensagem "Seu
     IA ao consentir     enviada         perfil já está com a corretora…"

                         IA responde
     Quem atende por                     A IA só sugere. O corretor pode "devolver para a IA"
                         e o corretor
     padrão                              dúvidas simples, se a imobiliária permitir
                         "assume"

     Distribuição de     Por bairro de   Rodízio entre corretores ativos ou atribuição manual
     leads               especialidade   pelo gestor

     Métrica "primeira   12 s, tempo     Tempo até a primeira mensagem enviada ou aprovada
     resposta"           da IA           por um humano. A boas-vindas automática não conta

                         E-mail e
     Login do painel                     E-mail com código
                         senha

                         Celular
                         (SMS) ou e-     Implemente e-mail com código + Google primeiro;
     Login do cliente    mail; nome      SMS atrás de uma flag, desligado até eu aprovar o
                         em tela         custo. Mantenha a tela "Como podemos te chamar?"
                         própria

     Inteligência de
                         Tela no menu    Fora do MVP
     procura

                                         Entra no MVP (etapa 3): SAC e Price, taxa
     Ficha: simulador    Presente,
                                         configurável no Admin com data de atualização, aviso
     de financiamento    com taxa fixa
                                         de que não é oferta de crédito

                                         Entra de forma condicional (etapa 3), conforme a
     Ficha: "Preço       m² do
                                         seção 8 do docs/PLANO.md : mediana dos anúncios
     comparado ao        FipeZAP e
                                         da própria Konexya, com amostra mínima
     bairro"             estimativas
                                         configurável (padrão 15), fonte e data sempre
                         sem fonte
                                         visíveis; sem amostra, o bloco não aparece
     Critério
                         Valor
     "Potencial de                          Fora da nota. Só critérios mensuráveis: trajeto,
                         estimado
     investimento" na                       orçamento, pets, tipo, quartos, serviços por perto
                         sem fonte
     nota

                         Maior nota
     Nota do bairro no   entre os           Critérios mensuráveis com a origem de cada número
     mapa                imóveis do         (seção "Mapa Vivo" do documento)
                         bairro

     Perfil, seção "Em
     desenvolvimento"
     (busca por foto,    Presente           Remover
     IA com memória,
     tour 3D)

     Ficha: botão                           Visita só depois do contato com o corretor (F6). Barra
                         Presente
     "Agendar visita"                       da ficha: "Comparar" e "Falar com o corretor"

     Selo de anúncio
                         Ausente            Construir (I3)
     completo

                         Persona
                         Marina,
                         imobiliária        Nada fictício em produção. Dados de exemplo só no
     Dados
                         Maré Alta,         ambiente de teste, marcados como tal
                         imóveis
                         fictícios

    6. Regras de negócio críticas (escreva testes automatizados
    para cada uma)
    1. Sem consentimento registrado, nenhum dado do cliente chega à imobiliária. O
      consentimento vale para UMA imobiliária; outra imobiliária pede um novo. A revogação
      bloqueia dados futuros.
    2. Endereços exatos da rotina nunca vão para a imobiliária, só os tempos de
      deslocamento.
    3. Nenhuma mensagem sai em nome do corretor sem aprovação dele. A IA sugere; o
      corretor aprova, edita ou descarta.
    4. Só o corretor confirma visitas. Propostas sempre passam pelo corretor antes de ir ao
      proprietário.
     5. Uma imobiliária nunca lê leads, imóveis não publicados ou métricas de outra. Teste isso
       contra o banco (RLS), não só pela interface.
     6. Alerta de WhatsApp só com opt-in separado dos termos. No máximo 1 alerta de imóvel
       novo por usuário a cada 24 h, e só acima da nota mínima (configurável, padrão 85).
     7. A nota de compatibilidade é calculada por código determinístico com pesos
       configuráveis, não pelo LLM. Toda nota mostra os motivos por critério. Faixas: verde ≥
       85, amarelo 75–84, vermelho < 75. O protótipo tem um modelo de pontuação ( crit ,
        weights , score , reasons ) que serve de ponto de partida, sem o critério de
       investimento.
     8. A IA responde só com dados da base e do perfil. Nunca inventa imóvel, preço ou
       atributo. Quando algo é estimativa, diz que é. Não dá nota de segurança de bairro nem
       promete valorização.
     9. Selo "Anúncio completo": regra objetiva e configurável (mínimo de fotos; metragem,
       valor, condomínio e IPTU preenchidos; descrição com tamanho mínimo; pino confirmado
       no mapa). Dá um peso pequeno na ordenação, sem passar à frente de imóveis muito
       mais compatíveis.
    10. Toda ação da IA que chega ao cliente fica registrada em ai_action_log .
    11. Controle de custo: limite diário de mensagens de IA por usuário e cache de rotas por
       imóvel × endereço × modo.
    12. O cliente vê, corrige, exporta e exclui os próprios dados pelo app.

    7. Figma
    Você pode usar o Figma (via servidor MCP do Figma) para criar e consultar os layouts das
    telas antes de implementá-las, seguindo a identidade visual descrita abaixo. Use as telas de
    docs/prototipo.html como ponto de partida e aplique as decisões da seção 5. No início
    de cada etapa, crie ou atualize no Figma os frames das telas daquela etapa, mostre para
    mim e só implemente depois que eu aprovar. Se o servidor MCP do Figma não estiver
    conectado, me avise em vez de pular essa parte.

    Identidade visual:

       Preto e branco, muito espaço em branco, fonte Montserrat, ícones de linha simples
       (traço fino, cantos arredondados).
       Cor só com significado: verde para o que atende ao perfil, amarelo para atenção,
       vermelho para o que não atende ou para erro.
       Botão principal preto, texto branco, cantos totalmente arredondados, altura mínima de
       44 px. Um único botão principal por tela.
       Logo "konexya" em minúsculas, fonte fina e espaçada, com o Y desenhado à mão
        (pincelado); o Y sozinho é o símbolo. Use o SVG do logo que está no protótipo
        (constantes WMP e YP ).
        Slogan "Você conversa. A Konexya encontra." só na boas-vindas e no login.
        Textos em português do Brasil, sempre "para", nunca "pra".
        Estados de carregando, vazio, erro e sem internet conforme a seção "Padrões de
        interface" do documento.

    8. Ordem de construção
    Uma etapa por vez. Ao fim de cada uma: rode os testes, faça o deploy no ambiente de
    teste, me mostre o resultado e espere eu aprovar antes de seguir.

    Etapa 0 — Fundação. Repositório, Next.js, Supabase (teste e produção), variáveis de
    ambiente, CLAUDE.md com as regras deste prompt, tokens de design e componentes base
    (botões, cartões, chips, toasts, esqueletos).
    Pronto quando: deploy de teste no ar, lint e testes passando, componentes base numa
    página de referência.

    Etapa 1 — Base. Login do cliente (C-01 a C-03, termos, nome). Acesso e cadastro da
    imobiliária (P-01) com aprovação no Admin. Equipe e convites (P-11). Cadastro, edição e
    fotos de imóveis (P-06, P-07). Checklist e regra do selo. Importação por planilha (P-08).
    Ficha do imóvel básica (C-07).
    Pronto quando: uma imobiliária aprovada sobe 100 imóveis por planilha em menos de 1
    hora, e um teste prova que a imobiliária A não lê nada da B.

    Etapa 2 — Núcleo de valor. Chat de perfil (C-04, C-05) com a IA. Pontuação determinística
    e recomendações com motivos. Consentimento e criação do lead (C-10, F4). Rodízio. Lead
    aberto com resumo, qualificação e mensagem sugerida (P-04). Chat cliente–corretor (C-
    11). Funil (P-03). Painel (P-02). Registro do tempo da primeira resposta humana.
    Pronto quando: os fluxos F1 a F5 funcionam de ponta a ponta com dois usuários reais de
    teste, e os testes das regras 1 a 8 passam.

    Etapa 3 — Diferenciais. Mapa Vivo com rotas reais e cache (C-06). Salvos e comparação
    por IA (C-09, C-08). Visitas e agenda (F6, P-05). Proposta (F7). Métricas (P-09).
    Configurações da IA (P-10).
    Pronto quando: F6 e F7 funcionam de ponta a ponta, e o tempo de primeira resposta em P-
    09 bate com os registros do banco.

    Etapa 4 — Retenção. Alertas e notificações por WhatsApp e e-mail (F8, I9), lembrete de
    visita, links profundos que abrem a tela exata, instalação do PWA e fila de mensagens
    offline.
    Pronto quando: F8 funciona com template aprovado, os limites de frequência têm teste, e
    cada link de alerta abre a tela certa (inclusive passando pelo login).

    Se o orçamento apertar, a ordem de corte está no documento (seção "Orçamento,
    cronograma e prioridade de corte"). O que não sai em nenhum cenário: chat de perfil,
    recomendações, consentimento, caixa de leads com resumo da IA e tempo de primeira
    resposta.

    9. O que você NÃO deve fazer
       Construir algo da lista "Fora do escopo" do documento ou da seção 5 (escaneamento
       3D, estudo de mercado e sugestão de preço, inteligência de procura, revisão periódica
       de anúncios pela IA, conversa com a IA pelo WhatsApp, apps nativos, tom de voz
       personalizado, cobrança automática, outras cidades, integrações com CRMs e portais
       além da importação).
       Mostrar dados fictícios como se fossem reais, ou inventar números de mercado, de
       bairro ou de desempenho.
       Escrever chaves de API ou senhas no código.
       Mudar regra de negócio por conta própria. Se uma regra parecer errada ou impossível,
       pare e me pergunte.
       Avançar para a próxima etapa sem a minha aprovação.

    10. Primeira resposta que espero de você
    Não escreva código ainda. Responda com:

     1. O que você entendeu do produto, em 5 linhas.
     2. A stack final, com qualquer mudança justificada.
     3. O modelo de dados (tabelas, relações e políticas de RLS principais).
     4. O plano das etapas 0 a 4, com o que entra em cada uma e o critério de pronto.
     5. As contas e chaves que eu preciso criar antes de cada etapa (Supabase, Anthropic,
       Google Maps, Meta/WhatsApp Business, Resend, Vercel, Figma).
     6. Dúvidas ou contradições que você encontrou no documento ou no protótipo.

    Depois disso, espere minha aprovação.
