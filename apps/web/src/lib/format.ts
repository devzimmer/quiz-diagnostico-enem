const TIME_ZONE = 'America/Sao_Paulo'

/** Máscara progressiva de telefone: `(11) 98765-4321` (celular) ou `(11) 3456-7890` (fixo). */
export function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 11)
  if (!digits) return ''
  if (digits.length <= 2) return `(${digits}`
  const ddd = digits.slice(0, 2)
  const rest = digits.slice(2)
  if (rest.length <= 4) return `(${ddd}) ${rest}`
  const splitAt = digits.length === 11 ? 5 : 4
  return `(${ddd}) ${rest.slice(0, splitAt)}-${rest.slice(splitAt)}`
}

const dateTime = new Intl.DateTimeFormat('pt-BR', {
  timeZone: TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const dateOnly = new Intl.DateTimeFormat('pt-BR', {
  timeZone: TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

/** `27/11/2026 14:32` no fuso de São Paulo. */
export const formatDateTime = (iso: string) => dateTime.format(new Date(iso)).replace(', ', ' ')

/** `27/11/2026` no fuso de São Paulo. */
export const formatDate = (iso: string) => dateOnly.format(new Date(iso))
