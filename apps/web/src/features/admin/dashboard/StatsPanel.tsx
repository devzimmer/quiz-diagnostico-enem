import type { AdminStats } from '@quiz/shared'
import { useQuery } from '@tanstack/react-query'
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'
import { BAND_BAR_COLORS } from '../leads/BandBadge'
import { useAdminApi } from '../useAdminApi'

export function useAdminStats() {
  const api = useAdminApi()
  return useQuery({ queryKey: ['admin', 'stats'], queryFn: () => api<AdminStats>('/admin/stats') })
}

const ddmm = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}`
const card = 'rounded-[14px] border border-painel-borda bg-white'

/** Indicadores do topo da tela de leads. Some em silêncio se a consulta falhar. */
export function StatsPanel() {
  const { data, isPending, isError } = useAdminStats()
  if (isError) return null
  if (isPending) {
    return (
      <div className="grid gap-4 sm:grid-cols-3" role="status" aria-label="Carregando indicadores">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-[100px] rounded-[14px] bg-white" />
        ))}
      </div>
    )
  }

  return (
    <>
      <section aria-label="Indicadores" className="grid gap-4 sm:grid-cols-3">
        <Metric label="Total de leads" value={data.total} />
        <Metric label="Últimos 7 dias" value={data.last7Days} />
        <Metric
          label="Pontuação média"
          value={data.averageScore ?? '—'}
          suffix={data.averageScore === null ? undefined : ' /100'}
        />
      </section>

      <section className="flex flex-wrap gap-4">
        <BandDistribution bands={data.byBand} />
        <DailyChart days={data.byDay} />
      </section>
    </>
  )
}

function Metric({
  label,
  value,
  suffix,
}: {
  label: string
  value: number | string
  suffix?: string
}) {
  return (
    <div className={`${card} p-5`}>
      <p className="text-[13px] font-medium text-painel-sub">{label}</p>
      <p className="mt-2 text-[32px] font-bold tabular-nums tracking-tight">
        {value}
        {suffix && <span className="text-base font-medium text-painel-sub">{suffix}</span>}
      </p>
    </div>
  )
}

function BandDistribution({ bands }: { bands: AdminStats['byBand'] }) {
  const max = Math.max(1, ...bands.map((b) => b.count))
  return (
    <div className={`${card} min-w-0 flex-[1_1_380px] px-[22px] py-5`}>
      <h2 className="text-[15px] font-semibold">Distribuição por faixa</h2>
      <ul className="mt-[18px] flex flex-col gap-3.5">
        {bands.map((band) => (
          <li
            key={band.slug}
            className="grid grid-cols-[130px_minmax(0,1fr)_40px] items-center gap-3 text-[13px]"
          >
            <span className="font-medium">{band.label}</span>
            <span aria-hidden className="block h-2.5 overflow-hidden rounded-full bg-[#EEF1F6]">
              <span
                className="block h-full rounded-full"
                style={{
                  width: `${(band.count / max) * 100}%`,
                  background: BAND_BAR_COLORS[band.slug] ?? '#5A6680',
                }}
              />
            </span>
            <span className="text-right font-semibold tabular-nums">{band.count}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function DailyChart({ days }: { days: AdminStats['byDay'] }) {
  const today = days.at(-1)?.date
  return (
    <div className={`${card} min-w-0 flex-[1.4_1_480px] px-[22px] py-5`}>
      <div className="flex items-baseline justify-between">
        <h2 className="text-[15px] font-semibold">Leads por dia</h2>
        <span className="text-[13px] text-painel-sub">Últimos 14 dias</span>
      </div>
      <div className="mt-4 h-[160px]" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={days}
            margin={{ top: 4, right: 0, bottom: 0, left: 0 }}
            barCategoryGap={3}
          >
            <XAxis
              dataKey="date"
              tickFormatter={(d: string) => (d === today ? 'Hoje' : ddmm(d))}
              interval="preserveStartEnd"
              minTickGap={24}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: '#5A6680' }}
            />
            <YAxis
              allowDecimals={false}
              width={28}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: '#5A6680' }}
            />
            <Tooltip
              cursor={{ fill: '#EEF1F6' }}
              labelFormatter={(d: string) => (d === today ? 'Hoje' : ddmm(d))}
              formatter={(value: number) => [value, 'Leads']}
              contentStyle={{ borderRadius: 10, borderColor: '#E2E7F0', fontSize: 13 }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} isAnimationActive={false}>
              {days.map((d) => (
                <Cell key={d.date} fill={d.date === today ? '#0021E1' : '#8B9CF0'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* mesma informação para leitores de tela */}
      <table className="sr-only">
        <caption>Leads cadastrados por dia nos últimos 14 dias</caption>
        <thead>
          <tr>
            <th scope="col">Dia</th>
            <th scope="col">Leads</th>
          </tr>
        </thead>
        <tbody>
          {days.map((d) => (
            <tr key={d.date}>
              <td>{d.date === today ? 'Hoje' : ddmm(d.date)}</td>
              <td>{d.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
