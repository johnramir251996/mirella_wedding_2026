import { Link } from 'react-router-dom'
import { formatWeddingDate } from '../../utils/formatting'
import { Reveal } from './Reveal'

export function RSVPCallout({ weddingDate }: { weddingDate: string }) {
  return (
    <section aria-labelledby="rsvp-heading" className="px-5 pb-28 pt-20 sm:px-8">
      <Reveal>
        <div className="fine-frame paper-texture mx-auto max-w-3xl rounded-sm px-6 py-16 text-center shadow-card sm:px-12 sm:py-20">
          <p className="eyebrow">Kindly Respond</p>
          <h2 id="rsvp-heading" className="mt-5 text-4xl leading-tight text-ink sm:text-5xl">
            We would be honoured
            <br className="hidden sm:block" /> by your presence
          </h2>
          <p className="mx-auto mt-5 max-w-md text-ink-soft">
            Please let us know if you can join us on <span className="whitespace-nowrap">{formatWeddingDate(weddingDate)}</span>. It only takes a
            minute.
          </p>
          <Link
            to="/rsvp"
            className="relative z-10 mt-10 inline-flex min-h-16 min-w-56 items-center justify-center rounded-full bg-ink px-12 text-sm font-medium uppercase tracking-[0.4em] text-ivory shadow-card transition duration-300 hover:-translate-y-0.5 hover:bg-ink-soft hover:shadow-lift"
          >
            RSVP
          </Link>
        </div>
      </Reveal>
    </section>
  )
}
