import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { PGlite } from '@electric-sql/pglite'
import { createTestDb } from './pglite'

let client: PGlite

beforeAll(async () => {
  ;({ client } = await createTestDb({ seed: true }))
})
afterAll(async () => client.close())

const one = async <T>(sql: string) => (await client.query<T>(sql)).rows[0] as T

describe('migration + seed', () => {
  it('cria um quiz ativo com 10 perguntas ativas', async () => {
    expect(await one(`select count(*)::int n from quizzes where is_active`)).toEqual({ n: 1 })
    expect(await one(`select count(*)::int n from questions where is_active`)).toEqual({ n: 10 })
  })

  it('soma dos maiores pesos é 100', async () => {
    const row = await one<{ total: number }>(`
      select sum(max_w)::int total from (
        select max(o.weight) max_w from options o group by o.question_id
      ) t`)
    expect(row.total).toBe(100)
  })

  it('pergunta 6 tem 5 alternativas na ordem do anexo', async () => {
    const { rows } = await client.query<{ text: string; weight: number }>(`
      select o.text, o.weight from options o join questions q on q.id = o.question_id
      where q.position = 6 order by o.position`)
    expect(rows.map((r) => r.weight)).toEqual([2, 5, 5, 7, 10])
    expect(rows[0]?.text).toBe('Não consigo me organizar nem manter constância')
  })

  it('cria as 4 faixas cobrindo 0–100', async () => {
    const { rows } = await client.query<{ slug: string; min_score: number; max_score: number }>(
      `select slug, min_score, max_score from result_bands order by min_score`,
    )
    expect(rows).toEqual([
      { slug: 'ponto-de-partida', min_score: 0, max_score: 30 },
      { slug: 'em-construcao', min_score: 31, max_score: 55 },
      { slug: 'bom-caminho', min_score: 56, max_score: 80 },
      { slug: 'reta-final', min_score: 81, max_score: 100 },
    ])
  })

  it('cria o admin com papel admin, senha com hash e identidade', async () => {
    const user = await one<{ role: string; ok: boolean }>(`
      select raw_app_meta_data->>'role' as role,
             encrypted_password = extensions.crypt('Admin@12345', encrypted_password) as ok
      from auth.users where email = 'admin@quiz.local'`)
    expect(user).toEqual({ role: 'admin', ok: true })
    expect(
      await one(`select count(*)::int n from auth.identities where provider = 'email'`),
    ).toEqual({ n: 1 })
  })

  it('não permite duas perguntas ativas na mesma posição', async () => {
    await expect(
      client.query(`insert into questions (quiz_id, position, text)
                    select quiz_id, 1, 'Duplicada?' from questions limit 1`),
    ).rejects.toThrow(/questions_active_position_uq/)
  })

  it('exige deactivated_at coerente com is_active', async () => {
    await expect(
      client.query(`update questions set is_active = false where position = 1`),
    ).rejects.toThrow(/questions_active_matches_deactivated/)
  })

  it('não permite apagar pergunta já respondida', async () => {
    await client.exec(`
      insert into leads (name, email, phone) values ('Teste', 'teste@email.com', '11987654321');
      insert into submissions (lead_id, quiz_id, score, raw_points, max_points, band_slug, band_label, band_message)
        select l.id, q.id, 50, 50, 100, 'em-construcao', 'Em construção', 'msg'
        from leads l, quizzes q limit 1;
      insert into submission_answers (submission_id, question_id, option_id, question_position, question_text, option_text, weight)
        select s.id, qu.id, o.id, qu.position, qu.text, o.text, o.weight
        from submissions s, questions qu join options o on o.question_id = qu.id and o.position = 1
        where qu.position = 1;
    `)
    await expect(client.query(`delete from questions where position = 1`)).rejects.toThrow(
      /foreign key/i,
    )
  })
})
