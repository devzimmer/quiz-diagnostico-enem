import type { PublicQuiz, SubmissionResult } from '@quiz/shared'

export type QuizState = {
  quizId: string | null
  /** Índice (0-based) da pergunta exibida. */
  step: number
  /** questionId → optionId */
  answers: Record<string, string>
  result: SubmissionResult | null
  /** Contato informado, para personalizar a tela de resultado. */
  lead: LeadContact | null
  /** O conteúdo do quiz mudou e as respostas salvas foram descartadas: a tela avisa. */
  notice: 'quiz-updated' | null
}

export type LeadContact = { name: string; phone: string }

export type QuizAction =
  | { type: 'sync'; quiz: PublicQuiz }
  | { type: 'answer'; questionId: string; optionId: string }
  | { type: 'next'; total: number }
  | { type: 'back' }
  | { type: 'finish'; result: SubmissionResult; lead: LeadContact }
  | { type: 'reset' }
  | { type: 'dismissNotice' }

export const initialState: QuizState = {
  quizId: null,
  step: 0,
  answers: {},
  result: null,
  lead: null,
  notice: null,
}

export const STORAGE_KEY = 'quiz-state-v1'

/** Respostas salvas ainda batem com o quiz carregado agora? */
function answersFit(quiz: PublicQuiz, answers: Record<string, string>): boolean {
  return Object.entries(answers).every(([questionId, optionId]) =>
    quiz.questions.some((q) => q.id === questionId && q.options.some((o) => o.id === optionId)),
  )
}

export function quizReducer(state: QuizState, action: QuizAction): QuizState {
  switch (action.type) {
    case 'sync': {
      const { quiz } = action
      if (state.quizId !== quiz.id || !answersFit(quiz, state.answers)) {
        const discarded = Object.keys(state.answers).length > 0 && !state.result
        return { ...initialState, quizId: quiz.id, notice: discarded ? 'quiz-updated' : null }
      }
      const lastStep = Math.max(0, quiz.questions.length - 1)
      return { ...state, step: Math.min(state.step, lastStep) }
    }
    case 'answer':
      return { ...state, answers: { ...state.answers, [action.questionId]: action.optionId } }
    case 'next':
      return { ...state, step: Math.min(state.step + 1, Math.max(0, action.total - 1)) }
    case 'back':
      return { ...state, step: Math.max(0, state.step - 1) }
    case 'finish':
      return { ...state, result: action.result, lead: action.lead }
    case 'reset':
      return initialState
    case 'dismissNotice':
      return { ...state, notice: null }
  }
}

type SessionStorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

function isQuizState(value: unknown): value is QuizState {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    (v.quizId === null || typeof v.quizId === 'string') &&
    typeof v.step === 'number' &&
    Number.isInteger(v.step) &&
    v.step >= 0 &&
    !!v.answers &&
    typeof v.answers === 'object' &&
    (v.result === null || typeof v.result === 'object') &&
    (v.lead === null || typeof v.lead === 'object')
  )
}

/** Lê o estado salvo; qualquer problema (storage bloqueado, JSON inválido) volta ao inicial. */
export function loadState(storage: SessionStorageLike): QuizState {
  try {
    const raw = storage.getItem(STORAGE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : null
    // estados salvos antes do campo notice existir continuam válidos
    return isQuizState(parsed) ? { ...parsed, notice: parsed.notice ?? null } : initialState
  } catch {
    return initialState
  }
}

export function saveState(storage: SessionStorageLike, state: QuizState): void {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // storage indisponível (modo privado/cheio): o quiz segue funcionando em memória
  }
}
