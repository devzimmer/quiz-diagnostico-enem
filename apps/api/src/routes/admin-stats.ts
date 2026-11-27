import { Hono } from 'hono'
import type { AppEnv } from '../deps'
import { getLeadStats } from '../services/stats-service'

export const adminStatsRoutes = new Hono<AppEnv>().get('/stats', async (c) =>
  c.json(await getLeadStats(c.var.deps)),
)
