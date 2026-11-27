import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair } from 'jose'
import { describe, expect, it } from 'vitest'
import { createSupabaseTokenVerifier } from './verify-token'

const SUPABASE_URL = 'http://127.0.0.1:54321'
const SECRET = 'super-secret-jwt-token-with-at-least-32-characters-long'
const key = new TextEncoder().encode(SECRET)

const sign = (
  opts: { secret?: Uint8Array; iss?: string; exp?: string | number; role?: string } = {},
) =>
  new SignJWT({ email: 'admin@quiz.local', app_metadata: opts.role ? { role: opts.role } : {} })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject('user-1')
    .setIssuer(opts.iss ?? `${SUPABASE_URL}/auth/v1`)
    .setIssuedAt()
    .setExpirationTime(opts.exp ?? '1h')
    .sign(opts.secret ?? key)

const verify = createSupabaseTokenVerifier({ supabaseUrl: SUPABASE_URL, jwtSecret: SECRET })

describe('createSupabaseTokenVerifier', () => {
  it('aceita token HS256 válido e lê o papel de app_metadata', async () => {
    expect(await verify(await sign({ role: 'admin' }))).toEqual({
      id: 'user-1',
      email: 'admin@quiz.local',
      role: 'admin',
    })
  })

  it('token sem papel → role null', async () => {
    expect((await verify(await sign())).role).toBeNull()
  })

  it.each([
    ['expirado', () => sign({ role: 'admin', exp: Math.floor(Date.now() / 1000) - 60 })],
    [
      'assinado com outro segredo',
      () => sign({ role: 'admin', secret: new TextEncoder().encode('x'.repeat(40)) }),
    ],
    ['de outro emissor', () => sign({ role: 'admin', iss: 'https://evil.example/auth/v1' })],
    ['malformado', async () => 'nao-e-um-jwt'],
  ])('rejeita token %s com 401', async (_label, makeToken) => {
    await expect(verify(await makeToken())).rejects.toMatchObject({
      status: 401,
      code: 'UNAUTHORIZED',
    })
  })

  it('aceita token ES256 validado pelo JWKS', async () => {
    const { publicKey, privateKey } = await generateKeyPair('ES256')
    const jwk = { ...(await exportJWK(publicKey)), kid: 'k1', alg: 'ES256' }
    const verifyJwks = createSupabaseTokenVerifier({
      supabaseUrl: SUPABASE_URL,
      jwks: createLocalJWKSet({ keys: [jwk] }),
    })
    const token = await new SignJWT({ app_metadata: { role: 'admin' } })
      .setProtectedHeader({ alg: 'ES256', kid: 'k1' })
      .setSubject('user-2')
      .setIssuer(`${SUPABASE_URL}/auth/v1`)
      .setExpirationTime('1h')
      .sign(privateKey)
    expect(await verifyJwks(token)).toEqual({ id: 'user-2', email: null, role: 'admin' })
  })

  it('HS256 sem segredo configurado → 401', async () => {
    const noSecret = createSupabaseTokenVerifier({ supabaseUrl: SUPABASE_URL })
    await expect(noSecret(await sign({ role: 'admin' }))).rejects.toMatchObject({ status: 401 })
  })
})
