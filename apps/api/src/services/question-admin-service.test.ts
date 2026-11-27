import { beforeEach, describe, expect, it } from 'vitest'
import { FakeQuestionRepo } from '../../test/fake-question-repo'
import {
  createQuestion,
  deactivateQuestion,
  listQuestions,
  reactivateQuestion,
  reorderQuestions,
  updateQuestion,
} from './question-admin-service'

const content = {
  text: 'Nova redação da pergunta?',
  options: [
    { text: 'Sim', weight: 10 },
    { text: 'Não', weight: 0 },
  ],
}

let repo: FakeQuestionRepo
beforeEach(() => {
  repo = new FakeQuestionRepo()
})

describe('updateQuestion', () => {
  it('pergunta sem respostas → altera no lugar (versioned: false, mesmo id)', async () => {
    const q = repo.add({ answerCount: 0 })
    const result = await updateQuestion(repo, q.id, content)
    expect(repo.calls).toEqual(['updateContent'])
    expect(result.versioned).toBe(false)
    expect(result.question.id).toBe(q.id)
    expect(result.question.text).toBe(content.text)
  })

  it('pergunta com respostas → nova versão na mesma posição (versioned: true, id novo)', async () => {
    repo.add()
    const q = repo.add({ answerCount: 12 })
    const result = await updateQuestion(repo, q.id, content)
    expect(repo.calls).toEqual(['replaceWithNewVersion'])
    expect(result.versioned).toBe(true)
    expect(result.question.id).not.toBe(q.id)
    expect(result.question.position).toBe(2)
  })

  it('pergunta inativa → 409 QUESTION_INACTIVE', async () => {
    const q = repo.add({ isActive: false })
    await expect(updateQuestion(repo, q.id, content)).rejects.toMatchObject({
      status: 409,
      code: 'QUESTION_INACTIVE',
    })
  })

  it('inexistente → 404', async () =>
    expect(updateQuestion(repo, 'nada', content)).rejects.toMatchObject({ status: 404 }))
})

describe('createQuestion', () => {
  it('insere no fim da lista', async () => {
    repo.add()
    repo.add()
    const q = await createQuestion(repo, content)
    expect(q.position).toBe(3)
  })
})

describe('deactivateQuestion', () => {
  it('desativa', async () => {
    repo.add()
    const q = repo.add()
    await deactivateQuestion(repo, q.id)
    expect(repo.calls).toEqual(['deactivate'])
  })

  it('última ativa → 422 LAST_ACTIVE_QUESTION', async () => {
    const q = repo.add()
    await expect(deactivateQuestion(repo, q.id)).rejects.toMatchObject({
      status: 422,
      code: 'LAST_ACTIVE_QUESTION',
    })
  })

  it('já inativa → não falha e não faz nada (idempotente)', async () => {
    repo.add()
    const q = repo.add({ isActive: false })
    await deactivateQuestion(repo, q.id)
    expect(repo.calls).toEqual([])
  })

  it('inexistente → 404', async () =>
    expect(deactivateQuestion(repo, 'nada')).rejects.toMatchObject({ status: 404 }))
})

describe('reactivateQuestion', () => {
  it('desativada manualmente → volta no fim', async () => {
    repo.add()
    const q = repo.add({ isActive: false })
    const result = await reactivateQuestion(repo, q.id)
    expect(repo.calls).toEqual(['reactivateAtEnd'])
    expect(result.position).toBe(2)
  })

  it('substituída por nova versão → 409 QUESTION_REPLACED', async () => {
    const old = repo.add({ isActive: false })
    repo.add({ previousVersionId: old.id })
    await expect(reactivateQuestion(repo, old.id)).rejects.toMatchObject({
      status: 409,
      code: 'QUESTION_REPLACED',
    })
  })

  it('já ativa → 409 QUESTION_ALREADY_ACTIVE', async () => {
    const q = repo.add()
    await expect(reactivateQuestion(repo, q.id)).rejects.toMatchObject({
      status: 409,
      code: 'QUESTION_ALREADY_ACTIVE',
    })
  })
})

describe('reorderQuestions', () => {
  it('aplica a nova ordem quando a lista é exatamente o conjunto de ativas', async () => {
    const a = repo.add()
    const b = repo.add()
    await reorderQuestions(repo, [b.id, a.id])
    expect((await listQuestions(repo, 'active')).map((q) => q.id)).toEqual([b.id, a.id])
  })

  it.each([
    ['faltando uma ativa', (ids: string[]) => ids.slice(0, 1)],
    ['com id a mais', (ids: string[]) => [...ids, 'q-extra']],
    ['com uma inativa no lugar', (ids: string[]) => [ids[0]!, 'q3']],
  ])('lista %s → 422 VALIDATION_ERROR', async (_label, mutate) => {
    const a = repo.add()
    const b = repo.add()
    repo.add({ id: 'q3', isActive: false })
    await expect(reorderQuestions(repo, mutate([a.id, b.id]))).rejects.toMatchObject({
      status: 422,
      code: 'VALIDATION_ERROR',
    })
    expect(repo.calls).not.toContain('setOrder')
  })
})
