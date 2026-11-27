/**
 * Modo demonstração sem Docker: sobe a API real (mesmo app Hono) em Node, sobre um Postgres
 * em memória (PGlite) com as migrations e o seed aplicados. Os dados somem ao encerrar.
 *
 *   pnpm --filter @quiz/api dev:memory
 *
 * Inclui uma imitação mínima do Supabase Auth em /auth/v1 (login do seed: admin@quiz.local /
 * Admin@12345), então o painel funciona com VITE_SUPABASE_URL=http://127.0.0.1:8787.
 * DEV_JWT_TTL (segundos) encurta a validade do token para testar sessão expirada.
 */
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { createApp } from '../src/app'
import { createSupabaseTokenVerifier } from '../src/auth/verify-token'
import { DrizzleLeadQueryRepository } from '../src/repositories/drizzle/lead-query-repository'
import { DrizzleQuestionAdminRepository } from '../src/repositories/drizzle/question-admin-repository'
import { DrizzleQuizRepository } from '../src/repositories/drizzle/quiz-repository'
import { DrizzleSubmissionRepository } from '../src/repositories/drizzle/submission-repository'
import { createTestDb } from '../test/db/pglite'
import { createDevAuth } from './dev-auth'

const port = Number(process.env.PORT ?? 8787)
const supabaseUrl = process.env.SUPABASE_URL ?? `http://127.0.0.1:${port}`
const webOrigin = process.env.WEB_ORIGIN ?? 'http://localhost:5173'
const jwtSecret =
  process.env.DEV_JWT_SECRET ?? 'super-secret-jwt-token-with-at-least-32-characters-long'

const { client, db } = await createTestDb({ seed: true })
const deps = {
  quizRepo: new DrizzleQuizRepository(db),
  submissionRepo: new DrizzleSubmissionRepository(db),
  leadQueryRepo: new DrizzleLeadQueryRepository(db),
  questionAdminRepo: new DrizzleQuestionAdminRepository(db),
  verifyToken: createSupabaseTokenVerifier({ supabaseUrl, jwtSecret }),
}

const api = createApp(() => deps)
const server = new Hono()
server.route(
  '/auth/v1',
  createDevAuth({
    client,
    supabaseUrl,
    jwtSecret,
    allowedOrigin: webOrigin,
    ttlSeconds: Number(process.env.DEV_JWT_TTL ?? 3600),
  }),
)
server.all('*', (c) => api.fetch(c.req.raw, { ALLOWED_ORIGINS: webOrigin }))

serve({ fetch: server.fetch, port })
console.log(`API em memória em http://127.0.0.1:${port}/api/v1 (auth de dev em /auth/v1)`)
