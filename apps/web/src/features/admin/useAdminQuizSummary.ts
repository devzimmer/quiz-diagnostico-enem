import type { AdminQuizSummary } from '@quiz/shared'
import { useQuery } from '@tanstack/react-query'
import { useAdminApi } from './useAdminApi'

export const adminQuizKey = ['admin', 'quiz'] as const

/** Resumo do quiz no admin: faixas, pontuação máxima e contagem de perguntas. */
export function useAdminQuizSummary() {
  const api = useAdminApi()
  return useQuery({
    queryKey: adminQuizKey,
    queryFn: () => api<AdminQuizSummary>('/admin/quiz'),
  })
}
