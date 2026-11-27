import { cn } from '@/lib/utils'

export const Skeleton = ({ className }: { className?: string }) => (
  <span aria-hidden className={cn('block animate-pulse rounded-lg bg-[#E6EEF9]', className)} />
)
