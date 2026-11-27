import { leadListQuerySchema } from '@quiz/shared'
import { Hono } from 'hono'
import type { AppEnv } from '../deps'
import { notFound } from '../lib/http-error'
import { validate } from '../lib/validate'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const adminLeadRoutes = new Hono<AppEnv>()
  .get('/leads', validate('query', leadListQuerySchema), async (c) => {
    const query = c.req.valid('query')
    const { items, total } = await c.var.deps.leadQueryRepo.listLeads(query)
    return c.json({
      data: items,
      pagination: { page: query.page, pageSize: query.pageSize, total },
    })
  })
  .get('/leads/:id', async (c) => {
    const id = c.req.param('id')
    const lead = UUID.test(id) ? await c.var.deps.leadQueryRepo.getLeadDetail(id) : null
    if (!lead) throw notFound('Lead não encontrado')
    return c.json(lead)
  })
