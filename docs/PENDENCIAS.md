# Pendências que dependem de pagamento, conta ou terceiros

Lista do que ficou para depois porque depende de crédito, cobrança, cadastro externo ou documento.
Atualizar quando algo for resolvido. Decisões de produto ficam em `DECISOES.md`.

## 1. Crédito na Anthropic (IA)

**O que fazer:** em platform.claude.com, organização "Konexya", comprar cerca de US$ 10 de crédito e definir o limite
de gastos em US$ 20. Para a produção (piloto), configurar a cobrança antes de abrir ao público.

**O que fica parado até lá (o resto da etapa 2 funciona sem IA):**
- Conversa de perfil fora das respostas rápidas (texto livre do cliente).
- Resumo do lead para o corretor e sugestões de mensagem no painel.
- Respostas da Lia a perguntas livres do cliente (as perguntas com opções funcionam).
- Teste completo da etapa 2 com IA.
- Construir e testar a **conversa livre do piloto** (DECISOES, 2026-10-28): obrigatória antes da produção.
- Extração das preferências abertas do cliente pela IA, para a nota (DECISOES, 2026-10-28).

## 2. Google Maps Platform (Mapa Vivo, etapa 3)

**O que fazer:** decidir o pagamento do Google Maps (cartão na conta do Google Cloud) e criar as chaves
`NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY` e `GOOGLE_ROUTES_API_KEY` no Vercel.

**O que fica parado até lá:**
- Mapa Vivo (etapa 3) e o aviso "Você vai ver todos no Mapa Vivo" (não pode ir para produção antes da etapa 3).
- Proximidade real na nota: distância e tempo de trajeto até o trabalho, praia, escola ou o que o cliente citar.
  Hoje o teste só reconhece "mesmo bairro do trabalho".
- "Perto da praia" e "Serviços a pé" entrarem na nota.
- Mapa para posicionar e confirmar o pino no cadastro de imóveis. Sem pino confirmado, nenhum imóvel ganha o selo
  "Anúncio completo" (regra 9), então o selo também depende disso.

## 3. WhatsApp Cloud API

**O que fazer:** conta Meta Business verificada (pede CNPJ), número de telefone dedicado e templates aprovados
pela Meta.

**O que fica parado até lá:** alertas de imóvel novo por WhatsApp (regra 6) e avisos ao corretor por WhatsApp.

## 4. Documentos e empresa

- **CNPJ:** necessário para a verificação na Meta (WhatsApp) e recomendado para as cobranças (Anthropic,
  Google, Vercel).
- **Textos legais definitivos:** Termos de Uso e Política de Privacidade revisados por advogado, incluindo a
  idade mínima de 18 anos nos termos. Hoje os textos são provisórios.

## 5. CRECI-CE (acesso oficial aos dados)

**O que fazer (perto do lançamento do MVP público):** enviar ao CRECI-CE um pedido formal (ofício ou convênio) de
acesso oficial à consulta de inscritos, para a Konexya conferir o CRECI dos anunciantes automaticamente.

**O que fica parado até lá:** aprovação automática pelo CRECI. Hoje o CRECI é conferido à mão no Admin, com atalho
de consulta (DECISOES, 2026-10-29). Pedir ao Claude um rascunho do ofício quando for a hora.

## 6. Antes de ir para produção (checklist)

- [ ] Crédito e cobrança da Anthropic configurados, com limite de gastos.
- [ ] Conversa livre construída, testada e aprovada.
- [ ] Nota com preferências do cliente + critérios de base (meta do piloto).
- [ ] Google Maps pago e Mapa Vivo pronto (etapa 3).
- [ ] Textos legais definitivos publicados.
- [ ] Nenhum dado de exemplo ("[EXEMPLO]") no banco de produção.
- [ ] Pedido de acesso oficial aos dados do CRECI-CE enviado (seção 5).
