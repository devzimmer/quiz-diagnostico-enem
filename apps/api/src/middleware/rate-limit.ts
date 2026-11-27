import type { Context, MiddlewareHandler } from 'hono'
import type { AppEnv, RateLimiter } from '../deps'
import { HttpError } from '../lib/http-error'

/**
 * Limita requisições por IP (`cf-connecting-ip`, preenchido pela Cloudflare). Sem limiter
 * configurado (dev, testes), não limita. O binding de Rate Limiting é por localidade e
 * eventual: freia abuso, não é uma cota exata.
 */
export function rateLimit(
  getLimiter: (c: Context<AppEnv>) => RateLimiter | undefined,
): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const limiter = getLimiter(c)
    if (limiter) {
      const key = c.req.header('cf-connecting-ip') ?? 'local'
      const { success } = await limiter.limit({ key })
      if (!success) {
        throw new HttpError(
          429,
          'RATE_LIMITED',
          'Muitas tentativas. Aguarde um minuto e tente de novo.',
        )
      }
    }
    await next()
  }
}
