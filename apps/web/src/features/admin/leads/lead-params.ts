/** Estado da lista de leads, guardado na URL (`?q=&faixa=&page=`) para ser compartilhável. */
export type LeadParams = { search: string; band: string | null; page: number }

export const LEADS_PAGE_SIZE = 20

export function readLeadParams(params: URLSearchParams): LeadParams {
  const page = Number(params.get('page'))
  return {
    search: params.get('q') ?? '',
    band: params.get('faixa') || null,
    page: Number.isInteger(page) && page > 0 ? page : 1,
  }
}

export function leadsApiPath({ search, band, page }: LeadParams, pageSize: number): string {
  const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
  if (search.trim()) query.set('search', search.trim())
  if (band) query.set('band', band)
  return `/admin/leads?${query}`
}
