import type { AuthUser, VerifyToken } from './auth/types'
import type { Env } from './env'
import type {
  LeadQueryRepository,
  QuestionAdminRepository,
  QuizRepository,
  SubmissionRepository,
} from './repositories/types'

export type RateLimiter = { limit(opts: { key: string }): Promise<{ success: boolean }> }

export type AppDeps = {
  quizRepo: QuizRepository
  submissionRepo: SubmissionRepository
  leadQueryRepo: LeadQueryRepository
  questionAdminRepo: QuestionAdminRepository
  verifyToken: VerifyToken
  submissionLimiter?: RateLimiter
  /** Libera recursos do request (conexão com o banco). */
  dispose?: () => Promise<void>
}

export type AppEnv = {
  Bindings: Env
  Variables: { deps: AppDeps; user?: AuthUser }
}
