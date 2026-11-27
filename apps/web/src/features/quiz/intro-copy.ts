/** Textos da tela inicial que dependem de quantas perguntas o quiz tem agora. */
export function introCopy(count: number | undefined): { lead: string; item: string } {
  if (!count) {
    return { lead: 'Responda algumas perguntas rápidas', item: 'Perguntas de múltipla escolha' }
  }
  const noun = count === 1 ? 'pergunta' : 'perguntas'
  return {
    lead: `Responda ${count} ${noun} ${count === 1 ? 'rápida' : 'rápidas'}`,
    item: `${count} ${noun} de múltipla escolha`,
  }
}
