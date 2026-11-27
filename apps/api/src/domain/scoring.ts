export type ScoringQuestion = { id: string; options: { id: string; weight: number }[] }

export type ScoreBand = {
  slug: string
  label: string
  message: string
  minScore: number
  maxScore: number
}
