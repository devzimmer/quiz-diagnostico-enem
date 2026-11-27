import type { AppDeps } from './deps'
import type { Env } from './env'
import { createDb } from './db/client'
import { HttpError } from './lib/http-error'
import { DrizzleQuizRepository } from './repositories/drizzle/quiz-repository'

const notImplemented = <T extends object>(name: string): T =>
  new Proxy({} as T, {
    get: () => () => {
      throw new Error(`${name} ainda não implementado`)
    },
  })

/** Dependências reais de um request: conexão via Hyperdrive e repositórios Drizzle. */
export function makeDeps(env: Env): AppDeps {
  const { db, close } = createDb(env.HYPERDRIVE.connectionString)
  return {
    quizRepo: new DrizzleQuizRepository(db),
    submissionRepo: notImplemented('submissionRepo'),
    leadQueryRepo: notImplemented('leadQueryRepo'),
    questionAdminRepo: notImplemented('questionAdminRepo'),
    verifyToken: async () => {
      throw new HttpError(401, 'UNAUTHORIZED', 'Autenticação indisponível')
    },
    dispose: close,
  }
}
