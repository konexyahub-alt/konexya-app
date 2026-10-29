# Decisões do produto

Mudanças aprovadas pelo dono do produto depois do PLANO, do PROMPT e do mvp.md. Valem sobre esses documentos.

## 2026-10-28 · Assistente virtual da imobiliária faz o primeiro atendimento

**Antes (mvp.md e regra 3):** a única mensagem automática era a boas-vindas identificada como IA, se a
imobiliária ativasse. Todo o resto esperava o corretor aprovar.

**Agora:**

- Quando o lead chega, a assistente virtual da imobiliária dá as boas-vindas e faz as perguntas que a
  imobiliária configurou, para o cliente não ficar sem resposta até o corretor chegar.
- Vem **ligada por padrão**; a imobiliária pode desligar.
- **Nome personalizável** por imobiliária, sempre acompanhado do selo **"assistente virtual"**, que a
  imobiliária não pode remover. Ela nunca fala em nome do corretor.
- **Mensagens personalizáveis:** boas-vindas, despedida (quando termina as perguntas) e o texto de cada
  pergunta são escritos pela imobiliária e enviados exatamente como estão, com o nome do cliente encaixado.
  As respostas curtas entre uma pergunta e outra e as respostas a dúvidas (ver abaixo) são geradas pela IA e
  não são personalizáveis.
- **Perguntas personalizáveis.** As perguntas vêm de uma lista padrão (forma de pagamento,
  crédito aprovado, uso do FGTS, precisa vender outro imóvel, melhor horário para contato) ou são escritas pela
  imobiliária. Limite de **8 perguntas**, com aviso a partir de 5. A assistente pula o que o cliente já
  respondeu na conversa com a Konexya.
- As respostas **preenchem o perfil do lead no painel na hora**: as da lista padrão vão para a qualificação;
  as escritas pela imobiliária aparecem em "Respostas para a imobiliária".
- A assistente **não agenda, não negocia e não promete**. Visitas e propostas continuam só com o corretor
  (regra 4). Ela segue a regra 8 (só dados da base e do perfil).
- **Dúvidas fora do roteiro** (decisão de 2026-10-28, opção A):
  - **Responde** só com dados cadastrados na ficha dos imóveis do lead (metragem, quartos, vagas, condomínio,
    IPTU, pets, andar, lazer etc.). Se o dado não estiver na ficha, diz que não tem a informação e que o
    corretor responde. Nunca estima nem chuta.
  - **Encaminha ao corretor, sem responder:** preço, desconto ou proposta; visita e horário; financiamento e
    documentação; imóveis que não estão na conversa; opiniões (bom negócio, segurança do bairro, valorização).
  - Depois de responder ou encaminhar, volta às perguntas configuradas.
  - O painel do lead mostra um bloco **"Dúvidas do cliente"** com o que ficou para o corretor, marcado como
    respondido quando o corretor envia mensagem.
  - Testes automatizados cobrem: resposta só com dado da ficha, recusa a agendar/negociar/prometer e
    encaminhamento dos temas proibidos.
- Ela **para quando o corretor envia a primeira mensagem**.
- As mensagens dela **não contam** no tempo até a primeira resposta humana (métrica central).
- O texto do consentimento (C-10) avisa que a assistente da imobiliária vai fazer algumas perguntas.
- Toda mensagem dela fica em `ai_action_log` (regra 10) e conta no limite diário de IA (regra 11).

**Escopo:** a configuração da assistente (nome, boas-vindas, perguntas, despedida, liga/desliga) entra na etapa 2.
"Tom de voz personalizado" (mudar o jeito de a IA escrever) continua fora do MVP.

## 2026-10-28 · Recomendações na conversa: ranking de até 5 imóveis

**Antes:** o fluxo F2 (docs/mvp.md) mostrava os 3 imóveis mais compatíveis.

**Agora:**
- A conversa mostra um ranking numerado (1º, 2º, 3º…) de até 5 imóveis, sempre da maior nota de
  compatibilidade para a menor. Não se limita a 3.
- O selo "Anúncio completo" (regra 9) só desempata imóveis com a mesma nota; nunca coloca um imóvel à frente de
  outro com nota maior.
