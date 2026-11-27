import { formatDateTime, formatPhone, leadListQuerySchema } from '@quiz/shared'
import { Hono } from 'hono'
import type { AppEnv } from '../deps'
import { toCsv } from '../lib/csv'
import { notFound } from '../lib/http-error'
import { validate } from '../lib/validate'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
/** Teto da exportação: protege o Worker de montar arquivos enormes em memória. */
const EXPORT_LIMIT = 10_000

const exportQuerySchema = leadListQuerySchema.pick({ search: true, band: true })

export const adminLeadRoutes = new Hono<AppEnv>()
  .get('/leads', validate('query', leadListQuerySchema), async (c) => {
    const query = c.req.valid('query')
    const { items, total } = await c.var.deps.leadQueryRepo.listLeads(query)
    return c.json({
      data: items,
      pagination: { page: query.page, pageSize: query.pageSize, total },
    })
  })
  // antes de /leads/:id, senão "export.csv" seria lido como id
  .get('/leads/export.csv', validate('query', exportQuerySchema), async (c) => {
    const { search, band } = c.req.valid('query')
    const { items } = await c.var.deps.leadQueryRepo.listLeads({
      search,
      band,
      page: 1,
      pageSize: EXPORT_LIMIT,
    })
    const csv = toCsv(
      ['Nome', 'E-mail', 'Telefone', 'Pontuação', 'Faixa', 'Cadastro'],
      items.map((lead) => [
        lead.name,
        lead.email,
        formatPhone(lead.phone),
        lead.score,
        lead.band.label,
        formatDateTime(lead.createdAt),
      ]),
    )
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(
      new Date(),
    )
    return c.body(csv, 200, {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="leads-${today}.csv"`,
      'cache-control': 'no-store',
    })
  })
  .get('/leads/:id', async (c) => {
    const id = c.req.param('id')
    const lead = UUID.test(id) ? await c.var.deps.leadQueryRepo.getLeadDetail(id) : null
    if (!lead) throw notFound('Lead não encontrado')
    return c.json(lead)
  })
