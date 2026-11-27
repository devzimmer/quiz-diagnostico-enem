# Quiz de Diagnóstico ENEM — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir o quiz público de diagnóstico ENEM com captura de leads e a área administrativa (leads + editor de perguntas versionado), em monorepo com API em Cloudflare Workers e banco Supabase.

**Architecture:** Monorepo pnpm com `packages/shared` (schemas Zod e tipos da API usados pelos dois lados), `apps/api` (Hono em Workers, camadas rotas → serviços → repositórios Drizzle, dependências injetadas para testar com fakes) e `apps/web` (React SPA por feature). Supabase local via CLI fornece Postgres e Auth; o Worker valida o JWT do Supabase nas rotas admin.

**Tech Stack:** pnpm 11, Node 24, TypeScript 5, Hono 4, Drizzle ORM + drizzle-kit, postgres.js 3, jose, Wrangler, Supabase CLI, Vitest, React 18, Vite 5, Tailwind 3, shadcn/ui, React Router 6, TanStack Query 5, React Hook Form 7, Zod 3, Framer Motion 11, Sonner 1, Recharts 2.

**Spec:** `docs/superpowers/specs/2026-11-27-quiz-diagnostico-enem-design.md` (ler antes de qualquer tarefa). Telas: `design/canvas/*.dc.html`; tokens: `design/brand-reference.md`.

## Global Constraints

- Majors fixas: React 18, TypeScript 5, Vite 5, Tailwind 3, React Router 6, TanStack Query 5, React Hook Form 7, Zod 3, Framer Motion 11, Sonner 1, Recharts 2. Não subir majors.
- Prefixo da API: `/api/v1`. Corpo de erro sempre `{ "error": { "code": string, "message": string, "details"?: object } }`.
- Pesos das alternativas **nunca** aparecem em respostas de rotas públicas.
- Pontuação só é calculada no backend: `score = round(raw_points / max_points * 100)`; `max_points` = soma do maior peso de cada pergunta ativa.
- Faixas (seed): `ponto-de-partida` 0–30, `em-construcao` 31–55, `bom-caminho` 56–80, `reta-final` 81–100, com as mensagens do enunciado (spec §2/§8).
- Textos da interface em pt-BR. Quiz é mobile first (referência 390px), alvos de toque ≥ 44px, `prefers-reduced-motion` respeitado.
- Datas exibidas em pt-BR no fuso `America/Sao_Paulo`.
- Commits pequenos, Conventional Commits em português (`feat: ...`, `test: ...`), terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Uma branch por fase (`feat/<fase>`), PR com o que foi feito, por quê e como testar. Merge com **merge commit** (`gh pr merge --merge`) e **somente depois que o Gabriel aprovar** a PR.
- Credenciais do admin local: `admin@quiz.local` / `Admin@12345` (só seed local; documentar no README).

## Review Focus

1. Telefone digitado/colado em formatos variados (`+55 11 98765-4321`, `011987654321`, `(11) 98765-4321`) deve ser aceito e normalizado para `11987654321` — teste na Task 1.
2. E-mail com maiúsculas/espaços (`  Maria@Email.COM `) deve contar como o mesmo lead de `maria@email.com` (dedup e 409) — testes nas Tasks 1 e 7.
3. Quiz alterado no admin enquanto alguém responde (pergunta desativada/substituída) → API responde 422 `QUIZ_OUTDATED` e o front reinicia o quiz com aviso — testes nas Tasks 7 e 13.
4. Sessão do admin expirada no meio do uso → 401, front sai e volta ao login com mensagem — teste na Task 8 (token expirado) e tratamento na Task 16.
5. Busca de leads com `%` ou `_` não pode virar curinga do `ILIKE` — teste na Task 9.

---

## Estrutura de arquivos

```
package.json                 scripts raiz (test, typecheck, lint, db:*)
pnpm-workspace.yaml
tsconfig.base.json
eslint.config.js · .prettierrc
supabase/
  config.toml                gerado por `supabase init`; signup desabilitado
  migrations/                SQL gerado pelo drizzle-kit (prefixo supabase)
  seed.sql                   quiz do anexo, faixas, usuário admin
packages/shared/src/
  lead.ts                    leadInputSchema, normalizePhone, normalizeEmail
  question.ts                questionContentSchema
  submission.ts              submissionInputSchema
  admin.ts                   leadListQuerySchema, questionStatusSchema, reorderSchema
  api-types.ts               tipos de resposta da API
  errors.ts                  ErrorCode, ApiErrorBody
  index.ts
apps/api/
  wrangler.jsonc · .dev.vars.example · drizzle.config.ts
  src/index.ts               export default { fetch } com deps reais
  src/app.ts                 createApp(makeDeps) → Hono
  src/env.ts                 tipo Env (bindings)
  src/deps.ts                AppDeps + makeDeps(env)
  src/db/schema.ts · src/db/client.ts
  src/lib/http-error.ts · src/lib/validate.ts · src/lib/like.ts · src/lib/csv.ts
  src/auth/verify-token.ts · src/middleware/require-admin.ts · src/middleware/rate-limit.ts
  src/domain/scoring.ts
  src/repositories/types.ts  interfaces
  src/repositories/drizzle/*.ts  implementações
  src/services/submission-service.ts · src/services/question-admin-service.ts · src/services/stats-service.ts
  src/routes/public.ts · src/routes/admin-leads.ts · src/routes/admin-quiz.ts · src/routes/admin-stats.ts
  test/fakes.ts              fakes em memória dos repositórios
apps/web/
  vite.config.ts · tailwind.config.ts · components.json · .env.example
  src/main.tsx · src/router.tsx
  src/lib/api-client.ts · src/lib/supabase.ts · src/lib/format.ts
  src/components/ui/*        shadcn
  src/components/Logo.tsx
  src/features/quiz/         state.ts (reducer), QuizProvider.tsx, hooks.ts, pages/*, components/*
  src/features/admin/        auth/*, layout/*, leads/*, questions/*, dashboard/*
```

---

## Fase 1 — Fundação (branch `feat/fundacao`)

### Task 1: Monorepo e validação do lead

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `eslint.config.js`, `.prettierrc`, `.editorconfig`
- Create: `packages/shared/package.json`, `packages/shared/tsconfig.json`, `packages/shared/src/lead.ts`, `packages/shared/src/index.ts`
- Test: `packages/shared/src/lead.test.ts`

**Interfaces:**
- Produces: pacote `@quiz/shared` (exports `./src/index.ts`, sem build). `normalizePhone(raw: string): string` (só dígitos, remove `55` inicial quando sobram 12–13 dígitos e `0` de tronco); `normalizeEmail(raw: string): string` (trim + minúsculas); `leadInputSchema: z.ZodType<LeadInput>` com `LeadInput = { name: string; email: string; phone: string }` já normalizado; `PHONE_ERROR_MESSAGE = "Informe DDD + número. Ex.: (11) 98765-4321"`.
- Scripts raiz: `pnpm test` (`pnpm -r test`), `pnpm typecheck`, `pnpm lint`, `pnpm format`.

- [ ] **Step 1: Criar workspace** — `pnpm-workspace.yaml` com `apps/*` e `packages/*`; `tsconfig.base.json` com `strict`, `noUncheckedIndexedAccess`, `moduleResolution: "Bundler"`, `target: "ES2022"`; ESLint flat config com `typescript-eslint` recomendado; Prettier (`singleQuote`, `semi: false`, `printWidth: 100`). `packages/shared` com `zod@3` e `vitest`.

- [ ] **Step 2: Escrever o teste que falha**

```ts
// packages/shared/src/lead.test.ts
describe('normalizePhone', () => {
  it.each([
    ['(11) 98765-4321', '11987654321'],
    ['+55 11 98765-4321', '11987654321'],
    ['011987654321', '11987654321'],
    ['11 3456-7890', '1134567890'],
  ])('%s → %s', (raw, expected) => expect(normalizePhone(raw)).toBe(expected))
})

describe('leadInputSchema', () => {
  const valid = { name: 'Mariana Souza', email: 'mariana@email.com', phone: '(11) 98765-4321' }
  it('aceita e normaliza', () => {
    expect(leadInputSchema.parse({ ...valid, email: '  Maria@Email.COM ' }))
      .toEqual({ name: 'Mariana Souza', email: 'maria@email.com', phone: '11987654321' })
  })
  it('rejeita nome com menos de 3 caracteres após trim', () =>
    expect(leadInputSchema.safeParse({ ...valid, name: ' Al ' }).success).toBe(false))
  it.each(['mariana@', 'mariana.email.com', ''])('rejeita e-mail %s', (email) =>
    expect(leadInputSchema.safeParse({ ...valid, email }).success).toBe(false))
  it.each(['98765-4321', '(01) 98765-4321', '(10) 98765-4321', '(11) 88765-4321', '(11) 98765-43210'])(
    'rejeita telefone %s com a mensagem padrão', (phone) => {
      const r = leadInputSchema.safeParse({ ...valid, phone })
      expect(r.success).toBe(false)
      expect(r.error?.flatten().fieldErrors.phone).toEqual([PHONE_ERROR_MESSAGE])
    })
})
```

