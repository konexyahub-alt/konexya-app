# Konexya

Assistente imobiliário com IA — MVP. Regras do projeto em [`CLAUDE.md`](CLAUDE.md); escopo e plano em [`docs/`](docs).

## Rodar localmente

Requer Node 22.

```bash
npm install
cp .env.example .env.local   # preencha com o projeto Supabase de teste
npm run dev                  # http://localhost:3000
```

- `/referencia` — componentes base (não existe em produção)
- `/api/saude` — ambiente atual e status da conexão com o Supabase

## Verificações

```bash
npm run check   # lint + typecheck + testes
npm run build
```

O CI (`.github/workflows/ci.yml`) roda as mesmas verificações e o build em cada push para `main` e em cada pull request.

## Ambientes

| Ambiente | Vercel | Supabase | `NEXT_PUBLIC_APP_ENV` |
| --- | --- | --- | --- |
| Local | `npm run dev` | projeto de teste (ou `supabase start`) | `local` |
| Teste | Preview (qualquer branch fora da `main`) | projeto **konexya teste** | `teste` |
| Produção | Production (`main`) | projeto **konexya producao** | `producao` |

### Configuração inicial (uma vez)

1. **Supabase**: na organização `konexya`, dois projetos na região São Paulo: `konexya teste` e `konexya producao`. Em ambos: *Enable Data API* ligado, *Automatically expose new tables* **desligado** (cada migração concede o acesso explicitamente) e *Enable automatic RLS* ligado. Em cada um, copie de *Project Settings → API* a URL e a *publishable key*.
   - A etiqueta "main · PRODUCTION" que o painel do Supabase mostra é o nome do banco principal de **qualquer** projeto, não o nosso ambiente. O ambiente é definido pelo projeto (`konexya teste` ou `konexya producao`).
2. **Vercel**: importe este repositório do GitHub. Em *Settings → Environment Variables*, cadastre:
   - `NEXT_PUBLIC_APP_ENV`: `teste` em Preview, `producao` em Production.
   - `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: valores do projeto de teste em Preview e do projeto de produção em Production.
3. Faça um push numa branch e abra `/api/saude` no link de Preview: deve responder `{"ambiente":"teste","supabase":"ok"}`.

As migrações do banco ficam em `supabase/migrations`. O workflow `Banco` (`.github/workflows/banco.yml`) as aplica junto com a configuração de login de `supabase/config.toml`: no projeto de teste a cada push numa branch de trabalho que mude `supabase/`, e na produção só no merge para a `main`. Ele precisa de três segredos no GitHub (*Settings → Secrets and variables → Actions*):

- `SUPABASE_ACCESS_TOKEN`: token pessoal criado em *supabase.com → Account → Access Tokens*.
- `SUPABASE_DB_PASSWORD_TESTE` e `SUPABASE_DB_PASSWORD_PRODUCAO`: a senha do banco de cada projeto (*Project Settings → Database → Reset database password*, se não tiver anotado).

Nenhuma chave vai para o repositório. A lista completa de variáveis, por etapa, está em `.env.example`.
