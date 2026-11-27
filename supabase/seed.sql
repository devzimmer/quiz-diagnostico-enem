-- Seed do ambiente local: quiz do anexo do enunciado, faixas de resultado e usuário admin.
-- Roda automaticamente em `supabase db reset` (depois das migrations).

-- Quiz ------------------------------------------------------------------------
insert into public.quizzes (slug, title, is_active)
values ('diagnostico-enem', 'Qual é a sua chance real de passar no ENEM?', true);

-- Perguntas e alternativas ----------------------------------------------------
-- Cada linha: posição da pergunta, texto, e as alternativas como json [texto, peso].
with content (position, text, opts) as (
  values
    (1, 'Em que etapa dos estudos você está?', '[
      ["Estou no 1º ou 2º ano do ensino médio", 2],
      ["Estou no 3º ano", 5],
      ["Já terminei o ensino médio e estudo por conta", 7],
      ["Já terminei e faço cursinho", 10]]'::jsonb),
    (2, 'Quantas horas por semana você estuda além da escola/cursinho?', '[
      ["Menos de 2 horas", 0],
      ["De 3 a 6 horas", 4],
      ["De 7 a 14 horas", 7],
      ["15 horas ou mais", 10]]'::jsonb),
    (3, 'Quantos simulados completos você já fez?', '[
      ["Nenhum", 0],
      ["1 ou 2", 3],
      ["De 3 a 5", 7],
      ["Mais de 5", 10]]'::jsonb),
    (4, 'Como está sua preparação para a redação?', '[
      ["Nunca escrevi uma redação no modelo ENEM", 0],
      ["Escrevi algumas, mas sem correção", 3],
      ["Escrevo e recebo correção de vez em quando", 7],
      ["Escrevo semanalmente com correção", 10]]'::jsonb),
    (5, 'Você tem um plano de estudos definido?', '[
      ["Não, estudo conforme dá", 0],
      ["Tenho uma ideia geral do que preciso estudar", 3],
      ["Tenho um plano, mas sigo parcialmente", 7],
      ["Tenho um plano e sigo à risca", 10]]'::jsonb),
    (6, 'Qual é a sua maior dificuldade hoje?', '[
      ["Não consigo me organizar nem manter constância", 2],
      ["Matemática e Ciências da Natureza", 5],
      ["Redação", 5],
      ["Linguagens e Ciências Humanas", 7],
      ["Não tenho dificuldade específica, quero melhorar no geral", 10]]'::jsonb),
    (7, 'Qual foi sua média aproximada nos últimos simulados?', '[
      ["Não sei / nunca fiz", 0],
      ["Abaixo de 500", 3],
      ["Entre 500 e 650", 6],
      ["Entre 650 e 750", 8],
      ["Acima de 750", 10]]'::jsonb),
    (8, 'Quão claro está seu objetivo de curso e universidade?', '[
      ["Ainda não sei o que quero cursar", 2],
      ["Tenho duas ou três opções em mente", 5],
      ["Sei o curso, mas não sei a nota de corte", 7],
      ["Sei o curso, a universidade e a nota de corte que preciso", 10]]'::jsonb),
    (9, 'Com que frequência você revisa o conteúdo que já estudou?', '[
      ["Não reviso, só avanço para matéria nova", 0],
      ["Reviso só na véspera das provas", 3],
      ["Reviso de vez em quando, sem método definido", 7],
      ["Tenho uma rotina de revisão programada", 10]]'::jsonb),
    (10, 'Você pretende investir em um cursinho ou mentoria neste ano?', '[
      ["Não pretendo investir", 2],
      ["Talvez, mas ainda não pesquisei nada", 5],
      ["Estou pesquisando opções agora", 8],
      ["Já decidi que vou, só falta escolher onde", 10]]'::jsonb)
),
inserted as (
  insert into public.questions (quiz_id, position, text)
  select q.id, c.position, c.text
  from content c cross join public.quizzes q
  where q.slug = 'diagnostico-enem'
  returning id, position
)
insert into public.options (question_id, position, text, weight)
select i.id, o.ordinality::int, o.value ->> 0, (o.value ->> 1)::int
from inserted i
join content c on c.position = i.position
cross join lateral jsonb_array_elements(c.opts) with ordinality as o(value, ordinality);

-- Faixas de resultado ---------------------------------------------------------
insert into public.result_bands (quiz_id, slug, label, message, min_score, max_score)
select q.id, b.slug, b.label, b.message, b.min_score, b.max_score
from public.quizzes q
cross join (values
  ('ponto-de-partida', 'Ponto de partida', 'Você está começando. Uma rotina estruturada faz a maior diferença agora.', 0, 30),
  ('em-construcao', 'Em construção', 'Você já tem base, mas falta consistência para chegar na nota de corte.', 31, 55),
  ('bom-caminho', 'Bom caminho', 'Sua preparação está sólida. O ganho agora vem de ajuste fino.', 56, 80),
  ('reta-final', 'Reta final', 'Você está muito bem posicionado. O foco é manter o ritmo e não perder pontos bobos.', 81, 100)
) as b(slug, label, message, min_score, max_score)
where q.slug = 'diagnostico-enem';

-- Usuário admin (somente ambiente local) -------------------------------------
-- E-mail: admin@quiz.local · Senha: Admin@12345
-- O papel "admin" em app_metadata é o que a API exige nas rotas /admin.
with new_user as (
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
    'admin@quiz.local', extensions.crypt('Admin@12345', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"],"role":"admin"}', '{}', now(), now(),
    '', '', '', ''
  )
  returning id, email
)
insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select id::text, id, jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true), 'email', now(), now(), now()
from new_user;
