import { createContext, useContext, useEffect, useReducer } from 'react'
import {
  type QuizAction,
  type QuizState,
  initialState,
  loadState,
  quizReducer,
  saveState,
} from './state'

type QuizContextValue = { state: QuizState; dispatch: React.Dispatch<QuizAction> }

const QuizContext = createContext<QuizContextValue | null>(null)

const storage = () => (typeof window === 'undefined' ? undefined : window.sessionStorage)

/** Estado do quiz persistido na sessão: refresh no meio do quiz não perde respostas. */
export function QuizProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(quizReducer, undefined, () => {
    const s = storage()
    return s ? loadState(s) : initialState
  })

  useEffect(() => {
    const s = storage()
    if (s) saveState(s, state)
  }, [state])

  return <QuizContext.Provider value={{ state, dispatch }}>{children}</QuizContext.Provider>
}

export function useQuizState(): QuizContextValue {
  const ctx = useContext(QuizContext)
  if (!ctx) throw new Error('useQuizState precisa estar dentro de <QuizProvider>')
  return ctx
}