- [ ] **Step 3: Rodar e ver falhar** — `pnpm --filter @quiz/shared test` → FAIL (módulo `./lead` inexistente).

- [ ] **Step 4: Implementar `packages/shared/src/lead.ts`** — regras da spec §10: nome trim 3–100; e-mail `z.string().trim().toLowerCase().email().max(254)`; telefone via `normalizePhone` + `refine`: 10 ou 11 dígitos, DDD com dois dígitos de 1–9 (11–99 sem zero), se 11 dígitos o terceiro é `9`. Mensagens em pt-BR. Reexportar em `index.ts`.

- [ ] **Step 5: Rodar e ver passar** — `pnpm --filter @quiz/shared test` → PASS. `pnpm lint && pnpm typecheck` sem erros.

- [ ] **Step 6: Commit** — `chore: configura monorepo pnpm` (workspace, lint, prettier) e `feat(shared): valida e normaliza dados do lead` (lead.ts + testes).

### Task 2: Schemas de envio, conteúdo de pergunta e contratos da API

**Files:**
- Create: `packages/shared/src/question.ts`, `submission.ts`, `admin.ts`, `api-types.ts`, `errors.ts`
- Modify: `packages/shared/src/index.ts`
- Test: `packages/shared/src/question.test.ts`, `submission.test.ts`, `admin.test.ts`

**Interfaces:**
- Produces:
  - `questionContentSchema` → `QuestionContent = { text: string; options: { text: string; weight: number }[] }` (texto trim 5–300; 2–6 alternativas; texto da alternativa trim 1–200; peso inteiro 0–100).
  - `submissionInputSchema` → `SubmissionInput = { lead: LeadInput; answers: { questionId: string; optionId: string }[]; confirmReplace?: boolean }` (uuids; 1–50 respostas; `questionId` repetido → erro em `answers`).
  - `leadListQuerySchema` → `LeadListQuery = { search?: string; band?: string; page: number; pageSize: number }` (coerce de query string; search trim ≤ 100; band `^[a-z0-9-]+$`; page ≥ 1 padrão 1; pageSize 1–100 padrão 20).
  - `questionStatusSchema` = `z.enum(['active','inactive']).default('active')`; `reorderSchema` = `{ questionIds: string[] }` (uuids, sem repetidos).
  - `ErrorCode` = `'INVALID_JSON' | 'VALIDATION_ERROR' | 'QUIZ_OUTDATED' | 'LEAD_ALREADY_SUBMITTED' | 'NOT_FOUND' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'RATE_LIMITED' | 'QUESTION_INACTIVE' | 'QUESTION_REPLACED' | 'QUESTION_ALREADY_ACTIVE' | 'LAST_ACTIVE_QUESTION' | 'INTERNAL_ERROR'`; `ApiErrorBody = { error: { code: ErrorCode; message: string; details?: Record<string, unknown> } }`. Erros de validação usam `details.fieldErrors: Record<string, string[]>`.
  - `api-types.ts`: `PublicQuiz = { id; title; questions: { id; position; text; options: { id; position; text }[] }[] }`; `Band = { slug; label; message }`; `SubmissionResult = { submissionId; score; band: Band; answers: { position; question; option }[] }`; `LeadListItem = { id; name; email; phone; score; band: { slug; label }; createdAt: string }`; `Paginated<T> = { data: T[]; pagination: { page; pageSize; total } }`; `LeadDetail = LeadListItem & { band: Band; submittedAt: string; submissionCount: number; answers: { position; question; option; weight }[] }`; `AdminQuizSummary = { id; title; maxPoints; activeCount; inactiveCount; bands: { slug; label; minScore; maxScore }[] }`; `AdminOption = { id; position; text; weight }`; `AdminQuestion = { id; position; text; answerCount; options: AdminOption[] }`; `InactiveAdminQuestion = Omit<AdminQuestion, 'position'> & { inactiveReason: 'replaced' | 'deactivated'; deactivatedAt: string; replacedBy: { id: string; position: number | null } | null }`; `UpdateQuestionResult = { question: AdminQuestion; versioned: boolean }`; `AdminStats` entra na Task 21. Datas em ISO 8601.

- [ ] **Step 1: Escrever os testes que falham** — `question.test.ts`: aceita 2 e 6 alternativas, rejeita 1 e 7, rejeita peso `-1`, `101` e `2.5`, rejeita texto com 4 caracteres. `submission.test.ts`: aceita payload válido com `confirmReplace` ausente; rejeita `questionId` duplicado com `fieldErrors.answers` preenchido; rejeita uuid inválido. `admin.test.ts`: `leadListQuerySchema.parse({ page: '2', pageSize: '50' })` → números; `pageSize: '101'` falha; `band: 'Bom Caminho'` falha.
- [ ] **Step 2: Rodar e ver falhar** — `pnpm --filter @quiz/shared test` → FAIL.
- [ ] **Step 3: Implementar os módulos** conforme Interfaces e reexportar em `index.ts`.
- [ ] **Step 4: Rodar e ver passar** — `pnpm --filter @quiz/shared test` → PASS.
- [ ] **Step 5: Commit** — `feat(shared): define schemas de envio, pergunta e contratos da API`.
- [ ] **Step 6: Abrir PR da Fase 1** — `git push -u origin feat/fundacao`; `gh pr create --base main --title "Fundação: monorepo e schemas compartilhados"` com descrição (o que, por quê, `pnpm test`). Aguardar aprovação do Gabriel; então `gh pr merge --merge`.

---

## Fase 2 — Banco (branch `feat/banco`)

> Pré-requisito: Docker Desktop instalado e rodando (`docker info` responde).

### Task 3: Schema Drizzle, migration e seed

**Files:**
- Create: `supabase/config.toml` (via `pnpm exec supabase init`), `supabase/seed.sql`, `supabase/migrations/*.sql` (gerado)
- Create: `apps/api/package.json`, `apps/api/tsconfig.json`, `apps/api/drizzle.config.ts`, `apps/api/src/db/schema.ts`, `apps/api/src/db/client.ts`
- Modify: `package.json` (devDependency `supabase`; scripts `db:start`, `db:stop`, `db:reset`, `db:generate`, `db:status`)

**Interfaces:**
- Produces: tabelas Drizzle exportadas `quizzes`, `questions`, `options`, `resultBands`, `leads`, `submissions`, `submissionAnswers` (nomes de colunas em snake_case no banco, camelCase no TS); `createDb(connectionString: string) => { db: PostgresJsDatabase<typeof schema>; close: () => Promise<void> }` usando `postgres(url, { max: 5, fetch_types: false, prepare: false })`; tipo `Db = ReturnType<typeof createDb>['db']`.

- [ ] **Step 1: Inicializar Supabase** — `pnpm exec supabase init` na raiz. Em `config.toml`: `[auth] enable_signup = false`, `site_url = "http://localhost:5173"`, `[db.seed] sql_paths = ["./seed.sql"]`.

- [ ] **Step 2: Escrever `apps/api/src/db/schema.ts`** exatamente como a spec §7, mais:
  - `quizzes`: índice único parcial `quizzes_single_active` em `(is_active) WHERE is_active`.
  - `questions`: `uniqueIndex('questions_active_position_uq').on(quizId, position).where(sql\`is_active\`)`; `check('questions_active_matches_deactivated', sql\`is_active = (deactivated_at IS NULL)\`)`; `previous_version_id` auto-referência.
  - `options.question_id` → `ON DELETE CASCADE`; `submission_answers.question_id/option_id` → `ON DELETE RESTRICT`; `submission_answers.submission_id` → `ON DELETE CASCADE`.
  - `leads.email` `text` único; `leads.latest_submission_id` FK nullable para `submissions.id` (`ON DELETE SET NULL`).
  - Índices: `leads(created_at desc)`, `submissions(lead_id, created_at desc)`, `submission_answers(question_id)`.
  - `uuid` com `defaultRandom()`, timestamps `timestamptz` com `defaultNow()`.

