<!-- Texto extraído automaticamente de PLANO.pdf. O PDF é o original; tabelas podem ter perdido a formatação. -->

    Konexya — Plano de construção do MVP
    Status: aguardando aprovação. Nenhum código foi escrito.

    1. O que eu entendi
    A Konexya é o SDR da imobiliária dentro de um sistema só. O comprador conversa com a IA,
    que monta um perfil e recomenda imóveis das parceiras com uma nota explicável. Ao tocar
    "Falar com o corretor" e autorizar, o lead chega à imobiliária já qualificado, com resumo,
    imóveis vistos e uma mensagem sugerida que o corretor aprova. O piloto (Fortaleza, 3 a 5
    imobiliárias) precisa provar uma coisa: o corretor responde mais rápido e fecha mais com
    esses leads. Por isso, a métrica central é o tempo até a primeira resposta humana.

    2. Stack final
    Igual à do prompt, com quatro acréscimos:

      Camada          Escolha                                    Por quê

                      Next.js (App Router) + TypeScript +
                                                                 Um código, um deploy, dois
      App             Tailwind, um PWA com /app ,
                                                                 públicos
                       /painel e /admin

                                                                 RLS no banco; auth por código
                      Supabase (Postgres, Auth, Storage,
      Banco e auth                                               de e-mail e Google sem
                      Edge Functions, cron)
                                                                 servidor próprio

                                                                 A resposta da IA nunca grava no
                      API da Anthropic, só no servidor, saída
      IA                                                         banco sem passar pela
                      validada com Zod
                                                                 validação

                      Google Maps Platform (Maps JS,             Rotas de transporte público em
      Mapas
                      Places, Routes)                            Fortaleza

      WhatsApp /
                      Cloud API da Meta / Resend                 Oficial; templates aprovados
      e-mail

                      Vitest (regras e nota), pgTAP via
                      Supabase CLI (RLS), Playwright             As regras críticas viram testes
      Testes
                      (fluxos F1 a F8)                            que rodam a cada mudança

                      Supabase CLI, migrações versionadas         Teste e produção com o mesmo
      Migrações
                      no repositório                              esquema

      Hospedagem      Vercel (teste e produção)                   Deploy por branch

    3. Modelo de dados

    Decisão de arquitetura mais importante
    A imobiliária nunca lê as tabelas do cliente. Quando o cliente autoriza, o sistema grava um
    retrato do perfil dentro do lead ( leads.profile_snapshot ), sem endereços da rotina, só
    com os tempos de deslocamento. Enquanto o consentimento estiver ativo, uma função
    atualiza esse retrato quando o perfil muda. Se o cliente revoga, a atualização para e a
    imobiliária fica só com o que já tinha recebido, como diz a tela C-05.

    Assim a regra "sem consentimento, nenhum dado chega à imobiliária" é garantida pelo
    desenho do banco, não por um if na tela.

    Tabelas
    Cliente

        client_profiles (1 por usuário): nome, finalidade (compra/aluguel), objetivo
       (morar/investir/ambos), orçamento mín./máx., tipo, quartos, vagas, prioridades[], trajeto
       máx. (min), estilo, filhos, pets (nenhum/pequeno/grande), prazo, extras[],
       perfil_mínimo_completo.
        routine_addresses : perfil, rótulo, endereço, lat, lng.

        profile_chat_messages : perfil, autor (cliente/ia/sistema), texto, cartões recomendados
       (json).

    Imobiliária

        agencies : razão social, CNPJ, CRECI jurídico, WhatsApp, status
       (pendente/aprovada/suspensa).
        agency_members : imobiliária, usuário, papel (gestor/corretor), CRECI, ativo, no_rodízio,
       último_lead_em.
        agency_invites : e-mail, papel, token, expira_em.

        agency_ai_settings : responder dúvidas simples, sugerir horários, boas-vindas
       automática, tom (3 opções), distribuição (rodízio/manual).
    Imóveis

       properties : imobiliária, corretor responsável, finalidade, tipo, endereço, bairro, lat, lng,
       pino_confirmado, preço, condomínio, IPTU, área, quartos, suítes, banheiros, vagas, pets,
       mobiliado, andar, vista, itens[], descrição, tour_url, status, tem_selo, publicado_em.
       property_photos : imóvel, caminho, ordem, é_capa, texto alternativo.

       seal_rules : critérios configuráveis do selo.

    Interação

       favorites , property_events (visto/salvo/comparado), comparisons (imóveis +
       parecer da IA).
       match_scores : perfil × imóvel, nota, motivos por critério (json), versão dos pesos.

       commute_cache : imóvel × hash do endereço × modo → minutos, consultado_em.

    Lead e atendimento

       consents : usuário, tipo (termos/compartilhamento/whatsapp), imobiliária (no
       compartilhamento), o que foi compartilhado, concedido_em, revogado_em.
       leads : imobiliária, cliente, consentimento, corretor, etapa, prontidão, motivo de perda,
       profile_snapshot , resumo da IA, imóveis de interesse[], criado_em,
       first_human_response_at , etapa_mudou_em. Um lead por cliente × imobiliária; um
       segundo imóvel da mesma imobiliária entra na lista de interesse.
       messages : lead, remetente (cliente/corretor/ia_imobiliária/sistema), texto, anexos,
       horários de visita propostos (json).
       ai_suggestions : lead, texto, status (pendente/aprovada/editada/descartada),
       aprovada_por.
       visits : lead, imóvel, corretor, horários propostos, horário confirmado, status.

       proposals : lead, imóvel, valor, status (aguardando
       corretor/encaminhada/aceita/recusada/contraproposta), contraproposta.
       internal_notes : lead, autor, texto.

    Auditoria

       ai_action_log : o que a IA gerou, para quem, se chegou ao cliente.

       notification_log : canal, template, destinatário, enviado_em (base do limite de 1 alerta
       por 24 h).

    Políticas de acesso (RLS) principais

     Dado                            Cliente      Corretor            Gestor              Admin
                                        só o                                                    só via
      Perfil, rotina, chat com a IA                  nunca                  nunca
                                        próprio                                                 logs

      Imóvel publicado                  lê           lê                     lê                  lê

      Imóvel em rascunho ou                          da própria             da própria
                                        não                                                     lê
      pausado                                        imobiliária            imobiliária

                                        os           só os atribuídos       todos da
      Lead e mensagens                                                                          lê
                                        próprios     a ele                  imobiliária

      Sugestões da IA e anotações                    dos próprios
                                        nunca                               da imobiliária      lê
      internas                                       leads

      Configurações da IA e
                                        não          lê                     edita               lê
      equipe

    Cada linha desta tabela vira um teste pgTAP, incluindo o caso "imobiliária A tenta ler a B".

    4. Etapas
    Cada etapa termina com testes passando, deploy no ambiente de teste e sua aprovação.

      Etapa             O que entra                                                 Pronto quando

                        Repositório, Next.js, Supabase teste e produção,
                                                                                    Deploy de teste no
      0.                 CLAUDE.md , tokens de design, componentes base,
                                                                                    ar; componentes
      Fundação          página de referência dos componentes, CI com lint e
                                                                                    base aprovados
                        testes

                                                                                    100 imóveis por
                        C-01 a C-03 + termos + nome; P-01 + aprovação no            planilha em menos
      1. Base           Admin; P-11 e convites; P-06, P-07, fotos; selo e           de 1 h; teste de
                        checklist; P-08 importação por planilha; C-07 básica        isolamento A × B
                                                                                    passando

                        C-04 e C-05 com a IA; nota determinística e                 F1 a F5 de ponta a
                        recomendações; C-10 consentimento e criação do              ponta com dois
      2. Núcleo         lead; rodízio; P-04 com resumo, qualificação e              usuários de teste;
                        mensagem sugerida; C-11; P-03; P-02; tempo de               testes das regras 1
                        primeira resposta humana                                    a 8 passando

                        C-06 Mapa Vivo com rotas reais e cache; C-09 e C-
     3.              08; visitas e P-05; propostas; P-09; P-10; simulador      F6 e F7 de ponta a
     Diferenciais    de financiamento na ficha; bloco "Preço comparado         ponta; P-09 bate
                     ao bairro" condicional (ver seção 8)                      com o banco

                                                                               F8 com template
                                                                               aprovado; limites
                     WhatsApp e e-mail (F8, I9), lembrete de visita, links
     4. Retenção                                                               com teste; cada
                     profundos, instalação do PWA, fila offline
                                                                               link abre a tela
                                                                               certa

    5. Contas e chaves necessárias

     Antes
     da          Conta                            Observação
     etapa

                 GitHub (repositório da
     0                                            É onde o código fica
                 Konexya, não pessoal)

                 Supabase (2 projetos: teste e
     0                                            Plano gratuito serve para o teste
                 produção)

     0           Vercel                           Ligada ao GitHub

     0           Figma                            Para os frames de cada etapa

                 Google Cloud (Places para
     1                                            Exige cartão; configure limite de gasto
                 autocompletar endereço)

     1           Resend + domínio de e-mail       Código de login e convites

     2           Anthropic (chave de API)         Defina limite mensal no console

     3           Google Routes API                Mesmo projeto do Google Cloud

                 Meta Business + WhatsApp         Exige CNPJ. Comece a verificação já, porque
     4
                 Business                         os templates levam dias para aprovar

    6. Contradições e lacunas que encontrei
    Para cada uma, indico o que vou fazer se você não disser outra coisa.
     1. Login. C1 fala em e-mail e Google; C-02 e o protótipo usam celular com SMS. → E-mail
       com código + Google; SMS atrás de uma flag.
     2. Aluguel. C2 pede "compra ou aluguel", mas o roteiro do chat e o protótipo só tratam
       compra. → Incluir a pergunta e um orçamento mensal para aluguel.
     3. Quem sugere horário de visita. C8 diz que o cliente sugere até 3; F6 diz que o corretor
       sugere. → Os dois podem, pelo chat; só o corretor confirma.
     4. O que o consentimento compartilha. O documento lista perfil e salvos; o protótipo
       inclui "resumo da conversa com a IA", que o P-04 mostra. → O texto do consentimento
       cita o resumo também, senão o corretor recebe algo que o cliente não autorizou.
     5. Números não definidos. Nota mínima para alerta, critérios do selo e limite diário de IA.
       → Padrões configuráveis: alerta ≥ 85; selo com 5 fotos e descrição de 200 caracteres;
       60 mensagens de IA por dia por cliente.
     6. Admin sem tela. → Lista de imobiliárias pendentes com aprovar/recusar, uso por
       imobiliária e busca nos logs da IA.
     7. Revogação. O documento não diz o que acontece com a conversa. → O chat com
       aquela imobiliária é encerrado e o lead fica marcado "consentimento revogado".
     8. Proprietário. Não existe cadastro de proprietário. → O corretor registra manualmente a
       resposta à proposta, como em F7.
     9. Dois imóveis da mesma imobiliária. → Um lead só, com os dois na lista de interesse; o
       consentimento é por imobiliária.

    7. Decisões tomadas depois da primeira versão do plano
       Repositório: novo, no GitHub da Konexya.
       Simulador de financiamento: entra no MVP, na ficha do imóvel. SAC e Price; taxa de
       juros configurável no Admin, sempre exibida com a data em que foi atualizada; aviso de
       que é simulação e não oferta de crédito. A taxa do protótipo (11,49% a.a.) é ilustrativa.
       Preço comparado ao bairro: entra de forma condicional (seção 8).

    8. Comparativo de m² com o bairro: estudo de viabilidade
    É possível, mas não do jeito que o protótipo mostra.

    O que o protótipo usa e por que não serve como está:

       O FipeZAP é calculado sobre preços anunciados de apartamentos prontos, não sobre
       vendas fechadas.
       A Fipe publica a média da cidade e cita só alguns bairros "mais representativos". Ela
       mesma informa que não divulga tabelas de preço por bairro.
       Cobertura em Fortaleza: cerca de 10 bairros (Meireles, Aldeota, Eng. Luciano
       Cavalcante, Centro, Dionísio Torres, Fátima, Manuel Dias Branco, Praia do Futuro,
       Papicu, Joaquim Távora). Cocó, Varjota e Mucuripe, que estão no protótipo, ficam de
       fora; ali o protótipo usa estimativas inventadas.
       Não encontrei termos que autorizem uso comercial desses números dentro de um app.
       Para usar, é preciso pedir autorização à Fipe/DataZAP.
       Não encontrei dados abertos de ITBI (valor de transação) da Prefeitura de Fortaleza.

    O que proponho construir:

     1. Fonte principal: a própria base da Konexya. Mediana do preço pedido por m² nos
       anúncios publicados no mesmo bairro, mesmo tipo e faixa de quartos parecida. O bloco
       só aparece com uma amostra mínima (padrão: 15 anúncios, configurável) e sempre diz
       de onde vem: "mediana de N anúncios na Konexya, atualizada em [data]".
     2. Fonte secundária opcional: tabela de referência no Admin. Valor por bairro digitado
       manualmente, com fonte e data obrigatórias. Só é ligada se a Konexya obtiver
       autorização de uso de alguma fonte externa.
     3. Sem fonte ou sem amostra, o bloco não aparece. Nada de estimativa.
     4. Texto neutro: "acima/abaixo da mediana dos anúncios do bairro". Nunca "preço justo",
       "vale a pena" ou valor sugerido, para não virar avaliação de imóvel. Confirmar com o
       CRECI antes do piloto (já está nos próximos passos do documento).

    Limitação honesta: com 3 a 5 imobiliárias, poucos bairros vão atingir a amostra mínima no
    piloto. O bloco vai aparecer pouco no começo e mais conforme a base cresce. É o custo de
    não mostrar número sem fonte.

    9. Onde este código pode rodar
    Consigo escrever, testar e rodar o app neste ambiente. O que não consigo daqui: criar as
    suas contas (Supabase, Vercel, Google, Meta) nem acessar a maioria dos sites externos. Na
    prática, cada etapa termina com o código num repositório GitHub da Konexya; você cria as
    contas da tabela 5 e cola as chaves nas configurações da Vercel e do Supabase.
