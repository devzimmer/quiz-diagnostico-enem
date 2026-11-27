import type {
  AdminQuestion,
  InactiveAdminQuestion,
  QuestionContent,
  UpdateQuestionResult,
} from '@quiz/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminQuizKey } from '../useAdminQuizSummary'
import { useAdminApi } from '../useAdminApi'

const questionsKey = (status: 'active' | 'inactive') => ['admin', 'questions', status] as const

export function useActiveQuestions() {
  const api = useAdminApi()
  return useQuery({
    queryKey: questionsKey('active'),
    queryFn: () => api<AdminQuestion[]>('/admin/quiz/questions?status=active'),
  })
}

export function useInactiveQuestions() {
  const api = useAdminApi()
  return useQuery({
    queryKey: questionsKey('inactive'),
    queryFn: () => api<InactiveAdminQuestion[]>('/admin/quiz/questions?status=inactive'),
  })
}

/** Depois de qualquer mudança: resumo, as duas listas e o quiz público em cache. */
function useInvalidateQuiz() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: adminQuizKey }),
      queryClient.invalidateQueries({ queryKey: ['admin', 'questions'] }),
      queryClient.invalidateQueries({ queryKey: ['quiz'] }),
    ])
}

export type SaveQuestionInput = { id?: string; content: QuestionContent }
export type SaveQuestionResult = UpdateQuestionResult & { created: boolean }

export function useSaveQuestion() {
  const api = useAdminApi()
  const invalidate = useInvalidateQuiz()
  return useMutation({
    mutationFn: async ({ id, content }: SaveQuestionInput): Promise<SaveQuestionResult> => {
      if (!id) {
        const question = await api<AdminQuestion>('/admin/quiz/questions', {
          method: 'POST',
          json: content,
        })
        return { question, versioned: false, created: true }
      }
      const result = await api<UpdateQuestionResult>(`/admin/quiz/questions/${id}`, {
        method: 'PUT',
        json: content,
      })
      return { ...result, created: false }
    },
    onSettled: invalidate,
  })
}

export function useDeactivateQuestion() {
  const api = useAdminApi()
  const invalidate = useInvalidateQuiz()
  return useMutation({
    mutationFn: (id: string) => api<void>(`/admin/quiz/questions/${id}`, { method: 'DELETE' }),
    onSettled: invalidate,
  })
}

export function useReactivateQuestion() {
  const api = useAdminApi()
  const invalidate = useInvalidateQuiz()
  return useMutation({
    mutationFn: (id: string) =>
      api<AdminQuestion>(`/admin/quiz/questions/${id}/reactivate`, { method: 'POST' }),
    onSettled: invalidate,
  })
}

/** Reordena com atualização otimista; em erro a lista volta ao que era. */
export function useReorderQuestions() {
  const api = useAdminApi()
  const queryClient = useQueryClient()
  const invalidate = useInvalidateQuiz()
  const key = questionsKey('active')
  return useMutation({
    mutationFn: (questionIds: string[]) =>
      api<{ questionIds: string[] }>('/admin/quiz/question-order', {
        method: 'PUT',
        json: { questionIds },
      }),
    onMutate: async (questionIds) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<AdminQuestion[]>(key)
      if (previous) {
        const byId = new Map(previous.map((q) => [q.id, q]))
        queryClient.setQueryData<AdminQuestion[]>(
          key,
          questionIds.map((id, i) => ({ ...byId.get(id)!, position: i + 1 })),
        )
      }
      return { previous }
    },
    onError: (_error, _ids, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous)
    },
    onSettled: invalidate,
  })
}