- [ ] **Step 3: Gerar migration** — `drizzle.config.ts` com `dialect: 'postgresql'`, `schema: './src/db/schema.ts'`, `out: '../../supabase/migrations'`, `migrations: { prefix: 'supabase' }`. Rodar `pnpm db:generate`. Expected: um arquivo `supabase/migrations/<timestamp>_*.sql` com as 7 tabelas, o índice parcial e o check.

- [ ] **Step 4: Escrever `supabase/seed.sql`** — idempotente sobre banco recém-resetado:
  1. Quiz `slug = 'diagnostico-enem'`, `title = 'Qual é a sua chance real de passar no ENEM?'`, `is_active = true`.
  2. As 10 perguntas (posições 1–10) e alternativas (posições 1..n) com os pesos abaixo, usando CTEs para ligar ids.
  3. As 4 faixas (Global Constraints) com as mensagens: *Você está começando. Uma rotina estruturada faz a maior diferença agora.* / *Você já tem base, mas falta consistência para chegar na nota de corte.* / *Sua preparação está sólida. O ganho agora vem de ajuste fino.* / *Você está muito bem posicionado. O foco é manter o ritmo e não perder pontos bobos.*
  4. Usuário admin em `auth.users` (`email = 'admin@quiz.local'`, `encrypted_password = crypt('Admin@12345', gen_salt('bf'))`, `email_confirmed_at = now()`, `aud`/`role = 'authenticated'`, `raw_app_meta_data = '{"provider":"email","providers":["email"],"role":"admin"}'`, colunas de token `''`) e a linha correspondente em `auth.identities` (`provider = 'email'`, `provider_id` = id do usuário, `identity_data` com `sub` e `email`).

  Conteúdo (pergunta → alternativa:peso):
  1. Em que etapa dos estudos você está? → Estou no 1º ou 2º ano do ensino médio:2 · Estou no 3º ano:5 · Já terminei o ensino médio e estudo por conta:7 · Já terminei e faço cursinho:10
  2. Quantas horas por semana você estuda além da escola/cursinho? → Menos de 2 horas:0 · De 3 a 6 horas:4 · De 7 a 14 horas:7 · 15 horas ou mais:10
  3. Quantos simulados completos você já fez? → Nenhum:0 · 1 ou 2:3 · De 3 a 5:7 · Mais de 5:10
  4. Como está sua preparação para a redação? → Nunca escrevi uma redação no modelo ENEM:0 · Escrevi algumas, mas sem correção:3 · Escrevo e recebo correção de vez em quando:7 · Escrevo semanalmente com correção:10
  5. Você tem um plano de estudos definido? → Não, estudo conforme dá:0 · Tenho uma ideia geral do que preciso estudar:3 · Tenho um plano, mas sigo parcialmente:7 · Tenho um plano e sigo à risca:10
  6. Qual é a sua maior dificuldade hoje? → Não consigo me organizar nem manter constância:2 · Matemática e Ciências da Natureza:5 · Redação:5 · Linguagens e Ciências Humanas:7 · Não tenho dificuldade específica, quero melhorar no geral:10
  7. Qual foi sua média aproximada nos últimos simulados? → Não sei / nunca fiz:0 · Abaixo de 500:3 · Entre 500 e 650:6 · Entre 650 e 750:8 · Acima de 750:10
  8. Quão claro está seu objetivo de curso e universidade? → Ainda não sei o que quero cursar:2 · Tenho duas ou três opções em mente:5 · Sei o curso, mas não sei a nota de corte:7 · Sei o curso, a universidade e a nota de corte que preciso:10
  9. Com que frequência você revisa o conteúdo que já estudou? → Não reviso, só avanço para matéria nova:0 · Reviso só na véspera das provas:3 · Reviso de vez em quando, sem método definido:7 · Tenho uma rotina de revisão programada:10
  10. Você pretende investir em um cursinho ou mentoria neste ano? → Não pretendo investir:2 · Talvez, mas ainda não pesquisei nada:5 · Estou pesquisando opções agora:8 · Já decidi que vou, só falta escolher onde:10

- [ ] **Step 5: Verificar** — `pnpm db:start` e `pnpm db:reset`. Depois:

```bash
pnpm exec supabase db query "select count(*) from questions where is_active" # 10
pnpm exec supabase db query "select sum(max_w) from (select max(o.weight) max_w from options o join questions q on q.id=o.question_id group by q.id) t" # 100
pnpm exec supabase db query "select raw_app_meta_data->>'role' from auth.users where email='admin@quiz.local'" # admin
```
(Se o subcomando `db query` não existir na versão instalada, usar `psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -c "..."`.) Tentar `delete from questions` num banco com respostas deve falhar por FK — verificado na Task 7.

- [ ] **Step 6: Commit** — `feat(db): cria schema, migration e seed do quiz e do admin`.
- [ ] **Step 7: Abrir PR da Fase 2** — título "Banco: schema, migrations e seed". Merge após aprovação.

---

## Fase 3 — API pública (branch `feat/api-publica`)

### Task 4: Esqueleto da API, erros e injeção de dependências

**Files:**
- Create: `apps/api/wrangler.jsonc`, `apps/api/.dev.vars.example`, `apps/api/src/env.ts`, `src/deps.ts`, `src/app.ts`, `src/index.ts`, `src/lib/http-error.ts`, `src/lib/validate.ts`, `src/repositories/types.ts`, `test/fakes.ts`
- Test: `apps/api/src/app.test.ts`

**Interfaces:**
- Consumes: `ApiErrorBody`, `ErrorCode` (Task 2); `createDb` (Task 3).
- Produces:
  - `class HttpError extends Error { constructor(status: number, code: ErrorCode, message: string, details?: Record<string, unknown>) }`.
  - `validate<T extends ZodSchema>(target: 'json' | 'query' | 'param', schema: T)` — middleware (sobre `@hono/zod-validator`) que lança `HttpError(422, 'VALIDATION_ERROR', 'Dados inválidos', { fieldErrors })`.
  - `type AppDeps = { quizRepo: QuizRepository; submissionRepo: SubmissionRepository; leadQueryRepo: LeadQueryRepository; questionAdminRepo: QuestionAdminRepository; verifyToken: VerifyToken; submissionLimiter?: RateLimiter; dispose?: () => Promise<void> }` (interfaces em `repositories/types.ts`; as que ainda não têm método começam vazias e crescem nas tasks seguintes). O middleware de deps chama `c.executionCtx.waitUntil(deps.dispose())` depois de `await next()` para fechar a conexão postgres.js do request.
  - `createApp(makeDeps: (env: Env) => AppDeps): Hono<{ Bindings: Env; Variables: { deps: AppDeps; user?: AuthUser } }>` — monta CORS (`ALLOWED_ORIGINS` separado por vírgula), middleware que faz `c.set('deps', makeDeps(c.env))`, rotas sob `/api/v1`, `notFound` → 404 `NOT_FOUND`, `onError` → `HttpError` vira seu status/corpo; `HTTPException` 400 de JSON malformado → 400 `INVALID_JSON`; o resto → 500 `INTERNAL_ERROR` (com `console.error`).
  - `Env = { HYPERDRIVE: Hyperdrive; SUPABASE_URL: string; SUPABASE_JWT_SECRET?: string; ALLOWED_ORIGINS: string; SUBMISSION_LIMITER?: RateLimit }`.
  - `test/fakes.ts`: `makeFakeDeps(overrides?: Partial<AppDeps>): AppDeps`.

- [ ] **Step 1: Configurar Wrangler** — `wrangler.jsonc`: `main: "src/index.ts"`, `compatibility_flags: ["nodejs_compat"]`, `compatibility_date` = a data mais recente aceita pelo Wrangler instalado, `hyperdrive: [{ binding: "HYPERDRIVE", id: "local-dev", localConnectionString: "postgresql://postgres:postgres@127.0.0.1:54322/postgres" }]`. `.dev.vars.example`: `SUPABASE_URL=http://127.0.0.1:54321`, `SUPABASE_JWT_SECRET=` (copiar de `pnpm db:status`), `ALLOWED_ORIGINS=http://localhost:5173`. Scripts: `dev` (`wrangler dev --port 8787`), `test` (`vitest run`), `typecheck`.

- [ ] **Step 2: Escrever o teste que falha**

