import { Download, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/lib/api-client'
import { useAdminApi } from '../useAdminApi'

/** Baixa o CSV com os mesmos filtros da lista (o download precisa do token, por isso via fetch). */
export function ExportCsvButton({ search, band }: { search: string; band: string | null }) {
  const api = useAdminApi()
  const [pending, setPending] = useState(false)

  const download = async () => {
    setPending(true)
    try {
      const query = new URLSearchParams()
      if (search.trim()) query.set('search', search.trim())
      if (band) query.set('band', band)
      const blob = await api<Blob>(`/admin/leads/export.csv?${query}`, { as: 'blob' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `leads-${new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })}.csv`
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (error) {
      // 401/403 já são tratados pelo useAdminApi
      if (!(error instanceof ApiError && (error.status === 401 || error.status === 403))) {
        toast.error('Não foi possível exportar. Tente de novo.')
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <Button variant="secondary" onClick={() => void download()} disabled={pending}>
      {pending ? <Loader2 aria-hidden className="animate-spin" /> : <Download aria-hidden />}
      {pending ? 'Exportando…' : 'Exportar CSV'}
    </Button>
  )
}
