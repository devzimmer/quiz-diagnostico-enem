import { z } from 'zod'
import { leadInputSchema } from './lead'

export const answerInputSchema = z.object({
  questionId: z.string().uuid(),
  optionId: z.string().uuid(),
})

export const submissionInputSchema = z.object({
  lead: leadInputSchema,
  answers: z
    .array(answerInputSchema)
    .min(1, 'Responda o quiz antes de enviar')
    .max(50)
    .refine(
      (answers) => new Set(answers.map((a) => a.questionId)).size === answers.length,
      'Cada pergunta deve ter uma única resposta',
    ),
  confirmReplace: z.boolean().optional(),
})

export type SubmissionInput = z.output<typeof submissionInputSchema>
