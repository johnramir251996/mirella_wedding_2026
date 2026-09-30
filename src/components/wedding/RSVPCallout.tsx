import { Link } from 'react-router-dom'
import { CalendarClock } from 'lucide-react'
import { formatDeadlineDate, formatWeddingDate } from '../../utils/formatting'
import { Reveal } from './Reveal'

interface Props {
  weddingDate: string
  open: boolean
  deadline: string | null
  closedMessage: string
}

export function RSVPCallout({ weddingDate, open, deadline, closedMessage }: Props) {
  return (
    <section aria-labelledby="rsvp-heading" className="px-5 pb-28 pt-20 sm:px-8">
      <Reveal>
        <div className="fine-frame paper-texture mx-auto max-w-3xl rounded-sm px-6 py-16 text-center shadow-card sm:px-12 sm:py-20">
          <p className="eyebrow">Kindly Respond</p>
          <h2 id="rsvp-heading" className="mt-5 text-4xl leading-tight text-ink sm:text-5xl">
            We would be honoured
            <br className="hidden sm:block" /> by your presence
          </h2>
          {open ? (
            <>
              <p className="mx-auto mt-5 max-w-md text-ink-soft">
                Please let us know if you can join us on <span className="whitespace-nowrap">{formatWeddingDate(weddingDate)}</span>. It only takes a
                minute.
              </p>
              {deadline && (
                <p className="mx-auto mt-5 inline-flex items-center gap-2 rounded-full border border-champagne/50 bg-paper px-4 py-2 text-sm text-ink-soft">
                  <CalendarClock aria-hidden="true" className="size-4 text-gold" strokeWidth={1.5} />
                  Kindly RSVP by <strong className="font-medium text-ink">{formatDeadlineDate(deadline)}</strong>
                </p>
              )}
              <div>
                <Link
                  to="/rsvp"
                  className="relative z-10 mt-10 inline-flex min-h-16 min-w-56 items-center justify-center rounded-full bg-ink px-12 text-sm font-medium uppercase tracking-[0.4em] text-ivory shadow-card transition duration-300 hover:-translate-y-0.5 hover:bg-ink-soft hover:shadow-lift"
                >
                  RSVP
                </Link>
              </div>
            </>
          ) : (
            <p className="mx-auto mt-6 max-w-md whitespace-pre-line font-serif text-xl italic leading-relaxed text-ink-soft">
              {closedMessage || 'Our RSVP list is now closed. Thank you so much!'}
            </p>
          )}
        </div>
      </Reveal>
    </section>
  )
}
