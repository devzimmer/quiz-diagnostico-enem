import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiFetch } from './api-client'

const mockFetch = (impl: typeof fetch) => vi.stubGlobal('fetch', vi.fn(impl))
afterEach(() => vi.unstubAllGlobals())

describe('apiFetch', () => {
  it('prefixa /api/v1, envia JSON e token e devolve o corpo', async () => {
    mockFetch(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }))
    const result = await apiFetch<{ ok: boolean }>('/quiz', {
      method: 'POST',
      json: { a: 1 },
      token: 't',
    })
    expect(result).toEqual({ ok: true })
    const [url, init] = vi.mocked(fetch).mock.calls[0]!
    expect(url).toBe('/api/v1/quiz')
    expect(init?.body).toBe('{"a":1}')
    const headers = new Headers(init?.headers)
    expect(headers.get('authorization')).toBe('Bearer t')
    expect(headers.get('content-type')).toBe('application/json')
  })

  it('erro da API vira ApiError com código e detalhes', async () => {
    mockFetch(
      async () =>
        new Response(
          JSON.stringify({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Dados inválidos',
              details: { fieldErrors: {} },
            },
          }),
          { status: 422 },
        ),
    )
    const error = await apiFetch('/submissions').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({
      status: 422,
      code: 'VALIDATION_ERROR',
      message: 'Dados inválidos',
    })
  })

  it('falha de rede vira ApiError status 0', async () => {
    mockFetch(async () => {
      throw new TypeError('Failed to fetch')
    })
    await expect(apiFetch('/quiz')).rejects.toMatchObject({ status: 0, code: 'INTERNAL_ERROR' })
  })

  it('204 → undefined', async () => {
    mockFetch(async () => new Response(null, { status: 204 }))
    expect(await apiFetch('/x', { method: 'DELETE' })).toBeUndefined()
  })
})
