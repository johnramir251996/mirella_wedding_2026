import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import type { AttendanceStatus } from '../../types/rsvp'
import { formatTable, formatWeddingDate } from '../../utils/formatting'
import { Ornament } from '../ui/Ornament'
import { CoupleNames } from '../wedding/CoupleNames'

interface Props {
  status: AttendanceStatus
  guestName: string
  tableNumber: string | null
  coupleNames: string
  weddingDate: string
  requestedGuests: number
}

export function SuccessState({ status, guestName, tableNumber, coupleNames, weddingDate, requestedGuests }: Props) {
  const reduce = useReducedMotion()
  const attending = status === 'attending'

  const item = (delay: number) =>
    reduce
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.4, delay: delay / 3 } }
      : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] as const } }

  return (
    <section aria-live="polite" className="mx-auto w-full max-w-xl text-center">
      <div className="fine-frame paper-texture rounded-sm px-6 py-14 shadow-card sm:px-12 sm:py-16">
        <motion.svg
          viewBox="0 0 64 64"
          className="mx-auto size-16 text-champagne"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.4}
          aria-hidden="true"
          {...item(0)}
        >
          <motion.circle
            cx="32"
            cy="32"
            r="30"
            initial={reduce ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.1, ease: 'easeInOut' }}
          />
          <motion.path
            d="M32 45.5c-7.6-5.3-13-9.8-13-15.6 0-3.8 3-6.6 6.6-6.6 2.6 0 4.9 1.5 6.4 3.9 1.5-2.4 3.8-3.9 6.4-3.9 3.6 0 6.6 2.8 6.6 6.6 0 5.8-5.4 10.3-13 15.6z"
            initial={reduce ? false : { pathLength: 0, fill: 'rgba(184,155,106,0)' }}
            animate={{ pathLength: 1, fill: 'rgba(184,155,106,0.18)' }}
            transition={{ duration: 1.2, delay: 0.5, ease: 'easeInOut' }}
          />
        </motion.svg>

        <motion.p {...item(0.3)} className="eyebrow mt-8">
          Thank you, {guestName.split(' ')[0]}
        </motion.p>

        {attending ? (
          <motion.h1 {...item(0.5)} className="mt-5 text-[2.2rem] leading-tight text-ink sm:text-[2.6rem]">
            We&apos;re so happy you&apos;ll be celebrating with us! <span aria-hidden="true">❤️</span>
          </motion.h1>
        ) : (
          <motion.div {...item(0.5)}>
            <h1 className="mt-5 text-[2.2rem] leading-tight text-ink sm:text-[2.6rem]">Thank you for letting us know.</h1>
            <p className="mt-4 font-serif text-xl italic text-ink-soft">
              Your warm wishes mean so much to us. <span aria-hidden="true">❤️</span>
            </p>
          </motion.div>
        )}

        {attending && (
          <motion.div
            {...item(0.65)}
            className="mx-auto mt-8 max-w-xs rounded-xl border border-champagne/60 bg-champagne-light/30 px-6 py-5 shadow-soft"
          >
            <p className="text-[0.7rem] font-medium uppercase tracking-[0.32em] text-gold">Your seat</p>
            <p className="mt-2 font-serif text-[2.4rem] leading-none text-ink">{formatTable(tableNumber)}</p>
            <p className="mt-2 text-xs text-muted">Please take note of this for the reception.</p>
          </motion.div>
        )}

        {attending && requestedGuests > 0 && (
          <motion.p {...item(0.7)} className="mx-auto mt-6 max-w-sm text-sm text-muted">
            We’ve received your additional guest request and will be in touch soon to confirm.
          </motion.p>
        )}

        <motion.div {...item(0.9)}>
          <Ornament className="mt-10" />
          <p className="mt-8 font-serif text-4xl font-light text-ink">
            <CoupleNames names={coupleNames} />
          </p>
          <p className="mt-2 text-xs uppercase tracking-[0.36em] text-muted">{formatWeddingDate(weddingDate)}</p>
        </motion.div>
      </div>

      <motion.div {...item(1.1)} className="mt-8">
        <Link to="/" className="rounded px-3 py-2 text-sm uppercase tracking-[0.2em] text-muted underline-offset-4 hover:text-ink hover:underline">
          Back to our wedding website
        </Link>
      </motion.div>
    </section>
  )
}
