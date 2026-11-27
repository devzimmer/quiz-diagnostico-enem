import { zValidator } from '@hono/zod-validator'
import type { ValidationTargets } from 'hono'
import type { ZodSchema } from 'zod'
import { validationError } from './http-error'

/** Valida `target` com o schema e lança 422 VALIDATION_ERROR no formato padrão da API. */
export const validate = <T extends ZodSchema, Target extends keyof ValidationTargets>(
  target: Target,
  schema: T,
) =>
  zValidator(target, schema, (result) => {
    if (!result.success) throw validationError(result.error)
  })
