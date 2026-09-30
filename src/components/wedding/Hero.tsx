import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import type { WeddingSettings } from '../../types/wedding'
import { formatWeddingDate, monogram } from '../../utils/formatting'
import { Ornament } from '../ui/Ornament'
import { CoupleNames } from './CoupleNames'
import { isRsvpOpen } from '../../services/settingsService'

export function Hero({ settings }: { settings: WeddingSettings }) {
  const reduce = useReducedMotion()
  const [imageFailed, setImageFailed] = useState(false)
  const hasImage = Boolean(settings.heroImageUrl) && !imageFailed

  const fade = (delay: number) =>
    reduce
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.4 } }
      : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: 1, delay, ease: [0.22, 1, 0.36, 1] as const } }

  return (
    <header className="relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-ink text-ivory">
      {hasImage ? (
        <motion.img
          src={settings.heroImageUrl}
          alt=""
          onError={() => setImageFailed(true)}
          className="absolute inset-0 -z-20 size-full object-cover"
          initial={reduce ? false : { scale: 1.06 }}
          animate={{ scale: 1 }}
          transition={{ duration: 2.4, ease: 'easeOut' }}
          fetchPriority="high"
        />
      ) : (
        <div aria-hidden="true" className="paper-texture absolute inset-0 -z-20 opacity-[0.06]" />
      )}
      {/* Soft, even veil for legibility — no loud gradients */}
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,rgb(20_19_18/0.25),rgb(20_19_18/0.6))]" />

      <nav aria-label="Primary" className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-8">
        <Link to="/" className="font-serif text-2xl italic tracking-wide text-ivory/95" aria-label={`${settings.coupleNames} — home`}>
          {monogram(settings.coupleNames)}
        </Link>
        <div className="flex items-center gap-1 text-[0.72rem] font-medium uppercase tracking-[0.28em] sm:gap-4">
          <button
            type="button"
            onClick={() => scrollToSection('details', reduce)}
            className="hidden rounded px-2 py-2 uppercase tracking-[0.28em] text-ivory/85 transition hover:text-ivory sm:inline-block"
          >
            Details
          </button>
          {isRsvpOpen(settings) && (
            <Link
              to="/rsvp"
              className="rounded-full border border-ivory/50 px-5 py-2.5 text-ivory transition hover:border-ivory hover:bg-ivory/10"
            >
              RSVP
            </Link>
          )}
        </div>
      </nav>

      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-6 pb-24 pt-10 text-center">
        <motion.p {...fade(0.2)} className="text-[0.72rem] font-medium uppercase tracking-[0.42em] text-ivory/80">
          Together with their families
        </motion.p>
        <motion.h1 {...fade(0.4)} className="mt-6 text-[clamp(3.5rem,14vw,8.5rem)] font-light leading-[0.95] tracking-tight">
          <CoupleNames names={settings.heroTitle || settings.coupleNames} ampClassName="text-champagne-light" />
        </motion.h1>
        {settings.heroSubtitle && (
          <motion.p {...fade(0.65)} className="mt-5 font-serif text-2xl italic text-ivory/90 sm:text-3xl">
            {settings.heroSubtitle}
          </motion.p>
        )}
        <motion.div {...fade(0.85)} className="mt-9 flex flex-col items-center gap-4">
          <Ornament light />
          <p className="text-sm font-medium uppercase tracking-[0.36em] text-ivory sm:text-base">
            {formatWeddingDate(settings.weddingDate)}
          </p>
        </motion.div>
      </div>

      <button
        type="button"
        onClick={() => scrollToSection('details', reduce)}
        aria-label="Scroll to wedding details"
        className="absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-1/2 flex -translate-x-1/2 flex-col items-center gap-1 rounded p-2 text-[0.65rem] uppercase tracking-[0.3em] text-ivory/70 transition hover:text-ivory"
      >
        <span>Scroll</span>
        <ChevronDown aria-hidden="true" className="size-4 motion-safe:animate-bounce" strokeWidth={1.5} />
      </button>
    </header>
  )
}

/**
 * In-page scrolling. Plain "#details" links don't work with hash routing
 * (the router would treat "details" as a page), so scroll programmatically.
 */
function scrollToSection(id: string, reduceMotion: boolean | null) {
  const el = document.getElementById(id)
  if (!el) return
  el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
  // Move focus for keyboard and screen-reader users without jumping again.
  el.setAttribute('tabindex', '-1')
  el.focus({ preventScroll: true })
}
