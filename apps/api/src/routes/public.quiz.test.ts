import { describe, expect, it } from 'vitest'
import { createApp } from '../app'
import { makeFakeDeps } from '../../test/fakes'
import { publicQuiz } from '../../test/fixtures'
import { readJson } from '../../test/http'

const appWith = (quiz: typeof publicQuiz | null) =>
  createApp(() =>
    makeFakeDeps({
      quizRepo: {
        getActivePublicQuiz: async () => quiz,
        getActiveQuizForScoring: async () => null,
      },
    }),
  )

describe('GET /api/v1/quiz', () => {
  it('retorna o quiz ativo sem pesos', async () => {
    const res = await appWith(publicQuiz).request('/api/v1/quiz')
    expect(res.status).toBe(200)
    const body = await readJson(res)
    expect(body).toEqual(publicQuiz)
    expect(JSON.stringify(body)).not.toContain('weight')
  })

  it('404 quando não há quiz ativo', async () => {
    const res = await appWith(null).request('/api/v1/quiz')
    expect(res.status).toBe(404)
    expect((await readJson(res)).error.code).toBe('NOT_FOUND')
  })
})
