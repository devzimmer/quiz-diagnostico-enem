import type {
  AdminQuestion,
  AdminQuizSummary,
  InactiveAdminQuestion,
  QuestionContent,
} from '@quiz/shared'
import { and, asc, count, desc, eq, inArray, max, sql } from 'drizzle-orm'
import type { Database } from '../../db/client'
import { options, questions, quizzes, resultBands, submissionAnswers } from '../../db/schema'
import type { QuestionAdminRepository, QuestionState } from '../types'

type QuestionRow = typeof questions.$inferSelect

export class DrizzleQuestionAdminRepository implements QuestionAdminRepository {
  constructor(private readonly db: Database) {}

  async getActiveQuizId(): Promise<string | null> {
    const [quiz] = await this.db
      .select({ id: quizzes.id })
      .from(quizzes)
      .where(eq(quizzes.isActive, true))
      .limit(1)
    return quiz?.id ?? null
  }

  async getSummary(quizId: string): Promise<AdminQuizSummary> {
    const [quiz] = await this.db
      .select({ id: quizzes.id, title: quizzes.title })
      .from(quizzes)
      .where(eq(quizzes.id, quizId))
    const counts = await this.db
      .select({ isActive: questions.isActive, total: count() })
      .from(questions)
      .where(eq(questions.quizId, quizId))
      .groupBy(questions.isActive)
    const maxWeights = await this.db
      .select({ maxWeight: max(options.weight) })
      .from(options)
      .innerJoin(questions, eq(questions.id, options.questionId))
      .where(and(eq(questions.quizId, quizId), eq(questions.isActive, true)))
      .groupBy(options.questionId)
    const bands = await this.db
      .select({
        slug: resultBands.slug,
        label: resultBands.label,
        minScore: resultBands.minScore,
        maxScore: resultBands.maxScore,
      })
      .from(resultBands)
      .where(eq(resultBands.quizId, quizId))
      .orderBy(asc(resultBands.minScore))
    return {
      id: quizId,
      title: quiz?.title ?? '',
      maxPoints: maxWeights.reduce((sum, row) => sum + (row.maxWeight ?? 0), 0),
      activeCount: counts.find((c) => c.isActive)?.total ?? 0,
      inactiveCount: counts.find((c) => !c.isActive)?.total ?? 0,
      bands,
    }
  }

  async listActive(quizId: string): Promise<AdminQuestion[]> {
    const rows = await this.db
      .select()
      .from(questions)
      .where(and(eq(questions.quizId, quizId), eq(questions.isActive, true)))
      .orderBy(asc(questions.position))
    return this.hydrate(rows)
  }

  async listInactive(quizId: string): Promise<InactiveAdminQuestion[]> {
    const rows = await this.db
      .select()
      .from(questions)
      .where(and(eq(questions.quizId, quizId), eq(questions.isActive, false)))
      .orderBy(desc(questions.deactivatedAt))
    if (!rows.length) return []
    const successors = await this.db
      .select({
        id: questions.id,
        previousVersionId: questions.previousVersionId,
        position: questions.position,
        isActive: questions.isActive,
      })
      .from(questions)
      .where(
        inArray(
          questions.previousVersionId,
          rows.map((r) => r.id),
        ),
      )
    const hydrated = await this.hydrate(rows)
    return hydrated.map(({ position: _position, ...question }, i) => {
      const successor = successors.find((s) => s.previousVersionId === question.id)
      return {
        ...question,
        inactiveReason: successor ? 'replaced' : 'deactivated',
        deactivatedAt: (rows[i]!.deactivatedAt ?? rows[i]!.updatedAt).toISOString(),
        replacedBy: successor
          ? { id: successor.id, position: successor.isActive ? successor.position : null }
          : null,
      }
    })
  }

  async findState(id: string): Promise<QuestionState | null> {
    const [row] = await this.db
      .select({ id: questions.id, quizId: questions.quizId, isActive: questions.isActive })
      .from(questions)
      .where(eq(questions.id, id))
    if (!row) return null
    const [answers] = await this.db
      .select({ total: count() })
      .from(submissionAnswers)
      .where(eq(submissionAnswers.questionId, id))
    const [successor] = await this.db
      .select({ id: questions.id })
      .from(questions)
      .where(eq(questions.previousVersionId, id))
      .limit(1)
    return { ...row, answerCount: answers?.total ?? 0, replaced: Boolean(successor) }
  }

  async countActive(quizId: string): Promise<number> {
    return (await this.activeIds(quizId)).length
  }

  async activeIds(quizId: string): Promise<string[]> {
    const rows = await this.db
      .select({ id: questions.id })
      .from(questions)
      .where(and(eq(questions.quizId, quizId), eq(questions.isActive, true)))
      .orderBy(asc(questions.position))
    return rows.map((r) => r.id)
  }

  async insertAtEnd(quizId: string, content: QuestionContent): Promise<AdminQuestion> {
    const id = await this.db.transaction(async (tx) => {
      const position = await nextPosition(tx, quizId)
      const [row] = await tx
        .insert(questions)
        .values({ quizId, position, text: content.text })
        .returning({ id: questions.id })
      await insertOptions(tx, row!.id, content)
      return row!.id
    })
    return this.loadOne(id)
  }

