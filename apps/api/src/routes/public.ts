import { Hono } from 'hono'
import type { AppEnv } from '../deps'
import { notFound } from '../lib/http-error'

export const publicRoutes = new Hono<AppEnv>().get('/quiz', async (c) => {
  const quiz = await c.var.deps.quizRepo.getActivePublicQuiz()
  if (!quiz) throw notFound('Nenhum quiz ativo')
  return c.json(quiz)
})
