# Quiz de Diagnóstico ENEM — Design

Data: 2026-11-27 · Prazo de entrega: 2026-11-30 (3 dias corridos) · Esforço-alvo: 6–8 h

## 1. Intenção

Teste técnico para vaga de Dev Fullstack em uma empresa de pré-vestibular. O produto é o funil de aquisição deles: um quiz público de diagnóstico ENEM que captura leads, mais uma área interna onde o time comercial acompanha esses leads.

O que o avaliador pesa (do enunciado): funcionamento ponta a ponta (25%), qualidade de código (25%), modelagem de dados e design da API (20%), interface com estados de erro/carregamento (15%), documentação e clareza das decisões no README (15%). Depois da entrega há uma conversa de 45 min defendendo as decisões.

Sucesso = o fluxo completo funciona sem quebrar, o código e a modelagem se explicam sozinhos, e o README justifica cada decisão. Escopo menor bem feito vale mais que escopo completo mal resolvido.

## 2. Objetivos, não-objetivos, anti-objetivos

**Objetivos (obrigatórios do enunciado)**
- Quiz público: tela inicial, 10 perguntas uma por vez, progresso "Pergunta N de 10", voltar e alterar resposta.
- Perguntas e alternativas vêm do backend (marketing altera sem redeploy do front).
- Formulário de captura (nome, e-mail, telefone) depois da última pergunta e antes do resultado, validado no front e no back.
- Pontuação 0–100 calculada **no backend**; resultado com faixa, mensagem e resumo das respostas.
- Admin com login e senha (usuário via seed), listagem de leads, busca por nome/e-mail, filtro por faixa, detalhe com todas as respostas.
- **Editor de perguntas no admin** (decisão do dono do projeto; vai além do enunciado, que só exige conteúdo vindo do backend): o marketing cria, edita, reordena e desativa perguntas e alternativas com pesos, sem tocar no banco. As regras de versionamento (seção 7) são garantidas pela API.
- Banco relacional real, API separada do front com status HTTP coerentes, validação no servidor, rotas admin protegidas no backend.
- README: como rodar, variáveis de ambiente, credenciais do admin, decisões técnicas e o que faria com mais tempo.
- Seed/migration com perguntas e admin. Testes nos pontos críticos (pontuação e validação do lead).
- Commits incrementais e descritivos; trabalho entregue via PRs.

**Diferenciais (só se sobrar tempo, nesta ordem)**
1. Responsividade mobile bem resolvida — tratada como obrigatória, não diferencial (tráfego é majoritariamente mobile).
2. Visual caprichado (já desenhado no canvas).
3. Proteção contra abuso: rate limit no envio + deduplicação por e-mail.
4. Dashboard no admin: total, distribuição por faixa, leads por dia.
5. Exportação CSV.
6. Deploy público.

**Não-objetivos**
- Rascunho/publicação de conteúdo (alterações no editor entram no ar na hora), edição das faixas de resultado e do texto da tela inicial pela UI.
- Papéis distintos para marketing e comercial (um único papel `admin`).
- Cadastro/gestão de usuários admin, recuperação de senha.
- Múltiplos quizzes simultâneos na UI, i18n, analytics/tracking.

**Anti-objetivos (falha mesmo que "funcione")**
- Pesos das alternativas expostos ao cliente ou pontuação aceita do cliente.
- Endpoint admin acessível sem token válido de admin.
- Histórico de respostas de um lead mudando quando o marketing edita uma pergunta, ou resposta apontando para pergunta que deixou de existir.
- Fluxo quebrado ou desconfortável no celular.
- Over-engineering que estoure o tempo e deixe o fluxo principal incompleto.

## 3. Restrições

- Stack definida com o dono do projeto (seção 5). Front espelha a stack do dia a dia da empresa.
- Ambiente de dev: Windows 11, Node 24, pnpm 11. Supabase roda local via CLI + Docker Desktop (o dono do projeto vai instalar o Docker), que é o mesmo caminho que o avaliador segue pelo README.
- O avaliador precisa conseguir rodar localmente seguindo o README.
- Conteúdo do quiz: usar exatamente o anexo do enunciado (10 perguntas, pesos 0–10).

## 4. Abordagens consideradas

