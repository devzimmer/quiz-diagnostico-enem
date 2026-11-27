import { submissionInputSchema } from '@quiz/shared'
import { Hono } from 'hono'
import type { AppEnv } from '../deps'
import { notFound } from '../lib/http-error'
import { validate } from '../lib/validate'
import { submitQuiz } from '../services/submission-service'

export const publicRoutes = new Hono<AppEnv>()
  .get('/quiz', async (c) => {
    const quiz = await c.var.deps.quizRepo.getActivePublicQuiz()
    if (!quiz) throw notFound('Nenhum quiz ativo')
    return c.json(quiz)
  })
  .post('/submissions', validate('json', submissionInputSchema), async (c) => {
    const result = await submitQuiz(c.var.deps, c.req.valid('json'))
    return c.json(result, 201)
  })
