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

## 2026-10-28 · Recomendações na conversa: de 5 a 7 imóveis

**Antes:** o fluxo F2 (docs/mvp.md) mostrava os 3 imóveis mais compatíveis.

**Agora:** a conversa mostra no mínimo 5 e no máximo 7 imóveis.
- Sempre os 5 mais compatíveis; o 6º e o 7º entram só se também forem verdes (nota ≥ 85).
- Com menos de 5 imóveis elegíveis (finalidade e tipo residencial), mostra os que existem. Nunca completa a lista
  com imóvel que não serve nem com dado inventado.
- Os 3 primeiros aparecem em cartão grande; do 4º em diante, em cartão compacto (foto pequena, nota e motivo
  principal), para a lista não pesar no celular.
- O aviso de mudança passa a ser "Recomendações atualizadas: a lista mudou".
- Ordem: sempre da maior nota de compatibilidade para a menor. O selo "Anúncio completo" (regra 9) só desempata
  imóveis com a mesma nota; nunca coloca um imóvel à frente de outro com nota maior.