- Com menos de 5 imóveis elegíveis, mostra os que existem. Nunca completa a lista com imóvel que não serve.
- Quando há mais imóveis compatíveis (nota ≥ 75) além dos 5, a conversa avisa quantos são e que eles vão estar
  no Mapa Vivo (etapa 3).
- Os 3 primeiros aparecem em cartão grande; o 4º e o 5º, em cartão compacto.
- O aviso de mudança passa a ser "Recomendações atualizadas: a lista mudou".

## 2026-10-28 · Conversa de perfil orgânica e livre no piloto

**Antes:** o fluxo F2 (docs/mvp.md) é um roteiro: uma pergunta por vez, sempre com botões de resposta rápida.

**Agora:**
- **No piloto** (primeira versão para o público e para os anunciantes), a conversa com a IA da Konexya é
  **orgânica e livre**. A IA é o "corretor inteligente" do cliente: responde ao que ele escreveu, entende a rotina
  e o que procura, e recomenda a partir dessa conversa. Ela não pode parecer um filtro com mensagens prontas.
- **Mensagens prontas (respostas rápidas) continuam existindo, como segunda opção:** para o cliente que não quer
  digitar, ou quando a conversa não está chegando ao resultado (por exemplo, falta uma informação essencial para
  recomendar). Não são o caminho principal.
- **No ambiente de teste**, a conversa com roteiro e botões pode continuar como está enquanto a versão livre não
  fica pronta. A versão livre precisa estar pronta e aprovada antes de ir para produção.
- Continua valendo: a nota de compatibilidade é calculada pelo código (regra 7); a IA responde só com dados da base
  e do perfil (regra 8); toda resposta da IA fica em `ai_action_log` (regra 10); limite diário de IA (regra 11).

**Consequências registradas:**
- Sem crédito na Anthropic, a conversa livre não funciona; a conta de produção precisa de cobrança configurada antes
  do piloto.
- Toda mensagem do cliente passa a usar IA: o limite diário (padrão 60) passa a ser atingido por quem conversa muito.
  Ao atingir, o cliente segue pelas mensagens prontas e pelo Perfil.
- **A IA pergunta o que falta.** Quando faltar uma informação necessária para recomendar (comprar ou alugar, faixa de
  valor, tipo, bairro ou onde trabalha), a IA pergunta ao cliente, de forma natural e encaixada na conversa.
- **A assistente virtual da imobiliária (Lia) continua como está**, com as perguntas configuradas pela imobiliária.
  Pode mudar no futuro, por decisão do dono do produto.

## 2026-10-28 · Nota: preferências do cliente somadas aos critérios de base

**Antes:** a nota usa só critérios fixos (orçamento, tipo, quartos, vagas, pets, bairro, lazer), com os mesmos pesos
para todos. Das prioridades perguntadas na conversa, só "lazer no prédio" muda a nota. Fora do bairro do trabalho, a
localização não conta.

**Agora (versão para o público, piloto):**
- O ranking junta duas coisas: **as preferências que o cliente expressa** e **os critérios de base**. Não é só uma
  lista de metas prontas.
- Preferências são abertas: qualquer coisa que o cliente disser que importa para ele (perto do trabalho, perto da
  praia, da escola dos filhos, andar alto, varanda, silêncio, serviços a pé…), não uma lista fechada. A praia é só um
  exemplo entre muitos.
- O que o cliente diz que é mais importante pesa mais na nota dele. Quem busca morar perto do trabalho tem o imóvel
  mais perto do trabalho no topo.
- A IA extrai as preferências da conversa livre; **o código calcula a nota** (regra 7 continua). Toda nota mostra os
  motivos por critério. Preferência que a ficha do imóvel não informa aparece como "o anúncio não informa", nunca
  como chute (regra 8).

**Meta do piloto (o que precisa estar pronto antes de ir ao público):**
- Conversa livre (seção anterior) extraindo as preferências abertas do cliente.
- Nota = preferências do cliente + critérios de base, com mais peso para o que o cliente disse que importa mais.
- **Proximidade real** (trabalho, praia, escola, o que o cliente citar) calculada pelo Google Maps (Mapa Vivo,
  etapa 3): distância e tempo de trajeto do endereço do imóvel até o lugar. Depende da decisão de pagamento do
  Google Maps.

