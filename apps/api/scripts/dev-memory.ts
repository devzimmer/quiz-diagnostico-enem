/**
 * Modo demonstração sem Docker: sobe a API real (mesmo app Hono) em Node, sobre um Postgres
 * em memória (PGlite) com as migrations e o seed aplicados. Os dados somem ao encerrar.
 *
 *   pnpm --filter @quiz/api dev:memory
 *
 * Rotas admin aceitam tokens HS256 assinados com DEV_JWT_SECRET (o login do front continua
 * exigindo o Supabase Auth; para o fluxo completo use `pnpm db:start`).
 */
import { serve } from '@hono/node-server'
import { createApp } from '../src/app'
import { createSupabaseTokenVerifier } from '../src/auth/verify-token'
import { DrizzleLeadQueryRepository } from '../src/repositories/drizzle/lead-query-repository'
import { DrizzleQuestionAdminRepository } from '../src/repositories/drizzle/question-admin-repository'
import { DrizzleQuizRepository } from '../src/repositories/drizzle/quiz-repository'
import { DrizzleSubmissionRepository } from '../src/repositories/drizzle/submission-repository'
import { createTestDb } from '../test/db/pglite'

const port = Number(process.env.PORT ?? 8787)
const supabaseUrl = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321'
const jwtSecret =
  process.env.DEV_JWT_SECRET ?? 'super-secret-jwt-token-with-at-least-32-characters-long'

const { db } = await createTestDb({ seed: true })
const deps = {
  quizRepo: new DrizzleQuizRepository(db),
  submissionRepo: new DrizzleSubmissionRepository(db),
  leadQueryRepo: new DrizzleLeadQueryRepository(db),
  questionAdminRepo: new DrizzleQuestionAdminRepository(db),
  verifyToken: createSupabaseTokenVerifier({ supabaseUrl, jwtSecret }),
}

const app = createApp(() => deps)
serve({ fetch: (req) => app.fetch(req, { ALLOWED_ORIGINS: 'http://localhost:5173' }), port })
console.log(`API em memória ouvindo em http://127.0.0.1:${port}/api/v1`)
