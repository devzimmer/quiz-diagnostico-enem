import { z } from 'zod'

export const QUESTION_LIMITS = {
  textMin: 5,
  textMax: 300,
  optionsMin: 2,
  optionsMax: 6,
  optionTextMax: 200,
  weightMin: 0,
  weightMax: 100,
} as const

export const questionOptionSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, 'Informe o texto da alternativa')
    .max(QUESTION_LIMITS.optionTextMax, `Máximo de ${QUESTION_LIMITS.optionTextMax} caracteres`),
  weight: z
    .number({ invalid_type_error: 'Informe os pontos' })
    .int('Use um número inteiro')
    .min(QUESTION_LIMITS.weightMin, 'Mínimo de 0 pontos')
    .max(QUESTION_LIMITS.weightMax, 'Máximo de 100 pontos'),
})

export const questionContentSchema = z.object({
  text: z
    .string()
    .trim()
    .min(QUESTION_LIMITS.textMin, `Mínimo de ${QUESTION_LIMITS.textMin} caracteres`)
    .max(QUESTION_LIMITS.textMax, `Máximo de ${QUESTION_LIMITS.textMax} caracteres`),
  options: z
    .array(questionOptionSchema)
    .min(QUESTION_LIMITS.optionsMin, `Inclua pelo menos ${QUESTION_LIMITS.optionsMin} alternativas`)
    .max(QUESTION_LIMITS.optionsMax, `Inclua no máximo ${QUESTION_LIMITS.optionsMax} alternativas`),
})

export type QuestionContent = z.output<typeof questionContentSchema>
