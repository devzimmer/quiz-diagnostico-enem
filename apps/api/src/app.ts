import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { HTTPException } from 'hono/http-exception'
import type { AppDeps, AppEnv } from './deps'
import type { Env } from './env'
import { HttpError } from './lib/http-error'
import { requireAdmin } from './middleware/require-admin'
import { adminLeadRoutes } from './routes/admin-leads'
import { adminQuizRoutes } from './routes/admin-quiz'
import { publicRoutes } from './routes/public'

export function createApp(makeDeps: (env: Env) => AppDeps) {
  const app = new Hono<AppEnv>()

  app.use('*', (c, next) => {
    const allowed = (c.env?.ALLOWED_ORIGINS ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean)
    return cors({
      origin: (origin) => (allowed.includes(origin) ? origin : null),
      allowHeaders: ['Content-Type', 'Authorization'],
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      exposeHeaders: ['Content-Disposition'],
      maxAge: 600,
    })(c, next)
  })

  app.use('*', async (c, next) => {
    const deps = makeDeps(c.env)
    c.set('deps', deps)
    try {
      await next()
    } finally {
      if (deps.dispose) {
        const done = deps.dispose()
        try {
          c.executionCtx.waitUntil(done)
        } catch {
          await done // fora do Worker (testes) não há executionCtx
        }
      }
    }
  })

  app.get('/api/v1/health', (c) => c.json({ status: 'ok' }))
  app.route('/api/v1', publicRoutes)
  app.use('/api/v1/admin/*', requireAdmin())
  app.route('/api/v1/admin', adminLeadRoutes)
  app.route('/api/v1/admin', adminQuizRoutes)

  app.notFound((c) => c.json(new HttpError(404, 'NOT_FOUND', 'Rota não encontrada').toBody(), 404))

  app.onError((err, c) => {
    if (err instanceof HttpError) return c.json(err.toBody(), err.status)
    if (err instanceof HTTPException && err.status === 400) {
      return c.json(
        new HttpError(400, 'INVALID_JSON', 'Corpo da requisição inválido').toBody(),
        400,
      )
    }
    console.error(err)
    return c.json(
      new HttpError(500, 'INTERNAL_ERROR', 'Erro interno. Tente novamente.').toBody(),
      500,
    )
  })

  return app
}
