import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { Armchair, MapPin, Minus, Plus, Users } from 'lucide-react'
import { useWeddingSettings } from '../hooks/useWeddingSettings'
import { findMySeat, type SeatSearchResult } from '../services/seatingService'
import { isFinderOpen, isRsvpOpen } from '../services/settingsService'
import { ITEM_KINDS } from '../types/seating'
import { toFriendlyMessage } from '../utils/errors'
import { formatWeddingDate } from '../utils/formatting'
import { chairsFor, itemLocation } from '../utils/seatingGeometry'
import { SearchForm } from '../components/rsvp/SearchForm'
import { FloorPlan } from '../components/seating/FloorPlan'
import { PageLoader } from '../components/ui/Spinner'
import { Ornament } from '../components/ui/Ornament'
import { PublicHeader } from '../components/wedding/PublicHeader'
import { Footer } from '../components/wedding/Footer'
import { CoupleNames } from '../components/wedding/CoupleNames'

/** Guests type their name and see their table on a read-only map. */
export default function FindSeat() {
  const { settings, loading } = useWeddingSettings()
  const reduce = useReducedMotion()
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<SeatSearchResult | null>(null)

  useEffect(() => {
    document.title = settings ? `Find My Seat · ${settings.coupleNames}` : 'Find My Seat'
  }, [settings])

  const search = async (name: string) => {
    setSearching(true)
    setError(null)
    try {
      const r = await findMySeat(name)
      if (r.status === 'not_found') setError('We couldn’t find that name. Please type it exactly as it appears on your invitation.')
      else setResult(r)
    } catch (e) {
      setError(toFriendlyMessage(e))
    } finally {
      setSearching(false)
    }
  }

  const open = settings ? isFinderOpen(settings.seatingConfig) : false
  const fade = reduce ? { initial: { opacity: 0 }, animate: { opacity: 1 } } : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } }

  return (
    <div className="flex min-h-[100svh] flex-col">
      <PublicHeader />
      <main className="flex flex-1 flex-col px-5 pb-20 pt-10 sm:px-8 sm:pt-14">
        {loading && !settings ? (
          <PageLoader />
        ) : (
          <>
            <div className="mb-10 text-center">
              <p className="font-serif text-2xl font-light text-ink-soft">
                <CoupleNames names={settings?.coupleNames ?? ''} />
              </p>
              <p className="mt-1 text-xs uppercase tracking-[0.34em] text-muted">{settings ? formatWeddingDate(settings.weddingDate) : ''}</p>
              <Ornament className="mt-7" />
              <h1 className="mt-7 text-[2.5rem] leading-tight text-ink sm:text-5xl">Find My Seat</h1>
            </div>

            {!open || result?.status === 'hidden' ? (
              <Message title="Seating will be shared soon" text="We’re still arranging the tables. Please check back closer to the day. 🤍" />
            ) : !result ? (
              <>
                <p className="mx-auto -mt-4 mb-8 max-w-md text-center text-ink-soft">Type your name to see your table and where it is in the venue.</p>
                <SearchForm onSearch={(n) => void search(n)} searching={searching} error={error} />
              </>
            ) : (
              <motion.div {...fade} transition={{ duration: 0.6 }} className="mx-auto w-full max-w-4xl">
                <ResultView result={result} rsvpOpen={settings ? isRsvpOpen(settings) : false} />
                <p className="mt-10 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setResult(null)
                      setError(null)
                    }}
                    className="rounded px-3 py-2 text-sm uppercase tracking-[0.2em] text-muted underline-offset-4 hover:text-ink hover:underline"
                  >
                    Search another name
                  </button>
                </p>
              </motion.div>
            )}
          </>
        )}
      </main>
      {settings && <Footer coupleNames={settings.coupleNames} weddingDate={settings.weddingDate} closingMessage={settings.closingMessage} />}
    </div>
  )
}

function Message({ title, text, children }: { title: string; text: string; children?: ReactNode }) {
  return (
    <section className="fine-frame paper-texture mx-auto w-full max-w-md rounded-sm px-7 py-12 text-center shadow-card">
      <h2 className="text-[2rem] leading-tight text-ink">{title}</h2>
      <p className="mx-auto mt-4 max-w-sm font-serif text-lg italic leading-relaxed text-ink-soft">{text}</p>
      {children}
    </section>
  )
}

