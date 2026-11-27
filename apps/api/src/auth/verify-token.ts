import {
  type JWTPayload,
  type JWTVerifyGetKey,
  createRemoteJWKSet,
  decodeProtectedHeader,
  jwtVerify,
} from 'jose'
import { HttpError } from '../lib/http-error'
import type { AuthUser, VerifyToken } from './types'

type Options = {
  supabaseUrl: string
  /** Segredo HS256 (Supabase local / projetos com chave legada). */
  jwtSecret?: string
  /** Chaves públicas para tokens assimétricos; padrão: JWKS do próprio Supabase. */
  jwks?: JWTVerifyGetKey
}

const unauthorized = () => new HttpError(401, 'UNAUTHORIZED', 'Sessão inválida ou expirada')

/**
 * Valida o access token emitido pelo Supabase Auth: assinatura (HS256 com segredo, ou
 * assimétrica pelo JWKS), expiração e emissor. O papel vem de `app_metadata.role`, que só
 * o servidor consegue definir (o usuário não edita app_metadata).
 */
export function createSupabaseTokenVerifier(opts: Options): VerifyToken {
  const issuer = `${opts.supabaseUrl.replace(/\/$/, '')}/auth/v1`
  const secret = opts.jwtSecret ? new TextEncoder().encode(opts.jwtSecret) : undefined
  let jwks = opts.jwks

  return async (token: string): Promise<AuthUser> => {
    let payload: JWTPayload
    try {
      const { alg } = decodeProtectedHeader(token)
      if (alg === 'HS256') {
        if (!secret) throw unauthorized()
        ;({ payload } = await jwtVerify(token, secret, { issuer, algorithms: ['HS256'] }))
      } else {
        jwks ??= createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`))
        ;({ payload } = await jwtVerify(token, jwks, { issuer, algorithms: ['ES256', 'RS256'] }))
      }
    } catch {
      throw unauthorized()
    }
    if (!payload.sub) throw unauthorized()
    const appMetadata = (payload.app_metadata ?? {}) as { role?: unknown }
    return {
      id: payload.sub,
      email: typeof payload.email === 'string' ? payload.email : null,
      role: typeof appMetadata.role === 'string' ? appMetadata.role : null,
    }
  }
}