**Acesso ao banco a partir do Worker**
- (A) **Drizzle ORM + postgres.js via Hyperdrive** — escolhida. Schema tipado em TS, transações reais (lead + respostas atômicos), migrations geradas, SQL legível.
- (B) supabase-js com service role — mais simples, mas passa pelo PostgREST e transação exige função no Postgres. Descartada.
- (C) Front falando direto com o Supabase (PostgREST + RLS) — viola "API separada" e "pontuação no backend". Descartada.

**Autenticação do admin**
- (A) **Supabase Auth** — escolhida. Login no front via supabase-js; o Worker valida o JWT em toda rota admin. Nenhum código de senha escrito à mão.
- (B) Auth próprio no Worker (hash + JWT em cookie) — mais código sensível no prazo. Descartada.

**Hospedagem**
- Front no Cloudflare Pages, API no Cloudflare Workers, Postgres + Auth no Supabase. Decidido pelo dono do projeto.

## 5. Stack

| Camada | Escolha |
|---|---|
| Monorepo | pnpm workspaces: `apps/web`, `apps/api`, `packages/shared` |
| Front | React 18, TypeScript 5, Vite 5, Tailwind 3, shadcn/ui, React Router 6, TanStack Query 5, React Hook Form 7 + Zod 3, Framer Motion 11, Sonner, Recharts 2 |
| API | Hono em Cloudflare Workers, validação Zod, `jose` para JWT |
| Banco | Postgres (Supabase), Drizzle ORM + postgres.js, Hyperdrive em produção |
| Auth | Supabase Auth (e-mail + senha), cadastro público desabilitado |
| Testes | Vitest |
| Ferramentas | Supabase CLI e Wrangler como devDependencies (via `pnpm exec`) |

Versões: as majors da tabela da empresa (React 18, Vite 5, Tailwind 3, Zod 3…). Não atualizar para majors mais novas.

## 6. Arquitetura

```
apps/web  (Pages)  ──HTTP/JSON──▶  apps/api (Worker / Hono)  ──SQL──▶  Postgres (Supabase)
     │                                   │
     └── supabase-js (só login) ──▶ Supabase Auth ◀── verificação do JWT (JWKS/segredo)
packages/shared: schemas Zod de entrada (lead, envio), tipos de resposta da API
```

**API em camadas:** `routes` (HTTP, validação, status) → `services` (regras: pontuação, faixa, envio) → `repositories` (Drizzle). Repositórios entram por injeção (fábrica no contexto do Hono) para que as rotas sejam testáveis com repositório fake.

**Front por feature:** `features/quiz`, `features/admin`, `lib/api` (cliente fetch tipado com erros normalizados), `components/ui` (shadcn). Estado do quiz em `useReducer` persistido em `sessionStorage` (refresh no meio do quiz não perde respostas).

**Validação compartilhada:** os schemas Zod de entrada vivem em `packages/shared` e são usados pelo React Hook Form (front) e pelo validador do Hono (back). Uma fonte de regras, aplicada dos dois lados.

## 7. Modelo de dados

```
quizzes         id uuid PK, slug text UNIQUE, title text, is_active bool, created_at
questions       id uuid PK, quiz_id FK→quizzes, position int, text text,
                is_active bool, previous_version_id FK→questions NULL,
                created_at, updated_at
                UNIQUE (quiz_id, position) WHERE is_active   -- índice parcial
options         id uuid PK, question_id FK→questions, position int, text text,
                weight int CHECK (weight BETWEEN 0 AND 100)
                UNIQUE (question_id, position)
result_bands    id uuid PK, quiz_id FK→quizzes, slug text, label text, message text,
                min_score int, max_score int, CHECK (min_score <= max_score)
leads           id uuid PK, name text, email citext UNIQUE, phone text (só dígitos),
                created_at, updated_at
submissions     id uuid PK, lead_id FK→leads, quiz_id FK→quizzes,
                score int CHECK (0..100), raw_points int, max_points int,
                band_slug text, band_label text, band_message text,   -- snapshot
                created_at
submission_answers  id uuid PK, submission_id FK→submissions ON DELETE CASCADE,
                question_id FK, option_id FK,
                question_position int, question_text text, option_text text,
                weight int                                              -- snapshot
                UNIQUE (submission_id, question_id)
```

