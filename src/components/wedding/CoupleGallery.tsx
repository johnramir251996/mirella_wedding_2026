import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import type { GalleryImage } from '../../types/wedding'
import { Ornament } from '../ui/Ornament'
import { cn } from '../ui/cn'
import { Reveal } from './Reveal'

interface Props {
  title: string
  subtitle: string
  layout: 'grid' | 'carousel'
  images: GalleryImage[]
}

/** "Our Story in Frames" — magazine-style photo grid (or carousel) with a swipeable full-screen view. */
export function CoupleGallery({ title, subtitle, layout, images }: Props) {
  const [open, setOpen] = useState<number | null>(null)
  if (!images.length) return null

  return (
    <section aria-labelledby="gallery-heading" className="px-4 py-24 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <Reveal className="text-center">
          <p className="eyebrow">Moments</p>
          <h2 id="gallery-heading" className="mt-4 text-4xl text-ink sm:text-5xl">
            {title}
          </h2>
          {subtitle && <p className="mx-auto mt-4 max-w-lg text-ink-soft">{subtitle}</p>}
          <Ornament className="mt-8" />
        </Reveal>

        {layout === 'carousel' ? (
          <ul className="no-scrollbar -mx-4 mt-12 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0" aria-label={title}>
            {images.map((img, i) => (
              <li key={img.id} className="w-[80%] shrink-0 snap-center sm:w-[46%] lg:w-[31%]">
                <Photo img={img} index={i} total={images.length} onOpen={setOpen} className="aspect-[4/5]" />
              </li>
            ))}
          </ul>
        ) : (
          <ul className="mt-12 columns-2 gap-3 sm:gap-4 lg:columns-3" aria-label={title}>
            {images.map((img, i) => (
              <li key={img.id} className="mb-3 break-inside-avoid sm:mb-4">
                <Reveal delay={(i % 3) * 0.06}>
                  <Photo img={img} index={i} total={images.length} onOpen={setOpen} />
                </Reveal>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Lightbox images={images} index={open} onChange={setOpen} />
    </section>
  )
}

function Photo({ img, index, total, onOpen, className }: { img: GalleryImage; index: number; total: number; onOpen: (i: number) => void; className?: string }) {
  const [loaded, setLoaded] = useState(false)
  return (
    <figure className="group relative overflow-hidden rounded-sm bg-linen/60 shadow-soft">
      <button type="button" onClick={() => onOpen(index)} className="block w-full" aria-label={`Open photo ${index + 1} of ${total}${img.caption ? `: ${img.caption}` : ''}`}>
        <img
          src={img.imageUrl}
          alt={img.caption || `Photo ${index + 1}`}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          className={cn(
            'block w-full object-cover transition duration-700 ease-out group-hover:scale-[1.03]',
            loaded ? 'opacity-100' : 'opacity-0',
            className,
          )}
        />
      </button>
      {img.caption && (
        <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/60 to-transparent px-4 pb-3 pt-10 font-serif text-lg italic text-ivory opacity-0 transition duration-300 group-hover:opacity-100">
          {img.caption}
        </figcaption>
      )}
    </figure>
  )
}

function Lightbox({ images, index, onChange }: { images: GalleryImage[]; index: number | null; onChange: (i: number | null) => void }) {
  const reduce = useReducedMotion()
  const touchX = useRef<number | null>(null)
  const [dir, setDir] = useState(0)
  const count = images.length

  const go = useCallback(
    (step: number) => {
      if (index === null) return
      setDir(step)
      onChange((index + step + count) % count)
    },
    [index, count, onChange],
  )

  useEffect(() => {
    if (index === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onChange(null)
      else if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
    }
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = overflow
      document.removeEventListener('keydown', onKey)
    }
  }, [index, go, onChange])

  const img = index !== null ? images[index] : null

  return (
    <AnimatePresence>
      {img && index !== null && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={`Photo ${index + 1} of ${count}`}
          className="fixed inset-0 z-50 flex flex-col bg-[#141211]/95 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touchX.current === null) return
            const dx = e.changedTouches[0].clientX - touchX.current
            if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1)
            touchX.current = null
          }}
        >
          <div className="flex items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))] text-ivory/80">
            <span className="text-xs uppercase tracking-[0.3em]">
              {index + 1} / {count}
            </span>
            <button type="button" onClick={() => onChange(null)} autoFocus aria-label="Close" className="flex size-11 items-center justify-center rounded-full hover:bg-white/10">
              <X className="size-6" />
            </button>
          </div>

          <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 sm:px-16" onClick={() => onChange(null)}>
            <AnimatePresence mode="popLayout" initial={false} custom={dir}>
              <motion.figure
                key={img.id}
                className="flex max-h-full flex-col items-center"
                initial={reduce ? { opacity: 0 } : { opacity: 0, x: dir * 60 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, x: dir * -60 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                onClick={(e) => e.stopPropagation()}
              >
                <img src={img.imageUrl} alt={img.caption || `Photo ${index + 1}`} className="max-h-[78dvh] w-auto max-w-full rounded-sm object-contain shadow-lift" />
                {img.caption && <figcaption className="mt-4 text-center font-serif text-2xl italic text-ivory">{img.caption}</figcaption>}
              </motion.figure>
            </AnimatePresence>

            {count > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    go(-1)
                  }}
                  aria-label="Previous photo"
                  className="absolute left-2 top-1/2 hidden size-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-ivory transition hover:bg-white/20 sm:flex"
                >
                  <ChevronLeft className="size-6" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    go(1)
                  }}
                  aria-label="Next photo"
                  className="absolute right-2 top-1/2 hidden size-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-ivory transition hover:bg-white/20 sm:flex"
                >
                  <ChevronRight className="size-6" />
                </button>
              </>
            )}
          </div>
          <p className="pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 text-center text-xs text-ivory/50 sm:hidden">Swipe to see more</p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
