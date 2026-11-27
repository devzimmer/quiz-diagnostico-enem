import type { AdminStats } from '@quiz/shared'
import { notFound } from '../lib/http-error'
import type { LeadQueryRepository, QuestionAdminRepository } from '../repositories/types'

export const STATS_TIME_ZONE = 'America/Sao_Paulo'
const DAYS = 14
const DAY_MS = 24 * 60 * 60 * 1000

/** Data `YYYY-MM-DD` de `now` no fuso informado. */
export function todayIn(timeZone: string, now: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(now)
}

const shiftDate = (date: string, days: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10)

/** Janela de `days` dias terminando em `today`, com zero nos dias sem registro. */
export function fillDays(
  rows: { date: string; count: number }[],
  today: string,
  days = DAYS,
): { date: string; count: number }[] {
  const counts = new Map(rows.map((r) => [r.date, r.count]))
  return Array.from({ length: days }, (_, i) => {
    const date = shiftDate(today, i - days + 1)
    return { date, count: counts.get(date) ?? 0 }
  })
}

type Deps = {
  leadQueryRepo: Pick<LeadQueryRepository, 'getStatsRow'>
  questionAdminRepo: Pick<QuestionAdminRepository, 'getActiveQuizId' | 'getSummary'>
}

export async function getLeadStats(deps: Deps, now = new Date()): Promise<AdminStats> {
  const quizId = await deps.questionAdminRepo.getActiveQuizId()
  if (!quizId) throw notFound('Nenhum quiz ativo')
  // margem de 1 dia na consulta; a janela exata sai do fillDays
  const since = new Date(now.getTime() - (DAYS + 1) * DAY_MS)
  const [row, summary] = await Promise.all([
    deps.leadQueryRepo.getStatsRow({ timeZone: STATS_TIME_ZONE, since }),
    deps.questionAdminRepo.getSummary(quizId),
  ])

  const byDay = fillDays(row.byDay, todayIn(STATS_TIME_ZONE, now))
  const counted = new Map(row.byBand.map((b) => [b.slug, b]))
  const currentBands = [...summary.bands].sort((a, b) => a.minScore - b.minScore)
  const byBand = [
    ...currentBands.map((b) => ({
      slug: b.slug,
      label: b.label,
      count: counted.get(b.slug)?.count ?? 0,
    })),
    // faixas que não existem mais no quiz, mas ainda têm leads
    ...row.byBand.filter((b) => !currentBands.some((c) => c.slug === b.slug)),
  ]

  return {
    total: row.total,
    last7Days: byDay.slice(-7).reduce((sum, d) => sum + d.count, 0),
    averageScore: row.averageScore === null ? null : Math.round(row.averageScore),
    byBand,
    byDay,
  }
}
