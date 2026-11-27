import { describe, expect, it } from 'vitest'
import { createApp } from '../app'
import type { AuthUser } from '../auth/types'
import { HttpError } from '../lib/http-error'
import { makeFakeDeps } from '../../test/fakes'
import { readJson } from '../../test/http'
import { requireAdmin } from './require-admin'

const users: Record<string, AuthUser> = {
  'token-admin': { id: 'u1', email: 'admin@quiz.local', role: 'admin' },
  'token-comum': { id: 'u2', email: 'x@quiz.local', role: null },
}

function buildApp() {
  const app = createApp(() =>
    makeFakeDeps({
      verifyToken: async (token) => {
        const user = users[token]
        if (!user) throw new HttpError(401, 'UNAUTHORIZED', 'Sessão inválida ou expirada')
        return user
      },
    }),
  )
  app.get('/api/v1/admin/__ping', requireAdmin(), (c) => c.json({ user: c.var.user }))
  return app
}

const get = (authorization?: string) =>
  buildApp().request('/api/v1/admin/__ping', {
    headers: authorization ? { authorization } : {},
  })

describe('requireAdmin', () => {
  it('sem Authorization → 401', async () => {
    const res = await get()
    expect(res.status).toBe(401)
    expect((await readJson(res)).error.code).toBe('UNAUTHORIZED')
  })

  it('esquema diferente de Bearer → 401', async () =>
    expect((await get('Basic abc')).status).toBe(401))

  it('token rejeitado (ex.: expirado) → 401', async () =>
    expect((await get('Bearer token-expirado')).status).toBe(401))

  it('usuário autenticado sem papel admin → 403', async () => {
    const res = await get('Bearer token-comum')
    expect(res.status).toBe(403)
    expect((await readJson(res)).error.code).toBe('FORBIDDEN')
  })

  it('o app protege todo /api/v1/admin/* (mesmo rotas inexistentes) → 401 sem token', async () => {
    const res = await buildApp().request('/api/v1/admin/qualquer-coisa')
    expect(res.status).toBe(401)
  })

  it('admin → passa e expõe o usuário', async () => {
    const res = await get('Bearer token-admin')
    expect(res.status).toBe(200)
    expect((await readJson(res)).user.email).toBe('admin@quiz.local')
  })
})
