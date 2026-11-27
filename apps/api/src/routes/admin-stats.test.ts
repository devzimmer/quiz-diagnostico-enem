import type { AdminQuizSummary } from '@quiz/shared'
import { describe, expect, it } from 'vitest'
import { createApp } from '../app'
import type { LeadQueryRepository, QuestionAdminRepository } from '../repositories/types'
import { authHeader, fakeVerifyToken } from '../../test/admin'
import { makeFakeDeps } from '../../test/fakes'
import { readJson } from '../../test/http'

const app = createApp(() =>
  makeFakeDeps({
    verifyToken: fakeVerifyToken,
    leadQueryRepo: {
      getStatsRow: async () => ({
        total: 2,
        averageScore: 47.5,
        byBand: [{ slug: 'em-construcao', label: 'Em construção', count: 2 }],
        byDay: [],
      }),
    } as unknown as LeadQueryRepository,
    questionAdminRepo: {
      getActiveQuizId: async () => 'quiz-1',
      getSummary: async () =>
        ({
          bands: [{ slug: 'em-construcao', label: 'Em construção', minScore: 31, maxScore: 55 }],
        }) as AdminQuizSummary,
    } as unknown as QuestionAdminRepository,
  }),
)

describe('GET /api/v1/admin/stats', () => {
  it('exige admin', async () => {
    expect((await app.request('/api/v1/admin/stats')).status).toBe(401)
  })

  it('devolve os indicadores', async () => {
    const res = await app.request('/api/v1/admin/stats', { headers: authHeader })
    expect(res.status).toBe(200)
    const body = await readJson(res)
    expect(body).toMatchObject({
      total: 2,
      averageScore: 48,
      byBand: [{ slug: 'em-construcao', count: 2 }],
    })
    expect(body.byDay).toHaveLength(14)
  })
})
