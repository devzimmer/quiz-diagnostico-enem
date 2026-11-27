import type { SubmissionInput } from '@quiz/shared'
import { describe, expect, it, vi } from 'vitest'
import type { NewSubmission, SubmissionRepository } from '../repositories/types'
import { Q1, Q1_A, Q1_B, Q2, Q2_A, Q2_B, scoringQuiz } from '../../test/fixtures'
import { submitQuiz } from './submission-service'

const lead = { name: 'Mariana Souza', email: 'mariana@email.com', phone: '11987654321' }

function setup({ hasPrevious = false, quiz = scoringQuiz as typeof scoringQuiz | null } = {}) {
  const saved: NewSubmission[] = []
  const submissionRepo: SubmissionRepository = {
    leadHasSubmission: vi.fn(async () => hasPrevious),
    saveSubmission: vi.fn(async (data: NewSubmission) => {
      saved.push(data)
      return { submissionId: 'sub-1', leadId: 'lead-1' }
    }),
  }
  const quizRepo = {
    getActivePublicQuiz: async () => null,
    getActiveQuizForScoring: async () => quiz,
  }
  return { deps: { quizRepo, submissionRepo }, saved, submissionRepo }
}

const input = (overrides: Partial<SubmissionInput> = {}): SubmissionInput => ({
  lead,
  // fora de ordem de propósito: o resultado deve vir ordenado por posição
  answers: [
    { questionId: Q2, optionId: Q2_A },
    { questionId: Q1, optionId: Q1_B },
  ],
  ...overrides,
})

describe('submitQuiz', () => {
  it('calcula nota e faixa e devolve respostas ordenadas por posição', async () => {
    const { deps } = setup()
    // 10 + 2 = 12 de 20 → 60 → Bom caminho
    const result = await submitQuiz(deps, input())
    expect(result).toEqual({
      submissionId: 'sub-1',
      score: 60,
      band: { slug: 'bom-caminho', label: 'Bom caminho', message: 'm3' },
      answers: [
        { position: 1, question: 'Pergunta um?', option: 'Um B' },
        { position: 2, question: 'Pergunta dois?', option: 'Dois A' },
      ],
      bands: [
        { slug: 'ponto-de-partida', label: 'Ponto de partida', minScore: 0, maxScore: 30 },
        { slug: 'em-construcao', label: 'Em construção', minScore: 31, maxScore: 55 },
        { slug: 'bom-caminho', label: 'Bom caminho', minScore: 56, maxScore: 80 },
        { slug: 'reta-final', label: 'Reta final', minScore: 81, maxScore: 100 },
      ],
    })
  })

  it('salva snapshot de textos, pesos e faixa', async () => {
    const { deps, saved } = setup()
    await submitQuiz(deps, input())
    expect(saved[0]).toMatchObject({
      lead,
      rawPoints: 12,
      maxPoints: 20,
      score: 60,
      band: { slug: 'bom-caminho' },
      answers: [
        {
          questionId: Q1,
          optionId: Q1_B,
          questionPosition: 1,
          questionText: 'Pergunta um?',
          optionText: 'Um B',
          weight: 10,
        },
        {
          questionId: Q2,
          optionId: Q2_A,
          questionPosition: 2,
          questionText: 'Pergunta dois?',
          optionText: 'Dois A',
          weight: 2,
        },
      ],
    })
  })

  it('e-mail com envio anterior e sem confirmReplace → 409 sem salvar', async () => {
    const { deps, submissionRepo } = setup({ hasPrevious: true })
    await expect(submitQuiz(deps, input())).rejects.toMatchObject({
      status: 409,
      code: 'LEAD_ALREADY_SUBMITTED',
    })
    expect(submissionRepo.saveSubmission).not.toHaveBeenCalled()
  })

  it('e-mail com envio anterior e confirmReplace → salva', async () => {
    const { deps, saved } = setup({ hasPrevious: true })
    await submitQuiz(deps, input({ confirmReplace: true }))
    expect(saved).toHaveLength(1)
  })

  it('e-mail novo com confirmReplace → salva normalmente', async () => {
    const { deps, saved } = setup()
    await submitQuiz(deps, input({ confirmReplace: true }))
    expect(saved).toHaveLength(1)
  })

  it.each([
    ['falta resposta de pergunta ativa', [{ questionId: Q1, optionId: Q1_A }]],
    [
      'pergunta desconhecida',
      [
        { questionId: Q1, optionId: Q1_A },
        { questionId: Q2, optionId: Q2_A },
        { questionId: '00000000-0000-4000-8000-000000000999', optionId: Q2_A },
      ],
    ],
    [
      'alternativa de outra pergunta',
      [
        { questionId: Q1, optionId: Q2_B },
        { questionId: Q2, optionId: Q2_A },
      ],
    ],
  ])('%s → 422 QUIZ_OUTDATED', async (_label, answers) => {
    const { deps, submissionRepo } = setup()
    await expect(submitQuiz(deps, input({ answers }))).rejects.toMatchObject({
      status: 422,
      code: 'QUIZ_OUTDATED',
    })
    expect(submissionRepo.saveSubmission).not.toHaveBeenCalled()
  })

  it('sem quiz ativo → 404', async () => {
    const { deps } = setup({ quiz: null })
    await expect(submitQuiz(deps, input())).rejects.toMatchObject({ status: 404 })
  })
})
