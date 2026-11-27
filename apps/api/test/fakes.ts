import type { AppDeps } from '../src/deps'
import { HttpError } from '../src/lib/http-error'
import type {
  LeadQueryRepository,
  QuestionAdminRepository,
  QuizRepository,
  SubmissionRepository,
} from '../src/repositories/types'

/** Proxy que falha alto se o teste usar um método que não configurou. */
function unconfigured<T extends object>(name: string): T {
  return new Proxy({} as T, {
    get: (_target, prop) => () => {
      throw new Error(`${name}.${String(prop)} não configurado neste teste`)
    },
  })
}

export function makeFakeDeps(overrides: Partial<AppDeps> = {}): AppDeps {
  return {
    quizRepo: unconfigured<QuizRepository>('quizRepo'),
    submissionRepo: unconfigured<SubmissionRepository>('submissionRepo'),
    leadQueryRepo: unconfigured<LeadQueryRepository>('leadQueryRepo'),
    questionAdminRepo: unconfigured<QuestionAdminRepository>('questionAdminRepo'),
    verifyToken: async () => {
      throw new HttpError(401, 'UNAUTHORIZED', 'Token inválido')
    },
    ...overrides,
  }
}
