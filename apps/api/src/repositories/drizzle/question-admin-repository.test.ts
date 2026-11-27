import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { PGlite } from '@electric-sql/pglite'
import { createTestDb } from '../../../test/db/pglite'
import { DrizzleQuestionAdminRepository } from './question-admin-repository'
import { DrizzleQuizRepository } from './quiz-repository'
import { DrizzleSubmissionRepository } from './submission-repository'

let client: PGlite
let repo: DrizzleQuestionAdminRepository
let quizId: string
let quizRepo: DrizzleQuizRepository

const content = (text: string, weights = [0, 10]) => ({
  text,
  options: weights.map((weight, i) => ({ text: `${text} op${i + 1}`, weight })),
})

beforeAll(async () => {
  const testDb = await createTestDb({ seed: true })
  client = testDb.client
  repo = new DrizzleQuestionAdminRepository(testDb.db)
  quizRepo = new DrizzleQuizRepository(testDb.db)
  quizId = (await repo.getActiveQuizId())!
  // um envio real: todas as 10 perguntas do seed passam a ter 1 resposta
  const quiz = (await new DrizzleQuizRepository(testDb.db).getActiveQuizForScoring())!
  await new DrizzleSubmissionRepository(testDb.db).saveSubmission({
    lead: { name: 'Ana Souza', email: 'ana@email.com', phone: '11987654321' },
    quizId: quiz.id,
    rawPoints: 8,
    maxPoints: 100,
    score: 8,
    band: quiz.bands[0]!,
    answers: quiz.questions.map((q) => ({
      questionId: q.id,
      optionId: q.options[0]!.id,
      questionPosition: q.position,
      questionText: q.text,
      optionText: q.options[0]!.text,
      weight: q.options[0]!.weight,
    })),
  })
})
afterAll(async () => client.close())

describe('DrizzleQuestionAdminRepository', () => {
  it('resumo: 10 ativas, 0 inativas, máximo 100, 4 faixas', async () => {
    expect(await repo.getSummary(quizId)).toMatchObject({
      title: 'Qual é a sua chance real de passar no ENEM?',
      maxPoints: 100,
      activeCount: 10,
      inactiveCount: 0,
      bands: [
        { slug: 'ponto-de-partida', minScore: 0, maxScore: 30 },
        { slug: 'em-construcao' },
        { slug: 'bom-caminho' },
        { slug: 'reta-final', minScore: 81, maxScore: 100 },
      ],
    })
  })

  it('lista ativas por posição com pesos e contagem de respostas', async () => {
    const active = await repo.listActive(quizId)
    expect(active.map((q) => q.position)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    expect(active[0]).toMatchObject({
      answerCount: 1,
      options: [{ position: 1, weight: 2 }, {}, {}, {}],
    })
  })

  it('insere no fim e altera no lugar (sem respostas)', async () => {
    const created = await repo.insertAtEnd(quizId, content('Pergunta nova?'))
    expect(created).toMatchObject({ position: 11, answerCount: 0 })
    const updated = await repo.updateContent(
      created.id,
      content('Pergunta nova editada?', [1, 2, 3]),
    )
    expect(updated.id).toBe(created.id)
    expect(updated.text).toBe('Pergunta nova editada?')
    expect(updated.options.map((o) => o.weight)).toEqual([1, 2, 3])
    expect((await repo.findState(created.id))?.answerCount).toBe(0)
  })

  it('substitui por nova versão: mesma posição, antiga inativa e marcada como substituída', async () => {
    const [first] = await repo.listActive(quizId)
    const next = await repo.replaceWithNewVersion(
      first!.id,
      content('Em que etapa você está agora?'),
    )
    expect(next.id).not.toBe(first!.id)
    expect(next.position).toBe(1)
    expect(await repo.findState(first!.id)).toMatchObject({
      isActive: false,
      replaced: true,
      answerCount: 1,
    })
    const inactive = await repo.listInactive(quizId)
    expect(inactive[0]).toMatchObject({
      id: first!.id,
      inactiveReason: 'replaced',
      replacedBy: { id: next.id, position: 1 },
      answerCount: 1,
    })
    expect(typeof inactive[0]?.deactivatedAt).toBe('string')
  })

  it('desativa compactando as posições e reativa no fim', async () => {
    const before = await repo.listActive(quizId)
    const target = before[1]!
    await repo.deactivate(target.id)
    const after = await repo.listActive(quizId)
    expect(after.map((q) => q.position)).toEqual(after.map((_, i) => i + 1))
    expect(after.find((q) => q.id === target.id)).toBeUndefined()
    const inactive = await repo.listInactive(quizId)
    expect(inactive.find((q) => q.id === target.id)).toMatchObject({
      inactiveReason: 'deactivated',
      replacedBy: null,
    })
    const back = await repo.reactivateAtEnd(target.id)
    expect(back.position).toBe(after.length + 1)
  })

  it('reordena sem violar o índice único de posição', async () => {
    const ids = await repo.activeIds(quizId)
    const reversed = [...ids].reverse()
    await repo.setOrder(quizId, reversed)
    expect(await repo.activeIds(quizId)).toEqual(reversed)
    expect((await repo.listActive(quizId)).map((q) => q.position)).toEqual(ids.map((_, i) => i + 1))
  })

  it('o quiz público acompanha as mudanças (só ativas)', async () => {
    const publicQuiz = await quizRepo.getActivePublicQuiz()
    expect(publicQuiz?.questions).toHaveLength(await repo.countActive(quizId))
  })
})
