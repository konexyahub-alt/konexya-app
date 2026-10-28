@AGENTS.md

# Konexya — regras do projeto

Assistente imobiliário com IA. Para a imobiliária, "o SDR dentro de um sistema só"; para o comprador,
um assistente que entende o que ele precisa. MVP para piloto em Fortaleza (3 a 5 imobiliárias).
A tese: a imobiliária responde mais rápido e fecha mais quando o lead chega qualificado.

## Fontes (ordem de prioridade)

1. `docs/PLANO.md` (aprovado; vale onde divergir do prompt — seções 6, 7 e 8).
2. `docs/PROMPT.md` (instruções de construção; seção 5 resolve divergências protótipo × documento).
3. `docs/mvp.md` (fonte da verdade de escopo, regras e telas).
4. `docs/prototipo.html` (referência visual). Quando divergir do documento, vale o documento.

`docs/DECISOES.md` registra mudanças aprovadas pelo dono do produto depois desses documentos e vale sobre eles.

Os `.md` em `docs/` foram extraídos dos PDFs; em caso de dúvida de leitura, o PDF é o original.

## Processo

- Uma etapa por vez (0 a 4, ver PLANO seção 4). Ao fim de cada etapa: testes passando, deploy no
  ambiente de teste, mostrar o resultado e **esperar aprovação** antes de seguir.
- No início de cada etapa com telas, criar/atualizar os frames no Figma e só implementar depois de
  aprovados. Se o Figma não estiver acessível, avisar em vez de pular.
- Nunca mudar regra de negócio por conta própria. Se uma regra parecer errada ou impossível, parar e perguntar.
- Nada fora do escopo: escaneamento 3D, estudo de mercado/sugestão de preço, inteligência de procura,
  revisão periódica de anúncios pela IA, conversa com a IA pelo WhatsApp, apps nativos, tom de voz
  personalizado (o jeito de a IA escrever; nome, mensagens e perguntas da assistente entram, ver DECISOES), cobrança automática, outras cidades, integrações com CRMs/portais além da importação.
- Nada fictício em produção. Dados de exemplo só no ambiente de teste, marcados como tal. Nunca inventar
  números de mercado, de bairro ou de desempenho.

## Stack

- Next.js (App Router, versão 16 — ler `node_modules/next/dist/docs/` antes de usar uma API) +
  TypeScript + Tailwind v4. Um único PWA: cliente em `/app`, imobiliária em `/painel`, interno em `/admin`.
- Supabase (Postgres, Auth, Storage, Edge Functions, cron). Migrações versionadas em `supabase/migrations`.
  Isolamento entre imobiliárias garantido por **RLS no banco**, não só na interface.
- IA: API da Anthropic, **só no servidor**, saída estruturada validada com Zod antes de gravar.
- Google Maps Platform (Maps JS, Places, Routes), WhatsApp Cloud API (só templates aprovados), Resend.
- Vercel: Preview = teste, Production = produção, cada um com o seu projeto Supabase.
- Segredos só em variáveis de ambiente (`.env.example` lista todas). Nunca chave no código ou no repositório.

## Regras de negócio críticas (cada uma precisa de teste automatizado)

1. Sem consentimento registrado, nenhum dado do cliente chega à imobiliária. O consentimento vale para
   UMA imobiliária; outra pede um novo. A revogação bloqueia dados futuros. A imobiliária nunca lê as
   tabelas do cliente: recebe `leads.profile_snapshot`, atualizado só enquanto o consentimento está ativo.
2. Endereços exatos da rotina nunca vão para a imobiliária, só os tempos de deslocamento.
3. Nenhuma mensagem sai em nome do corretor sem aprovação dele. A IA sugere; o corretor aprova, edita ou
   descarta. Exceção: a assistente virtual da imobiliária (ligada por padrão, pode desligar) dá as boas-vindas
   e faz as perguntas configuradas pela imobiliária (até 8), pulando o que o perfil já tem. Ela aparece com o
   nome escolhido pela imobiliária e sempre com o selo "assistente virtual", nunca em nome do corretor. Não
   agenda, não negocia, não promete. Responde dúvidas só com dados da ficha dos imóveis do lead; o que não estiver
   na ficha, ou envolver preço, visita, financiamento ou opinião, vai para o corretor. Para quando o corretor envia a primeira mensagem. As respostas preenchem
   o perfil do lead na hora. Não contam na métrica central.
4. Só o corretor confirma visitas. Propostas sempre passam pelo corretor antes de ir ao proprietário.
5. Uma imobiliária nunca lê leads, imóveis não publicados ou métricas de outra. Testar contra o banco (pgTAP).
6. Alerta de WhatsApp só com opt-in separado dos termos; no máximo 1 alerta de imóvel novo por usuário a
   cada 24 h, e só acima da nota mínima (configurável, padrão 85).
7. Nota de compatibilidade calculada por código determinístico com pesos configuráveis, nunca pelo LLM.
   Toda nota mostra os motivos por critério. Faixas: verde ≥ 85, amarelo 75–84, vermelho < 75
   (`src/lib/score-band.ts`). Sem "potencial de investimento" na nota.
8. A IA responde só com dados da base e do perfil. Nunca inventa imóvel, preço ou atributo; diz quando algo
   é estimativa; não dá nota de segurança de bairro nem promete valorização.
9. Selo "Anúncio completo": regra objetiva e configurável (padrão: 5 fotos; metragem, valor, condomínio e
   IPTU; descrição ≥ 200 caracteres; pino confirmado). Peso pequeno na ordenação.
10. Toda ação da IA que chega ao cliente fica em `ai_action_log`.
11. Controle de custo: limite diário de mensagens de IA por usuário (padrão 60) e cache de rotas por
    imóvel × endereço × modo.
12. O cliente vê, corrige, exporta e exclui os próprios dados pelo app.

Métrica central: tempo até a primeira mensagem enviada ou aprovada por um humano (a boas-vindas automática
não conta).

## Interface

- Preto e branco, muito espaço em branco, Montserrat, ícones de linha (`src/components/ui`).
- Cor só com significado: verde atende ao perfil, amarelo atenção, vermelho não atende ou erro.
- Botão principal preto, texto branco, totalmente arredondado, mínimo 44 px. **Um por tela.**
- Slogan "Você conversa. A Konexya encontra." só na boas-vindas e no login.
- Português do Brasil, sempre "para", nunca "pra".
- Estados: carregando = esqueleto (conversa: três pontos); vazio = quadro tracejado + ação; erro = frase
  simples + "Tentar de novo", nunca código técnico; sem internet = faixa "Você está sem conexão";
  avisos = toast preto por 3 s; confirmação só para ações irreversíveis.
- Cliente: 360–430 px; no computador, coluna central estreita. Painel: a partir de 1280 px; no celular,
  barra inferior, tabelas viram cartões.
- Usar os componentes de `src/components/ui` antes de criar novos. A página `/referencia` (só fora de
  produção) mostra todos.

## Comandos

- `npm run dev` — desenvolvimento
- `npm run check` — lint + typecheck + testes (rodar antes de cada commit)
- `npm run build` — build de produção