**No ambiente de teste, por enquanto (sem Google Maps):**
- Critérios de base com pesos configuráveis, como hoje.
- Nova prioridade "Morar perto do trabalho". A prioridade que o cliente escolher pesa mais na nota.
- Proximidade do trabalho só pelo bairro: imóvel no mesmo bairro do trabalho fica no topo; em outro bairro, o motivo
  diz que a distância até o trabalho entra com o Mapa Vivo. Nada de distância estimada ou inventada.
- "Perto da praia" e "Serviços a pé" ficam fora da nota até haver dado real (Google Maps).
- Distância em linha reta entre bairros foi descartada: seria um quebra-galho jogado fora na etapa 3.

## 2026-10-29 · Boas-vindas da assistente e lista de conversas do cliente

- Texto padrão de boas-vindas da assistente termina com "Enquanto isso, podemos começar a conversar sobre o
  imóvel?" (antes: "posso te fazer algumas perguntas rápidas?"). Imobiliárias que editaram o texto não mudam.
- Aba Corretor (C-11): sempre mostra a lista de conversas, mesmo com uma só (antes abria direto a única conversa).
  Cada conversa é com uma imobiliária (o consentimento vale para a imobiliária inteira) e mostra o imóvel que
  abriu a conversa e a situação: "Aguardando corretor" (amarelo), "Conversando" (verde, depois da primeira
  mensagem do corretor) ou "Revogado". Quando a assistente mandou mensagem e espera o cliente, a situação mostra
  "[nome da assistente] respondeu" (preto), para o cliente saber que já pode conversar. Cada conversa mostra
  também a última mensagem e quem a mandou.

## 2026-10-29 · Aba "Leads" no painel

**Antes:** o item "Lead aberto" do menu abria direto o próximo lead esperando resposta (P-04).

**Agora:** o item se chama **Leads** e abre uma **lista** de todos os leads que a pessoa pode ver (gestor: a
imobiliária toda; corretor: os seus), com busca pelo nome, filtros rápidos (Em andamento, Aguardando resposta,
Parados há 48 h+, Encerrados), filtro por etapa e, para o gestor, "Meus leads". Tocar num lead abre a tela do lead
(P-04, sem mudança). O Funil (P-03) continua para ver e mover o andamento por etapa.

## 2026-10-29 · Corretor autônomo como anunciante

**Antes:** só imobiliárias (CNPJ e CRECI jurídico) anunciavam.

**Agora:** o cadastro de anunciante (P-01) começa com a escolha **Imobiliária** ou **Corretor autônomo**, cada uma
com explicação e ajuda "?", e um aviso visível: quem trabalha numa imobiliária que já usa a Konexya não se cadastra;
entra pelo convite do gestor.

| Ponto | Corretor autônomo |
|---|---|
| Documentos | Nome completo, CRECI de pessoa física, e-mail e WhatsApp. Sem CPF e sem CNPJ |
| Aprovação | Manual no Admin, como a imobiliária (conferir o CRECI no CRECI-CE) |
| Painel | O mesmo; o login é gestor e corretor ao mesmo tempo. Sem Equipe, sem convites, sem distribuição de leads |
| Assistente virtual | Disponível, configurável como na imobiliária |
| O cliente vê | "Anunciado por [nome], corretor(a) autônomo(a)" e o CRECI |
| Regras | Todas iguais (consentimento, isolamento entre anunciantes, métricas) |
| Convite pendente | Quem tem convite de imobiliária não consegue se cadastrar como autônomo |

Proprietário vendendo direto continua fora do escopo.

## 2026-10-29 · Verificação de anunciantes e e-mails da Konexya

- **Conferência automática do CNPJ:** no cadastro de imobiliária, o servidor consulta a Receita Federal (BrasilAPI,
  pública e gratuita) e confere situação ativa, razão social e atividade imobiliária (CNAE 6821-8/01, 6821-8/02 ou
  6822-6/00). O resultado aparece no Admin com ✓/✗. A aprovação **continua manual**.
