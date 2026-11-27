import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { PGlite } from '@electric-sql/pglite'
import { createTestDb } from '../../../test/db/pglite'
import type { NewSubmission } from '../types'
import { DrizzleQuizRepository } from './quiz-repository'
import { DrizzleSubmissionRepository } from './submission-repository'

let client: PGlite
let repo: DrizzleSubmissionRepository
let base: Omit<NewSubmission, 'lead'>

beforeAll(async () => {
  const testDb = await createTestDb({ seed: true })
  client = testDb.client
  repo = new DrizzleSubmissionRepository(testDb.db)
  const quiz = (await new DrizzleQuizRepository(testDb.db).getActiveQuizForScoring())!
  base = {
    quizId: quiz.id,
    rawPoints: 64,
    maxPoints: 100,
    score: 64,
    band: quiz.bands[2]!,
    answers: quiz.questions.map((q) => ({
      questionId: q.id,
      optionId: q.options[0]!.id,
      questionPosition: q.position,
      questionText: q.text,
      optionText: q.options[0]!.text,
      weight: q.options[0]!.weight,
    })),
  }
})
afterAll(async () => client.close())

const count = async (sql: string) => (await client.query<{ n: number }>(sql)).rows[0]!.n

describe('DrizzleSubmissionRepository', () => {
  it('grava lead, envio, respostas e o ponteiro do envio mais recente', async () => {
    const lead = { name: 'Mariana Souza', email: 'mariana@email.com', phone: '11987654321' }
    expect(await repo.leadHasSubmission(lead.email)).toBe(false)
    const { leadId, submissionId } = await repo.saveSubmission({ ...base, lead })
    expect(await repo.leadHasSubmission(lead.email)).toBe(true)
    expect(
      await count(
        `select count(*)::int n from submission_answers where submission_id = '${submissionId}'`,
      ),
    ).toBe(10)
    const { rows } = await client.query<{ latest_submission_id: string }>(
      `select latest_submission_id from leads where id = '${leadId}'`,
    )
    expect(rows[0]?.latest_submission_id).toBe(submissionId)
  })

  it('reenvio do mesmo e-mail atualiza o lead e aponta para o novo envio, mantendo o histórico', async () => {
    const lead = { name: 'Mariana S.', email: 'mariana@email.com', phone: '21987654321' }
    const { leadId, submissionId } = await repo.saveSubmission({ ...base, lead })
    const { rows } = await client.query<{
      name: string
      phone: string
      latest_submission_id: string
    }>(`select name, phone, latest_submission_id from leads where id = '${leadId}'`)
    expect(rows[0]).toEqual({
      name: 'Mariana S.',
      phone: '21987654321',
      latest_submission_id: submissionId,
    })
    expect(await count(`select count(*)::int n from leads`)).toBe(1)
    expect(await count(`select count(*)::int n from submissions where lead_id = '${leadId}'`)).toBe(
      2,
    )
  })

  it('falha no meio da transação não deixa nada gravado', async () => {
    const before = await count(`select count(*)::int n from submissions`)
    const broken = {
      ...base,
      answers: [
        {
          ...base.answers[0]!,
          optionId: base.answers[1]!.optionId,
          questionId: '00000000-0000-4000-8000-000000000000',
        },
      ],
    }
    await expect(
      repo.saveSubmission({
        ...broken,
        lead: { name: 'Outra Pessoa', email: 'outra@email.com', phone: '11987650000' },
      }),
    ).rejects.toThrow()
    expect(await count(`select count(*)::int n from submissions`)).toBe(before)
    expect(await count(`select count(*)::int n from leads where email = 'outra@email.com'`)).toBe(0)
  })
})
