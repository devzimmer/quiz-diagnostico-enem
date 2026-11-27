import { describe, expect, it, vi } from 'vitest'
import { createApp } from '../app'
import type { RateLimiter } from '../deps'
import { makeFakeDeps } from '../../test/fakes'
import { readJson } from '../../test/http'

const appWith = (submissionLimiter?: RateLimiter) =>
  createApp(() => makeFakeDeps({ submissionLimiter }))

const postInvalid = (app: ReturnType<typeof appWith>, ip?: string) =>
  app.request('/api/v1/submissions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(ip ? { 'cf-connecting-ip': ip } : {}) },
    body: '{}',
  })

describe('rate limit do envio', () => {
  it('limiter nega: 429 RATE_LIMITED antes de validar o corpo', async () => {
    const limiter = { limit: vi.fn(async () => ({ success: false })) }
    const res = await postInvalid(appWith(limiter), '203.0.113.7')
    expect(res.status).toBe(429)
    expect(await readJson(res)).toEqual({
      error: {
        code: 'RATE_LIMITED',
        message: 'Muitas tentativas. Aguarde um minuto e tente de novo.',
      },
    })
    expect(limiter.limit).toHaveBeenCalledWith({ key: '203.0.113.7' })
  })

  it('limiter permite: segue para a validação', async () => {
    const limiter = { limit: vi.fn(async () => ({ success: true })) }
    const res = await postInvalid(appWith(limiter))
    expect(res.status).toBe(422)
    expect(limiter.limit).toHaveBeenCalledWith({ key: 'local' })
  })

  it('sem limiter configurado: segue', async () => {
    const res = await postInvalid(appWith(undefined))
    expect(res.status).toBe(422)
  })

  it('não limita a leitura do quiz', async () => {
    const limiter = { limit: vi.fn(async () => ({ success: false })) }
    await appWith(limiter).request('/api/v1/quiz')
    expect(limiter.limit).not.toHaveBeenCalled()
  })
})
