import { z } from 'zod'

export const leadListQuerySchema = z.object({
  search: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((value) => (value ? value : undefined)),
  band: z
    .string()
    .regex(/^[a-z0-9-]+$/, 'Faixa inválida')
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export type LeadListQuery = z.output<typeof leadListQuerySchema>

export const questionStatusSchema = z.enum(['active', 'inactive']).default('active')
export type QuestionStatus = z.output<typeof questionStatusSchema>

export const reorderSchema = z.object({
  questionIds: z
    .array(z.string().uuid())
    .min(1)
    .refine((ids) => new Set(ids).size === ids.length, 'Lista com perguntas repetidas'),
})

export type ReorderInput = z.output<typeof reorderSchema>
