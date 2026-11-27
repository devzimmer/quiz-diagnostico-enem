import { ApiError, type ApiInit, apiFetch } from '@/lib/api-client'

type Options = {
  /** Token atual (o Supabase renova sozinho quando está para vencer). */
  getToken: () => Promise<string | undefined>
  /** Sessão ausente ou recusada pela API (401). */
  onUnauthorized: () => void | Promise<void>
  /** Usuário autenticado, mas sem papel de admin (403). */
  onForbidden: () => void
}

export type AdminFetch = <T>(path: string, init?: Omit<ApiInit, 'token'>) => Promise<T>

/** `apiFetch` com o token do admin e o tratamento comum de 401/403 do painel. */
export function createAdminFetch({ getToken, onUnauthorized, onForbidden }: Options): AdminFetch {
  return async <T>(path: string, init: Omit<ApiInit, 'token'> = {}) => {
    const token = await getToken()
    if (!token) {
      await onUnauthorized()
      throw new ApiError(401, 'UNAUTHORIZED', 'Sessão expirada')
    }
    try {
      return await apiFetch<T>(path, { ...init, token })
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) await onUnauthorized()
      else if (error instanceof ApiError && error.status === 403) onForbidden()
      throw error
    }
  }
}
