import { sql } from 'drizzle-orm'

// RLS habilitado em todas as tabelas, sem políticas: o schema public fica inacessível pela API
// REST do Supabase (chaves anon/authenticated). A API (Worker) conecta como dono das tabelas.
import {
  type AnyPgColumn,
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
const updatedAt = () => timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()

export const quizzes = pgTable(
  'quizzes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull().unique(),
    title: text('title').notNull(),
    isActive: boolean('is_active').notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('quizzes_single_active')
      .on(t.isActive)
      .where(sql`is_active`),
  ],
).enableRLS()

export const questions = pgTable(
  'questions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    quizId: uuid('quiz_id')
      .notNull()
      .references(() => quizzes.id, { onDelete: 'restrict' }),
    position: integer('position').notNull(),
    text: text('text').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    deactivatedAt: timestamp('deactivated_at', { withTimezone: true }),
    previousVersionId: uuid('previous_version_id').references((): AnyPgColumn => questions.id, {
      onDelete: 'restrict',
    }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('questions_active_position_uq')
      .on(t.quizId, t.position)
      .where(sql`is_active`),
    check('questions_active_matches_deactivated', sql`is_active = (deactivated_at IS NULL)`),
    index('questions_previous_version_idx').on(t.previousVersionId),
  ],
).enableRLS()

export const options = pgTable(
  'options',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    questionId: uuid('question_id')
      .notNull()
      .references(() => questions.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    text: text('text').notNull(),
    weight: integer('weight').notNull(),
  },
  (t) => [
    unique('options_question_position_uq').on(t.questionId, t.position),
    check('options_weight_range', sql`weight BETWEEN 0 AND 100`),
  ],
).enableRLS()

export const resultBands = pgTable(
  'result_bands',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    quizId: uuid('quiz_id')
      .notNull()
      .references(() => quizzes.id, { onDelete: 'restrict' }),
    slug: text('slug').notNull(),
    label: text('label').notNull(),
    message: text('message').notNull(),
    minScore: integer('min_score').notNull(),
    maxScore: integer('max_score').notNull(),
  },
  (t) => [
    unique('result_bands_quiz_slug_uq').on(t.quizId, t.slug),
    check('result_bands_range', sql`min_score <= max_score`),
  ],
).enableRLS()

export const leads = pgTable(
  'leads',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    /** Sempre minúsculo: normalizado pelo schema compartilhado antes de chegar aqui. */
    email: text('email').notNull().unique(),
    /** Só dígitos (DDD + número). */
    phone: text('phone').notNull(),
    latestSubmissionId: uuid('latest_submission_id').references((): AnyPgColumn => submissions.id, {
      onDelete: 'set null',
    }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('leads_created_at_idx').on(t.createdAt.desc())],
).enableRLS()

export const submissions = pgTable(
  'submissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    leadId: uuid('lead_id')
      .notNull()
      .references(() => leads.id, { onDelete: 'cascade' }),
    quizId: uuid('quiz_id')
      .notNull()
      .references(() => quizzes.id, { onDelete: 'restrict' }),
    score: integer('score').notNull(),
    rawPoints: integer('raw_points').notNull(),
    maxPoints: integer('max_points').notNull(),
    // snapshot da faixa no momento do envio
    bandSlug: text('band_slug').notNull(),
    bandLabel: text('band_label').notNull(),
    bandMessage: text('band_message').notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    check('submissions_score_range', sql`score BETWEEN 0 AND 100`),
    index('submissions_lead_created_idx').on(t.leadId, t.createdAt.desc()),
  ],
).enableRLS()

export const submissionAnswers = pgTable(
  'submission_answers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    submissionId: uuid('submission_id')
      .notNull()
      .references(() => submissions.id, { onDelete: 'cascade' }),
    questionId: uuid('question_id')
      .notNull()
      .references(() => questions.id, { onDelete: 'restrict' }),
    optionId: uuid('option_id')
      .notNull()
      .references(() => options.id, { onDelete: 'restrict' }),
    // snapshot do que o lead viu
    questionPosition: integer('question_position').notNull(),
    questionText: text('question_text').notNull(),
    optionText: text('option_text').notNull(),
    weight: integer('weight').notNull(),
  },
  (t) => [
    unique('submission_answers_submission_question_uq').on(t.submissionId, t.questionId),
    index('submission_answers_question_idx').on(t.questionId),
  ],
).enableRLS()
