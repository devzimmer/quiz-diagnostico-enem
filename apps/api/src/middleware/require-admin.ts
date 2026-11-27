import { createMiddleware } from 'hono/factory'
import type { AppEnv } from '../deps'
import { HttpError } from '../lib/http-error'

/** Exige `Authorization: Bearer <jwt>` válido de um usuário com papel admin. */
export const requireAdmin = () =>
  createMiddleware<AppEnv>(async (c, next) => {
    const header = c.req.header('authorization') ?? ''
    const [scheme, token] = header.split(' ')
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      throw new HttpError(401, 'UNAUTHORIZED', 'Faça login para continuar')
    }
    const user = await c.var.deps.verifyToken(token)
    if (user.role !== 'admin') {
      throw new HttpError(403, 'FORBIDDEN', 'Seu usuário não tem acesso ao painel')
    }
    c.set('user', user)
    await next()
  })
