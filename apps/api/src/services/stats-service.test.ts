import type { AdminQuizSummary } from '@quiz/shared'
import { describe, expect, it } from 'vitest'
import type { LeadStatsRow, QuestionAdminRepository } from '../repositories/types'
import { fillDays, getLeadStats, todayIn } from './stats-service'

describe('fillDays', () => {
  it('completa os dias sem lead com zero, do mais antigo para hoje', () => {
    expect(
      fillDays(
        [
          { date: '2026-11-27', count: 3 },
          { date: '2026-11-25', count: 1 },
        ],
        '2026-11-27',
        4,
      ),
    ).toEqual([
      { date: '2026-11-24', count: 0 },
      { date: '2026-11-25', count: 1 },
      { date: '2026-11-26', count: 0 },
      { date: '2026-11-27', count: 3 },
    ])
  })

  it('atravessa virada de mês e ignora datas fora da janela', () => {
    const days = fillDays([{ date: '2026-10-01', count: 9 }], '2026-12-01', 3)
    expect(days).toEqual([
      { date: '2026-11-29', count: 0 },
      { date: '2026-11-30', count: 0 },
      { date: '2026-12-01', count: 0 },
    ])
  })
})

describe('todayIn', () => {
  it('usa o fuso pedido (23h30 UTC-3 ainda é o mesmo dia em São Paulo)', () => {
    expect(todayIn('America/Sao_Paulo', new Date('2026-11-28T02:30:00Z'))).toBe('2026-11-27')
  })
})

const summary = {
  bands: [
    { slug: 'reta-final', label: 'Reta final', minScore: 81, maxScore: 100 },
    { slug: 'ponto-de-partida', label: 'Ponto de partida', minScore: 0, maxScore: 30 },
  ],
} as AdminQuizSummary

const deps = (row: LeadStatsRow) => ({
  leadQueryRepo: { getStatsRow: async () => row },
  questionAdminRepo: {
    getActiveQuizId: async () => 'quiz-1',
    getSummary: async () => summary,
  } as unknown as QuestionAdminRepository,
})

describe('getLeadStats', () => {
  const now = new Date('2026-11-27T15:00:00Z')

  it('sem leads: média null, faixas zeradas e 14 dias zerados', async () => {
    const stats = await getLeadStats(
      deps({ total: 0, averageScore: null, byBand: [], byDay: [] }),
      now,
    )
    expect(stats.total).toBe(0)
    expect(stats.averageScore).toBeNull()
    expect(stats.last7Days).toBe(0)
    expect(stats.byBand).toEqual([
      { slug: 'ponto-de-partida', label: 'Ponto de partida', count: 0 },
      { slug: 'reta-final', label: 'Reta final', count: 0 },
    ])
    expect(stats.byDay).toHaveLength(14)
    expect(stats.byDay.at(-1)).toEqual({ date: '2026-11-27', count: 0 })
  })

  it('arredonda a média, soma 7 dias e mantém faixas antigas no fim', async () => {
    const stats = await getLeadStats(
      deps({
        total: 5,
        averageScore: 52.6,
        byBand: [
          { slug: 'reta-final', label: 'Reta final', count: 2 },
          { slug: 'faixa-antiga', label: 'Faixa antiga', count: 3 },
        ],
        byDay: [
          { date: '2026-11-27', count: 2 },
          { date: '2026-11-21', count: 1 },
          { date: '2026-11-20', count: 2 }, // fora dos 7 dias
        ],
      }),
      now,
    )
    expect(stats.averageScore).toBe(53)
    expect(stats.last7Days).toBe(3)
    expect(stats.byBand.map((b) => [b.slug, b.count])).toEqual([
      ['ponto-de-partida', 0],
      ['reta-final', 2],
      ['faixa-antiga', 3],
    ])
  })
})
