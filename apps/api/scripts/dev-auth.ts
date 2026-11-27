/**
 * Imitação mínima do Supabase Auth (GoTrue) para o modo `dev:memory`: só o que o
 * `@supabase/supabase-js` usa no painel — login por senha, refresh, usuário atual e logout.
 * Confere a senha no `auth.users` do seed (pgcrypto) e emite tokens HS256 com o mesmo
 * formato de claims do Supabase. Uso exclusivo de desenvolvimento local.
 */
import type { PGlite } from '@electric-sql/pglite'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { SignJWT, jwtVerify } from 'jose'

type Options = {
  client: PGlite
  /** URL base do "Supabase" (o emissor dos tokens é `<url>/auth/v1`). */
  supabaseUrl: string
  jwtSecret: string
  allowedOrigin: string
  /** Validade do access token em segundos. */
  ttlSeconds: number
}

type UserRow = {
  id: string
  email: string
  raw_app_meta_data: Record<string, unknown> | null
  raw_user_meta_data: Record<string, unknown> | null
  created_at: string
}

const invalidGrant = {
  code: 'invalid_credentials',
  error: 'invalid_grant',
  error_description: 'Invalid login credentials',
  msg: 'Invalid login credentials',
}

export function createDevAuth(opts: Options) {
  const issuer = `${opts.supabaseUrl.replace(/\/$/, '')}/auth/v1`
  const secret = new TextEncoder().encode(opts.jwtSecret)
  const refreshTokens = new Map<string, string>() // refresh token → user id

  const toUser = (row: UserRow) => ({
    id: row.id,
    aud: 'authenticated',
    role: 'authenticated',
    email: row.email,
    app_metadata: row.raw_app_meta_data ?? {},
    user_metadata: row.raw_user_meta_data ?? {},
    created_at: row.created_at,
  })

  const findUser = async (where: string, params: unknown[]) => {
    const { rows } = await opts.client.query<UserRow>(
      `select id, email, raw_app_meta_data, raw_user_meta_data, created_at
         from auth.users where ${where}`,
      params,
    )
    return rows[0]
  }

  const issueSession = async (row: UserRow) => {
    const user = toUser(row)
    const now = Math.floor(Date.now() / 1000)
    const accessToken = await new SignJWT({
      email: user.email,
      role: 'authenticated',
      app_metadata: user.app_metadata,
      user_metadata: user.user_metadata,
    })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setSubject(user.id)
      .setIssuer(issuer)
      .setAudience('authenticated')
      .setIssuedAt(now)
      .setExpirationTime(now + opts.ttlSeconds)
      .sign(secret)
    const refreshToken = crypto.randomUUID()
    refreshTokens.set(refreshToken, user.id)
    return {
      access_token: accessToken,
      token_type: 'bearer',
      expires_in: opts.ttlSeconds,
      expires_at: now + opts.ttlSeconds,
      refresh_token: refreshToken,
      user,
    }
  }

  const auth = new Hono()
  auth.use(
    '*',
    cors({
      origin: opts.allowedOrigin,
      allowHeaders: [
        'authorization',
        'apikey',
        'content-type',
        'x-client-info',
        'x-supabase-api-version',
      ],
      allowMethods: ['GET', 'POST', 'OPTIONS'],
    }),
  )

  auth.post('/token', async (c) => {
    const grant = c.req.query('grant_type')
    const body = await c.req
      .json<Record<string, string>>()
      .catch(() => ({}) as Record<string, string>)
    if (grant === 'password') {
      const row = await findUser(
        'lower(email) = lower($1) and encrypted_password = extensions.crypt($2, encrypted_password)',
        [body.email ?? '', body.password ?? ''],
      )
      return row ? c.json(await issueSession(row)) : c.json(invalidGrant, 400)
    }
    if (grant === 'refresh_token') {
      const userId = refreshTokens.get(body.refresh_token ?? '')
      refreshTokens.delete(body.refresh_token ?? '')
      const row = userId ? await findUser('id = $1', [userId]) : undefined
      return row
        ? c.json(await issueSession(row))
        : c.json({ code: 'refresh_token_not_found', msg: 'Invalid Refresh Token' }, 400)
    }
    return c.json({ code: 'unsupported_grant_type', msg: 'Unsupported grant type' }, 400)
  })

  auth.get('/user', async (c) => {
    const token = c.req.header('authorization')?.replace(/^Bearer /i, '') ?? ''
    try {
      const { payload } = await jwtVerify(token, secret, { issuer })
      const row = await findUser('id = $1', [payload.sub])
      if (row) return c.json(toUser(row))
    } catch {
      // cai no 401 abaixo
    }
    return c.json({ code: 'bad_jwt', msg: 'invalid JWT' }, 401)
  })

  auth.post('/logout', (c) => c.body(null, 204))

  return auth
}
