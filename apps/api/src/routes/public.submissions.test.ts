import { describe, expect, it, vi } from 'vitest'
import { createApp } from '../app'
import type { SubmissionRepository } from '../repositories/types'
import { makeFakeDeps } from '../../test/fakes'
import { Q1, Q1_B, Q2, Q2_B, scoringQuiz } from '../../test/fixtures'
import { readJson } from '../../test/http'

function appWith(hasPrevious = false) {
  const submissionRepo: SubmissionRepository = {
    leadHasSubmission: async () => hasPrevious,
    saveSubmission: vi.fn(async () => ({ submissionId: 'sub-1', leadId: 'lead-1' })),
  }
  const app = createApp(() =>
    makeFakeDeps({
      quizRepo: {
        getActivePublicQuiz: async () => null,
        getActiveQuizForScoring: async () => scoringQuiz,
      },
      submissionRepo,
    }),
  )
  return { app, submissionRepo }
}

const post = (app: ReturnType<typeof appWith>['app'], body: unknown) =>
  app.request('/api/v1/submissions', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })

const valid = {
  lead: { name: 'Mariana Souza', email: '  Mariana@Email.com ', phone: '(11) 98765-4321' },
  answers: [
    { questionId: Q1, optionId: Q1_B },
    { questionId: Q2, optionId: Q2_B },
  ],
}

describe('POST /api/v1/submissions', () => {
  it('201 com o resultado', async () => {
    const res = await post(appWith().app, valid)
    expect(res.status).toBe(201)
    const body = await readJson(res)
    expect(body.score).toBe(100)
    expect(body.band.slug).toBe('reta-final')
  })

  it('normaliza o lead antes de salvar (e-mail minúsculo, telefone em dígitos)', async () => {
    const { app, submissionRepo } = appWith()
    await post(app, valid)
    expect(submissionRepo.saveSubmission).toHaveBeenCalledWith(
      expect.objectContaining({
        lead: { name: 'Mariana Souza', email: 'mariana@email.com', phone: '11987654321' },
      }),
    )
  })

  it('400 INVALID_JSON com corpo malformado', async () => {
    const res = await post(appWith().app, '{')
    expect(res.status).toBe(400)
    expect((await readJson(res)).error.code).toBe('INVALID_JSON')
  })

  it('422 VALIDATION_ERROR com erro no campo do telefone', async () => {
    const res = await post(appWith().app, { ...valid, lead: { ...valid.lead, phone: '1234' } })
    expect(res.status).toBe(422)
    const body = await readJson(res)
    expect(body.error.code).toBe('VALIDATION_ERROR')
    expect(body.error.details.fieldErrors['lead.phone']).toEqual([
      'Informe DDD + número. Ex.: (11) 98765-4321',
    ])
  })

  it('409 LEAD_ALREADY_SUBMITTED sem confirmReplace; 201 com confirmReplace', async () => {
    const { app } = appWith(true)
    const first = await post(app, valid)
    expect(first.status).toBe(409)
    expect((await readJson(first)).error.code).toBe('LEAD_ALREADY_SUBMITTED')
    const second = await post(app, { ...valid, confirmReplace: true })
    expect(second.status).toBe(201)
  })
})
