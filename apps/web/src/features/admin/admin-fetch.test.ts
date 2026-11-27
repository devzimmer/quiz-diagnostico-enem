import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/lib/api-client'
import { createAdminFetch } from './admin-fetch'

const respond = (status: number, body: unknown) =>
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(body), { status })),
  )
afterEach(() => vi.unstubAllGlobals())

const setup = (token: string | undefined) => {
  const onUnauthorized = vi.fn()
  const onForbidden = vi.fn()
  const adminFetch = createAdminFetch({
    getToken: async () => token,
    onUnauthorized,
    onForbidden,
  })
  return { adminFetch, onUnauthorized, onForbidden }
}

describe('createAdminFetch', () => {
  it('envia o token atual no Authorization', async () => {
    respond(200, { ok: true })
    const { adminFetch } = setup('abc')
    await expect(adminFetch('/admin/leads')).resolves.toEqual({ ok: true })
    const [url, init] = vi.mocked(fetch).mock.calls[0]!
    expect(url).toBe('/api/v1/admin/leads')
    expect(new Headers(init?.headers).get('authorization')).toBe('Bearer abc')
  })

  it('401: chama onUnauthorized e repassa o erro', async () => {
    respond(401, { error: { code: 'UNAUTHORIZED', message: 'Sessão inválida ou expirada' } })
    const { adminFetch, onUnauthorized, onForbidden } = setup('tok')
    await expect(adminFetch('/admin/leads')).rejects.toBeInstanceOf(ApiError)
    expect(onUnauthorized).toHaveBeenCalledOnce()
    expect(onForbidden).not.toHaveBeenCalled()
  })

  it('sem sessão: trata como 401 sem chamar a API', async () => {
    vi.stubGlobal('fetch', vi.fn())
    const { adminFetch, onUnauthorized } = setup(undefined)
    await expect(adminFetch('/admin/leads')).rejects.toMatchObject({ status: 401 })
    expect(onUnauthorized).toHaveBeenCalledOnce()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('403: chama onForbidden', async () => {
    respond(403, { error: { code: 'FORBIDDEN', message: 'Sem permissão' } })
    const { adminFetch, onUnauthorized, onForbidden } = setup('tok')
    await expect(adminFetch('/admin/leads')).rejects.toMatchObject({ status: 403 })
    expect(onForbidden).toHaveBeenCalledOnce()
    expect(onUnauthorized).not.toHaveBeenCalled()
  })

  it('outros erros passam direto', async () => {
    respond(404, { error: { code: 'NOT_FOUND', message: 'Lead não encontrado' } })
    const { adminFetch, onUnauthorized, onForbidden } = setup('tok')
    await expect(adminFetch('/admin/leads/x')).rejects.toMatchObject({ code: 'NOT_FOUND' })
    expect(onUnauthorized).not.toHaveBeenCalled()
    expect(onForbidden).not.toHaveBeenCalled()
  })
})