function ResultView({ result: r, rsvpOpen }: { result: SeatSearchResult; rsvpOpen: boolean }) {
  const first = (r.name ?? '').split(' ')[0]
  if (r.status === 'pending') {
    return (
      <Message title={`Hi ${first}!`} text="Please RSVP first — your seat will appear here once you’ve confirmed you’re coming.">
        {rsvpOpen && (
          <Link to="/rsvp" className="mt-7 inline-flex min-h-12 items-center rounded-full bg-ink px-8 text-sm font-medium uppercase tracking-[0.24em] text-ivory shadow-card transition hover:bg-ink-soft">
            RSVP now
          </Link>
        )}
      </Message>
    )
  }
  if (r.status === 'declined') return <Message title={`We’ll miss you, ${first}!`} text="Thank you for letting us know. You’ll be in our hearts on the day." />
  if (r.status === 'unseated' || !r.layout) {
    return (
      <Message
        title={r.tableName ? `You’re at ${r.tableName}` : `Hi ${first}!`}
        text={r.tableName ? 'Your exact place on the map is being finalised — please check back soon.' : 'Seating is being finalised — please check back soon.'}
      />
    )
  }
  return <SeatedView r={r} />
}

function SeatedView({ r }: { r: SeatSearchResult }) {
  const { config, tables, items } = r.layout!
  const table = tables.find((t) => t.id === r.tableId)
  const [zoom, setZoom] = useState(1)

  const where = useMemo(() => {
    if (!table) return ''
    const inside = itemLocation({ id: '', kind: 'custom', label: '', x: table.x, y: table.y, width: 1, height: 1, rotation: 0, location: 'auto' }, config.room) === 'inside'
    const near = [...items]
      .map((i) => ({ i, d: Math.hypot(i.x - table.x, i.y - table.y) }))
      .sort((a, b) => a.d - b.d)[0]
    const nearLabel = near ? near.i.label.trim() || ITEM_KINDS.find((k) => k.kind === near.i.kind)?.label : ''
    return `${inside ? 'Inside the hall' : 'Outside'}${nearLabel ? ` · near the ${nearLabel.toLowerCase()}` : ''}`
  }, [table, items, config.room])

  const partyAt = new Map((r.party ?? []).map((p) => [p.seat, p.name]))
  const chairCount = table ? chairsFor(table).length : 0

  return (
    <div>
      <section className="fine-frame paper-texture mx-auto max-w-md rounded-sm px-7 py-10 text-center shadow-card">
        <p className="eyebrow">{r.name}, your seat is at</p>
        <p className="mt-4 font-serif text-[2.8rem] leading-none text-ink">{r.tableName}</p>
        {typeof r.seat === 'number' && chairCount > 0 && (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-champagne/60 bg-champagne-light/35 px-4 py-1.5 text-sm text-ink-soft">
            <Armchair aria-hidden="true" className="size-4 text-gold" /> Chair {r.seat + 1} of {chairCount}
          </p>
        )}
        {where && (
          <p className="mt-4 flex items-center justify-center gap-1.5 text-sm text-ink-soft">
            <MapPin aria-hidden="true" className="size-4 text-gold" /> {where}
          </p>
        )}
        {(r.party ?? []).length > 0 && (
          <p className="mt-4 flex items-start justify-center gap-1.5 text-sm text-ink-soft">
            <Users aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-gold" />
            <span>Seated with you: {(r.party ?? []).map((p) => p.name).join(', ')}</span>
          </p>
        )}
      </section>

      <section aria-label="Venue map" className="mt-8 overflow-hidden rounded-xl border border-line bg-paper shadow-soft">
        <div className="flex items-center justify-between border-b border-line px-3 py-2">
          <p className="text-xs uppercase tracking-[0.2em] text-muted">Venue map · your table is highlighted</p>
          <div className="flex items-center gap-1">
            <button type="button" aria-label="Zoom out" onClick={() => setZoom((z) => Math.max(1, z - 0.5))} className="flex size-9 items-center justify-center rounded-md hover:bg-cream disabled:opacity-30" disabled={zoom <= 1}>
              <Minus className="size-4" />
            </button>
            <button type="button" aria-label="Zoom in" onClick={() => setZoom((z) => Math.min(3, z + 0.5))} className="flex size-9 items-center justify-center rounded-md hover:bg-cream disabled:opacity-30" disabled={zoom >= 3}>
              <Plus className="size-4" />
            </button>
          </div>
        </div>
        <div className="max-h-[70vh] overflow-auto" ref={(el) => {
          if (el && table && zoom > 1) {
            const sx = (table.x / config.canvas.width) * el.scrollWidth - el.clientWidth / 2
            const sy = (table.y / config.canvas.height) * el.scrollHeight - el.clientHeight / 2
            el.scrollTo({ left: sx, top: sy })
          }
        }}>
          <div style={{ width: `${zoom * 100}%` }}>
            <FloorPlan
              config={config}
              tables={tables}
              items={items}
              highlightTableId={r.tableId}
              dimOthers
              className="h-auto w-full"
              chair={(tid, i) => {
                if (tid !== r.tableId) return null
                if (i === r.seat) return { name: r.name ?? 'You', state: 'you' }
                const n = partyAt.get(i)
                return n ? { name: n, state: 'party' } : null
              }}
            />
          </div>
        </div>
      </section>
    </div>
  )
}
