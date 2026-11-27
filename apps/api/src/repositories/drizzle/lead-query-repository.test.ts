import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { PGlite } from '@electric-sql/pglite'
import { createTestDb } from '../../../test/db/pglite'
import { DrizzleLeadQueryRepository } from './lead-query-repository'
import { DrizzleQuizRepository } from './quiz-repository'
import { DrizzleSubmissionRepository } from './submission-repository'

let client: PGlite
let repo: DrizzleLeadQueryRepository
const ids: Record<string, string> = {}

beforeAll(async () => {
  const testDb = await createTestDb({ seed: true })
  client = testDb.client
  repo = new DrizzleLeadQueryRepository(testDb.db)
  const quiz = (await new DrizzleQuizRepository(testDb.db).getActiveQuizForScoring())!
  const submissions = new DrizzleSubmissionRepository(testDb.db)
  const save = async (name: string, email: string, bandIndex: number, score: number) => {
    const band = quiz.bands[bandIndex]!
    const { leadId } = await submissions.saveSubmission({
      lead: { name, email, phone: '11987654321' },
      quizId: quiz.id,
      rawPoints: score,
      maxPoints: 100,
      score,
      band,
      answers: quiz.questions.map((q) => ({
        questionId: q.id,
        optionId: q.options[0]!.id,
        questionPosition: q.position,
        questionText: q.text,
        optionText: q.options[0]!.text,
        weight: q.options[0]!.weight,
      })),
    })
    ids[email] = leadId
  }
  await save('Ana Souza', 'ana@email.com', 2, 64)
  await save('Bruno 50% Lima', 'bruno@email.com', 0, 20)
  await save('Carla_Dias', 'carla@email.com', 3, 90)
  await save('Ana Souza', 'ana@email.com', 1, 40) // reenvio: vale o envio mais recente
})
afterAll(async () => client.close())

describe('DrizzleLeadQueryRepository', () => {
  it('lista um item por lead, mais recentes primeiro, com dados do último envio', async () => {
    const { items, total } = await repo.listLeads({ page: 1, pageSize: 20 })
    expect(total).toBe(3)
    expect(items.map((i) => i.email)).toEqual([
      'carla@email.com',
      'bruno@email.com',
      'ana@email.com',
    ])
    expect(items[2]).toMatchObject({
      score: 40,
      band: { slug: 'em-construcao', label: 'Em construção' },
    })
    expect(typeof items[0]?.createdAt).toBe('string')
  })

  it('busca por nome ou e-mail, sem diferenciar maiúsculas', async () => {
    expect((await repo.listLeads({ page: 1, pageSize: 20, search: 'SOUZA' })).total).toBe(1)
    expect((await repo.listLeads({ page: 1, pageSize: 20, search: 'bruno@' })).total).toBe(1)
  })

  it('% e _ na busca são literais, não curingas', async () => {
    expect((await repo.listLeads({ page: 1, pageSize: 20, search: '50%' })).items[0]?.email).toBe(
      'bruno@email.com',
    )
    expect((await repo.listLeads({ page: 1, pageSize: 20, search: '%' })).total).toBe(1)
    expect((await repo.listLeads({ page: 1, pageSize: 20, search: '_' })).total).toBe(1)
  })

  it('filtra pela faixa do envio mais recente', async () => {
    const { items } = await repo.listLeads({ page: 1, pageSize: 20, band: 'em-construcao' })
    expect(items.map((i) => i.email)).toEqual(['ana@email.com'])
    expect((await repo.listLeads({ page: 1, pageSize: 20, band: 'bom-caminho' })).total).toBe(0)
  })

  it('pagina com total correto', async () => {
    const page2 = await repo.listLeads({ page: 2, pageSize: 2 })
    expect(page2.total).toBe(3)
    expect(page2.items.map((i) => i.email)).toEqual(['ana@email.com'])
  })

  it('detalhe traz o último envio, respostas por posição e contagem de envios', async () => {
    const detail = await repo.getLeadDetail(ids['ana@email.com']!)
    expect(detail).toMatchObject({
      name: 'Ana Souza',
      score: 40,
      band: { slug: 'em-construcao', message: expect.any(String) },
      submissionCount: 2,
    })
    expect(detail?.answers.map((a) => a.position)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    expect(detail?.answers[0]).toEqual({
      position: 1,
      question: 'Em que etapa dos estudos você está?',
      option: 'Estou no 1º ou 2º ano do ensino médio',
      weight: 2,
    })
  })

  it('detalhe de id inexistente → null', async () => {
    expect(await repo.getLeadDetail('00000000-0000-4000-8000-000000000099')).toBeNull()
  })

  it('agregados: total, média, faixas e leads por dia no fuso de São Paulo', async () => {
    // 02:00 UTC de 20/11 ainda é 19/11 em São Paulo
    await client.query(
      `update leads set created_at = '2026-11-20T02:00:00Z' where email = 'carla@email.com'`,
    )
    await client.query(
      `update leads set created_at = '2026-11-20T12:00:00Z' where email <> 'carla@email.com'`,
    )
    const stats = await repo.getStatsRow({
      timeZone: 'America/Sao_Paulo',
      since: new Date('2026-11-01T00:00:00Z'),
    })
    expect(stats.total).toBe(3)
    expect(stats.averageScore).toBeCloseTo(50) // (40 + 20 + 90) / 3, último envio de cada lead
    expect(stats.byBand.map((b) => [b.slug, b.count]).sort()).toEqual([
      ['em-construcao', 1],
      ['ponto-de-partida', 1],
      ['reta-final', 1],
    ])
    expect(stats.byDay).toEqual([
      { date: '2026-11-19', count: 1 },
      { date: '2026-11-20', count: 2 },
    ])
    const recent = await repo.getStatsRow({
      timeZone: 'America/Sao_Paulo',
      since: new Date('2026-11-20T10:00:00Z'),
    })
    expect(recent.byDay).toEqual([{ date: '2026-11-20', count: 2 }])
  })
})
