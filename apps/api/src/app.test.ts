import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { createApp } from './app'
import { validate } from './lib/validate'
import { makeFakeDeps } from '../test/fakes'
import { readJson } from '../test/http'

function buildApp() {
  const app = createApp(() => makeFakeDeps())
  app.get('/api/v1/__boom', () => {
    throw new Error('segredo interno')
  })
  app.post(
    '/api/v1/__echo',
    validate('json', z.object({ lead: z.object({ name: z.string().min(3) }) })),
    (c) => c.json(c.req.valid('json')),
  )
  return app
}

describe('app', () => {
  it('GET /api/v1/health → 200 { status: "ok" }', async () => {
    const res = await buildApp().request('/api/v1/health')
    expect(res.status).toBe(200)
    expect(await readJson(res)).toEqual({ status: 'ok' })
  })

  it('rota inexistente → 404 NOT_FOUND', async () => {
    const res = await buildApp().request('/api/v1/nada')
    expect(res.status).toBe(404)
    expect((await readJson(res)).error.code).toBe('NOT_FOUND')
  })

  it('erro inesperado → 500 INTERNAL_ERROR sem vazar a mensagem', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = await buildApp().request('/api/v1/__boom')
    expect(res.status).toBe(500)
    const body = await readJson(res)
    expect(body.error.code).toBe('INTERNAL_ERROR')
    expect(JSON.stringify(body)).not.toContain('segredo')
  })

  it('JSON malformado → 400 INVALID_JSON', async () => {
    const res = await buildApp().request('/api/v1/__echo', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{',
    })
    expect(res.status).toBe(400)
    expect((await readJson(res)).error.code).toBe('INVALID_JSON')
  })

  it('validação falha → 422 com fieldErrors por caminho', async () => {
    const res = await buildApp().request('/api/v1/__echo', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ lead: { name: 'Al' } }),
    })
    expect(res.status).toBe(422)
    const body = await readJson(res)
    expect(body.error.code).toBe('VALIDATION_ERROR')
    expect(body.error.details.fieldErrors['lead.name']).toHaveLength(1)
  })
})
