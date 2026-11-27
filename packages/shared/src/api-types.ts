/** Contratos de resposta da API. Datas sempre em ISO 8601. */

export type PublicOption = { id: string; position: number; text: string }
export type PublicQuestion = { id: string; position: number; text: string; options: PublicOption[] }
export type PublicQuiz = { id: string; title: string; questions: PublicQuestion[] }

export type Band = { slug: string; label: string; message: string }

export type SubmissionAnswerSummary = { position: number; question: string; option: string }

export type BandRange = { slug: string; label: string; minScore: number; maxScore: number }

export type SubmissionResult = {
  submissionId: string
  score: number
  band: Band
  answers: SubmissionAnswerSummary[]
  /** Todas as faixas, para a régua do resultado. */
  bands: BandRange[]
}

export type LeadListItem = {
  id: string
  name: string
  email: string
  phone: string
  score: number
  band: { slug: string; label: string }
  createdAt: string
}

export type Paginated<T> = {
  data: T[]
  pagination: { page: number; pageSize: number; total: number }
}

export type LeadDetail = Omit<LeadListItem, 'band'> & {
  band: Band
  submittedAt: string
  submissionCount: number
  answers: (SubmissionAnswerSummary & { weight: number })[]
}

export type AdminQuizSummary = {
  id: string
  title: string
  maxPoints: number
  activeCount: number
  inactiveCount: number
  bands: BandRange[]
}

export type AdminOption = { id: string; position: number; text: string; weight: number }

export type AdminQuestion = {
  id: string
  position: number
  text: string
  answerCount: number
  options: AdminOption[]
}

export type InactiveAdminQuestion = Omit<AdminQuestion, 'position'> & {
  inactiveReason: 'replaced' | 'deactivated'
  deactivatedAt: string
  replacedBy: { id: string; position: number | null } | null
}

export type UpdateQuestionResult = { question: AdminQuestion; versioned: boolean }
