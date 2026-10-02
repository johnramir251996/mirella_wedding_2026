import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useWeddingSettings } from '../hooks/useWeddingSettings'
import { getPublicWheel } from '../services/raffleService'
import { toFriendlyMessage } from '../utils/errors'
import { monogram } from '../utils/formatting'
import { PublicHeader } from '../components/wedding/PublicHeader'
import { Footer } from '../components/wedding/Footer'
import { CoupleNames } from '../components/wedding/CoupleNames'
import { PageLoader } from '../components/ui/Spinner'
import { Ornament } from '../components/ui/Ornament'
import { RaffleWheel } from '../components/raffle/RaffleWheel'

type State = { status: 'loading' } | { status: 'closed' } | { status: 'error'; message: string } | { status: 'open'; masked: boolean; names: string[] }

/** Public raffle page: the wheel the host will spin (guests can watch, not spin). */
export default function Raffle() {
  const { settings } = useWeddingSettings()
  const [state, setState] = useState<State>({ status: 'loading' })

  useEffect(() => {
    document.title = settings ? `Raffle · ${settings.coupleNames}` : 'Raffle'
  }, [settings])

  useEffect(() => {
    getPublicWheel()
      .then((w) => setState(w.visible ? { status: 'open', masked: w.masked, names: w.names } : { status: 'closed' }))
      .catch((e) => setState({ status: 'error', message: toFriendlyMessage(e) }))
  }, [])

  return (
    <div className="flex min-h-[100svh] flex-col">
      <PublicHeader />
      <main className="flex flex-1 flex-col items-center px-5 pb-20 pt-10 text-center sm:px-8">
        {settings && (
          <p className="font-serif text-2xl font-light text-ink-soft">
            <CoupleNames names={settings.coupleNames} />
          </p>
        )}
        <h1 className="mt-4 text-[2.5rem] leading-tight text-ink sm:text-5xl">Raffle</h1>
        <Ornament className="mt-6" />
        {state.status === 'loading' ? (
          <PageLoader label="Loading the raffle" />
        ) : state.status === 'closed' || state.status === 'error' ? (
          <div className="mt-10 max-w-md">
            <p className="leading-relaxed text-ink-soft">{state.status === 'error' ? state.message : 'The raffle isn’t open yet. Please check back closer to the celebration.'}</p>
            <Link to="/" className="mt-6 inline-block text-sm text-gold underline-offset-4 hover:underline">
              Back to the wedding website
            </Link>
          </div>
        ) : (
          <>
            <p className="mt-6 max-w-md leading-relaxed text-ink-soft">
              Our host will spin the wheel at the reception. {state.names.length} {state.names.length === 1 ? 'name is' : 'names are'} on it
              {state.masked ? ' — partly hidden until the wedding day.' : '.'}
            </p>
            <div className="mt-10 w-full max-w-md">
              <RaffleWheel names={state.names} rotation={0} spinning={false} idle centre={settings ? monogram(settings.coupleNames, '&') : ''} />
            </div>
          </>
        )}
      </main>
      {settings && <Footer coupleNames={settings.coupleNames} weddingDate={settings.weddingDate} closingMessage={settings.closingMessage} />}
    </div>
  )
}
