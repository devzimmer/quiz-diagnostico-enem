export type ErrorCode =
  | 'INVALID_JSON'
  | 'VALIDATION_ERROR'
  | 'QUIZ_OUTDATED'
  | 'LEAD_ALREADY_SUBMITTED'
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'RATE_LIMITED'
  | 'QUESTION_INACTIVE'
  | 'QUESTION_REPLACED'
  | 'QUESTION_ALREADY_ACTIVE'
  | 'LAST_ACTIVE_QUESTION'
  | 'INTERNAL_ERROR'

export type ApiErrorBody = {
  error: {
    code: ErrorCode
    message: string
    /** Em erros de validação: `{ fieldErrors: Record<string, string[]> }`. */
    details?: Record<string, unknown>
  }
}
