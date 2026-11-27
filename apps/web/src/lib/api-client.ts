import type { ApiErrorBody, ErrorCode } from '@quiz/shared'

const BASE_URL = `${import.meta.env.VITE_API_URL ?? ''}/api/v1`

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message)
    this.name = 'ApiError'
  }

  /** Erros de validação por campo (`lead.phone`, `options`…), quando houver. */
  get fieldErrors(): Record<string, string[]> {
    return (this.details?.fieldErrors as Record<string, string[]> | undefined) ?? {}
  }
}

export type ApiInit = Omit<RequestInit, 'body'> & { json?: unknown; token?: string }

export async function apiFetch<T>(path: string, init: ApiInit = {}): Promise<T> {
  const { json, token, headers: extraHeaders, ...rest } = init
  const headers = new Headers(extraHeaders)
  if (json !== undefined) headers.set('content-type', 'application/json')
  if (token) headers.set('authorization', `Bearer ${token}`)

  let res: Response
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...rest,
      headers,
      body: json === undefined ? undefined : JSON.stringify(json),
    })
  } catch {
    throw new ApiError(0, 'INTERNAL_ERROR', 'Sem conexão com o servidor. Verifique sua internet.')
  }

  if (res.status === 204) return undefined as T
  const body: unknown = await res.json().catch(() => null)
  if (!res.ok) {
    const error = (body as ApiErrorBody | null)?.error
    throw new ApiError(
      res.status,
      error?.code ?? 'INTERNAL_ERROR',
      error?.message ?? 'Erro inesperado. Tente novamente.',
      error?.details,
    )
  }
  return body as T
}
