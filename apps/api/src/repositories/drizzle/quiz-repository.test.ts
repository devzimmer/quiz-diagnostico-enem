import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { PGlite } from '@electric-sql/pglite'
import { createTestDb } from '../../../test/db/pglite'
import { DrizzleQuizRepository } from './quiz-repository'

let client: PGlite
let repo: DrizzleQuizRepository

beforeAll(async () => {
  const testDb = await createTestDb({ seed: true })
  client = testDb.client
  repo = new DrizzleQuizRepository(testDb.db)
})
afterAll(async () => client.close())

describe('DrizzleQuizRepository (seed real)', () => {
  it('quiz público: 10 perguntas ordenadas, alternativas ordenadas, sem pesos', async () => {
    const quiz = await repo.getActivePublicQuiz()
    expect(quiz?.title).toBe('Qual é a sua chance real de passar no ENEM?')
    expect(quiz?.questions.map((q) => q.position)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    expect(quiz?.questions[5]?.options.map((o) => o.position)).toEqual([1, 2, 3, 4, 5])
    expect(JSON.stringify(quiz)).not.toContain('weight')
  })

  it('ignora perguntas inativas', async () => {
    await client.query(
      `update questions set is_active = false, deactivated_at = now() where position = 10`,
    )
    const quiz = await repo.getActivePublicQuiz()
    expect(quiz?.questions).toHaveLength(9)
    await client.query(
      `update questions set is_active = true, deactivated_at = null where position = 10`,
    )
  })

  it('quiz para pontuação traz pesos e as 4 faixas', async () => {
    const quiz = await repo.getActiveQuizForScoring()
    expect(quiz?.questions[0]?.options.map((o) => o.weight)).toEqual([2, 5, 7, 10])
    expect(quiz?.bands.map((b) => b.slug)).toEqual([
      'ponto-de-partida',
      'em-construcao',
      'bom-caminho',
      'reta-final',
    ])
  })
})
