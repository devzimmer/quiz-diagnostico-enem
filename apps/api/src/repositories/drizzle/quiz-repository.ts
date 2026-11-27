import type { PublicQuiz } from '@quiz/shared'
import { and, asc, eq, inArray } from 'drizzle-orm'
import type { Database } from '../../db/client'
import { options, questions, quizzes, resultBands } from '../../db/schema'
import type { QuizRepository, ScoringQuiz } from '../types'

export class DrizzleQuizRepository implements QuizRepository {
  constructor(private readonly db: Database) {}

  async getActivePublicQuiz(): Promise<PublicQuiz | null> {
    const loaded = await this.loadActive()
    if (!loaded) return null
    return {
      id: loaded.quiz.id,
      title: loaded.quiz.title,
      questions: loaded.questions.map((q) => ({
        id: q.id,
        position: q.position,
        text: q.text,
        options: q.options.map(({ id, position, text }) => ({ id, position, text })),
      })),
    }
  }

  async getActiveQuizForScoring(): Promise<ScoringQuiz | null> {
    const loaded = await this.loadActive()
    if (!loaded) return null
    const bands = await this.db
      .select({
        slug: resultBands.slug,
        label: resultBands.label,
        message: resultBands.message,
        minScore: resultBands.minScore,
        maxScore: resultBands.maxScore,
      })
      .from(resultBands)
      .where(eq(resultBands.quizId, loaded.quiz.id))
      .orderBy(asc(resultBands.minScore))
    return {
      id: loaded.quiz.id,
      questions: loaded.questions.map((q) => ({
        id: q.id,
        position: q.position,
        text: q.text,
        options: q.options.map(({ id, text, weight }) => ({ id, text, weight })),
      })),
      bands,
    }
  }

  /** Quiz ativo com perguntas ativas (por posição) e alternativas (por posição). */
  private async loadActive() {
    const [quiz] = await this.db
      .select({ id: quizzes.id, title: quizzes.title })
      .from(quizzes)
      .where(eq(quizzes.isActive, true))
      .limit(1)
    if (!quiz) return null

    const questionRows = await this.db
      .select({ id: questions.id, position: questions.position, text: questions.text })
      .from(questions)
      .where(and(eq(questions.quizId, quiz.id), eq(questions.isActive, true)))
      .orderBy(asc(questions.position))

    const optionRows = questionRows.length
      ? await this.db
          .select()
          .from(options)
          .where(
            inArray(
              options.questionId,
              questionRows.map((q) => q.id),
            ),
          )
          .orderBy(asc(options.position))
      : []

    return {
      quiz,
      questions: questionRows.map((q) => ({
        ...q,
        options: optionRows.filter((o) => o.questionId === q.id),
      })),
    }
  }
}
