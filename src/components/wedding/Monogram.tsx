import { useWeddingSettings } from '../../hooks/useWeddingSettings'
import { monogram } from '../../utils/formatting'

/** The couple's initials from Website Settings (a small ornament while loading). */
export function Monogram({ className }: { className?: string }) {
  const { settings } = useWeddingSettings()
  const text = settings ? monogram(settings.coupleNames) : ''
  return (
    <span aria-hidden="true" className={className}>
      {text || '♡'}
    </span>
  )
}
