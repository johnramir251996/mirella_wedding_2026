import { Share2 } from 'lucide-react'
import { useToast } from '../../hooks/useToast'
import { shareOrCopy, siteLinks } from '../../utils/share'

/** Small "Share our website" link for the public footer. */
export function ShareLink({ coupleNames }: { coupleNames: string }) {
  const toast = useToast()
  const onShare = async () => {
    const r = await shareOrCopy(siteLinks().home, coupleNames)
    if (r === 'copied') toast.show('Link copied. Paste it anywhere to share.')
  }
  return (
    <button
      type="button"
      onClick={() => void onShare()}
      className="mx-auto mt-8 inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-xs uppercase tracking-[0.24em] text-muted transition hover:bg-cream hover:text-ink"
    >
      <Share2 aria-hidden="true" className="size-4" strokeWidth={1.5} />
      Share our website
    </button>
  )
}
