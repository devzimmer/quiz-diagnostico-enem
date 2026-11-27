import { describe, expect, it } from 'vitest'
import { submissionInputSchema } from './submission'

const q1 = '6f1b3c2e-6a52-4f0e-9a0e-0a7a1c6b8d01'
const q2 = '6f1b3c2e-6a52-4f0e-9a0e-0a7a1c6b8d02'
const o1 = '9e2d4b1a-1c3e-4d5f-8a6b-7c8d9e0f1a01'
const lead = { name: 'Mariana Souza', email: 'mariana@email.com', phone: '(11) 98765-4321' }

describe('submissionInputSchema', () => {
  it('aceita payload válido sem confirmReplace', () => {
    const parsed = submissionInputSchema.parse({
      lead,
      answers: [
        { questionId: q1, optionId: o1 },
        { questionId: q2, optionId: o1 },
      ],
    })
    expect(parsed.confirmReplace).toBeUndefined()
    expect(parsed.lead.phone).toBe('11987654321')
  })

  it('rejeita questionId repetido apontando para answers', () => {
    const r = submissionInputSchema.safeParse({
      lead,
      answers: [
        { questionId: q1, optionId: o1 },
        { questionId: q1, optionId: o1 },
      ],
    })
    expect(r.success).toBe(false)
    expect(r.error?.flatten().fieldErrors.answers?.length).toBeGreaterThan(0)
  })

  it('rejeita uuid inválido', () => {
    const r = submissionInputSchema.safeParse({
      lead,
      answers: [{ questionId: 'x', optionId: o1 }],
    })
    expect(r.success).toBe(false)
  })

  it('rejeita lista de respostas vazia', () =>
    expect(submissionInputSchema.safeParse({ lead, answers: [] }).success).toBe(false))
})