```ts
// apps/api/src/app.test.ts
const app = createApp(() => makeFakeDeps())
it('GET /api/v1/health → 200 { status: "ok" }', async () => {
  const res = await app.request('/api/v1/health')
  expect(res.status).toBe(200)
  expect(await res.json()).toEqual({ status: 'ok' })
})
it('rota inexistente → 404 NOT_FOUND', async () => {
  const res = await app.request('/api/v1/nada')
  expect(res.status).toBe(404)
  expect((await res.json()).error.code).toBe('NOT_FOUND')
})
it('erro inesperado → 500 INTERNAL_ERROR sem vazar mensagem', async () => { /* rota de teste que lança Error('segredo') */ })
```

- [ ] **Step 3: Rodar e ver falhar** — `pnpm --filter @quiz/api test` → FAIL.
- [ ] **Step 4: Implementar** `http-error.ts`, `validate.ts`, `app.ts` (com `/health`), `deps.ts` (`makeDeps(env)` cria `createDb(env.HYPERDRIVE.connectionString)` por request e instancia os repositórios Drizzle), `index.ts` (`export default { fetch: createApp(makeDeps).fetch }`).
- [ ] **Step 5: Rodar e ver passar** — `pnpm --filter @quiz/api test` → PASS; `pnpm --filter @quiz/api dev` e `curl http://127.0.0.1:8787/api/v1/health` → `{"status":"ok"}`.
- [ ] **Step 6: Commit** — `feat(api): cria app Hono com tratamento de erros padronizado`.

### Task 5: Cálculo de pontuação e faixa

**Files:**
- Create: `apps/api/src/domain/scoring.ts`
- Test: `apps/api/src/domain/scoring.test.ts`

**Interfaces:**
- Produces: `type ScoringQuestion = { id: string; options: { id: string; weight: number }[] }`; `calculateScore(questions: ScoringQuestion[], selectedOptionByQuestion: Map<string, string>): { rawPoints: number; maxPoints: number; score: number }`; `type ScoreBand = { slug: string; label: string; message: string; minScore: number; maxScore: number }`; `findBand(bands: ScoreBand[], score: number): ScoreBand` (lança `Error` se nenhuma faixa cobre — erro de configuração, vira 500).

- [ ] **Step 1: Escrever o teste que falha**

```ts
it('soma pesos e normaliza para 0–100', () => {
  // 2 perguntas, maior peso 12 cada (max 24); escolhidas 6 + 6 = 12 → 50
  expect(calculateScore(qs, sel)).toEqual({ rawPoints: 12, maxPoints: 24, score: 50 })
})
it('arredonda para o inteiro mais próximo', () => /* 2 de 3 → 67 */)
it('max_points 0 → score 0 (sem NaN)', () => /* todos os pesos 0 */)
it.each([[0,'ponto-de-partida'],[30,'ponto-de-partida'],[31,'em-construcao'],[55,'em-construcao'],
         [56,'bom-caminho'],[80,'bom-caminho'],[81,'reta-final'],[100,'reta-final']])(
  'score %i → %s', (score, slug) => expect(findBand(BANDS, score).slug).toBe(slug))
```
- [ ] **Step 2: Rodar e ver falhar** — `pnpm --filter @quiz/api test scoring` → FAIL.
- [ ] **Step 3: Implementar** `scoring.ts` (`maxPoints` = soma do maior peso de cada pergunta; `rawPoints` = soma dos pesos escolhidos; `Math.round`).
- [ ] **Step 4: Rodar e ver passar** → PASS.
- [ ] **Step 5: Commit** — `feat(api): calcula pontuação normalizada e faixa`.

### Task 6: `GET /quiz`

**Files:**
- Create: `apps/api/src/repositories/drizzle/quiz-repository.ts`, `apps/api/src/routes/public.ts`
- Modify: `src/repositories/types.ts`, `src/app.ts`, `test/fakes.ts`
- Test: `apps/api/src/routes/public.quiz.test.ts`

**Interfaces:**
- Produces: `QuizRepository = { getActivePublicQuiz(): Promise<PublicQuiz | null>; getActiveQuizForScoring(): Promise<ScoringQuiz | null> }` com `ScoringQuiz = { id: string; questions: (ScoringQuestion & { position: number; text: string; options: { id: string; weight: number; text: string }[] })[]; bands: ScoreBand[] }`. Só perguntas ativas, ordenadas por `position`; alternativas por `position`.

- [ ] **Step 1: Teste que falha** — com fake retornando um quiz: `GET /api/v1/quiz` → 200, corpo igual ao `PublicQuiz` e `JSON.stringify(body)` **não contém** `"weight"`; fake retornando `null` → 404 `NOT_FOUND`.
- [ ] **Step 2: Rodar e ver falhar.**
- [ ] **Step 3: Implementar** rota em `public.ts` e o repositório Drizzle (uma query com join ou duas queries; mapear sem `weight` em `getActivePublicQuiz`).
- [ ] **Step 4: Rodar e ver passar**; com banco local: `curl http://127.0.0.1:8787/api/v1/quiz` → 10 perguntas, sem pesos.
- [ ] **Step 5: Commit** — `feat(api): expõe quiz ativo sem pesos`.

### Task 7: `POST /submissions`

**Files:**
- Create: `apps/api/src/services/submission-service.ts`, `apps/api/src/repositories/drizzle/submission-repository.ts`
- Modify: `src/routes/public.ts`, `src/repositories/types.ts`, `test/fakes.ts`
- Test: `apps/api/src/services/submission-service.test.ts`, `apps/api/src/routes/public.submissions.test.ts`

**Interfaces:**
- Consumes: `calculateScore`, `findBand` (Task 5); `QuizRepository.getActiveQuizForScoring` (Task 6); `submissionInputSchema` (Task 2).
- Produces:
  - `SubmissionRepository = { leadHasSubmission(email: string): Promise<boolean>; saveSubmission(data: NewSubmission): Promise<{ submissionId: string; leadId: string }> }`, `NewSubmission = { lead: LeadInput; quizId: string; rawPoints; maxPoints; score; band: ScoreBand; answers: { questionId; optionId; questionPosition; questionText; optionText; weight }[] }`.
  - `submitQuiz(deps: Pick<AppDeps, 'quizRepo' | 'submissionRepo'>, input: SubmissionInput): Promise<SubmissionResult>`.

- [ ] **Step 1: Testes do serviço que falham** (fakes):
  - envio válido → `SubmissionResult` com score/faixa corretos e `answers` ordenadas por posição; `saveSubmission` recebe snapshot de textos e pesos.
  - e-mail já com envio e sem `confirmReplace` → `HttpError` 409 `LEAD_ALREADY_SUBMITTED`, `saveSubmission` **não** chamado.
  - mesmo caso com `confirmReplace: true` → salva.
  - e-mail novo com `confirmReplace: true` → salva normalmente.
  - resposta faltando para pergunta ativa, `questionId` desconhecido, ou `optionId` de outra pergunta → 422 `QUIZ_OUTDATED`.
  - sem quiz ativo → 404 `NOT_FOUND`.
- [ ] **Step 2: Teste da rota que falha** — corpo `{` → 400 `INVALID_JSON`; telefone inválido → 422 `VALIDATION_ERROR` com `details.fieldErrors.phone`; envio válido → 201; 409 propagado.
- [ ] **Step 3: Rodar e ver falhar.**
- [ ] **Step 4: Implementar** serviço, rota (`validate('json', submissionInputSchema)` → `submitQuiz` → `c.json(result, 201)`) e `saveSubmission` numa transação Drizzle: upsert do lead por e-mail (`onConflictDoUpdate` de `name`, `phone`, `updated_at`), insert do submission com snapshot da faixa, insert das respostas, update de `leads.latest_submission_id`.
- [ ] **Step 5: Rodar e ver passar.** Com banco local: enviar o mesmo e-mail duas vezes via `curl` (segunda → 409; com `"confirmReplace": true` → 201); `delete from questions` → erro de FK.
- [ ] **Step 6: Commit** — `feat(api): registra envio com pontuação, snapshot e confirmação de e-mail repetido`.
- [ ] **Step 7: Abrir PR da Fase 3** — "API pública: quiz e envio". Merge após aprovação.

---

## Fase 4 — API admin (branch `feat/api-admin`)

### Task 8: Verificação do token e middleware admin

