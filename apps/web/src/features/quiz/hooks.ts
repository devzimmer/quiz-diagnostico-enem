import type { PublicQuiz, SubmissionInput, SubmissionResult } from '@quiz/shared'
import { useMutation, useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api-client'

type SubmissionPayload = Omit<SubmissionInput, 'lead'> & {
  lead: { name: string; email: string; phone: string }
}

export const usePublicQuiz = () =>
  useQuery({
    queryKey: ['quiz'],
    queryFn: () => apiFetch<PublicQuiz>('/quiz'),
    // o marketing pode mudar o conteúdo; ao reabrir, busca de novo
    staleTime: 60_000,
  })

export const useSubmitQuiz = () =>
  useMutation({
    mutationFn: (payload: SubmissionPayload) =>
      apiFetch<SubmissionResult>('/submissions', { method: 'POST', json: payload }),
  })