- **CRECI:** não há serviço oficial do COFECI/CRECI-CE para sistemas; raspar a página de consulta é frágil e pode
  violar os termos do conselho. Por isso o CRECI segue conferido pelo admin, com um atalho de consulta no Admin.
  Aprovação automática pelo CRECI só com acesso oficial aos dados (pedir ao CRECI-CE).
- **Aviso de cadastro novo:** e-mail para konexyadmin@gmail.com com os dados e o resultado da conferência.
- **Rascunho enquanto pendente:** quem aguarda aprovação já cadastra e importa imóveis como rascunho; publicar e
  receber leads dependem da aprovação (garantido no banco).
- **E-mails:** administração do app → konexyadmin@gmail.com; operação e negócio (propostas e afins) →
  konexyahub@gmail.com (`src/lib/contacts.ts`).

## 2026-10-29 · Perguntas da assistente ligadas por padrão

Das 5 perguntas padrão, 4 vêm ligadas (pagamento, crédito aprovado, FGTS e melhor horário). **"Vender outro imóvel"
vem desligada**: com as 5 ligadas, toda imobiliária nova abriria a tela já com o aviso "muitas perguntas" (a partir
de 5). O gestor liga quando quiser na página Assistente virtual; sem ela, o lead mostra "A confirmar" e o corretor
pergunta na conversa.

## 2026-10-29 · Mensagens da assistente sem promessa de prazo

A assistente não promete (regra 3), e "fala com você em breve" depende do corretor. Textos padrão:
- Boas-vindas: "… Seu perfil já está com o corretor. Enquanto isso, podemos começar a conversar sobre o imóvel?"
  (autônomo: "Seu perfil já está com [nome]").
- Despedida: "Obrigada, [nome do cliente]! Já passei tudo para o corretor. A resposta chega aqui nesta conversa."
- Dúvida encaminhada: "Passei essa pergunta para o corretor. A resposta chega aqui nesta conversa."
- Cabeçalho da conversa do cliente: só o nome do corretor (sem "entra em breve").
Imobiliárias que editaram as próprias mensagens não mudam.

## 2026-10-29 · Etapa 2: decisões de construção aprovadas

Aprovadas pelo dono do produto ("ok em tudo"): nota sem trajeto até a etapa 3; prontidão "Pronto para visitar" =
muda em até 3 meses e informou orçamento; excluir a conta não apaga o que a imobiliária já recebeu com consentimento
(dados novos param); texto atual da tela de consentimento; "Parados há 48 h" no Painel no lugar de "Visitas";
assistente continua respondendo dúvidas com dados da ficha depois da despedida; modelo de IA mais forte no piloto.
Resumo do lead sem IA: "Resumo indisponível no momento" depois de 5 minutos (sem prometer versão futura).

## 2026-10-29 · Etapa 2 aprovada

Aprovada pelo dono do produto no ambiente de teste, com a ressalva de que a parte de IA (conversa livre, resumo,
sugestões e respostas livres da assistente) será testada quando houver crédito na Anthropic (PENDENCIAS, seção 1).

## 2026-10-29 · Comparação (C-08) moldada pelo perfil do cliente

- As linhas da tabela acompanham o que o cliente informou: **primeiro o que ele disse que importa** (a prioridade
  escolhida, pets se tem pet, vagas e quartos se pediu), depois o básico (preço, condomínio, área).
- Critério que o cliente **não mencionou não aparece** na tabela principal; fica em "Ver todos os detalhes".
  Ex.: sem pet, não há linha de pets; sem prioridade de lazer, lazer vai para os detalhes.
