import type { SubmissionInput, SubmissionResult } from '@quiz/shared'
import type { AppDeps } from '../deps'
import { calculateScore, findBand } from '../domain/scoring'
import { HttpError, notFound } from '../lib/http-error'
import type { ScoringQuiz } from '../repositories/types'

type Deps = Pick<AppDeps, 'quizRepo' | 'submissionRepo'>

const quizOutdated = () =>
  new HttpError(
    422,
    'QUIZ_OUTDATED',
    'O quiz foi atualizado enquanto você respondia. Recomece para ver as perguntas novas.',
  )

/**
 * As respostas precisam cobrir exatamente as perguntas ativas, cada uma com uma alternativa
 * da própria pergunta. Qualquer divergência significa que o quiz mudou depois de carregado.
 */
function assertAnswersMatchQuiz(quiz: ScoringQuiz, answers: SubmissionInput['answers']) {
  if (answers.length !== quiz.questions.length) throw quizOutdated()
  const byQuestion = new Map(answers.map((a) => [a.questionId, a.optionId]))
  for (const question of quiz.questions) {
    const optionId = byQuestion.get(question.id)
    if (!optionId || !question.options.some((o) => o.id === optionId)) throw quizOutdated()
  }
}

export async function submitQuiz(deps: Deps, input: SubmissionInput): Promise<SubmissionResult> {
  const quiz = await deps.quizRepo.getActiveQuizForScoring()
  if (!quiz) throw notFound('Nenhum quiz ativo')

  assertAnswersMatchQuiz(quiz, input.answers)

  if (!input.confirmReplace && (await deps.submissionRepo.leadHasSubmission(input.lead.email))) {
    throw new HttpError(
      409,
      'LEAD_ALREADY_SUBMITTED',
      'Este e-mail já fez o diagnóstico. Confirme para substituir o resultado anterior.',
    )
  }

  const selected = new Map(input.answers.map((a) => [a.questionId, a.optionId]))
  const { rawPoints, maxPoints, score } = calculateScore(quiz.questions, selected)
  const band = findBand(quiz.bands, score)

  const answers = quiz.questions.map((question) => {
    const option = question.options.find((o) => o.id === selected.get(question.id))!
    return {
      questionId: question.id,
      optionId: option.id,
      questionPosition: question.position,
      questionText: question.text,
      optionText: option.text,
      weight: option.weight,
    }
  })

  const { submissionId } = await deps.submissionRepo.saveSubmission({
    lead: input.lead,
    quizId: quiz.id,
    rawPoints,
    maxPoints,
    score,
    band,
    answers,
  })

  return {
    submissionId,
    score,
    band: { slug: band.slug, label: band.label, message: band.message },
    answers: answers.map((a) => ({
      position: a.questionPosition,
      question: a.questionText,
      option: a.optionText,
    })),
    bands: quiz.bands.map(({ slug, label, minScore, maxScore }) => ({
      slug,
      label,
      minScore,
      maxScore,
    })),
  }
}