**Files:**
- Create: `apps/api/src/auth/verify-token.ts`, `apps/api/src/middleware/require-admin.ts`
- Modify: `src/deps.ts`, `src/app.ts`
- Test: `apps/api/src/auth/verify-token.test.ts`, `apps/api/src/middleware/require-admin.test.ts`

**Interfaces:**
- Produces: `type AuthUser = { id: string; email: string | null; role: string | null }`; `type VerifyToken = (token: string) => Promise<AuthUser>` (lança `HttpError(401, 'UNAUTHORIZED', ...)`); `createSupabaseTokenVerifier(opts: { supabaseUrl: string; jwtSecret?: string; jwks?: JWTVerifyGetKey }): VerifyToken` — `alg` HS256 → segredo; senão JWKS (`opts.jwks` ou `createRemoteJWKSet(<supabaseUrl>/auth/v1/.well-known/jwks.json)`); exige `iss = <supabaseUrl>/auth/v1`; `role` vem de `payload.app_metadata.role`. `requireAdmin(): MiddlewareHandler` — sem `Authorization: Bearer` → 401; `verifyToken` falha → 401; `role !== 'admin'` → 403 `FORBIDDEN`; ok → `c.set('user', user)`. Todas as rotas `/api/v1/admin/*` passam por ele.

- [ ] **Step 1: Testes que falham** — verifier: token HS256 válido (assinado com `SignJWT`) → `AuthUser` com `role: 'admin'`; token expirado → 401; assinatura com outro segredo → 401; issuer diferente → 401; token ES256 validado por `createLocalJWKSet`. Middleware (fake `verifyToken`): sem header → 401; token rejeitado → 401; usuário sem papel → 403; admin → 200 numa rota de teste.
- [ ] **Step 2: Rodar e ver falhar.**
- [ ] **Step 3: Implementar** com `jose` (`decodeProtectedHeader`, `jwtVerify`).
- [ ] **Step 4: Rodar e ver passar.**
- [ ] **Step 5: Commit** — `feat(api): protege rotas admin com JWT do Supabase e papel admin`.

### Task 9: Leads — listagem e detalhe

**Files:**
- Create: `apps/api/src/routes/admin-leads.ts`, `apps/api/src/repositories/drizzle/lead-query-repository.ts`, `apps/api/src/lib/like.ts`
- Modify: `src/repositories/types.ts`, `src/app.ts`, `test/fakes.ts`
- Test: `apps/api/src/lib/like.test.ts`, `apps/api/src/routes/admin-leads.test.ts`

