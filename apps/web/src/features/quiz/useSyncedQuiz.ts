import { useEffect } from 'react'
import { usePublicQuiz } from './hooks'
import { useQuizState } from './QuizProvider'

/** Carrega o quiz e reconcilia o estado salvo com o conteúdo atual (sync). */
export function useSyncedQuiz() {
  const query = usePublicQuiz()
  const { state, dispatch } = useQuizState()
  const quiz = query.data

  useEffect(() => {
    if (quiz) dispatch({ type: 'sync', quiz })
  }, [quiz, dispatch])

  // até o sync rodar, o estado pode ser de outro quiz: só devolve quando bate
  const ready = Boolean(quiz && state.quizId === quiz.id)
  return { query, quiz: ready ? quiz : undefined, state, dispatch }
}
