import type { PublicQuiz } from '@quiz/shared'
import type { ScoringQuiz } from '../src/repositories/types'

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

export const QUIZ_ID = uuid(1)
export const Q1 = uuid(11)
export const Q2 = uuid(12)
export const Q1_A = uuid(111)
export const Q1_B = uuid(112)
export const Q2_A = uuid(121)
export const Q2_B = uuid(122)

/** Quiz pequeno de 2 perguntas (máximo de 20 pontos) para testes de serviço e rota. */
export const scoringQuiz: ScoringQuiz = {
  id: QUIZ_ID,
  questions: [
    {
      id: Q1,
      position: 1,
      text: 'Pergunta um?',
      options: [
        { id: Q1_A, text: 'Um A', weight: 0 },
        { id: Q1_B, text: 'Um B', weight: 10 },
      ],
    },
    {
      id: Q2,
      position: 2,
      text: 'Pergunta dois?',
      options: [
        { id: Q2_A, text: 'Dois A', weight: 2 },
        { id: Q2_B, text: 'Dois B', weight: 10 },
      ],
    },
  ],
  bands: [
    {
      slug: 'ponto-de-partida',
      label: 'Ponto de partida',
      message: 'm1',
      minScore: 0,
      maxScore: 30,
    },
    { slug: 'em-construcao', label: 'Em construção', message: 'm2', minScore: 31, maxScore: 55 },
    { slug: 'bom-caminho', label: 'Bom caminho', message: 'm3', minScore: 56, maxScore: 80 },
    { slug: 'reta-final', label: 'Reta final', message: 'm4', minScore: 81, maxScore: 100 },
  ],
}

export const publicQuiz: PublicQuiz = {
  id: QUIZ_ID,
  title: 'Qual é a sua chance real de passar no ENEM?',
  questions: scoringQuiz.questions.map((q) => ({
    id: q.id,
    position: q.position,
    text: q.text,
    options: q.options.map((o, i) => ({ id: o.id, position: i + 1, text: o.text })),
  })),
}