Decisões de modelagem:
- **Lead ≠ envio.** O lead é a pessoa (e-mail único); cada vez que ela responde o quiz é um `submission`. Isso resolve deduplicação por e-mail sem perder histórico.
- **E-mail repetido (decidido):** o lead é atualizado (nome e telefone) e ganha um novo envio; o admin sempre mostra o envio mais recente. Antes de gravar, a pessoa é avisada de que já respondeu e que o resultado anterior será substituído se prosseguir (fluxo na seção 9). O banco guarda o histórico; para a pessoa e para o comercial vale o último.
- **Versionamento de perguntas (regra central do editor):**
  - Pergunta **sem respostas**: editar altera a própria linha (texto, alternativas, pesos).
  - Pergunta **com respostas**: editar cria uma pergunta nova (com alternativas novas) na mesma posição, com `previous_version_id` apontando para a antiga, e desativa a antiga (`is_active = false`). As respostas antigas continuam ligadas à versão que o lead viu.
  - **Excluir** nunca apaga: desativa (`is_active = false`). Não é permitido desativar a última pergunta ativa.
  - Reordenar só muda `position` das perguntas ativas; não gera versão.
  - Toda a operação roda em transação. As FKs de `submission_answers` para perguntas e alternativas são `ON DELETE RESTRICT`: o próprio banco recusa apagar conteúdo já respondido, mesmo fora da API.
  - O quiz público mostra só perguntas ativas, por `position`; o total de perguntas pode variar e o progresso usa esse total.
- **Snapshot nas respostas e na faixa.** Texto da pergunta, da alternativa, peso e faixa são copiados no momento do envio. Com o versionamento isso é redundante para edições feitas pela API, mas deixa a leitura do detalhe do lead sem joins e protege contra edição direta no banco.
- **Faixas no banco**, não no código: rótulos e mensagens também são conteúdo de marketing.
- **Telefone normalizado** para dígitos (`11987654321`); formatação é responsabilidade da UI.
- Índices: `leads(created_at desc)`, `submissions(lead_id, created_at desc)`, busca com `ILIKE` em nome/e-mail (volume de teste não pede trigram).

## 8. Regra de pontuação

```
raw_points = soma dos pesos das alternativas escolhidas
max_points = soma do maior peso de cada pergunta do quiz
score      = round(raw_points / max_points * 100)
faixa      = result_band onde min_score <= score <= max_score
```

Com o conteúdo atual, `max_points = 100`, então `score = raw_points`. A normalização garante 0–100 mesmo se o marketing mudar pesos (o anexo diz "0 a 12" mas o máximo real é 10). As faixas do enunciado: 0–30 Ponto de partida, 31–55 Em construção, 56–80 Bom caminho, 81–100 Reta final.

Função pura no `services` da API, coberta por testes unitários (limites de faixa: 0, 30, 31, 55, 56, 80, 81, 100; normalização com pesos alterados).

## 9. API (REST, prefixo `/api/v1`)

Formato de erro único: `{ "error": { "code": string, "message": string, "details"?: object } }`.

| Método e rota | Auth | Sucesso | Erros |
|---|---|---|---|
| `GET /quiz` | — | 200 quiz ativo: `{id, title, questions:[{id, position, text, options:[{id, position, text}]}]}` **sem pesos** | 404 sem quiz ativo |
| `POST /submissions` | — | 201 `{submissionId, score, band:{slug,label,message}, answers:[{position, question, option}]}` | 400 JSON malformado; 409 `LEAD_ALREADY_SUBMITTED` (e-mail já tem envio e `confirmReplace` não veio `true`); 422 validação (campos do lead, pergunta sem resposta, resposta duplicada, alternativa que não pertence à pergunta ou ao quiz ativo); 429 rate limit (diferencial) |
| `GET /admin/leads?search=&band=&page=&pageSize=` | admin | 200 `{data:[{id,name,email,phone,score,band,createdAt}], pagination:{page,pageSize,total}}` | 401, 403, 422 parâmetros inválidos |
| `GET /admin/leads/:id` | admin | 200 lead + último envio com as respostas | 401, 403, 404 |
| `GET /admin/quiz` | admin | 200 quiz ativo com perguntas ativas, alternativas **com pesos**, `answerCount` por pergunta e `maxPoints` atual | 401, 403 |
| `POST /admin/quiz/questions` | admin | 201 pergunta criada no fim da lista | 401, 403, 422 |
| `PUT /admin/quiz/questions/:id` | admin | 200 `{question, versioned}` — `versioned: true` quando a regra criou uma nova versão (novo `id`) | 401, 403, 404, 409 se a pergunta já está inativa, 422 |
| `DELETE /admin/quiz/questions/:id` | admin | 204 (desativa) | 401, 403, 404, 422 se for a última ativa |
| `PUT /admin/quiz/question-order` | admin | 200 com `{questionIds: [...]}` na nova ordem (deve conter exatamente as perguntas ativas) | 401, 403, 422 |
| `GET /admin/stats` (diferencial) | admin | 200 `{total, last7Days, averageScore, byBand:[…], byDay:[…14 dias]}` | 401, 403 |
| `GET /admin/leads/export.csv` (diferencial) | admin | 200 `text/csv` respeitando filtros | 401, 403 |
| `GET /health` | — | 200 | — |

