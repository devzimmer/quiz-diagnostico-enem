import type {
  AdminQuestion,
  AdminQuizSummary,
  InactiveAdminQuestion,
  QuestionContent,
  QuestionStatus,
  UpdateQuestionResult,
} from '@quiz/shared'
import { HttpError, notFound } from '../lib/http-error'
import type { QuestionAdminRepository, QuestionState } from '../repositories/types'

type Repo = QuestionAdminRepository

async function activeQuizId(repo: Repo): Promise<string> {
  const quizId = await repo.getActiveQuizId()
  if (!quizId) throw notFound('Nenhum quiz ativo')
  return quizId
}

async function findOrFail(repo: Repo, id: string): Promise<QuestionState> {
  const state = await repo.findState(id)
  if (!state) throw notFound('Pergunta não encontrada')
  return state
}

export async function getQuizSummary(repo: Repo): Promise<AdminQuizSummary> {
  return repo.getSummary(await activeQuizId(repo))
}

export async function listQuestions(
  repo: Repo,
  status: QuestionStatus,
): Promise<AdminQuestion[] | InactiveAdminQuestion[]> {
  const quizId = await activeQuizId(repo)
  return status === 'active' ? repo.listActive(quizId) : repo.listInactive(quizId)
}

export async function createQuestion(repo: Repo, content: QuestionContent): Promise<AdminQuestion> {
  return repo.insertAtEnd(await activeQuizId(repo), content)
}

/**
 * Regra central do editor: pergunta já respondida nunca é sobrescrita. Editar cria uma nova
 * versão na mesma posição e desativa a antiga, preservando o que cada lead viu.
 */
export async function updateQuestion(
  repo: Repo,
  id: string,
  content: QuestionContent,
): Promise<UpdateQuestionResult> {
  const state = await findOrFail(repo, id)
  if (!state.isActive) {
    throw new HttpError(
      409,
      'QUESTION_INACTIVE',
      'Esta pergunta está desativada. Reative-a para editar.',
    )
  }
  if (state.answerCount > 0) {
    return { question: await repo.replaceWithNewVersion(id, content), versioned: true }
  }
  return { question: await repo.updateContent(id, content), versioned: false }
}

export async function deactivateQuestion(repo: Repo, id: string): Promise<void> {
  const state = await findOrFail(repo, id)
  if (!state.isActive) return
  if ((await repo.countActive(state.quizId)) <= 1) {
    throw new HttpError(
      422,
      'LAST_ACTIVE_QUESTION',
      'O quiz precisa de pelo menos uma pergunta ativa.',
    )
  }
  await repo.deactivate(id)
}

export async function reactivateQuestion(repo: Repo, id: string): Promise<AdminQuestion> {
  const state = await findOrFail(repo, id)
  if (state.isActive) {
    throw new HttpError(409, 'QUESTION_ALREADY_ACTIVE', 'Esta pergunta já está ativa.')
  }
  if (state.replaced) {
    throw new HttpError(
      409,
      'QUESTION_REPLACED',
      'Esta pergunta foi substituída por uma nova versão e faz parte do histórico.',
    )
  }
  return repo.reactivateAtEnd(id)
}

export async function reorderQuestions(repo: Repo, ids: string[]): Promise<void> {
  const quizId = await activeQuizId(repo)
  const active = new Set(await repo.activeIds(quizId))
  const sameSet = ids.length === active.size && ids.every((id) => active.has(id))
  if (!sameSet) {
    throw new HttpError(
      422,
      'VALIDATION_ERROR',
      'A ordem deve conter exatamente as perguntas ativas.',
      {
        fieldErrors: { questionIds: ['A lista de perguntas mudou. Recarregue a página.'] },
      },
    )
  }
  await repo.setOrder(quizId, ids)
}
