import type { ApiErrorBody, ErrorCode } from '@quiz/shared'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import type { ZodError } from 'zod'

export class HttpError extends Error {
  constructor(
    readonly status: ContentfulStatusCode,
    readonly code: ErrorCode,
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message)
    this.name = 'HttpError'
  }

  toBody(): ApiErrorBody {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details ? { details: this.details } : {}),
      },
    }
  }
}

/** Erros do Zod agrupados por caminho com ponto (`lead.phone`, `answers`). */
export function fieldErrorsFrom(error: ZodError): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {}
  for (const issue of error.issues) {
    const key = issue.path.length ? issue.path.join('.') : '_'
    ;(fieldErrors[key] ??= []).push(issue.message)
  }
  return fieldErrors
}

export const validationError = (error: ZodError) =>
  new HttpError(422, 'VALIDATION_ERROR', 'Dados inválidos', { fieldErrors: fieldErrorsFrom(error) })

export const notFound = (message = 'Recurso não encontrado') =>
  new HttpError(404, 'NOT_FOUND', message)
