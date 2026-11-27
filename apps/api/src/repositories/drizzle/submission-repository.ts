import { eq, isNotNull, and, sql } from 'drizzle-orm'
import type { Database } from '../../db/client'
import { leads, submissionAnswers, submissions } from '../../db/schema'
import type { NewSubmission, SubmissionRepository } from '../types'

export class DrizzleSubmissionRepository implements SubmissionRepository {
  constructor(private readonly db: Database) {}

  async leadHasSubmission(email: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: leads.id })
      .from(leads)
      .where(and(eq(leads.email, email), isNotNull(leads.latestSubmissionId)))
      .limit(1)
    return Boolean(row)
  }

  async saveSubmission(data: NewSubmission) {
    return this.db.transaction(async (tx) => {
      const [lead] = await tx
        .insert(leads)
        .values(data.lead)
        .onConflictDoUpdate({
          target: leads.email,
          set: { name: data.lead.name, phone: data.lead.phone, updatedAt: sql`now()` },
        })
        .returning({ id: leads.id })
      if (!lead) throw new Error('Falha ao gravar o lead')

      const [submission] = await tx
        .insert(submissions)
        .values({
          leadId: lead.id,
          quizId: data.quizId,
          score: data.score,
          rawPoints: data.rawPoints,
          maxPoints: data.maxPoints,
          bandSlug: data.band.slug,
          bandLabel: data.band.label,
          bandMessage: data.band.message,
        })
        .returning({ id: submissions.id })
      if (!submission) throw new Error('Falha ao gravar o envio')

      await tx
        .insert(submissionAnswers)
        .values(data.answers.map((answer) => ({ ...answer, submissionId: submission.id })))

      await tx.update(leads).set({ latestSubmissionId: submission.id }).where(eq(leads.id, lead.id))

      return { submissionId: submission.id, leadId: lead.id }
    })
  }
}
