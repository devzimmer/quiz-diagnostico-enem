import { beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../app'
import { authHeader, fakeVerifyToken } from '../../test/admin'
import { makeFakeDeps } from '../../test/fakes'
import { FakeQuestionRepo } from '../../test/fake-question-repo'
import { readJson } from '../../test/http'

let repo: FakeQuestionRepo
let app: ReturnType<typeof createApp>

beforeEach(() => {
  repo = new FakeQuestionRepo()
  app = createApp(() => makeFakeDeps({ questionAdminRepo: repo, verifyToken: fakeVerifyToken }))
})

const UUID = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const content = {
  text: 'Quantos simulados você já fez?',
  options: [
    { text: 'Nenhum', weight: 0 },
    { text: 'Vários', weight: 10 },
  ],
}

const send = (method: string, path: string, body?: unknown) =>
  app.request(`/api/v1/admin/quiz${path}`, {
    method,
    headers: { ...authHeader, 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

describe('rotas do editor de perguntas', () => {
  it('GET /admin/quiz → resumo', async () => {
    repo.add({ id: UUID(1) })
    const res = await send('GET', '')
    expect(res.status).toBe(200)
    expect((await readJson(res)).activeCount).toBe(1)
  })

  it('GET /questions?status=active|inactive e status inválido → 422', async () => {
    repo.add({ id: UUID(1) })
    expect((await readJson(await send('GET', '/questions'))).length).toBe(1)
    expect((await send('GET', '/questions?status=inactive')).status).toBe(200)
    expect((await send('GET', '/questions?status=foo')).status).toBe(422)
  })

  it('POST /questions → 201; conteúdo inválido → 422', async () => {
    expect((await send('POST', '/questions', content)).status).toBe(201)
    const bad = await send('POST', '/questions', { ...content, options: [content.options[0]] })
    expect(bad.status).toBe(422)
    expect((await readJson(bad)).error.details.fieldErrors.options).toBeDefined()
  })

  it('PUT /questions/:id → 200 com versioned', async () => {
    repo.add({ id: UUID(1), answerCount: 3 })
    repo.add({ id: UUID(2) })
    const res = await send('PUT', `/questions/${UUID(1)}`, content)
    expect(res.status).toBe(200)
    expect((await readJson(res)).versioned).toBe(true)
  })

  it('PUT com id que não é uuid → 404', async () =>
    expect((await send('PUT', '/questions/abc', content)).status).toBe(404))

  it('DELETE /questions/:id → 204; última ativa → 422', async () => {
    repo.add({ id: UUID(1) })
    repo.add({ id: UUID(2) })
    expect((await send('DELETE', `/questions/${UUID(1)}`)).status).toBe(204)
    const last = await send('DELETE', `/questions/${UUID(2)}`)
    expect(last.status).toBe(422)
    expect((await readJson(last)).error.code).toBe('LAST_ACTIVE_QUESTION')
  })

  it('POST /questions/:id/reactivate → 200', async () => {
    repo.add({ id: UUID(1) })
    repo.add({ id: UUID(2), isActive: false })
    const res = await send('POST', `/questions/${UUID(2)}/reactivate`)
    expect(res.status).toBe(200)
    expect((await readJson(res)).position).toBe(2)
  })

  it('PUT /question-order → 200; lista divergente → 422', async () => {
    repo.add({ id: UUID(1) })
    repo.add({ id: UUID(2) })
    const ok = await send('PUT', '/question-order', { questionIds: [UUID(2), UUID(1)] })
    expect(ok.status).toBe(200)
    expect(await readJson(ok)).toEqual({ questionIds: [UUID(2), UUID(1)] })
    expect((await send('PUT', '/question-order', { questionIds: [UUID(1)] })).status).toBe(422)
  })

  it('sem token → 401', async () => {
    expect((await app.request('/api/v1/admin/quiz/questions')).status).toBe(401)
  })
})
