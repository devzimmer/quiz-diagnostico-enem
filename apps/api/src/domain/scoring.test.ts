import { describe, expect, it } from 'vitest'
import { type ScoreBand, type ScoringQuestion, calculateScore, findBand } from './scoring'

const q = (id: string, weights: number[]): ScoringQuestion => ({
  id,
  options: weights.map((weight, i) => ({ id: `${id}-o${i}`, weight })),
})

const BANDS: ScoreBand[] = [
  { slug: 'ponto-de-partida', label: 'Ponto de partida', message: 'a', minScore: 0, maxScore: 30 },
  { slug: 'em-construcao', label: 'Em construção', message: 'b', minScore: 31, maxScore: 55 },
  { slug: 'bom-caminho', label: 'Bom caminho', message: 'c', minScore: 56, maxScore: 80 },
  { slug: 'reta-final', label: 'Reta final', message: 'd', minScore: 81, maxScore: 100 },
]

describe('calculateScore', () => {
  it('soma os pesos escolhidos e normaliza para 0–100', () => {
    const questions = [q('a', [0, 6, 12]), q('b', [6, 12])]
    const selected = new Map([
      ['a', 'a-o1'],
      ['b', 'b-o0'],
    ])
    expect(calculateScore(questions, selected)).toEqual({ rawPoints: 12, maxPoints: 24, score: 50 })
  })

  it('arredonda para o inteiro mais próximo', () => {
    const questions = [q('a', [0, 1]), q('b', [0, 1]), q('c', [0, 1])]
    const selected = new Map([
      ['a', 'a-o1'],
      ['b', 'b-o1'],
      ['c', 'c-o0'],
    ])
    expect(calculateScore(questions, selected).score).toBe(67)
  })

  it('com o conteúdo do anexo (máximo 100), score = soma dos pesos', () => {
    const questions = [q('a', [2, 5, 7, 10]), q('b', [0, 4, 7, 10])]
    const selected = new Map([
      ['a', 'a-o3'],
      ['b', 'b-o3'],
    ])
    expect(calculateScore(questions, selected)).toEqual({
      rawPoints: 20,
      maxPoints: 20,
      score: 100,
    })
  })

  it('max_points 0 → score 0 (sem NaN)', () => {
    const questions = [q('a', [0, 0])]
    expect(calculateScore(questions, new Map([['a', 'a-o0']]))).toEqual({
      rawPoints: 0,
      maxPoints: 0,
      score: 0,
    })
  })

  it('lança erro se faltar resposta ou a alternativa não for da pergunta', () => {
    const questions = [q('a', [0, 1])]
    expect(() => calculateScore(questions, new Map())).toThrow()
    expect(() => calculateScore(questions, new Map([['a', 'x']]))).toThrow()
  })
})

describe('findBand', () => {
  it.each([
    [0, 'ponto-de-partida'],
    [30, 'ponto-de-partida'],
    [31, 'em-construcao'],
    [55, 'em-construcao'],
    [56, 'bom-caminho'],
    [80, 'bom-caminho'],
    [81, 'reta-final'],
    [100, 'reta-final'],
  ])('score %i → %s', (score, slug) => expect(findBand(BANDS, score).slug).toBe(slug))

  it('lança erro quando nenhuma faixa cobre a nota', () =>
    expect(() => findBand(BANDS.slice(1), 10)).toThrow(/faixa/i))
})
