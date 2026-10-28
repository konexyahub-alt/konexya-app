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
  As respostas curtas entre uma pergunta e outra e o encaminhamento de dúvidas fora do roteiro ("a corretora
  vai te responder") são gerados pela IA e não são personalizáveis.
- **Perguntas personalizáveis.** As perguntas vêm de uma lista padrão (forma de pagamento,
  crédito aprovado, uso do FGTS, precisa vender outro imóvel, melhor horário para contato) ou são escritas pela
  imobiliária. Limite de **8 perguntas**, com aviso a partir de 5. A assistente pula o que o cliente já
  respondeu na conversa com a Konexya.
- As respostas **preenchem o perfil do lead no painel na hora**: as da lista padrão vão para a qualificação;
  as escritas pela imobiliária aparecem em "Respostas para a imobiliária".
- A assistente **não agenda, não negocia e não promete**. Visitas e propostas continuam só com o corretor
  (regra 4). Ela segue a regra 8 (só dados da base e do perfil).
- Ela **para quando o corretor envia a primeira mensagem**.
- As mensagens dela **não contam** no tempo até a primeira resposta humana (métrica central).
- O texto do consentimento (C-10) avisa que a assistente da imobiliária vai fazer algumas perguntas.
- Toda mensagem dela fica em `ai_action_log` (regra 10) e conta no limite diário de IA (regra 11).

**Escopo:** a configuração da assistente (nome, boas-vindas, perguntas, despedida, liga/desliga) entra na etapa 2.
"Tom de voz personalizado" (mudar o jeito de a IA escrever) continua fora do MVP.
