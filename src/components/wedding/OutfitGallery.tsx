import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import type { OutfitGender, OutfitImage } from '../../types/wedding'
import { cn } from '../ui/cn'
import { Ornament } from '../ui/Ornament'
import { Reveal } from './Reveal'

interface Props {
  title: string
  subtitle: string
  images: OutfitImage[]
}

const TABS: { value: OutfitGender; label: string }[] = [
  { value: 'male', label: 'For Him' },
  { value: 'female', label: 'For Her' },
]

/** "Attire inspiration" — admin-managed outfit images in a swipeable carousel. */
export function OutfitGallery({ title, subtitle, images }: Props) {
  const reduce = useReducedMotion()
  const groups = useMemo(
    () => ({
      male: images.filter((i) => i.gender === 'male'),
      female: images.filter((i) => i.gender === 'female'),
    }),
    [images],
  )
  const available = TABS.filter((t) => groups[t.value].length > 0)
  const [tab, setTab] = useState<OutfitGender>(available[0]?.value ?? 'male')
  const [lightbox, setLightbox] = useState<OutfitImage | null>(null)
  const active = groups[tab].length ? tab : (available[0]?.value ?? 'male')

  if (!available.length) return null

  return (
    <section aria-labelledby="outfits-heading" className="overflow-hidden bg-cream/60 px-5 py-24 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <Reveal className="text-center">
          <p className="eyebrow">Dress Code</p>
          <h2 id="outfits-heading" className="mt-4 text-4xl text-ink sm:text-5xl">
            {title}
          </h2>
          {subtitle && <p className="mx-auto mt-4 max-w-lg text-ink-soft">{subtitle}</p>}
          <Ornament className="mt-8" />
        </Reveal>

        {available.length > 1 && (
          <div role="tablist" aria-label="Outfit ideas" className="mx-auto mt-10 flex w-fit rounded-full border border-line bg-paper p-1 shadow-soft">
            {available.map((t) => {
              const selected = t.value === active
              return (
                <button
                  key={t.value}
                  type="button"
                  role="tab"
                  id={`outfit-tab-${t.value}`}
                  aria-selected={selected}
                  aria-controls="outfit-panel"
                  onClick={() => setTab(t.value)}
                  className={cn(
                    'relative min-h-11 rounded-full px-6 text-[0.72rem] font-medium uppercase tracking-[0.28em] transition-colors sm:px-8',
                    selected ? 'text-ivory' : 'text-ink-soft hover:text-ink',
                  )}
                >
                  {selected && (
                    <motion.span
                      layoutId={reduce ? undefined : 'outfit-tab-pill'}
                      className="absolute inset-0 rounded-full bg-ink"
                      transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                    />
                  )}
                  <span className="relative">{t.label}</span>
                </button>
              )
            })}
          </div>
        )}

        <div id="outfit-panel" role="tabpanel" aria-labelledby={`outfit-tab-${active}`} className="mt-10">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={active}
              initial={{ opacity: 0, y: reduce ? 0 : 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              <Carousel images={groups[active]} onOpen={setLightbox} label={TABS.find((t) => t.value === active)?.label ?? ''} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <Lightbox image={lightbox} onClose={() => setLightbox(null)} />
    </section>
  )
}

function Carousel({ images, onOpen, label }: { images: OutfitImage[]; onOpen: (i: OutfitImage) => void; label: string }) {
  const trackRef = useRef<HTMLUListElement>(null)
  const [index, setIndex] = useState(0)
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(images.length > 1)

  const update = useCallback(() => {
    const el = trackRef.current
    if (!el) return
    const first = el.firstElementChild as HTMLElement | null
    const step = first ? first.offsetWidth + parseFloat(getComputedStyle(el).columnGap || '0') : el.clientWidth
    setIndex(Math.min(images.length - 1, Math.max(0, Math.round(el.scrollLeft / Math.max(step, 1)))))
    setCanPrev(el.scrollLeft > 4)
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }, [images.length])

  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    update()
    el.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      el.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [update])

  const scrollToIndex = (i: number) => {
    const item = trackRef.current?.children[i] as HTMLElement | undefined
    item?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }

  const go = (dir: -1 | 1) => {
    const el = trackRef.current
    if (!el) return
    el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: 'smooth' })
  }

  return (
    <div className="relative">
      <ul
        ref={trackRef}
        aria-label={`${label} outfit ideas`}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') {
            e.preventDefault()
            go(1)
          } else if (e.key === 'ArrowLeft') {
            e.preventDefault()
            go(-1)
          }
        }}
        className="no-scrollbar -mx-5 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth px-5 pb-2 sm:mx-0 sm:px-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
      >
        {images.map((img, i) => (
          <li
            key={img.id}
            className="w-[78%] shrink-0 snap-center sm:w-[calc((100%-1.25rem)/2)] sm:snap-start lg:w-[calc((100%-2.5rem)/3)]"
            aria-label={`${i + 1} of ${images.length}${img.caption ? `: ${img.caption}` : ''}`}
          >
            <figure>
              <button
                type="button"
                onClick={() => onOpen(img)}
                className="group fine-frame block w-full overflow-hidden rounded-sm bg-paper shadow-card"
                aria-label={`View larger${img.caption ? `: ${img.caption}` : ''}`}
              >
                <img
                  src={img.imageUrl}
                  alt={img.caption || `${label} outfit idea ${i + 1}`}
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                  className="aspect-[3/4] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                />
              </button>
              {img.caption && <figcaption className="mt-4 text-center font-serif text-xl text-ink">{img.caption}</figcaption>}
            </figure>
          </li>
        ))}
      </ul>

      {images.length > 1 && (
        <>
          <ArrowButton side="left" disabled={!canPrev} onClick={() => go(-1)} />
          <ArrowButton side="right" disabled={!canNext} onClick={() => go(1)} />
          <div className="mt-6 flex justify-center gap-2" aria-hidden="true">
            {images.map((img, i) => (
              <button
                key={img.id}
                type="button"
                tabIndex={-1}
                onClick={() => scrollToIndex(i)}
                className={cn('h-1.5 rounded-full transition-all duration-300', i === index ? 'w-6 bg-gold' : 'w-1.5 bg-champagne/40 hover:bg-champagne')}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function ArrowButton({ side, disabled, onClick }: { side: 'left' | 'right'; disabled: boolean; onClick: () => void }) {
  const Icon = side === 'left' ? ChevronLeft : ChevronRight
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={side === 'left' ? 'Previous outfits' : 'Next outfits'}
      className={cn(
        'absolute top-[calc(50%-1.5rem)] hidden size-12 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-paper/95 text-ink shadow-card backdrop-blur transition hover:border-champagne disabled:pointer-events-none disabled:opacity-0 sm:flex',
        side === 'left' ? '-left-3 lg:-left-6' : '-right-3 lg:-right-6',
      )}
    >
      <Icon className="size-5" strokeWidth={1.5} />
    </button>
  )
}

function Lightbox({ image, onClose }: { image: OutfitImage | null; onClose: () => void }) {
  const reduce = useReducedMotion()
  useEffect(() => {
    if (!image) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [image, onClose])

  return (
    <AnimatePresence>
      {image && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={image.caption || 'Outfit idea'}
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.figure
            className="relative max-h-full w-full max-w-md"
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <img src={image.imageUrl} alt={image.caption || 'Outfit idea'} className="max-h-[80dvh] w-full rounded-sm bg-paper object-contain shadow-lift" />
            {image.caption && <figcaption className="mt-4 text-center font-serif text-2xl text-ivory">{image.caption}</figcaption>}
            <button
              type="button"
              onClick={onClose}
              autoFocus
              aria-label="Close"
              className="absolute -top-3 -right-3 flex size-11 items-center justify-center rounded-full bg-paper text-ink shadow-card"
            >
              <X className="size-5" />
            </button>
          </motion.figure>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