**Interfaces:**
- Produces: `escapeLike(term: string): string` (escapa `\`, `%`, `_`); `LeadQueryRepository = { listLeads(q: LeadListQuery): Promise<{ items: LeadListItem[]; total: number }>; getLeadDetail(id: string): Promise<LeadDetail | null> }`. Lista = `leads` join `submissions` via `latest_submission_id`, filtro `name ILIKE` ou `email ILIKE` com `%termo%` escapado, filtro `submissions.band_slug`, ordem `leads.created_at desc`, paginação offset. Detalhe = respostas do último envio (snapshot, por posição) e `submissionCount`.

- [ ] **Step 1: Testes que falham** — `escapeLike('50%_off\\')` → `'50\\%\\_off\\\\'`. Rota (fake + `verifyToken` fake admin): `GET /api/v1/admin/leads?page=2&pageSize=10&search=ana&band=bom-caminho` repassa a query normalizada ao repositório e responde `Paginated<LeadListItem>` com `pagination.total`; `pageSize=500` → 422; `GET /admin/leads/<uuid>` inexistente → 404; id não-uuid → 404 sem tocar o repositório; sem token → 401.
- [ ] **Step 2: Rodar e ver falhar.**
- [ ] **Step 3: Implementar** rota e repositório (`ilike` com `escapeLike`; `count(*)` com os mesmos filtros).
- [ ] **Step 4: Rodar e ver passar.** Manual: login no Supabase local para obter token (`curl -X POST 'http://127.0.0.1:54321/auth/v1/token?grant_type=password' -H "apikey: <anon>" -d '{"email":"admin@quiz.local","password":"Admin@12345"}'`) e chamar a lista com `Authorization: Bearer`.
- [ ] **Step 5: Commit** — `feat(api): lista e detalha leads com busca, filtro e paginação`.

### Task 10: Regras do editor de perguntas (serviço)

**Files:**
- Create: `apps/api/src/services/question-admin-service.ts`
- Modify: `src/repositories/types.ts`, `test/fakes.ts`
- Test: `apps/api/src/services/question-admin-service.test.ts`

**Interfaces:**
- Produces: `QuestionAdminRepository = { getActiveQuizId(): Promise<string | null>; getSummary(quizId): Promise<AdminQuizSummary>; listActive(quizId): Promise<AdminQuestion[]>; listInactive(quizId): Promise<InactiveAdminQuestion[]>; findState(id): Promise<{ id; quizId; isActive: boolean; answerCount: number; replaced: boolean } | null>; countActive(quizId): Promise<number>; activeIds(quizId): Promise<string[]>; insertAtEnd(quizId, content: QuestionContent): Promise<AdminQuestion>; updateContent(id, content): Promise<AdminQuestion>; replaceWithNewVersion(id, content): Promise<AdminQuestion>; deactivate(id): Promise<void>; reactivateAtEnd(id): Promise<AdminQuestion>; setOrder(quizId, ids: string[]): Promise<void> }`.
  Serviço (cada função recebe `repo` primeiro): `getQuizSummary`, `listQuestions(repo, status)`, `createQuestion(repo, content)`, `updateQuestion(repo, id, content): Promise<UpdateQuestionResult>`, `deactivateQuestion(repo, id): Promise<void>`, `reactivateQuestion(repo, id): Promise<AdminQuestion>`, `reorderQuestions(repo, ids): Promise<void>`.

- [ ] **Step 1: Testes que falham** (fake em memória que implementa a interface):
  - `updateQuestion` sem respostas → chama `updateContent`, `versioned: false`, mesmo `id`.
  - `updateQuestion` com respostas → chama `replaceWithNewVersion`, `versioned: true`, `id` novo.
  - `updateQuestion` em pergunta inativa → 409 `QUESTION_INACTIVE`; inexistente → 404.
  - `deactivateQuestion` na última ativa → 422 `LAST_ACTIVE_QUESTION`; em pergunta já inativa → não falha (idempotente).
  - `reactivateQuestion` em substituída → 409 `QUESTION_REPLACED`; em ativa → 409 `QUESTION_ALREADY_ACTIVE`; desativada → `reactivateAtEnd`.
  - `reorderQuestions` com lista que não é exatamente o conjunto de ativas (faltando, sobrando ou com inativa) → 422 `VALIDATION_ERROR`.
- [ ] **Step 2: Rodar e ver falhar.**
- [ ] **Step 3: Implementar** o serviço.
- [ ] **Step 4: Rodar e ver passar.**
- [ ] **Step 5: Commit** — `feat(api): aplica regras de versionamento do editor de perguntas`.

### Task 11: Editor de perguntas — repositório e rotas

**Files:**
- Create: `apps/api/src/repositories/drizzle/question-admin-repository.ts`, `apps/api/src/routes/admin-quiz.ts`
- Modify: `src/app.ts`, `src/deps.ts`
- Test: `apps/api/src/routes/admin-quiz.test.ts`

**Interfaces:**
- Consumes: serviço da Task 10; `questionContentSchema`, `questionStatusSchema`, `reorderSchema` (Task 2).
- Produces: rotas da spec §9 — `GET /admin/quiz`, `GET /admin/quiz/questions?status=`, `POST /admin/quiz/questions` (201), `PUT /admin/quiz/questions/:id` (200 `UpdateQuestionResult`), `DELETE /admin/quiz/questions/:id` (204), `POST /admin/quiz/questions/:id/reactivate` (200), `PUT /admin/quiz/question-order` (200 `{ questionIds }`).

- [ ] **Step 1: Testes de rota que falham** — status e códigos de cada rota (sucesso, 401 sem token, 422 com conteúdo inválido, 404 com id não-uuid), e `GET /admin/quiz/questions?status=foo` → 422.
- [ ] **Step 2: Rodar e ver falhar.**
- [ ] **Step 3: Implementar o repositório Drizzle**, tudo em transação:
  - `replaceWithNewVersion`: ler posição; `update` da antiga para `is_active=false, deactivated_at=now()`; inserir nova com mesma posição e `previous_version_id`; inserir alternativas.
  - `updateContent`: atualizar texto/`updated_at`, apagar e reinserir alternativas (permitido: sem respostas).
  - `insertAtEnd`/`reactivateAtEnd`: `position = coalesce(max(position) das ativas, 0) + 1`.
  - `setOrder`: primeiro posições temporárias negativas (`-1..-n`) e depois `1..n`, para não violar o índice único parcial.
  - `listInactive`: `inactiveReason = 'replaced'` quando existe pergunta com `previous_version_id = id`; `replacedBy` = essa sucessora (`position` nula se ela também estiver inativa); ordem `deactivated_at desc`.
  - `answerCount` via `count` em `submission_answers`.
- [ ] **Step 4: Rodar e ver passar.** Manual com banco local: editar pergunta com respostas (criadas na Task 7) → `versioned: true`, a antiga aparece em `?status=inactive` com `inactiveReason: "replaced"`; quiz público continua com 10 perguntas.
- [ ] **Step 5: Commit** — `feat(api): expõe editor de perguntas com versionamento`.
- [ ] **Step 6: Abrir PR da Fase 4** — "API admin: autenticação, leads e editor de perguntas". Merge após aprovação.

---

## Fase 5 — Front do quiz (branch `feat/web-quiz`)

### Task 12: Esqueleto do front, tema e cliente da API

**Files:**
- Create: `apps/web/*` via `pnpm create vite@5 apps/web --template react-ts`, ajustado: `vite.config.ts`, `tailwind.config.ts`, `postcss.config.js`, `components.json`, `.env.example`, `src/main.tsx`, `src/router.tsx`, `src/index.css`, `src/lib/api-client.ts`, `src/lib/format.ts`, `src/components/Logo.tsx`, `src/assets/logo.svg`
- Test: `apps/web/src/lib/format.test.ts`, `apps/web/src/lib/api-client.test.ts`

**Interfaces:**
- Produces:
  - `class ApiError extends Error { status: number; code: ErrorCode; details?: Record<string, unknown> }`; `apiFetch<T>(path: string, init?: RequestInit & { token?: string; json?: unknown }): Promise<T>` — base `import.meta.env.VITE_API_URL ?? ''` + `/api/v1`; corpo de erro vira `ApiError`; falha de rede vira `ApiError` com `status: 0`, `code: 'INTERNAL_ERROR'`; 204 → `undefined`.
  - `formatPhone(digits: string): string` (máscara progressiva `(11) 98765-4321` / `(11) 3456-7890`); `formatDateTime(iso: string): string` (`27/11/2026 14:32`, fuso `America/Sao_Paulo`).
  - `queryClient` (TanStack Query, `retry: 1` para queries, sem retry em mutations).
  - Tailwind `theme.extend`: cores `tinta #0B2A5B`, `tinta-2 #3A4F73`, `azul #0A7FFA`, `azul-fundo #0A6DE6`, `azul-texto #0866D6`, `azul-esc #0749A8`, `azul-claro #DCEBFF`, `papel #FBFDFF`, `amarelo #FFE100`, `verde-cta #0D8519`, `verde-cta-esc #075E10`, `marca #0021E1`; fontes `display: Anton`, `sans: Rubik`, `hand: Kalam`, `admin: Inter` (via `@fontsource/*`); utilitários `.bg-papel` (quadriculado) e `.marca-texto` (grifo amarelo) como no canvas.
  - Router: `/`, `/quiz`, `/quiz/contato`, `/quiz/resultado`, `/admin/*` (placeholder até a Fase 6).
  - `Logo` = `<img>` de `src/assets/logo.svg` (cópia de `design/assets/logo-plataforma-assaad.svg` com `currentColor` trocado por `#0021E1`), `alt="Plataforma Assaad"`.

- [ ] **Step 1: Testes que falham** — `formatPhone('11987654321')` → `'(11) 98765-4321'`; `formatPhone('1198')` → `'(11) 98'`; `formatDateTime('2026-11-27T17:32:00Z')` → `'27/11/2026 14:32'`; `apiFetch` com `fetch` mockado retornando 422 + `ApiErrorBody` → rejeita com `ApiError` de `code: 'VALIDATION_ERROR'`.
- [ ] **Step 2: Rodar e ver falhar** — `pnpm --filter @quiz/web test`.
- [ ] **Step 3: Implementar** scaffold, Tailwind, `pnpm dlx shadcn@<versão compatível com Tailwind 3> init` e componentes `button`, `input`, `label`, `sheet`, `alert-dialog`, `table`, `badge`, `skeleton`, `tabs`, `textarea`; Sonner no root; proxy Vite `'/api' → 'http://127.0.0.1:8787'`. Script raiz `dev` = `pnpm -r --parallel --filter @quiz/api --filter @quiz/web dev` (sobe API e web juntas).
- [ ] **Step 4: Rodar e ver passar**; `pnpm --filter @quiz/web build` sem erros.
- [ ] **Step 5: Commit** — `feat(web): cria app com tema da marca, rotas e cliente da API`.

### Task 13: Estado do quiz

**Files:**
- Create: `apps/web/src/features/quiz/state.ts`, `apps/web/src/features/quiz/QuizProvider.tsx`, `apps/web/src/features/quiz/hooks.ts`
- Test: `apps/web/src/features/quiz/state.test.ts`

**Interfaces:**
- Produces: `QuizState = { quizId: string | null; step: number; answers: Record<string, string>; result: SubmissionResult | null }`; ações `{ type: 'start'; quizId } | { type: 'answer'; questionId; optionId } | { type: 'next'; total } | { type: 'back' } | { type: 'finish'; result } | { type: 'reset' } | { type: 'sync'; quiz: PublicQuiz }`; `quizReducer(state, action): QuizState`; `loadState(storage: Storage): QuizState` / `saveState(storage, state)` com chave `quiz-state-v1` (JSON inválido → estado inicial). `sync`: se `quizId` difere ou alguma resposta aponta para pergunta/alternativa fora do quiz carregado, reseta. `useQuizState()` (contexto), `usePublicQuiz()` (`useQuery(['quiz'])`), `useSubmitQuiz()` (`useMutation` → `POST /submissions`).

- [ ] **Step 1: Testes que falham** — `answer` e depois `back` mantém a resposta (requisito "voltar e alterar"); `next` no último passo não passa de `total - 1`; `save` + `load` restaura passo e respostas (refresh no meio do quiz); `sync` com quiz cujo id de pergunta mudou → estado inicial; `finish` guarda `result`; `reset` limpa tudo.
- [ ] **Step 2: Rodar e ver falhar.**
- [ ] **Step 3: Implementar** reducer puro + provider que persiste em `sessionStorage` a cada mudança.
- [ ] **Step 4: Rodar e ver passar.**
- [ ] **Step 5: Commit** — `feat(web): gerencia estado do quiz com persistência na sessão`.

### Task 14: Telas de início e perguntas

**Files:**
- Create: `apps/web/src/features/quiz/pages/IntroPage.tsx`, `QuestionPage.tsx`, `components/ProgressBar.tsx`, `components/OptionButton.tsx`, `components/QuizLayout.tsx`, `components/QuizLoadError.tsx`, `components/QuestionSkeleton.tsx`

**Interfaces:**
- Consumes: `usePublicQuiz`, `useQuizState` (Task 13); referência visual `design/canvas/Main.dc.html`, `QuizPergunta.dc.html`, `QuizEstados.dc.html`.

- [ ] **Step 1: Implementar `IntroPage`** fiel ao canvas (título Anton com "chance real" grifado, 3 itens, nota manuscrita, CTA verde "Começar diagnóstico" → `start` + `/quiz`).
- [ ] **Step 2: Implementar `QuestionPage`** — "Pergunta N de T" (T = total de perguntas ativas), barra segmentada com `role="progressbar"`, alternativas como `role="radiogroup"`/`role="radio"` com letra, "Próxima" desabilitado sem resposta, "Voltar" (no passo 0 volta para `/`), na última pergunta "Próxima" leva a `/quiz/contato`. Transição entre perguntas com Framer Motion (slide curto; nenhuma animação com `useReducedMotion()`). Estados: skeleton enquanto carrega; erro com "Tentar de novo" (`refetch`).
- [ ] **Step 3: Verificar no navegador** (`pnpm dev` com API e banco locais, viewport 390px): responder até a 10ª, voltar e trocar uma resposta, dar refresh na pergunta 5 e continuar de onde parou; derrubar a API e ver o estado de erro.
- [ ] **Step 4: Commit** — `feat(web): telas de início e perguntas do quiz`.

### Task 15: Captura do lead e resultado

**Files:**
- Create: `apps/web/src/features/quiz/pages/ContactPage.tsx`, `ResultPage.tsx`, `components/PhoneInput.tsx`, `components/ReplaceResultDialog.tsx`, `components/ScoreScale.tsx`
- Modify: `apps/web/src/router.tsx` (guardas)

**Interfaces:**
- Consumes: `leadInputSchema`, `PHONE_ERROR_MESSAGE` (Task 1); `useSubmitQuiz`, `useQuizState` (Task 13); `formatPhone` (Task 12); canvas `QuizCaptura.dc.html`, `QuizResultado.dc.html`, `QuizEstados.dc.html`.

- [ ] **Step 1: Implementar `ContactPage`** — React Hook Form + `zodResolver(leadInputSchema)`, `mode: 'onTouched'`; campos com `<label>`, `autocomplete` (`name`, `email`, `tel`), `inputmode`; `PhoneInput` aplica `formatPhone` ao digitar. Envio: botão com spinner e campos desabilitados enquanto `isPending`. Tratamento de erros por `ApiError.code`:
  - `LEAD_ALREADY_SUBMITTED` → `ReplaceResultDialog` ("Você já fez este diagnóstico. Se continuar, seu resultado anterior será substituído por este." · "Continuar" reenvia com `confirmReplace: true` · "Cancelar" fecha).
  - `VALIDATION_ERROR` → `setError` em cada campo de `details.fieldErrors`.
  - `QUIZ_OUTDATED` → toast "O quiz foi atualizado. Vamos recomeçar com as perguntas novas." + `reset` + `/`.
  - outros/rede → toast "Não foi possível enviar. Suas respostas continuam salvas. Tente de novo em instantes."
  - Sucesso → `finish(result)` + `navigate('/quiz/resultado', { replace: true })`.
- [ ] **Step 2: Implementar `ResultPage`** — nome do lead, nota grande, selo da faixa, `ScoreScale` (4 segmentos proporcionais às faixas, marcador na nota), mensagem da faixa, bloco "Próximo passo" com o telefone formatado, lista "Suas respostas" (pergunta + alternativa). Botão "Refazer diagnóstico" → `reset` + `/`.
- [ ] **Step 3: Guardas de rota** — `/quiz/contato` sem todas as respostas → `/quiz`; `/quiz/resultado` sem `result` → `/`.
- [ ] **Step 4: Verificar no navegador** (390px): telefone inválido mostra a mensagem padrão; envio feliz mostra a faixa certa (todas as primeiras alternativas = 2+0+0+0+0+2+0+2+0+2 = 8 → "Ponto de partida"); reenviar com o mesmo e-mail abre o diálogo; desativar uma pergunta pelo banco no meio do quiz leva ao toast de quiz atualizado.
- [ ] **Step 5: Commit** — `feat(web): captura do lead e tela de resultado`.
- [ ] **Step 6: Abrir PR da Fase 5** — "Front: fluxo completo do quiz". Merge após aprovação.

---

## Fase 6 — Front admin (branch `feat/web-admin`)

### Task 16: Login e proteção da área admin

**Files:**
- Create: `apps/web/src/lib/supabase.ts`, `apps/web/src/features/admin/auth/AuthProvider.tsx`, `RequireAdmin.tsx`, `LoginPage.tsx`, `apps/web/src/features/admin/layout/AdminLayout.tsx`, `apps/web/src/features/admin/useAdminApi.ts`
- Modify: `apps/web/src/router.tsx`, `apps/web/.env.example` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)

**Interfaces:**
- Produces: `useAuth(): { session: Session | null; loading: boolean; signIn(email, password): Promise<void>; signOut(): Promise<void> }`; `<RequireAdmin>` (sem sessão → `/admin/login?next=<rota>`); `useAdminApi()` → `<T>(path, init?) => Promise<T>` que injeta `session.access_token`, e em `ApiError` 401 faz `signOut` + redireciona para `/admin/login?expired=1`; 403 → toast "Seu usuário não tem acesso ao painel."; `AdminLayout` com cabeçalho (logo, links "Leads" e "Perguntas", e-mail, "Sair") e `<Outlet/>`. Rotas: `/admin/login`, `/admin` (Leads), `/admin/leads/:id`, `/admin/perguntas`, `/admin/perguntas/nova`, `/admin/perguntas/:id`.

- [ ] **Step 1: Implementar** conforme `design/canvas/AdminLogin.dc.html` (Inter; erro "E-mail ou senha incorretos."; com `expired=1` mostra "Sua sessão expirou. Entre de novo."; botão mostrar senha com `aria-label`).
- [ ] **Step 2: Verificar** — login com `admin@quiz.local` / `Admin@12345` entra; senha errada mostra o erro; acessar `/admin` deslogado redireciona; apagar o token do `localStorage` e navegar leva ao login.
- [ ] **Step 3: Commit** — `feat(web): login do admin e proteção das rotas`.

### Task 17: Lista de leads e detalhe

**Files:**
- Create: `apps/web/src/features/admin/leads/LeadsPage.tsx`, `LeadsTable.tsx`, `LeadFilters.tsx`, `LeadDrawer.tsx`, `BandBadge.tsx`, `useLeads.ts`, `useDebouncedValue.ts`

**Interfaces:**
- Consumes: `useAdminApi` (Task 16); `GET /admin/quiz` (faixas para o filtro), `GET /admin/leads`, `GET /admin/leads/:id`; canvas `AdminLeads.dc.html`, `AdminLeadDetalhe.dc.html`.

- [ ] **Step 1: Implementar `LeadsPage`** — query string como fonte da verdade (`q`, `faixa`, `page`); busca com debounce de 300 ms que volta para a página 1; chips de faixa vindos de `bands`; tabela com nome, e-mail, telefone formatado, pontuação, `BandBadge`, cadastro (`formatDateTime`) e "Ver respostas" → `/admin/leads/:id` preservando a query; paginação "Mostrando X–Y de Z". Estados: skeleton da tabela, erro com "Tentar de novo", lista vazia ("Nenhum lead ainda") e busca sem resultado ("Nenhum lead encontrado para “termo”"). Sem indicadores/gráficos/CSV nesta fase.
- [ ] **Step 2: Implementar `LeadDrawer`** (shadcn `Sheet`, rota aninhada; fechar volta para `/admin` com a query) — contato com copiar e-mail e link WhatsApp `https://wa.me/55<telefone>`, nota e faixa, data do envio, contagem de envios quando > 1, as respostas com pontos.
- [ ] **Step 3: Verificar** com alguns leads criados pelo quiz: busca por parte do nome e do e-mail, filtro por faixa, paginação com `pageSize` pequeno, abrir o detalhe direto pela URL.
- [ ] **Step 4: Commit** — `feat(web): lista de leads com busca, filtro e detalhe`.

### Task 18: Editor de perguntas

**Files:**
- Create: `apps/web/src/features/admin/questions/QuestionsPage.tsx`, `ActiveQuestionList.tsx`, `InactiveQuestionList.tsx`, `QuestionEditorDrawer.tsx`, `useQuestions.ts`

**Interfaces:**
- Consumes: rotas da Task 11; `questionContentSchema` (Task 2); canvas `AdminQuiz.dc.html`, `AdminQuizEditar.dc.html`.
- Produces: hooks `useQuizSummary`, `useQuestions(status)`, `useSaveQuestion`, `useDeactivateQuestion`, `useReactivateQuestion`, `useReorderQuestions` — toda mutation invalida `['admin-quiz']` e `['admin-questions']`.

- [ ] **Step 1: Implementar `QuestionsPage`** — abas "Ativas | Desativadas" com contagens do resumo e `?status=desativadas`; aviso sobre versionamento; pontuação máxima atual. Ativas: subir/descer (botões 40px com `aria-label`, desabilitados nas pontas; atualização otimista revertida em erro), editar, desativar (`AlertDialog` de confirmação; erro `LAST_ACTIVE_QUESTION` vira toast). Desativadas: selo do motivo ("Substituída pela versão atual da pergunta N em dd/mm/aaaa" ou "Desativada em dd/mm/aaaa"), respostas, alternativas, "Reativar" só em desativadas.
- [ ] **Step 2: Implementar `QuestionEditorDrawer`** — React Hook Form + `useFieldArray` com `questionContentSchema`; textarea com contador "N / 300"; linhas de alternativa (texto, pontos 0–100, remover; mínimo 2, máximo 6); "Adicionar alternativa"; mostra o maior peso. Com `answerCount > 0`: aviso âmbar do canvas, botão "Salvar nova versão" e confirmação. Resposta `versioned: true` → toast "Nova versão criada. O histórico dos leads foi preservado."; `false` → "Pergunta atualizada.". `/admin/perguntas/nova` usa o mesmo drawer vazio.
- [ ] **Step 3: Verificar** — editar pergunta respondida gera versão e a antiga aparece em Desativadas como substituída; editar pergunta nova (sem respostas) altera no lugar; reativar uma desativada coloca no fim; o quiz público reflete as mudanças sem rebuild do front.
- [ ] **Step 4: Commit** — `feat(web): editor de perguntas com versionamento`.
- [ ] **Step 5: Abrir PR da Fase 6** — "Front admin: login, leads e editor de perguntas". Merge após aprovação.

---

## Fase 7 — Documentação (branch `docs/readme`)

### Task 19: README completo

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Escrever** as seções exigidas pelo enunciado: visão geral e prints/GIF opcionais; pré-requisitos (Node 24, pnpm 11, Docker Desktop); como rodar (`pnpm install` → `pnpm db:start` → `pnpm db:reset` → copiar `.dev.vars.example` e `.env.example` com valores de `pnpm db:status` → `pnpm dev` na raiz, que sobe API e web em paralelo); variáveis de ambiente (tabela por app); credenciais do admin; como rodar testes; arquitetura (diagrama da spec §6); modelo de dados e regra de versionamento; contrato da API (tabela resumida + formato de erro); decisões técnicas (Drizzle, Supabase Auth, lead × envio, snapshot, 409 com confirmação, pesos fora do cliente, faixas no banco); "o que faria com mais tempo" (rascunho/publicação, edição de faixas e da tela inicial, papéis marketing × comercial, testes E2E com Playwright, testes de integração do repositório com banco, observabilidade); o que ficou de fora e por quê.
- [ ] **Step 2: Verificar** seguindo o README do zero num clone limpo (`git clone` em pasta temporária) até ver o quiz e o login funcionando.
- [ ] **Step 3: Commit** — `docs: completa README com setup, decisões e próximos passos`.
- [ ] **Step 4: Abrir PR** — "Documentação". Merge após aprovação.

---

## Fase 8 — Diferenciais (uma branch por item, na ordem; parar quando o tempo acabar)

### Task 20: Rate limit no envio (branch `feat/rate-limit`)

**Files:**
- Create: `apps/api/src/middleware/rate-limit.ts`
- Modify: `apps/api/wrangler.jsonc`, `src/env.ts`, `src/deps.ts`, `src/routes/public.ts`
- Test: `apps/api/src/middleware/rate-limit.test.ts`

**Interfaces:**
- Produces: `type RateLimiter = { limit(opts: { key: string }): Promise<{ success: boolean }> }`; `rateLimit(getLimiter: (c) => RateLimiter | undefined)` — chave `cf-connecting-ip` (ou `'local'`); sem limiter configurado → passa; `success: false` → 429 `RATE_LIMITED` "Muitas tentativas. Aguarde um minuto e tente de novo.". Binding `ratelimits: [{ name: "SUBMISSION_LIMITER", namespace_id: "1001", simple: { limit: 5, period: 60 } }]`.

- [ ] **Step 1: Teste que falha** — limiter fake que nega → `POST /submissions` 429; que permite → segue para validação; sem limiter → segue.
- [ ] **Step 2: Rodar e ver falhar.** **Step 3: Implementar.** **Step 4: Rodar e ver passar.**
- [ ] **Step 5:** Front: `RATE_LIMITED` mostra a mensagem da API no toast. Commit `feat: limita envios por IP`. PR + merge após aprovação.

### Task 21: Dashboard (branch `feat/dashboard`)

**Files:**
- Create: `apps/api/src/services/stats-service.ts`, `apps/api/src/routes/admin-stats.ts`, `apps/web/src/features/admin/dashboard/StatsPanel.tsx`
- Modify: `apps/api/src/repositories/types.ts` (+ implementação Drizzle), `packages/shared/src/api-types.ts`, `apps/web/src/features/admin/leads/LeadsPage.tsx`
- Test: `apps/api/src/services/stats-service.test.ts`

**Interfaces:**
- Produces: `AdminStats = { total: number; last7Days: number; averageScore: number | null; byBand: { slug; label; count }[]; byDay: { date: string; count: number }[] }` (14 dias, `date` = `YYYY-MM-DD` em `America/Sao_Paulo`, dias sem lead com `count: 0`); `fillDays(rows: { date: string; count: number }[], today: string, days = 14)`. Rota `GET /admin/stats`.

- [ ] **Step 1: Teste que falha** — `fillDays` completa buracos e respeita a ordem cronológica; `averageScore` `null` sem leads.
- [ ] **Step 2–4:** ver falhar, implementar (agrupamento por `date(created_at at time zone 'America/Sao_Paulo')`), ver passar.
- [ ] **Step 5:** `StatsPanel` no topo da tela de Leads (indicadores + barras de faixa + Recharts `BarChart` de leads por dia), conforme o canvas. Commit `feat: dashboard de leads`. PR + merge após aprovação.

### Task 22: Exportação CSV (branch `feat/csv`)

**Files:**
- Create: `apps/api/src/lib/csv.ts`
- Modify: `apps/api/src/routes/admin-leads.ts`, repositório de leads (`listAllLeads(filters, limit = 10000)`), `apps/web/src/features/admin/leads/LeadsPage.tsx`
- Test: `apps/api/src/lib/csv.test.ts`

**Interfaces:**
- Produces: `toCsv(header: string[], rows: (string | number)[][]): string` — separador `;`, BOM UTF-8, aspas quando há `;`, `"` ou quebra de linha, e prefixo `'` em células que começam com `=`, `+`, `-` ou `@` (injeção de fórmula). Rota `GET /admin/leads/export.csv?search=&band=` (`text/csv; charset=utf-8`, `Content-Disposition: attachment; filename="leads-YYYY-MM-DD.csv"`), colunas Nome, E-mail, Telefone, Pontuação, Faixa, Cadastro. **Registrar a rota antes de `/admin/leads/:id`.**

- [ ] **Step 1: Teste que falha** — escape de `;`, aspas e quebra de linha; `=SOMA(A1)` vira `'=SOMA(A1)`.
- [ ] **Step 2–4:** ver falhar, implementar, ver passar.
- [ ] **Step 5:** botão "Exportar CSV" baixa via `fetch` com token → `Blob` → link temporário, respeitando filtros. Commit `feat: exporta leads em CSV`. PR + merge após aprovação.

### Task 23: Deploy (branch `chore/deploy`)

> Cria recursos nas contas do Gabriel (Supabase, Cloudflare). Cada passo que cria recurso ou faz login é confirmado com ele antes.

**Files:**
- Create: `apps/api/scripts/create-admin.ts`
- Modify: `apps/api/wrangler.jsonc` (id real do Hyperdrive, `vars`), `README.md` (URLs e passos de deploy)

- [ ] **Step 1:** Projeto Supabase na nuvem; `pnpm exec supabase link` e `pnpm exec supabase db push` (migrations). Seed do quiz rodando só a parte de conteúdo do `seed.sql` (não o admin local).
- [ ] **Step 2:** `create-admin.ts` com `supabase-js` (`auth.admin.createUser({ email, password, email_confirm: true, app_metadata: { role: 'admin' } })`, lendo `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`/`ADMIN_EMAIL`/`ADMIN_PASSWORD` do ambiente); rodar uma vez. Desabilitar signup no painel.
- [ ] **Step 3:** `wrangler hyperdrive create` com a connection string do pooler; `wrangler secret put` para segredos; `ALLOWED_ORIGINS` com o domínio do Pages; `wrangler deploy`.
- [ ] **Step 4:** Cloudflare Pages para `apps/web` (build `pnpm --filter @quiz/web build`, saída `apps/web/dist`, `VITE_API_URL` = URL do Worker, chaves públicas do Supabase), com `_redirects` `/* /index.html 200` para o SPA.
- [ ] **Step 5: Verificar** o fluxo completo em produção no celular: responder, enviar, ver resultado, logar no admin, ver o lead, editar uma pergunta.
- [ ] **Step 6:** README com as URLs. Commit `chore: configura deploy em Cloudflare e Supabase`. PR + merge após aprovação.
