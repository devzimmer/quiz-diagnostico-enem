/** Escapa `\`, `%` e `_` para que o termo seja literal num LIKE/ILIKE (escape padrão: `\`). */
export const escapeLike = (term: string): string => term.replace(/[\\%_]/g, (ch) => `\\${ch}`)