  async updateContent(id: string, content: QuestionContent): Promise<AdminQuestion> {
    await this.db.transaction(async (tx) => {
      await tx
        .update(questions)
        .set({ text: content.text, updatedAt: sql`now()` })
        .where(eq(questions.id, id))
      // permitido só porque a pergunta não tem respostas (garantido pelo serviço e pela FK)
      await tx.delete(options).where(eq(options.questionId, id))
      await insertOptions(tx, id, content)
    })
    return this.loadOne(id)
  }

  async replaceWithNewVersion(id: string, content: QuestionContent): Promise<AdminQuestion> {
    const newId = await this.db.transaction(async (tx) => {
      const [old] = await tx
        .update(questions)
        .set({ isActive: false, deactivatedAt: sql`now()`, updatedAt: sql`now()` })
        .where(eq(questions.id, id))
        .returning({ quizId: questions.quizId, position: questions.position })
      const [row] = await tx
        .insert(questions)
        .values({
          quizId: old!.quizId,
          position: old!.position,
          text: content.text,
          previousVersionId: id,
        })
        .returning({ id: questions.id })
      await insertOptions(tx, row!.id, content)
      return row!.id
    })
    return this.loadOne(newId)
  }

  async deactivate(id: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      const [row] = await tx
        .update(questions)
        .set({ isActive: false, deactivatedAt: sql`now()`, updatedAt: sql`now()` })
        .where(eq(questions.id, id))
        .returning({ quizId: questions.quizId })
      // mantém as posições ativas contínuas (1..n)
      const remaining = await tx
        .select({ id: questions.id })
        .from(questions)
        .where(and(eq(questions.quizId, row!.quizId), eq(questions.isActive, true)))
        .orderBy(asc(questions.position))
      await renumber(
        tx,
        remaining.map((r) => r.id),
      )
    })
  }

  async reactivateAtEnd(id: string): Promise<AdminQuestion> {
    await this.db.transaction(async (tx) => {
      const [row] = await tx
        .select({ quizId: questions.quizId })
        .from(questions)
        .where(eq(questions.id, id))
      const position = await nextPosition(tx, row!.quizId)
      await tx
        .update(questions)
        .set({ isActive: true, deactivatedAt: null, position, updatedAt: sql`now()` })
        .where(eq(questions.id, id))
    })
    return this.loadOne(id)
  }

  async setOrder(_quizId: string, ids: string[]): Promise<void> {
    await this.db.transaction((tx) => renumber(tx, ids))
  }

  private async loadOne(id: string): Promise<AdminQuestion> {
    const rows = await this.db.select().from(questions).where(eq(questions.id, id))
    const [question] = await this.hydrate(rows)
    if (!question) throw new Error(`Pergunta ${id} não encontrada após gravar`)
    return question
  }

  /** Junta alternativas (por posição) e contagem de respostas às linhas de pergunta. */
  private async hydrate(rows: QuestionRow[]): Promise<AdminQuestion[]> {
    if (!rows.length) return []
    const ids = rows.map((r) => r.id)
    const [optionRows, answerCounts] = await Promise.all([
      this.db
        .select()
        .from(options)
        .where(inArray(options.questionId, ids))
        .orderBy(asc(options.position)),
      this.db
        .select({ questionId: submissionAnswers.questionId, total: count() })
        .from(submissionAnswers)
        .where(inArray(submissionAnswers.questionId, ids))
        .groupBy(submissionAnswers.questionId),
    ])
    return rows.map((row) => ({
      id: row.id,
      position: row.position,
      text: row.text,
      answerCount: answerCounts.find((a) => a.questionId === row.id)?.total ?? 0,
      options: optionRows
        .filter((o) => o.questionId === row.id)
        .map(({ id, position, text, weight }) => ({ id, position, text, weight })),
    }))
  }
}

async function nextPosition(db: Database, quizId: string): Promise<number> {
  const [row] = await db
    .select({ last: max(questions.position) })
    .from(questions)
    .where(and(eq(questions.quizId, quizId), eq(questions.isActive, true)))
  return (row?.last ?? 0) + 1
}

async function insertOptions(db: Database, questionId: string, content: QuestionContent) {
  await db.insert(options).values(
    content.options.map((option, i) => ({
      questionId,
      position: i + 1,
      text: option.text,
      weight: option.weight,
    })),
  )
}

/**
 * Aplica as posições 1..n na ordem dada. Passa antes por posições negativas para não violar
 * o índice único parcial (quiz_id, position) das perguntas ativas no meio da troca.
 */
async function renumber(db: Database, ids: string[]) {
  for (const [i, id] of ids.entries()) {
    await db
      .update(questions)
      .set({ position: -(i + 1) })
      .where(eq(questions.id, id))
  }
  for (const [i, id] of ids.entries()) {
    await db
      .update(questions)
      .set({ position: i + 1 })
      .where(eq(questions.id, id))
  }
}
