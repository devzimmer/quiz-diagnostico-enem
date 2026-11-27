import type {
  AdminQuestion,
  AdminQuizSummary,
  InactiveAdminQuestion,
  QuestionContent,
} from '@quiz/shared'
import type { QuestionAdminRepository, QuestionState } from '../src/repositories/types'

type FakeQuestion = {
  id: string
  position: number
  text: string
  isActive: boolean
  answerCount: number
  previousVersionId: string | null
  options: QuestionContent['options']
}

export const QUIZ = 'quiz-1'

/** Repositório em memória com o mesmo contrato do Drizzle, para testar as regras do serviço. */
export class FakeQuestionRepo implements QuestionAdminRepository {
  questions: FakeQuestion[] = []
  private seq = 0
  calls: string[] = []

  add(partial: Partial<FakeQuestion> = {}): FakeQuestion {
    const q: FakeQuestion = {
      id: partial.id ?? `q${++this.seq}`,
      position: partial.position ?? this.active().length + 1,
      text: partial.text ?? 'Pergunta?',
      isActive: partial.isActive ?? true,
      answerCount: partial.answerCount ?? 0,
      previousVersionId: partial.previousVersionId ?? null,
      options: partial.options ?? [
        { text: 'A', weight: 0 },
        { text: 'B', weight: 10 },
      ],
    }
    this.questions.push(q)
    return q
  }

  private active() {
    return this.questions.filter((q) => q.isActive).sort((a, b) => a.position - b.position)
  }

  private toAdmin(q: FakeQuestion): AdminQuestion {
    return {
      id: q.id,
      position: q.position,
      text: q.text,
      answerCount: q.answerCount,
      options: q.options.map((o, i) => ({ id: `${q.id}-o${i}`, position: i + 1, ...o })),
    }
  }

  async getActiveQuizId() {
    return QUIZ
  }
  async getSummary(): Promise<AdminQuizSummary> {
    return {
      id: QUIZ,
      title: 'Quiz',
      maxPoints: 0,
      activeCount: this.active().length,
      inactiveCount: this.questions.length - this.active().length,
      bands: [],
    }
  }
  async listActive() {
    return this.active().map((q) => this.toAdmin(q))
  }
  async listInactive(): Promise<InactiveAdminQuestion[]> {
    return []
  }
  async findState(id: string): Promise<QuestionState | null> {
    const q = this.questions.find((x) => x.id === id)
    if (!q) return null
    return {
      id: q.id,
      quizId: QUIZ,
      isActive: q.isActive,
      answerCount: q.answerCount,
      replaced: this.questions.some((x) => x.previousVersionId === q.id),
    }
  }
  async countActive() {
    return this.active().length
  }
  async activeIds() {
    return this.active().map((q) => q.id)
  }
  async insertAtEnd(_quizId: string, content: QuestionContent) {
    this.calls.push('insertAtEnd')
    return this.toAdmin(this.add({ ...content, position: this.active().length + 1 }))
  }
  async updateContent(id: string, content: QuestionContent) {
    this.calls.push('updateContent')
    const q = this.questions.find((x) => x.id === id)!
    Object.assign(q, content)
    return this.toAdmin(q)
  }
  async replaceWithNewVersion(id: string, content: QuestionContent) {
    this.calls.push('replaceWithNewVersion')
    const old = this.questions.find((x) => x.id === id)!
    old.isActive = false
    return this.toAdmin(this.add({ ...content, position: old.position, previousVersionId: id }))
  }
  async deactivate(id: string) {
    this.calls.push('deactivate')
    this.questions.find((x) => x.id === id)!.isActive = false
  }
  async reactivateAtEnd(id: string) {
    this.calls.push('reactivateAtEnd')
    const q = this.questions.find((x) => x.id === id)!
    q.position = this.active().length + 1
    q.isActive = true
    return this.toAdmin(q)
  }
  async setOrder(_quizId: string, ids: string[]) {
    this.calls.push('setOrder')
    ids.forEach((id, i) => {
      this.questions.find((x) => x.id === id)!.position = i + 1
    })
  }
}
