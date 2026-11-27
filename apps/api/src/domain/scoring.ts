export type ScoringQuestion = { id: string; options: { id: string; weight: number }[] }

export type ScoreBand = {
  slug: string
  label: string
  message: string
  minScore: number
  maxScore: number
}

export type ScoreResult = { rawPoints: number; maxPoints: number; score: number }

/**
 * Pontuação normalizada para 0–100:
 * `round(soma dos pesos escolhidos / soma do maior peso de cada pergunta * 100)`.
 * A normalização mantém a escala mesmo que o marketing altere pesos ou o número de perguntas.
 * Espera uma resposta válida por pergunta (a validação de negócio acontece antes).
 */
export function calculateScore(
  questions: ScoringQuestion[],
  selectedOptionByQuestion: Map<string, string>,
): ScoreResult {
  let rawPoints = 0
  let maxPoints = 0
  for (const question of questions) {
    const optionId = selectedOptionByQuestion.get(question.id)
    const option = question.options.find((o) => o.id === optionId)
    if (!option) throw new Error(`Resposta ausente ou inválida para a pergunta ${question.id}`)
    rawPoints += option.weight
    maxPoints += Math.max(0, ...question.options.map((o) => o.weight))
  }
  const score = maxPoints === 0 ? 0 : Math.round((rawPoints / maxPoints) * 100)
  return { rawPoints, maxPoints, score }
}

export function findBand(bands: ScoreBand[], score: number): ScoreBand {
  const band = bands.find((b) => score >= b.minScore && score <= b.maxScore)
  if (!band) throw new Error(`Nenhuma faixa de resultado cobre a nota ${score}`)
  return band
}
