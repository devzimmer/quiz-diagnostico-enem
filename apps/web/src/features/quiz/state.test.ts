import type { PublicQuiz, SubmissionResult } from '@quiz/shared'
import { describe, expect, it } from 'vitest'
import { STORAGE_KEY, initialState, loadState, quizReducer, saveState } from './state'

const quiz: PublicQuiz = {
  id: 'quiz-1',
  title: 'Quiz',
  questions: [
    { id: 'q1', position: 1, text: 'P1?', options: [{ id: 'q1a', position: 1, text: 'A' }] },
    { id: 'q2', position: 2, text: 'P2?', options: [{ id: 'q2a', position: 1, text: 'A' }] },
  ],
}

const result: SubmissionResult = {
  submissionId: 's1',
  score: 64,
  band: { slug: 'bom-caminho', label: 'Bom caminho', message: 'm' },
  answers: [],
  bands: [],
}

class MemoryStorage implements Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> {
  data = new Map<string, string>()
  getItem = (k: string) => this.data.get(k) ?? null
  setItem = (k: string, v: string) => void this.data.set(k, v)
  removeItem = (k: string) => void this.data.delete(k)
}

const started = quizReducer(initialState, { type: 'sync', quiz })

describe('quizReducer', () => {
  it('responder, avançar, voltar e trocar a resposta', () => {
    let s = quizReducer(started, { type: 'answer', questionId: 'q1', optionId: 'q1a' })
    s = quizReducer(s, { type: 'next', total: 2 })
    expect(s.step).toBe(1)
    s = quizReducer(s, { type: 'back' })
    expect(s.step).toBe(0)
    expect(s.answers).toEqual({ q1: 'q1a' })
    s = quizReducer(s, { type: 'answer', questionId: 'q1', optionId: 'outra' })
    expect(s.answers.q1).toBe('outra')
  })

  it('next não passa da última pergunta e back não fica negativo', () => {
    let s = quizReducer(started, { type: 'next', total: 2 })
    s = quizReducer(s, { type: 'next', total: 2 })
    expect(s.step).toBe(1)
    s = quizReducer(quizReducer(s, { type: 'back' }), { type: 'back' })
    expect(s.step).toBe(0)
  })

  it('sync com o mesmo quiz mantém respostas válidas', () => {
    const s = quizReducer(started, { type: 'answer', questionId: 'q1', optionId: 'q1a' })
    expect(quizReducer(s, { type: 'sync', quiz }).answers).toEqual({ q1: 'q1a' })
  })

  it('sync com quiz diferente ou resposta que não existe mais → reinicia', () => {
    const s = quizReducer(started, { type: 'answer', questionId: 'q1', optionId: 'q1a' })
    const changed = {
      ...quiz,
      questions: [{ ...quiz.questions[0]!, id: 'q1-v2' }, quiz.questions[1]!],
    }
    // respostas descartadas: a tela avisa a pessoa (notice) em vez de recomeçar calada
    expect(quizReducer(s, { type: 'sync', quiz: changed })).toEqual({
      ...initialState,
      quizId: 'quiz-1',
      notice: 'quiz-updated',
    })
    expect(quizReducer(s, { type: 'sync', quiz: { ...quiz, id: 'quiz-2' } }).answers).toEqual({})
  })

  it('sync sem respostas a descartar não gera aviso; dismissNotice limpa o aviso', () => {
    expect(quizReducer(initialState, { type: 'sync', quiz }).notice).toBeNull()
    const s = quizReducer(started, { type: 'answer', questionId: 'q1', optionId: 'q1a' })
    const warned = quizReducer(s, { type: 'sync', quiz: { ...quiz, id: 'quiz-2' } })
    expect(warned.notice).toBe('quiz-updated')
    expect(quizReducer(warned, { type: 'dismissNotice' }).notice).toBeNull()
  })

  it('sync limita o passo ao total atual', () => {
    const s = { ...started, step: 5 }
    expect(quizReducer(s, { type: 'sync', quiz }).step).toBe(1)
  })

  it('finish guarda o resultado e o contato; reset limpa tudo', () => {
    const lead = { name: 'Mariana Souza', phone: '11987654321' }
    const s = quizReducer(started, { type: 'finish', result, lead })
    expect(s.result).toEqual(result)
    expect(s.lead).toEqual(lead)
    expect(quizReducer(s, { type: 'reset' })).toEqual(initialState)
  })
})

describe('persistência na sessão', () => {
  it('save + load restaura passo e respostas (refresh no meio do quiz)', () => {
    const storage = new MemoryStorage()
    const s = { ...started, step: 1, answers: { q1: 'q1a' } }
    saveState(storage, s)
    expect(loadState(storage)).toEqual(s)
  })

  it('JSON inválido ou formato inesperado → estado inicial', () => {
    const storage = new MemoryStorage()
    storage.setItem(STORAGE_KEY, '{quebrado')
    expect(loadState(storage)).toEqual(initialState)
    storage.setItem(STORAGE_KEY, JSON.stringify({ step: 'x' }))
    expect(loadState(storage)).toEqual(initialState)
  })

  it('storage indisponível (modo privado) não quebra', () => {
    const broken = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
      removeItem: () => {},
    }
    expect(loadState(broken)).toEqual(initialState)
    expect(() => saveState(broken, initialState)).not.toThrow()
  })
})
