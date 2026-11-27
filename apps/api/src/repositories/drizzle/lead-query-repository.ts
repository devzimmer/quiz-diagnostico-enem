import type { LeadDetail, LeadListItem, LeadListQuery } from '@quiz/shared'
import { type SQL, and, asc, count, desc, eq, ilike, isNotNull, or } from 'drizzle-orm'
import type { Database } from '../../db/client'
import { leads, submissionAnswers, submissions } from '../../db/schema'
import { escapeLike } from '../../lib/like'
import type { LeadQueryRepository } from '../types'

const listColumns = {
  id: leads.id,
  name: leads.name,
  email: leads.email,
  phone: leads.phone,
  createdAt: leads.createdAt,
  score: submissions.score,
  bandSlug: submissions.bandSlug,
  bandLabel: submissions.bandLabel,
}

type ListRow = {
  id: string
  name: string
  email: string
  phone: string
  createdAt: Date
  score: number
  bandSlug: string
  bandLabel: string
}

const toListItem = (row: ListRow): LeadListItem => ({
  id: row.id,
  name: row.name,
  email: row.email,
  phone: row.phone,
  score: row.score,
  band: { slug: row.bandSlug, label: row.bandLabel },
  createdAt: row.createdAt.toISOString(),
})

export class DrizzleLeadQueryRepository implements LeadQueryRepository {
  constructor(private readonly db: Database) {}

  async listLeads(query: LeadListQuery) {
    const where = this.listFilter(query)
    const [rows, totals] = await Promise.all([
      this.db
        .select(listColumns)
        .from(leads)
        .innerJoin(submissions, eq(submissions.id, leads.latestSubmissionId))
        .where(where)
        .orderBy(desc(leads.createdAt), desc(leads.id))
        .limit(query.pageSize)
        .offset((query.page - 1) * query.pageSize),
      this.db
        .select({ total: count() })
        .from(leads)
        .innerJoin(submissions, eq(submissions.id, leads.latestSubmissionId))
        .where(where),
    ])
    return { items: rows.map(toListItem), total: totals[0]?.total ?? 0 }
  }

  async getLeadDetail(id: string): Promise<LeadDetail | null> {
    const [row] = await this.db
      .select({
        ...listColumns,
        submissionId: submissions.id,
        submittedAt: submissions.createdAt,
        bandMessage: submissions.bandMessage,
      })
      .from(leads)
      .innerJoin(submissions, eq(submissions.id, leads.latestSubmissionId))
      .where(eq(leads.id, id))
      .limit(1)
    if (!row) return null

    const [answers, counts] = await Promise.all([
      this.db
        .select({
          position: submissionAnswers.questionPosition,
          question: submissionAnswers.questionText,
          option: submissionAnswers.optionText,
          weight: submissionAnswers.weight,
        })
        .from(submissionAnswers)
        .where(eq(submissionAnswers.submissionId, row.submissionId))
        .orderBy(asc(submissionAnswers.questionPosition)),
      this.db.select({ total: count() }).from(submissions).where(eq(submissions.leadId, id)),
    ])

    const item = toListItem(row)
    return {
      ...item,
      band: { ...item.band, message: row.bandMessage },
      submittedAt: row.submittedAt.toISOString(),
      submissionCount: counts[0]?.total ?? 1,
      answers,
    }
  }

  private listFilter({ search, band }: LeadListQuery): SQL | undefined {
    const filters: SQL[] = [isNotNull(leads.latestSubmissionId)]
    if (search) {
      const pattern = `%${escapeLike(search)}%`
      filters.push(or(ilike(leads.name, pattern), ilike(leads.email, pattern))!)
    }
    if (band) filters.push(eq(submissions.bandSlug, band))
    return and(...filters)
  }
}
