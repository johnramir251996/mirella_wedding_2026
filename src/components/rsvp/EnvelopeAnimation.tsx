import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { formatTable, formatWeddingDate } from '../../utils/formatting'
import { Ornament } from '../ui/Ornament'
import { CoupleNames } from '../wedding/CoupleNames'

interface Props {
  guestName: string
  tableNumber: string | null
  coupleNames: string
  weddingDate: string
  onComplete: () => void
}

/*
 * Stages:
 * 0 closed envelope · 1 flap opens · 2 paper emerges · 3 guest name
 * 4 table number · 5 invitation content · 6 fade away → onComplete
 */
const TIMELINE = [0, 500, 1100, 1800, 2200, 2550, 3700]
const DONE_AT = 4200
const EASE = [0.22, 1, 0.36, 1] as const

export function EnvelopeAnimation({ guestName, tableNumber, coupleNames, weddingDate, onComplete }: Props) {
  const reduce = useReducedMotion()
  const [stage, setStage] = useState(0)
  const doneRef = useRef(onComplete)

  useEffect(() => {
    doneRef.current = onComplete
  })

  useEffect(() => {
    const timers: number[] = []
    if (reduce) {
      setStage(5)
      timers.push(window.setTimeout(() => setStage(6), 1400))
      timers.push(window.setTimeout(() => doneRef.current(), 1800))
    } else {
      TIMELINE.forEach((t, i) => timers.push(window.setTimeout(() => setStage(i), t)))
      timers.push(window.setTimeout(() => doneRef.current(), DONE_AT))
    }
    return () => timers.forEach((t) => window.clearTimeout(t))
  }, [reduce])

  const skip = () => doneRef.current()

  const paperOut = stage >= 3
  const faded = stage >= 6

  return (
    <div className="relative flex min-h-[78svh] flex-col items-center justify-center overflow-hidden px-4 py-10" aria-live="polite">
      <p className="sr-only">
        Opening your invitation. {guestName}, {formatTable(tableNumber)}.
      </p>

      <motion.div
        className="relative w-[min(86vw,380px)]"
        animate={{ opacity: faded ? 0 : 1, y: faded && !reduce ? -12 : 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        aria-hidden="true"
      >
        {/* Envelope body */}
        <motion.div
          className="relative mt-40 aspect-[4/3] w-full"
          style={{ perspective: 1200 }}
          animate={reduce ? { opacity: 0 } : { y: paperOut ? 70 : 0, opacity: paperOut ? 0 : 1 }}
          transition={{ duration: 0.8, ease: EASE }}
        >
          {/* back */}
          <div className="absolute inset-0 rounded-md bg-[#ece2d1] shadow-lift" />

          {/* paper inside (behind the pocket until it is out) */}
          {!paperOut && (
            <motion.div
              className="absolute inset-x-[6%] top-[6%] z-10 h-[88%] rounded-sm bg-paper shadow-soft"
              initial={{ y: 0 }}
              animate={{ y: stage >= 2 ? '-52%' : 0 }}
              transition={{ duration: 0.75, ease: EASE }}
            >
              <div className="flex h-1/2 flex-col items-center justify-center">
                <span className="font-serif text-3xl italic text-champagne">
                  <CoupleNames names={coupleNames} ampClassName="text-champagne" />
                </span>
              </div>
            </motion.div>
          )}

          {/* front pocket */}
          <div className="absolute inset-0 z-20 overflow-hidden rounded-md">
            <div className="absolute inset-0 bg-[#f3ebdd]" style={{ clipPath: 'polygon(0 0, 50% 54%, 0 100%)' }} />
            <div className="absolute inset-0 bg-[#f3ebdd]" style={{ clipPath: 'polygon(100% 0, 50% 54%, 100% 100%)' }} />
            <div className="absolute inset-0 bg-[#efe5d5]" style={{ clipPath: 'polygon(0 100%, 50% 46%, 100% 100%)' }} />
            <div className="absolute inset-0 rounded-md ring-1 ring-inset ring-champagne/30" />
          </div>

          {/* top flap */}
          <motion.div
            className="absolute inset-x-0 top-0 h-[58%] origin-top"
            style={{ transformStyle: 'preserve-3d', zIndex: stage >= 2 ? 5 : 30 }}
            initial={{ rotateX: 0 }}
            animate={{ rotateX: stage >= 1 ? 180 : 0 }}
            transition={{ duration: 0.7, ease: EASE }}
          >
            <div
              className="absolute inset-0 bg-[#e8dcc7]"
              style={{ clipPath: 'polygon(0 0, 100% 0, 50% 100%)', backfaceVisibility: 'hidden' }}
            />
            <div
              className="absolute inset-0 bg-[#efe6d6]"
              style={{ clipPath: 'polygon(0 0, 100% 0, 50% 100%)', transform: 'rotateX(180deg)', backfaceVisibility: 'hidden' }}
            />
          </motion.div>

          {/* wax seal */}
          <motion.div
            className="absolute left-1/2 top-[58%] z-40 flex size-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#9c7d4f] shadow-[0_4px_10px_rgb(0_0_0/0.25),inset_0_1px_2px_rgb(255_255_255/0.35)]"
            animate={{ opacity: stage >= 1 ? 0 : 1, scale: stage >= 1 ? 0.8 : 1 }}
            transition={{ duration: 0.35 }}
          >
            <span className="font-serif text-lg italic text-[#f6ecd9]">M&amp;E</span>
          </motion.div>
        </motion.div>

        {/* The invitation card once it is out of the envelope */}
        {paperOut && (
          <motion.div
            className="fine-frame paper-texture absolute inset-x-0 top-6 z-50 mx-auto w-[min(86vw,360px)] rounded-sm px-6 py-10 text-center shadow-lift"
            initial={reduce ? { opacity: 0 } : { opacity: 1, y: 60, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: reduce ? 0.6 : 0.8, ease: EASE }}
          >
            <p className="eyebrow">You are invited</p>
            <motion.p
              className="mt-5 font-serif text-[2.1rem] leading-tight text-ink"
              initial={{ opacity: 0, y: reduce ? 0 : 8 }}
              animate={{ opacity: stage >= 3 ? 1 : 0, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              {guestName}
            </motion.p>
            <motion.p
              className="mt-2 text-sm uppercase tracking-[0.3em] text-gold"
              initial={{ opacity: 0 }}
              animate={{ opacity: stage >= 4 ? 1 : 0 }}
              transition={{ duration: 0.5 }}
            >
              {formatTable(tableNumber)}
            </motion.p>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: stage >= 5 ? 1 : 0 }} transition={{ duration: 0.7 }}>
              <Ornament className="mt-6" />
              <p className="mt-6 font-serif text-lg italic leading-snug text-ink-soft">to celebrate the wedding of</p>
              <p className="mt-1 font-serif text-3xl text-ink">
                <CoupleNames names={coupleNames} />
              </p>
              <p className="mt-3 text-xs uppercase tracking-[0.3em] text-muted">{formatWeddingDate(weddingDate)}</p>
            </motion.div>
          </motion.div>
        )}
      </motion.div>

      <button
        type="button"
        onClick={skip}
        className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 rounded-full px-4 py-2 text-xs uppercase tracking-[0.2em] text-muted transition hover:bg-cream hover:text-ink"
      >
        Skip
      </button>
    </div>
  )
}
