import { useEffect } from 'react'
import { toast } from 'sonner'
import { usePublicQuiz } from './hooks'
import { useQuizState } from './QuizProvider'

export const QUIZ_UPDATED_MESSAGE = 'O quiz foi atualizado. Vamos recomeçar com as perguntas novas.'

/** Carrega o quiz e reconcilia o estado salvo com o conteúdo atual (sync). */
export function useSyncedQuiz() {
  const query = usePublicQuiz()
  const { state, dispatch } = useQuizState()
  const quiz = query.data

  useEffect(() => {
    if (quiz) dispatch({ type: 'sync', quiz })
  }, [quiz, dispatch])

  // respostas descartadas porque o conteúdo mudou: avisa em vez de recomeçar calado
  useEffect(() => {
    if (state.notice !== 'quiz-updated') return
    toast.info(QUIZ_UPDATED_MESSAGE, { id: 'quiz-updated' })
    dispatch({ type: 'dismissNotice' })
  }, [state.notice, dispatch])

  // até o sync rodar, o estado pode ser de outro quiz: só devolve quando bate
  const ready = Boolean(quiz && state.quizId === quiz.id)
  return { query, quiz: ready ? quiz : undefined, state, dispatch }
}
