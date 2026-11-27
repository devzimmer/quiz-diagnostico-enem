import type { AdminQuizSummary, LeadDetail, LeadListItem, Paginated } from '@quiz/shared'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useAdminApi } from '../useAdminApi'
import { LEADS_PAGE_SIZE, type LeadParams, leadsApiPath } from './lead-params'

/** Resumo do quiz no admin (faixas, contagens). Compartilhado com a tela de perguntas. */
export function useAdminQuizSummary() {
  const api = useAdminApi()
  return useQuery({
    queryKey: ['admin', 'quiz'],
    queryFn: () => api<AdminQuizSummary>('/admin/quiz'),
    staleTime: 5 * 60_000,
  })
}

export function useLeads(params: LeadParams) {
  const api = useAdminApi()
  return useQuery({
    queryKey: ['admin', 'leads', params],
    queryFn: () => api<Paginated<LeadListItem>>(leadsApiPath(params, LEADS_PAGE_SIZE)),
    // mantém a tabela anterior na tela enquanto a próxima página/busca carrega
    placeholderData: keepPreviousData,
  })
}

export function useLead(id: string) {
  const api = useAdminApi()
  return useQuery({
    queryKey: ['admin', 'lead', id],
    queryFn: () => api<LeadDetail>(`/admin/leads/${encodeURIComponent(id)}`),
  })
}
