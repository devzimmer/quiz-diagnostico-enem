import type { AuthUser } from '../src/auth/types'
import { HttpError } from '../src/lib/http-error'

export const ADMIN_TOKEN = 'token-admin'
export const authHeader = { authorization: `Bearer ${ADMIN_TOKEN}` }

/** verifyToken fake: só aceita o token de admin dos testes. */
export const fakeVerifyToken = async (token: string): Promise<AuthUser> => {
  if (token !== ADMIN_TOKEN) throw new HttpError(401, 'UNAUTHORIZED', 'Sessão inválida ou expirada')
  return { id: 'admin-1', email: 'admin@quiz.local', role: 'admin' }
}
