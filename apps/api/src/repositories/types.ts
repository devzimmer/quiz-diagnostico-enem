import type {
  AdminQuestion,
  AdminQuizSummary,
  InactiveAdminQuestion,
  LeadDetail,
  LeadInput,
  LeadListItem,
  LeadListQuery,
  PublicQuiz,
  QuestionContent,
} from '@quiz/shared'
import type { ScoreBand, ScoringQuestion } from '../domain/scoring'

export type ScoringQuiz = {
  id: string
  questions: (Omit<ScoringQuestion, 'options'> & {
    position: number
    text: string
    options: { id: string; text: string; weight: number }[]
  })[]
  bands: ScoreBand[]
}

export interface QuizRepository {
  /** Quiz ativo só com perguntas ativas, sem pesos. */
  getActivePublicQuiz(): Promise<PublicQuiz | null>
  /** Quiz ativo com pesos e faixas, para calcular a pontuação. */
  getActiveQuizForScoring(): Promise<ScoringQuiz | null>
}

export type NewSubmission = {
  lead: LeadInput
  quizId: string
  rawPoints: number
  maxPoints: number
  score: number
  band: ScoreBand
  answers: {
    questionId: string
    optionId: string
    questionPosition: number
    questionText: string
    optionText: string
    weight: number
  }[]
}

export interface SubmissionRepository {
  leadHasSubmission(email: string): Promise<boolean>
  /** Upsert do lead + envio + respostas numa única transação. */
  saveSubmission(data: NewSubmission): Promise<{ submissionId: string; leadId: string }>
}

/** Agregados crus dos leads (cada lead conta pelo envio mais recente). */
export type LeadStatsRow = {
  total: number
  averageScore: number | null
  byBand: { slug: string; label: string; count: number }[]
  /** Leads cadastrados por dia (no fuso pedido) desde `since`; dias sem lead não aparecem. */
  byDay: { date: string; count: number }[]
}

export interface LeadQueryRepository {
  listLeads(query: LeadListQuery): Promise<{ items: LeadListItem[]; total: number }>
  getLeadDetail(id: string): Promise<LeadDetail | null>
  getStatsRow(opts: { timeZone: string; since: Date }): Promise<LeadStatsRow>
}

export type QuestionState = {
  id: string
  quizId: string
  isActive: boolean
  answerCount: number
  replaced: boolean
}

export interface QuestionAdminRepository {
  getActiveQuizId(): Promise<string | null>
  getSummary(quizId: string): Promise<AdminQuizSummary>
  listActive(quizId: string): Promise<AdminQuestion[]>
  listInactive(quizId: string): Promise<InactiveAdminQuestion[]>
  findState(id: string): Promise<QuestionState | null>
  countActive(quizId: string): Promise<number>
  activeIds(quizId: string): Promise<string[]>
  insertAtEnd(quizId: string, content: QuestionContent): Promise<AdminQuestion>
  updateContent(id: string, content: QuestionContent): Promise<AdminQuestion>
  replaceWithNewVersion(id: string, content: QuestionContent): Promise<AdminQuestion>
  deactivate(id: string): Promise<void>
  reactivateAtEnd(id: string): Promise<AdminQuestion>
  setOrder(quizId: string, ids: string[]): Promise<void>
}
