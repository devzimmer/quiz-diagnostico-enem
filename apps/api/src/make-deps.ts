import type { AppDeps } from './deps'
import type { Env } from './env'
import { createSupabaseTokenVerifier } from './auth/verify-token'
import type { VerifyToken } from './auth/types'
import { createDb } from './db/client'
import { DrizzleLeadQueryRepository } from './repositories/drizzle/lead-query-repository'
import { DrizzleQuestionAdminRepository } from './repositories/drizzle/question-admin-repository'
import { DrizzleQuizRepository } from './repositories/drizzle/quiz-repository'
import { DrizzleSubmissionRepository } from './repositories/drizzle/submission-repository'

// Verificador criado uma vez por isolate para reaproveitar o cache do JWKS entre requests.
let verifier: { key: string; verify: VerifyToken } | undefined
function getVerifier(env: Env): VerifyToken {
  const key = env.SUPABASE_URL + (env.SUPABASE_JWT_SECRET ?? '')
  if (verifier?.key !== key) {
    verifier = {
      key,
      verify: createSupabaseTokenVerifier({
        supabaseUrl: env.SUPABASE_URL,
        jwtSecret: env.SUPABASE_JWT_SECRET,
      }),
    }
  }
  return verifier.verify
}

/** Dependências reais de um request: conexão via Hyperdrive e repositórios Drizzle. */
export function makeDeps(env: Env): AppDeps {
  const { db, close } = createDb(env.HYPERDRIVE.connectionString)
  return {
    quizRepo: new DrizzleQuizRepository(db),
    submissionRepo: new DrizzleSubmissionRepository(db),
    leadQueryRepo: new DrizzleLeadQueryRepository(db),
    questionAdminRepo: new DrizzleQuestionAdminRepository(db),
    verifyToken: getVerifier(env),
    submissionLimiter: env.SUBMISSION_LIMITER,
    dispose: close,
  }
}
