import { useResolvedTheme } from '../../theme/themeContext'
import { cn } from './cn'

/**
 * The site's recurring divider. Each design style has its own:
 * classic — fine lines and a small diamond; maison — long hairlines and a dot;
 * deco — a gold fan with stepped lines; heritage — a woven diamond chain.
 */
export function Ornament({ className, light }: { className?: string; light?: boolean }) {
  const { style } = useResolvedTheme()
  const tone = light ? 'text-white/80' : 'text-champagne'

  if (style === 'maison') {
    const line = light ? 'bg-white/45' : 'bg-champagne/55'
    return (
      <div aria-hidden="true" className={cn('flex items-center justify-center gap-4', className)}>
        <span className={cn('h-px w-20 sm:w-28', line)} />
        <span className={cn('size-1 rounded-full', light ? 'bg-white/80' : 'bg-champagne')} />
        <span className={cn('h-px w-20 sm:w-28', line)} />
      </div>
    )
  }

  if (style === 'deco') {
    return (
      <div aria-hidden="true" className={cn('flex justify-center', tone, className)}>
        <svg width="168" height="22" viewBox="0 0 168 22" fill="none" stroke="currentColor" strokeWidth="1">
          <path d="M2 15h46l6-6h8M166 15h-46l-6-6h-8" />
          <path d="M10 19h40M158 19h-40" opacity="0.6" />
          {/* fan */}
          <path d="M70 19a14 14 0 0 1 28 0Z" />
          <path d="M84 19 72.5 10.5M84 19l-6-12.2M84 19V5.2M84 19l6-12.2M84 19l11.5-8.5" opacity="0.85" />
          <path d="M76 19a8 8 0 0 1 16 0" opacity="0.7" />
          <circle cx="84" cy="2.5" r="1.5" fill="currentColor" stroke="none" />
        </svg>
      </div>
    )
  }

  if (style === 'heritage') {
    // A short woven chain: diamonds alternating filled and outlined, like banig and inabel borders.
    const d = (x: number, filled: boolean) => (
      <path key={x} d={`M${x} 3l6 6-6 6-6-6Z`} fill={filled ? 'currentColor' : 'none'} opacity={filled ? 0.85 : 1} />
    )
    return (
      <div aria-hidden="true" className={cn('flex justify-center', tone, className)}>
        <svg width="150" height="18" viewBox="0 0 150 18" fill="none" stroke="currentColor" strokeWidth="1">
          <path d="M2 9h40M108 9h40" opacity="0.6" />
          {[51, 63, 75, 87, 99].map((x, i) => d(x, i % 2 === 0))}
        </svg>
      </div>
    )
  }

  const line = light ? 'bg-white/50' : 'bg-champagne/60'
  return (
    <div aria-hidden="true" className={cn('flex items-center justify-center gap-3', className)}>
      <span className={cn('h-px w-12 sm:w-16', line)} />
      <span className={cn('size-1.5 rotate-45 border', light ? 'border-white/80' : 'border-champagne')} />
      <span className={cn('h-px w-12 sm:w-16', line)} />
    </div>
  )
}