- Em cada linha, o valor que atende melhor o cliente fica destacado.
- Perfil com pouca informação gera tabela curta; nesse caso a análise convida a completar o perfil ("Me conte se
  você tem pet ou precisa de vaga para eu comparar melhor").
- A análise da Konexya, embaixo da tabela, fala só dos critérios do perfil. A nota continua do app (regra 7) e a
  análise só usa dados dos anúncios e do perfil (regra 8).

## 2026-10-29 · Visitas: "Adicionar ao meu calendário" (sem sincronização)

- Cada visita confirmada tem o botão **"Adicionar ao meu calendário"**, que baixa um arquivo de evento (.ics) com
  data, hora, endereço do imóvel e nome do cliente. Abre no Google Agenda, no calendário do iPhone e no Outlook.
  Vale na agenda do corretor (P-05) e na visita do cliente (C-11, sem dados do corretor além do nome).
- **Sem sincronização automática** com Google Agenda por enquanto: exige verificação de segurança do Google,
  acesso à agenda pessoal do corretor e regras para mudanças nos dois lados. Reavaliar depois do piloto, se os
  corretores pedirem. Se a visita mudar, o app avisa e oferece o arquivo novo.

## 2026-10-29 · Simulador de financiamento fora da etapa 3

O simulador de financiamento na ficha (PLANO, etapa 3) sai da etapa 3 e fica para quando houver **banco parceiro**:
sem taxa real, pré-aprovação ou envio ao banco, a parcela estimada pode enganar mais do que ajudar. Enquanto isso,
financiamento aparece na qualificação do lead (forma de pagamento, crédito aprovado, FGTS) e é conduzido pelo corretor.

## 2026-10-29 · Métricas (P-09) completas, com atalhos

- **5 abas:** Visão geral; Atendimento e equipe; Funil e conversão; Imóveis; IA e assistente. Filtros de período
  (7, 30, 90 dias ou personalizado) e de corretor; comparação com o período anterior. Sem "exportar planilha" no piloto.
- **Atalhos:** número que leva a uma lista ou ação é clicável (com ›) e abre a tela responsável já filtrada,
  mantendo o período: parados → Leads "Parados"; visitas aguardando → Agenda "Aguardando"; propostas sem
  encaminhar → Leads em Proposta; anúncios sem selo → Meus imóveis; etapa do funil → Leads da etapa; motivo de
  perda → Leads encerrados com o motivo; corretor → Leads do corretor; imóvel → tela do imóvel; pergunta da
  assistente → Assistente virtual. Números que não levam a uma lista (ex.: "14 min") não são clicáveis.
- A lista de Leads ganha filtros por corretor, motivo de perda e período.
- Fora: "bairros mais procurados" e qualquer dado de demanda do mercado (inteligência de procura, fora do escopo).
  Visitas, propostas e tempo por etapa mostram estado vazio até a etapa 3 gerar dados; nunca número inventado.

## 2026-10-29 · Desenhos da etapa 3 aprovados (telas sem mapa)

Aprovados pelo dono do produto (`docs/desenhos/etapa3/`): visita na conversa do cliente (horários em botões,
confirmação, endereço e "Adicionar ao meu calendário"); proposta (cliente envia à corretora; acompanhamento com
etapas e contraproposta); comparação com análise da Konexya embaixo; Salvos; Agenda (uma aba: semana em grade no
computador, semana + dia com filtros no celular; etiquetas "Aguardando confirmação" e "Horário duplicado");
lead com visita e proposta ("Encaminhar ao proprietário" e resposta); Métricas em 5 abas. App do cliente com 5
abas (Conversa, Mapa, Salvos, Corretor, Perfil). Falta importar no Figma (mcp.figma.com bloqueado na rede do
ambiente) e desenhar o Mapa Vivo (depende do Google Maps).

## 2026-10-29 · Agenda de visitas (P-05) construída

- "Outubro, semana 5" no celular: a semana pertence ao mês da quinta-feira (onde cai a maior parte dela) e conta a
  partir da semana que tem o dia 1, como no desenho aprovado.
- "Outro horário" num pedido: cancela o pedido e envia até 3 novos horários na conversa, em nome do corretor que
  clicou (ação dele, regra 3). Usado para resolver horário duplicado: confirma um cliente e oferece outros ao outro.
- Barra do celular do painel: Painel, Leads, Agenda, Imóveis e "Mais" (Funil, Equipe, Assistente virtual, Sair).
  O item Agenda mostra quantas visitas aguardam confirmação.
