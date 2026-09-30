import { Link } from 'react-router-dom'
import { formatDeadlineDateTime, formatWeddingDate } from '../../utils/formatting'
import { Reveal } from './Reveal'
import { cn } from '../ui/cn'

interface Props {
  weddingDate: string
  open: boolean
  deadline: string | null
  closedMessage: string
  showDeadline: boolean
  buttonLabel: string
}

export function RSVPCallout({ weddingDate, open, deadline, closedMessage, showDeadline, buttonLabel }: Props) {
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
                Please let us know if you can join us on <span className="whitespace-nowrap">{formatWeddingDate(weddingDate)}</span>
                {deadline && showDeadline ? (
                  <>
                    {' '}
                    until <strong className="font-medium text-ink">{formatDeadlineDateTime(deadline)}</strong>
                  </>
                ) : null}
                . It only takes a minute.
              </p>
              <div>
                <Link
                  to="/rsvp"
                  className={cn(
                    'relative z-10 mt-10 inline-flex min-h-16 min-w-56 max-w-full items-center justify-center rounded-full bg-ink py-4 text-center text-sm font-medium uppercase leading-snug text-ivory shadow-card transition duration-300 hover:-translate-y-0.5 hover:bg-ink-soft hover:shadow-lift',
                    buttonLabel.length <= 8 ? 'px-12 tracking-[0.4em]' : 'px-8 tracking-[0.22em]',
                  )}
                >
                  {buttonLabel}
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
