# Quiz de Diagnóstico ENEM

Quiz público que mostra ao estudante o quanto ele está preparado para o ENEM e captura o contato dele como lead. Uma área administrativa permite ao comercial consultar os leads e ao marketing editar as perguntas sem deploy.

- **Quiz (mobile first):** início → 10 perguntas com progresso e "voltar" → contato (nome, e-mail, WhatsApp) → resultado com nota 0–100, faixa, régua e resumo das respostas.
- **Painel:** login, indicadores (total, últimos 7 dias, média, distribuição por faixa, leads por dia), lista com busca, filtro por faixa e paginação, detalhe do lead com as respostas e os pontos, exportação CSV.
- **Editor de perguntas:** criar, editar, reordenar, desativar e reativar. Pergunta que já tem respostas nunca é sobrescrita: vira uma nova versão, e o histórico dos leads continua apontando para o que eles viram.

## Sumário

- [Como rodar](#como-rodar)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Acesso ao admin](#acesso-ao-admin)
- [Testes e qualidade](#testes-e-qualidade)
- [Arquitetura](#arquitetura)
- [Modelo de dados](#modelo-de-dados)
- [API](#api)
- [Decisões técnicas](#decisões-técnicas)
- [O que ficou de fora e o que eu faria com mais tempo](#o-que-ficou-de-fora-e-o-que-eu-faria-com-mais-tempo)
- [Deploy](#deploy)

## Como rodar

**Pré-requisitos:** Node 22 ou superior (desenvolvido no 24) e pnpm 11 (`corepack enable` resolve a versão pelo `packageManager`).

```bash
pnpm install
```

Há dois modos. Os dois rodam a **mesma API** (mesmo app Hono, mesmas rotas e regras); muda só onde fica o banco e o login.

### Modo rápido, sem Docker

A API sobe em Node sobre um Postgres em memória ([PGlite](https://pglite.dev)) com as migrations e o seed reais, e imita o Supabase Auth na própria porta (só login por senha, para o painel funcionar). Os dados somem ao encerrar.

```bash
# 1. API em http://127.0.0.1:8787
pnpm --filter @quiz/api dev:memory

# 2. Em outro terminal: aponte o login para a API em memória
cp apps/web/.env.example apps/web/.env.local
#   e no .env.local use:
#   VITE_SUPABASE_URL=http://127.0.0.1:8787
#   VITE_SUPABASE_ANON_KEY=dev-memory

# 3. Front em http://localhost:5173
pnpm --filter @quiz/web dev
```

### Modo completo, com Supabase local (Docker)

Precisa do [Docker Desktop](https://www.docker.com/products/docker-desktop/) rodando. O Supabase CLI já vem nas dependências.

```bash
pnpm db:start     # sobe Postgres, Auth e Studio do Supabase local
pnpm db:reset     # aplica as migrations de supabase/migrations e o supabase/seed.sql
pnpm db:status    # mostra API URL, anon key e JWT secret

cp apps/api/.dev.vars.example apps/api/.dev.vars     # SUPABASE_JWT_SECRET (o padrão do CLI já está lá)
cp apps/web/.env.example apps/web/.env.local         # VITE_SUPABASE_ANON_KEY = anon key do db:status

pnpm dev          # API (wrangler dev, :8787) e web (Vite, :5173) em paralelo
```

A API acessa o banco pelo binding do Hyperdrive, que no `wrangler dev` usa o `localConnectionString` do `wrangler.jsonc` (`postgresql://postgres:postgres@127.0.0.1:54322/postgres`). O Vite faz proxy de `/api` para `:8787`, então não há CORS em desenvolvimento.

Abra http://localhost:5173 para o quiz e http://localhost:5173/admin para o painel.

## Variáveis de ambiente

**API** (`apps/api`): `vars` no `wrangler.jsonc` e segredos no `.dev.vars` (local) ou `wrangler secret put` (produção).

| Variável | Onde | Para quê |
|---|---|---|
| `HYPERDRIVE` | binding (`wrangler.jsonc`) | Conexão com o Postgres. Local: `localConnectionString`; produção: id do Hyperdrive criado no painel |
| `SUPABASE_URL` | `vars` | Emissor dos tokens (`<url>/auth/v1`) e endereço do JWKS |
| `SUPABASE_JWT_SECRET` | segredo | Verificação HS256 (Supabase local e projetos com chave legada). Sem ele, a API valida tokens assimétricos pelo JWKS |
| `ALLOWED_ORIGINS` | `vars` | Origens liberadas no CORS, separadas por vírgula |
| `SUBMISSION_LIMITER` | binding `ratelimits` | Rate limit do envio do quiz (5 por minuto por IP) |

**Web** (`apps/web/.env.local`):

| Variável | Para quê |
|---|---|
| `VITE_API_URL` | Base da API. Vazio em dev (proxy do Vite); em produção, a URL do Worker |
| `VITE_SUPABASE_URL` | URL do Supabase, usada só no login do painel |
| `VITE_SUPABASE_ANON_KEY` | Chave pública (anon/publishable) do Supabase |

O quiz público não depende do Supabase no navegador: sem essas duas variáveis, só o login do painel fica indisponível (com aviso na tela).

## Acesso ao admin

| E-mail | Senha |
|---|---|
| `admin@quiz.local` | `Admin@12345` |

Criado pelo `supabase/seed.sql`, com `app_metadata.role = "admin"`. Vale só para ambiente local. O cadastro público está desligado no Supabase; novos usuários são criados pelo time de tecnologia.

## Testes e qualidade

```bash
pnpm test        # 224 testes: shared 53, api 134, web 37
pnpm typecheck   # TypeScript strict nos três pacotes
pnpm lint        # ESLint (typescript-eslint + react-hooks)
```

- **Regras puras** com testes unitários: pontuação e faixas (limites 0, 30, 31, 55, 56, 80, 81, 100 e pesos alterados), normalização de telefone e e-mail, schemas, CSV, preenchimento dos dias do dashboard, reducer do quiz.
- **Rotas** testadas com o app Hono real e repositórios fake injetados: status, formato de erro, autorização (401/403), 409 do e-mail repetido, 422 do quiz alterado, 429 do rate limit.
- **Repositórios** testados contra Postgres de verdade (PGlite em memória) com as migrations e o seed do projeto: transação do envio, versionamento, reordenação com o índice único parcial, busca com `%` e `_`, agregados por fuso horário.
- **Front:** verificado no navegador a 375 px e no desktop, fluxo completo contra a API.

## Arquitetura

```
apps/web (Cloudflare Pages) ──HTTP/JSON──▶ apps/api (Worker + Hono) ──SQL──▶ Postgres (Supabase)
      │                                         │          via Hyperdrive
      └── supabase-js (só login) ──▶ Supabase Auth ◀── verificação do JWT (segredo ou JWKS)

packages/shared: schemas Zod (lead, envio, pergunta), tipos de resposta, códigos de erro, formatadores
```

```
apps/api/src
  routes/         HTTP: validação (Zod), status, formato da resposta
  services/       regras: pontuação, envio, versionamento de perguntas, indicadores
  repositories/   interfaces + implementação Drizzle
  domain/         funções puras (pontuação e faixa)
  middleware/     requireAdmin, rateLimit
apps/web/src
  features/quiz   telas do quiz, estado em reducer persistido no sessionStorage
  features/admin  login, leads, dashboard, editor (carregado só em /admin)
  components/ui   componentes no estilo shadcn sobre Radix
```

- **Injeção de dependências por request:** `createApp(makeDeps)` recebe uma fábrica que monta os repositórios com a conexão do request. Os testes passam fakes ou o Drizzle sobre PGlite; produção passa o Drizzle sobre Hyperdrive.
- **Uma fonte de validação:** os mesmos schemas de `packages/shared` validam o formulário (React Hook Form) e a API (Hono). A API devolve erros por campo (`fieldErrors["lead.phone"]`) e o front os coloca no campo certo.
- **Erros padronizados:** `{ "error": { "code", "message", "details"? } }` em todas as rotas, com códigos tipados (`LEAD_ALREADY_SUBMITTED`, `QUIZ_OUTDATED`, `LAST_ACTIVE_QUESTION`…).

## Modelo de dados

```
quizzes            id, slug, title, is_active
questions          id, quiz_id, position, text, is_active, deactivated_at, previous_version_id
                   UNIQUE (quiz_id, position) WHERE is_active   ← índice parcial
options            id, question_id, position, text, weight (0–100)
result_bands       id, quiz_id, slug, label, message, min_score, max_score
leads              id, name, email (único, minúsculo), phone (só dígitos), latest_submission_id
submissions        id, lead_id, quiz_id, score, raw_points, max_points, band_* (snapshot)
submission_answers id, submission_id, question_id, option_id,
                   question_position, question_text, option_text, weight (snapshot)
```

**Pontuação** (só no backend): `score = round(soma dos pesos escolhidos / soma do maior peso de cada pergunta ativa × 100)`. Com o conteúdo do enunciado o máximo é 100, mas a normalização mantém a nota em 0–100 se o marketing mudar pesos ou o número de perguntas.

**Versionamento de perguntas:**

| Ação | Pergunta sem respostas | Pergunta com respostas |
|---|---|---|
| Editar | altera a própria linha | cria nova versão na mesma posição (`previous_version_id`) e desativa a antiga |
| Desativar | sai do quiz; posições se reorganizam | idem; nada é apagado |
| Reativar | volta no fim da lista | idem (versões substituídas não reativam: são histórico) |

Tudo em transação. As FKs das respostas são `ON DELETE RESTRICT`, então nem o banco aceita apagar conteúdo já respondido. RLS ligado em todas as tabelas sem políticas: o acesso aos dados é só pela API (a chave anon do Supabase não lê nada).

## API

Prefixo `/api/v1`. Rotas `/admin/*` exigem `Authorization: Bearer <token do Supabase>` com `app_metadata.role = "admin"` (sem token ou inválido → 401; sem papel → 403).

| Rota | Descrição |
|---|---|
| `GET /quiz` | Quiz ativo **sem pesos** |
| `POST /submissions` | Envia contato e respostas; devolve nota, faixa e resumo. 409 se o e-mail já respondeu (reenvio com `confirmReplace: true`), 422 validação ou quiz alterado, 429 rate limit |
| `GET /admin/leads` | Lista com `search`, `band`, `page`, `pageSize` |
| `GET /admin/leads/:id` | Detalhe com o último envio e as respostas com pontos |
| `GET /admin/leads/export.csv` | CSV com os mesmos filtros |
| `GET /admin/stats` | Indicadores do painel |
| `GET /admin/quiz` | Resumo: pontuação máxima, contagens e faixas |
| `GET /admin/quiz/questions?status=active\|inactive` | Perguntas com pesos e número de respostas |
| `POST /admin/quiz/questions` | Cria no fim |
| `PUT /admin/quiz/questions/:id` | Edita (`versioned: true` quando criou nova versão) |
| `DELETE /admin/quiz/questions/:id` | Desativa (nunca a última ativa) |
| `POST /admin/quiz/questions/:id/reactivate` | Reativa no fim |
| `PUT /admin/quiz/question-order` | Nova ordem das ativas |
| `GET /health` | Saúde |

Contrato completo (corpos, códigos de erro): [design do projeto, seção 9](docs/superpowers/specs/2026-11-27-quiz-diagnostico-enem-design.md#9-api-rest-prefixo-apiv1).

## Decisões técnicas

- **Lead × envio.** O lead é a pessoa (e-mail único); cada resposta ao quiz é um envio. Dedup por e-mail sem perder histórico; o painel mostra sempre o envio mais recente.
- **E-mail repetido com confirmação.** A API responde 409 sem gravar nada; o front avisa "Você já fez este diagnóstico" e, se a pessoa continuar, reenvia com `confirmReplace`. Não existe rota "esse e-mail existe?", e o 409 não expõe dados do envio anterior.
- **Pesos nunca vão ao navegador** e a nota é calculada só no servidor: ninguém descobre a "resposta certa" pelo DevTools nem manda uma nota forjada.
- **Snapshots nas respostas e na faixa.** O detalhe do lead mostra exatamente o texto e os pontos que ele viu, mesmo depois de edições.
- **Faixas no banco**, não no código: rótulos e mensagens também são conteúdo de marketing.
- **Quiz alterado durante o preenchimento** → 422 `QUIZ_OUTDATED`; o front avisa e recomeça com as perguntas novas. O estado salvo no `sessionStorage` também é reconciliado com o quiz atual ao carregar.
- **Drizzle + postgres.js via Hyperdrive.** SQL tipado e migrations versionadas (`drizzle-kit` gera em `supabase/migrations`, aplicadas pelo Supabase CLI); o Hyperdrive mantém o pool de conexões perto do Worker.
- **Supabase Auth no admin**, com o papel em `app_metadata` (o usuário não consegue editar). A API valida assinatura, expiração e emissor; aceita HS256 (local) e chaves assimétricas via JWKS (projetos novos).
- **Telefone normalizado para dígitos** (DDD de 11 a 99 + 8 ou 9 dígitos); aceita `+55 11 98765-4321`, `011987654321`, `(11) 98765-4321`. Formatação é papel da interface.
- **Busca segura:** `%` e `_` digitados são escapados no `ILIKE`.
- **CSV pensado para o Excel em pt-BR** (`;`, BOM UTF-8) e protegido contra injeção de fórmula (`=`, `+`, `-`, `@`).
- **Datas** sempre exibidas e agrupadas no fuso `America/Sao_Paulo` (o gráfico de leads por dia não "pula" lead das 22h para o dia seguinte).
- **Framer Motion removido.** O `AnimatePresence` travava a troca de pergunta em alguns cenários e deixava a pergunta anterior clicável; as transições ficaram em CSS (`tailwindcss-animate`) e respeitam `prefers-reduced-motion`.
- **Painel carregado sob demanda** (`/admin/*`): quem só faz o quiz não baixa o `supabase-js` nem o código do painel.
- **Modo sem Docker** (`dev:memory`): permite avaliar o projeto inteiro com `pnpm install` e dois comandos, e é o mesmo banco em memória dos testes de repositório.

## O que ficou de fora e o que eu faria com mais tempo

- **Confirmar o e-mail antes de substituir um resultado.** Hoje, quem souber o e-mail de alguém pode refazer o quiz em nome dele e trocar nome e telefone do lead (foi uma decisão de produto manter o fluxo sem atrito; o rate limit reduz o abuso). Com mais tempo, um código por e-mail (OTP) antes da substituição.
- **Rascunho e publicação** no editor, para o marketing preparar várias mudanças e publicar de uma vez; hoje cada alteração entra no ar na hora.
- **Editar faixas e a tela inicial** pelo painel (hoje vêm do seed).
- **Papéis separados** (marketing edita perguntas, comercial só vê leads); hoje existe um papel `admin`.
- **Testes E2E com Playwright** cobrindo o fluxo do quiz e do painel; hoje o front tem testes de unidade e verificação manual no navegador.
- **Observabilidade:** logs estruturados e alertas de erro no Worker.
- **Busca por trigram** (`pg_trgm`) se o volume de leads crescer.
- **Deploy** (abaixo): o código está pronto, mas não publiquei porque depende das contas da empresa/do avaliador.

## Deploy

Não está publicado. Passos para publicar:

1. **Supabase:** criar o projeto, rodar `supabase link` e `supabase db push` (migrations). Criar o usuário admin pelo painel do Supabase e definir `app_metadata.role = "admin"`. Desligar o cadastro público.
2. **Hyperdrive:** `wrangler hyperdrive create quiz-db --connection-string="<connection string do Supabase>"` e colocar o id no `wrangler.jsonc`.
3. **API:** ajustar `SUPABASE_URL` e `ALLOWED_ORIGINS` (domínio do Pages) e rodar `pnpm --filter @quiz/api exec wrangler deploy`. Em projetos com chave legada, `wrangler secret put SUPABASE_JWT_SECRET`.
4. **Web:** projeto no Cloudflare Pages com build `pnpm build`, saída `apps/web/dist`, e as variáveis `VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. O `_redirects` já trata as rotas do SPA.

## Documentação do processo

- [Design do projeto](docs/superpowers/specs/2026-11-27-quiz-diagnostico-enem-design.md): intenção, abordagens consideradas, modelo de dados e contrato da API.
- [Plano de implementação](docs/superpowers/plans/2026-11-27-quiz-diagnostico-enem.md): as fases e tarefas, cada uma entregue por PR.
- [Referência visual](design/brand-reference.md): tokens extraídos do site da Plataforma Assaad, e os protótipos das telas em `design/canvas`.