- Corpo do `POST /submissions`: `{ lead: {name, email, phone}, answers: [{questionId, optionId}], confirmReplace?: boolean }`. Exige exatamente uma resposta por pergunta do quiz ativo.
- **Fluxo de e-mail repetido:** o primeiro envio vai sem `confirmReplace`. Se o e-mail já tem envio, a API responde 409 sem gravar nada; o front abre um diálogo ("Você já fez este diagnóstico. Se continuar, seu resultado anterior será substituído por este.") com "Continuar" e "Cancelar". Em "Continuar", reenvia com `confirmReplace: true` → 201. A verificação acontece só no envio completo (não existe endpoint de "e-mail existe?"), para não facilitar enumeração de e-mails; o 409 não revela dados do envio anterior.
- Se a validação falhar porque o quiz mudou durante o preenchimento (pergunta/alternativa não pertence ao quiz ativo), o front avisa e reinicia o quiz.
- Lead + envio + respostas gravados numa **única transação**.
- Validação do conteúdo da pergunta (schema compartilhado): texto 5–300 caracteres; 2 a 6 alternativas; texto da alternativa 1–200; peso inteiro 0–100.
- `pageSize` máximo 100; ordenação padrão `createdAt desc`.
- CORS: allowlist via env (`ALLOWED_ORIGINS`). Em dev, o Vite faz proxy de `/api` para o Wrangler e evita CORS.

**Autorização admin:** middleware lê `Authorization: Bearer <jwt>`, verifica assinatura e expiração do token do Supabase Auth, e exige `app_metadata.role = "admin"` (definido no seed). Sem token/inválido → 401; autenticado sem papel → 403. Cadastro público desabilitado no Supabase.

## 10. Validação do lead (schema compartilhado)

- **Nome:** trim, mínimo 3 caracteres, máximo 100.
- **E-mail:** trim, minúsculas, formato válido (Zod), máximo 254.
- **Telefone:** remove não-dígitos; 10 ou 11 dígitos; DDD válido (11–99, sem zero); se 11 dígitos, o terceiro é `9` (celular). Mensagem: "Informe DDD + número. Ex.: (11) 98765-4321".

Front: máscara no input, validação ao sair do campo e no envio. Back: mesmo schema; resposta 422 com erros por campo, que o front mapeia de volta para os inputs.

## 11. Front — telas e fluxo

Referência visual (aprovada pelo dono do projeto): canvas "Quiz ENEM — Telas", 10 artboards. Link: https://claude.ai/artifact/1KNjfJrvqLMXhPDbmTBz2R (privado). O HTML de cada tela está versionado em `design/canvas/*.dc.html` e é a fonte de layout, componentes e comportamento mobile. Tokens e tipografia em `design/brand-reference.md`.

A tela `/admin` do canvas inclui indicadores e gráficos: eles pertencem ao diferencial "Dashboard". A primeira entrega da tela é cabeçalho + busca + filtro + tabela + paginação; indicadores e gráficos entram na fase do dashboard, no topo da mesma tela. Da mesma forma, "Exportar CSV" só aparece quando o diferencial for feito.

