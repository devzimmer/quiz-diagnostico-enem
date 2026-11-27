import { questionContentSchema, questionStatusSchema, reorderSchema } from '@quiz/shared'
import { Hono } from 'hono'
import { z } from 'zod'
import type { AppEnv } from '../deps'
import { notFound } from '../lib/http-error'
import { validate } from '../lib/validate'
import {
  createQuestion,
  deactivateQuestion,
  getQuizSummary,
  listQuestions,
  reactivateQuestion,
  reorderQuestions,
  updateQuestion,
} from '../services/question-admin-service'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Id de pergunta válido ou 404 (sem consultar o banco com lixo). */
const questionId = (id: string) => {
  if (!UUID.test(id)) throw notFound('Pergunta não encontrada')
  return id
}

export const adminQuizRoutes = new Hono<AppEnv>()
  .get('/quiz', async (c) => c.json(await getQuizSummary(c.var.deps.questionAdminRepo)))
  .get(
    '/quiz/questions',
    validate('query', z.object({ status: questionStatusSchema })),
    async (c) => {
      const { status } = c.req.valid('query')
      return c.json(await listQuestions(c.var.deps.questionAdminRepo, status))
    },
  )
  .post('/quiz/questions', validate('json', questionContentSchema), async (c) =>
    c.json(await createQuestion(c.var.deps.questionAdminRepo, c.req.valid('json')), 201),
  )
  .put('/quiz/question-order', validate('json', reorderSchema), async (c) => {
    const { questionIds } = c.req.valid('json')
    await reorderQuestions(c.var.deps.questionAdminRepo, questionIds)
    return c.json({ questionIds })
  })
  .put('/quiz/questions/:id', validate('json', questionContentSchema), async (c) => {
    const id = questionId(c.req.param('id'))
    return c.json(await updateQuestion(c.var.deps.questionAdminRepo, id, c.req.valid('json')))
  })
  .delete('/quiz/questions/:id', async (c) => {
    await deactivateQuestion(c.var.deps.questionAdminRepo, questionId(c.req.param('id')))
    return c.body(null, 204)
  })
  .post('/quiz/questions/:id/reactivate', async (c) =>
    c.json(await reactivateQuestion(c.var.deps.questionAdminRepo, questionId(c.req.param('id')))),
  )
