import { cn } from './cn'

/** A fine line divider with a small diamond — the site's recurring motif. */
export function Ornament({ className, light }: { className?: string; light?: boolean }) {
  const line = light ? 'bg-white/50' : 'bg-champagne/60'
  return (
    <div aria-hidden="true" className={cn('flex items-center justify-center gap-3', className)}>
      <span className={cn('h-px w-12 sm:w-16', line)} />
      <span className={cn('size-1.5 rotate-45 border', light ? 'border-white/80' : 'border-champagne')} />
      <span className={cn('h-px w-12 sm:w-16', line)} />
    </div>
  )
}