| Rota | Tela |
|---|---|
| `/` | Início do quiz |
| `/quiz` | Perguntas (passo controlado pelo estado; botão voltar e "Próxima") |
| `/quiz/contato` | Captura do lead |
| `/quiz/resultado` | Resultado (lê o retorno do POST guardado em estado/sessionStorage; sem dados → volta ao início) |
| `/admin/login` | Login |
| `/admin` | Leads: indicadores, gráficos, busca, filtro, tabela, paginação |
| `/admin/leads/:id` | Drawer de detalhe sobre a lista (rota aninhada, URL compartilhável) |
| `/admin/perguntas` | Editor: lista de perguntas ativas com alternativas e pesos, contagem de respostas, subir/descer, editar, desativar, nova pergunta, pontuação máxima atual |
| `/admin/perguntas/:id` e `/admin/perguntas/nova` | Drawer de edição: texto, alternativas (texto + peso), adicionar/remover alternativa; se a pergunta tem respostas, aviso de que salvar cria nova versão e confirmação antes de salvar |

- Quiz segue a linguagem da LP (Anton/Rubik/Kalam, papel quadriculado, amarelo marca-texto, CTA verde pílula). Admin segue o institucional (Inter, azul `#0021E1`).
- Estados obrigatórios: carregando perguntas (skeleton), falha ao carregar (tentar de novo), enviando (botão com spinner, campos desabilitados), falha no envio (toast, dados preservados), erro de validação por campo, diálogo de e-mail já usado (409), login inválido, lista vazia/sem resultado de busca, erro ao carregar lista.
- Busca com debounce (~300 ms); filtros e página refletidos na query string.
- Animação leve de transição entre perguntas (Framer Motion), respeitando `prefers-reduced-motion`.
- Logo oficial em `design/assets/logo-plataforma-assaad.svg` (cor via `currentColor`).

## 12. Testes

- **Unitários (Vitest):** cálculo de pontuação e faixa; schema do lead (casos válidos e inválidos de nome, e-mail, telefone/DDD).
- **Versionamento:** editar pergunta sem respostas altera no lugar; com respostas cria versão nova e desativa a antiga; não deixa desativar a última ativa; reordenação rejeita lista que não bate com as ativas.
- **Rotas da API:** `POST /submissions` (201, 409, 422 por motivo) e proteção admin (401/403/200) via `app.request` do Hono com repositório fake e verificação de JWT substituível.
- Front: sem testes automatizados, salvo tempo sobrando.

## 13. Dados iniciais

- Migration cria o schema. Seed insere o quiz do anexo (10 perguntas, alternativas e pesos), as 4 faixas e o usuário admin com `app_metadata.role = "admin"`.
- Credenciais do admin documentadas no README (só para ambiente local/avaliação).
- Um comando reconstrói o banco local do zero (migrations + seed).

## 14. Processo de entrega

- Repositório público `devzimmer/quiz-diagnostico-enem`; `main` sempre funcional.
- Cada fase em branch própria (`feat/...`), PR com descrição do que foi feito, por quê e como testar; merge preservando os commits (merge commit, não squash) para o avaliador ver o processo.
- Commits pequenos no padrão Conventional Commits.
- O documento do enunciado e a foto de referência da LP não vão para o repositório.

## 15. Fica a cargo do builder

- Estrutura interna de pastas dentro de cada app e nomes de arquivos.
- Como a migration chega ao Supabase (drizzle-kit gerando SQL na pasta de migrations do Supabase, ou equivalente), desde que exista um comando único de reset + seed.
- Verificação do JWT por JWKS (chaves assimétricas) ou segredo HS256, conforme o que o Supabase do ambiente usar — com fallback documentado.
- Fontes via `@fontsource` ou Google Fonts.
- Componentes shadcn específicos e detalhes de animação.
- Ordem exata dos diferenciais depois do item 3, conforme o tempo.

- Unicidade de quiz ativo e não sobreposição das faixas.
- Como trocar posições sem violar o índice único parcial durante a reordenação (ex.: posições temporárias negativas na mesma transação).
- Implementação do rate limit no Worker.

## 16. Decisões do dono do projeto

1. Repositório público `quiz-diagnostico-enem` na conta `devzimmer`.
2. Docker Desktop instalado localmente; Supabase local via CLI.
3. E-mail repetido: atualiza o lead e registra novo envio, com aviso prévio de substituição (seção 9).
4. Editor de perguntas no admin é obrigatório, não diferencial (seções 2, 7, 9 e 11). Reordenação por botões subir/descer (acessível e funciona no celular), não arrastar.
