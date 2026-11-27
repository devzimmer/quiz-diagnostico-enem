import type { LeadDetail, LeadListItem, LeadListQuery } from '@quiz/shared'
import { describe, expect, it, vi } from 'vitest'
import { createApp } from '../app'
import type { LeadQueryRepository } from '../repositories/types'
import { authHeader, fakeVerifyToken } from '../../test/admin'
import { makeFakeDeps } from '../../test/fakes'
import { readJson } from '../../test/http'

const LEAD_ID = '00000000-0000-4000-8000-000000000042'
const item: LeadListItem = {
  id: LEAD_ID,
  name: 'Ana Souza',
  email: 'ana@email.com',
  phone: '11987654321',
  score: 64,
  band: { slug: 'bom-caminho', label: 'Bom caminho' },
  createdAt: '2026-11-27T17:32:00.000Z',
}
const detail: LeadDetail = {
  ...item,
  band: { slug: 'bom-caminho', label: 'Bom caminho', message: 'msg' },
  submittedAt: '2026-11-27T17:32:00.000Z',
  submissionCount: 1,
  answers: [{ position: 1, question: 'P1?', option: 'A', weight: 7 }],
}

function setup() {
  const leadQueryRepo: LeadQueryRepository = {
    listLeads: vi.fn(async (_q: LeadListQuery) => ({ items: [item], total: 41 })),
    getLeadDetail: vi.fn(async (id: string) => (id === LEAD_ID ? detail : null)),
    getStatsRow: vi.fn(),
  }
  const app = createApp(() => makeFakeDeps({ leadQueryRepo, verifyToken: fakeVerifyToken }))
  return { app, leadQueryRepo }
}

describe('GET /api/v1/admin/leads', () => {
  it('repassa a query normalizada e devolve a página', async () => {
    const { app, leadQueryRepo } = setup()
    const res = await app.request(
      '/api/v1/admin/leads?page=2&pageSize=10&search=%20ana%20&band=bom-caminho',
      { headers: authHeader },
    )
    expect(res.status).toBe(200)
    expect(leadQueryRepo.listLeads).toHaveBeenCalledWith({
      page: 2,
      pageSize: 10,
      search: 'ana',
      band: 'bom-caminho',
    })
    expect(await readJson(res)).toEqual({
      data: [item],
      pagination: { page: 2, pageSize: 10, total: 41 },
    })
  })

  it('pageSize acima de 100 → 422', async () => {
    const res = await setup().app.request('/api/v1/admin/leads?pageSize=500', {
      headers: authHeader,
    })
    expect(res.status).toBe(422)
  })

  it('sem token → 401', async () => {
    expect((await setup().app.request('/api/v1/admin/leads')).status).toBe(401)
  })
})

describe('GET /api/v1/admin/leads/:id', () => {
  it('devolve o detalhe', async () => {
    const res = await setup().app.request(`/api/v1/admin/leads/${LEAD_ID}`, { headers: authHeader })
    expect(res.status).toBe(200)
    expect(await readJson(res)).toEqual(detail)
  })

  it('id inexistente → 404', async () => {
    const res = await setup().app.request(
      '/api/v1/admin/leads/00000000-0000-4000-8000-000000000099',
      { headers: authHeader },
    )
    expect(res.status).toBe(404)
  })

  it('id que não é uuid → 404 sem consultar o banco', async () => {
    const { app, leadQueryRepo } = setup()
    const res = await app.request('/api/v1/admin/leads/abc', { headers: authHeader })
    expect(res.status).toBe(404)
    expect(leadQueryRepo.getLeadDetail).not.toHaveBeenCalled()
  })
})

describe('GET /api/v1/admin/leads/export.csv', () => {
  it('exporta todos os leads filtrados em CSV para Excel', async () => {
    const { app, leadQueryRepo } = setup()
    const res = await app.request('/api/v1/admin/leads/export.csv?search=ana&band=bom-caminho', {
      headers: authHeader,
    })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('text/csv; charset=utf-8')
    expect(res.headers.get('content-disposition')).toMatch(
      /^attachment; filename="leads-\d{4}-\d{2}-\d{2}\.csv"$/,
    )
    expect(leadQueryRepo.listLeads).toHaveBeenCalledWith({
      search: 'ana',
      band: 'bom-caminho',
      page: 1,
      pageSize: 10_000,
    })
    const bytes = new Uint8Array(await res.arrayBuffer())
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]) // BOM: Excel lê como UTF-8
    const text = new TextDecoder().decode(bytes) // decodificar já remove o BOM
    expect(text.split('\r\n')).toEqual([
      'Nome;E-mail;Telefone;Pontuação;Faixa;Cadastro',
      'Ana Souza;ana@email.com;(11) 98765-4321;64;Bom caminho;27/11/2026 14:32',
      '',
    ])
  })

  it('exige admin', async () => {
    expect((await setup().app.request('/api/v1/admin/leads/export.csv')).status).toBe(401)
  })
})
