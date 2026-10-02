import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Armchair, CalendarPlus, Globe, MapPin, RotateCw } from 'lucide-react'
import { useWeddingSettings } from '../hooks/useWeddingSettings'
import { useResolvedTheme } from '../theme/themeContext'
import { openInvitation, type VirtualInvitation } from '../services/virtualInviteService'
import { isFinderOpen, isRsvpOpen } from '../services/settingsService'
import { esc, invitationBackHtml, invitationCardHtml, type PrintTheme } from '../utils/printables'
import { sealSvg } from '../utils/printStyles'
import { readTheme } from '../utils/printTheme'
import { measureCardFit } from '../utils/cardFit'
import { entouragePositions, invitationPosition } from '../utils/positions'
import { formatDeadlineDate, formatWeddingDate, monogram } from '../utils/formatting'
import { siteBaseUrl } from '../utils/share'
import { toFriendlyMessage } from '../utils/errors'
import type { WeddingSettings } from '../types/wedding'
import { PageLoader } from '../components/ui/Spinner'
import { Footer } from '../components/wedding/Footer'
import { CoupleNames } from '../components/wedding/CoupleNames'

const MM = 96 / 25.4 // CSS px per mm
const CARD_MM = 127 // the card is designed at 5 × 7 in (127 × 177.8 mm)
const RATIO = 177.8 / 127
const EASE = [0.22, 1, 0.36, 1] as const

type Stage = 'sealed' | 'opening' | 'card'
type Load = { status: 'loading' } | { status: 'ready'; inv: VirtualInvitation } | { status: 'missing' } | { status: 'error'; message: string }

const viewport = () => ({ w: window.innerWidth, h: window.innerHeight })

function useViewport() {
  const [size, setSize] = useState(viewport)
  useEffect(() => {
    const on = () => setSize(viewport())
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return size
}

const openedKey = (code: string) => `wedding-invite-opened:${code}`
function wasOpened(code: string): boolean {
  try {
    return sessionStorage.getItem(openedKey(code)) === '1'
  } catch {
    return false
  }
}
function rememberOpened(code: string) {
  try {
    sessionStorage.setItem(openedKey(code), '1')
  } catch {
    // private mode — the envelope simply shows again next time
  }
}

/** An all-day "Add to Google Calendar" link for the wedding. */
function calendarUrl(s: WeddingSettings): string {
  const start = s.weddingDate.replace(/-/g, '')
  const next = new Date(`${s.weddingDate}T00:00:00Z`)
  next.setUTCDate(next.getUTCDate() + 1)
  const end = next.toISOString().slice(0, 10).replace(/-/g, '')
  const details = [
    s.churchName && `Ceremony: ${s.churchName}${s.ceremonyTime ? `, ${s.ceremonyTime}` : ''}`,
    s.receptionName && `Reception: ${s.receptionName}${s.receptionTime ? `, ${s.receptionTime}` : ''}`,
    siteBaseUrl(),
  ]
    .filter(Boolean)
    .join('\n')
  const p = new URLSearchParams({ action: 'TEMPLATE', text: `${s.coupleNames} — wedding`, dates: `${start}/${end}`, details, location: s.churchName })
  return `https://calendar.google.com/calendar/render?${p.toString()}`
}

/** Shows a card designed in millimetres at a given on-screen width. */
function CardFace({ html, width }: { html: string; width: number }) {
  return (
    <div style={{ width, height: width * RATIO, overflow: 'hidden' }}>
      <div style={{ width: `${CARD_MM}mm`, transform: `scale(${width / (CARD_MM * MM)})`, transformOrigin: 'top left' }} dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  )
}

const face: CSSProperties = { position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }

export default function VirtualInvitationPage() {
  const { code = '' } = useParams()
  const { settings, loading: settingsLoading } = useWeddingSettings()
  const resolved = useResolvedTheme()
  const reduce = useReducedMotion()
  const { w, h } = useViewport()

  const [load, setLoad] = useState<Load>({ status: 'loading' })
  const [stage, setStage] = useState<Stage>(() => (wasOpened(code) ? 'card' : 'sealed'))
  const [theme, setTheme] = useState<PrintTheme | null>(null)
  const [fit, setFit] = useState(1)
  const loadedFor = useRef<string | null>(null)
  const hostRef = useRef<HTMLDivElement>(null)

  // Load the invitation once per code (this also records that it was opened).
  useEffect(() => {
    if (loadedFor.current === code) return
    loadedFor.current = code
    setLoad({ status: 'loading' })
    openInvitation(code)
      .then((inv) => setLoad(inv ? { status: 'ready', inv } : { status: 'missing' }))
      .catch((e) => setLoad({ status: 'error', message: toFriendlyMessage(e) }))
  }, [code])

  // Read the colours after the site theme has been applied to the page.
  useEffect(() => {
    if (!settings) return
    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => setTheme({ ...readTheme(), style: resolved.style }))
    })
    return () => cancelAnimationFrame(raf)
  }, [settings, resolved])

  const inv = load.status === 'ready' ? load.inv : null
  const coupleNames = settings?.coupleNames ?? ''

  useEffect(() => {
    document.title = coupleNames ? `You’re invited · ${coupleNames}` : 'You’re invited'
  }, [coupleNames])

  const position = useMemo(() => {
    if (!inv || !settings) return ''
    const auto = inv.positionMemberId
      ? entouragePositions(settings.entourage, [{ memberId: inv.positionMemberId, invitationId: 'me', guestId: null }])
      : new Map<string, string>()
    return invitationPosition({ id: 'me', positionMode: inv.positionMode, positionLabel: inv.positionLabel }, auto)
  }, [inv, settings])

  const rsvpOpen = settings ? isRsvpOpen(settings) : false
  const respondBy = settings && rsvpOpen && settings.rsvpShowDeadline && settings.rsvpDeadline && !inv?.attendanceStatus ? formatDeadlineDate(settings.rsvpDeadline) : null

  const makeFront = (f: number) =>
    inv && settings && theme
      ? invitationCardHtml({
          guestName: inv.inviteeName,
          position,
          withNames: inv.includedGuests,
          coupleNames: settings.coupleNames,
          dateText: formatWeddingDate(settings.weddingDate, 'full'),
          ceremony: [settings.churchName, settings.ceremonyTime].filter(Boolean).join(' · '),
          reception: [settings.receptionName, settings.receptionTime].filter(Boolean).join(' · '),
          respondBy,
          qrSvg: '',
          shortLink: '',
          theme,
          size: '5x7',
          virtual: true,
          fit: f,
        })
      : ''
  const frontKey = JSON.stringify([inv, position, respondBy, theme, settings?.coupleNames, settings?.weddingDate, settings?.churchName, settings?.receptionName])

  // Shrink the text slightly when a card is very full (same check as the printed cards).
  useEffect(() => {
    const host = hostRef.current
    if (!host || !makeFront(1)) return
    let alive = true
    const run = () => alive && setFit(measureCardFit(makeFront, host).fit)
    document.fonts.ready.then(run, run)
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frontKey])

  const frontHtml = makeFront(fit)
  const backHtml =
    settings && theme
      ? invitationBackHtml({ coupleNames: settings.coupleNames, dateText: formatWeddingDate(settings.weddingDate), monogram: monogram(settings.coupleNames, '&'), theme, size: '5x7' })
      : ''

  const cardW = Math.round(Math.max(232, Math.min(360, w - 48, (h - 250) / RATIO)))

  const open = () => {
    rememberOpened(code)
    setStage(reduce ? 'card' : 'opening')
  }

  const ready = Boolean(inv && settings && theme && frontHtml)

  return (
    <div
      className="flex min-h-[100svh] flex-col"
      style={{ background: 'radial-gradient(ellipse 120% 80% at 50% 34%, var(--color-paper) 0%, var(--color-cream) 58%, var(--color-linen) 100%)' }}
    >
      <div ref={hostRef} aria-hidden="true" style={{ position: 'fixed', left: -10000, top: 0, width: `${CARD_MM}mm`, visibility: 'hidden', pointerEvents: 'none' }} />

      <main className="flex flex-1 flex-col items-center px-5 pb-16 pt-8 sm:pt-12">
        {load.status === 'missing' || load.status === 'error' ? (
          <Notice
            title={load.status === 'missing' ? 'This invitation link isn’t working' : 'Your invitation didn’t load'}
            body={
              load.status === 'missing'
                ? 'The link may be incomplete. Check that the whole link was copied, or find your invitation by name.'
                : load.message
            }
          />
        ) : !ready || (settingsLoading && !settings) ? (
          <PageLoader label="Opening your invitation" />
        ) : (
          <>
            {coupleNames && (
              <motion.p
                className="text-center font-serif text-xl font-light text-ink-soft"
                animate={{ opacity: stage === 'opening' ? 0 : 1 }}
                transition={{ duration: 0.4 }}
              >
                <CoupleNames names={coupleNames} />
              </motion.p>
            )}
            <AnimatePresence mode="wait">
              {stage !== 'card' ? (
                <motion.div key="envelope" className="flex w-full flex-1 flex-col items-center justify-center" exit={{ opacity: 0, transition: { duration: 0.45 } }}>
                  <Envelope
                    name={inv!.inviteeName}
                    theme={theme!}
                    monogramText={monogram(coupleNames, '&')}
                    cardW={cardW}
                    frontHtml={frontHtml}
                    opening={stage === 'opening'}
                    onOpen={open}
                    onOpened={() => setStage('card')}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="card"
                  className="flex w-full flex-col items-center"
                  initial={reduce ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.6, ease: EASE }}
                >
                  <FlipCard frontHtml={frontHtml} backHtml={backHtml} width={cardW} />
                  <Actions inv={inv!} settings={settings!} code={code} rsvpOpen={rsvpOpen} respondBy={respondBy} />
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </main>

      {stage === 'card' && settings && ready && <Footer coupleNames={settings.coupleNames} weddingDate={settings.weddingDate} closingMessage={settings.closingMessage} />}
    </div>
  )
}

// ---------------------------------------------------------------- envelope

interface EnvelopeProps {
  name: string
  theme: PrintTheme
  monogramText: string
  cardW: number
  frontHtml: string
  opening: boolean
  onOpen: () => void
  onOpened: () => void
}

/**
 * A sealed envelope addressed to the guest. Tapping it breaks the seal, lifts
 * the flap and slides the card out; then the page moves on to the card itself.
 */
function Envelope({ name, theme, monogramText, cardW, frontHtml, opening, onOpen, onOpened }: EnvelopeProps) {
  const [step, setStep] = useState(0) // 0 sealed · 1 seal breaks, flap lifts · 2 flap behind · 3 card rises
  const done = useRef(onOpened)
  useEffect(() => {
    done.current = onOpened
  }, [onOpened])

  useEffect(() => {
    if (!opening) return
    setStep(1)
    const timers = [window.setTimeout(() => setStep(2), 620), window.setTimeout(() => setStep(3), 900), window.setTimeout(() => done.current(), 2250)]
    return () => timers.forEach((t) => window.clearTimeout(t))
  }, [opening])

  const cardH = cardW * RATIO
  const ew = Math.round(cardW * 1.06)
  const eh = Math.round(cardH * 0.97)
  const inner = Math.round(cardW * 0.92)
  const flapH = Math.round(eh * 0.4)
  const seal = Math.round(cardW * 0.2)
  const style = theme.style ?? 'classic'
  const colors = { ink: theme.ink, accent: theme.accent, accentLight: theme.accentLight, paper: theme.paper, line: theme.line, serif: theme.serif }
  const paper = theme.paper
  const shade = `color-mix(in srgb, ${theme.paper} 92%, ${theme.ink})`
  const liner = `color-mix(in srgb, ${theme.accentLight} 75%, ${theme.paper})`
  const rise = cardH * 0.56

  return (
    <div className="flex flex-col items-center">
      <motion.div animate={{ y: step >= 3 ? rise * 0.5 : 0 }} transition={{ duration: 1, ease: EASE }}>
        <button
          type="button"
          onClick={() => !opening && onOpen()}
          disabled={opening}
          aria-label={`Open your invitation, ${name}`}
          className="group relative block rounded-[3px] outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-4 focus-visible:ring-offset-cream"
          style={{ width: ew, height: eh, perspective: 1200, cursor: opening ? 'default' : 'pointer' }}
        >
          {/* soft shadow on the table */}
          <span
            aria-hidden="true"
            className="absolute left-1/2 -translate-x-1/2"
            style={{ bottom: -18, width: ew * 0.9, height: 30, background: 'radial-gradient(ellipse, rgba(0,0,0,0.22), transparent 70%)', filter: 'blur(6px)' }}
          />

          {/* inside of the envelope (the lining) */}
          <span aria-hidden="true" className="absolute inset-0 rounded-[3px]" style={{ background: `linear-gradient(${liner}, ${shade} 60%)` }} />

          {/* the card, tucked inside */}
          <motion.span
            aria-hidden="true"
            className="absolute"
            style={{ left: (ew - inner) / 2, top: eh * 0.035, boxShadow: '0 2px 10px rgba(0,0,0,0.12)', zIndex: 2 }}
            animate={{ y: step >= 3 ? -rise : 0 }}
            transition={{ duration: 1.1, ease: EASE }}
          >
            <CardFace html={frontHtml} width={inner} />
          </motion.span>

          {/* front pocket: side and bottom flaps meeting in the middle */}
          <span aria-hidden="true" className="absolute inset-0" style={{ zIndex: 3, clipPath: 'polygon(0 0, 50% 36%, 100% 0, 100% 100%, 0 100%)' }}>
            <span className="absolute inset-0 rounded-[3px]" style={{ background: paper, boxShadow: `inset 0 0 0 1px ${theme.line}` }} />
            <svg className="absolute inset-0 size-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <path d="M0 0 L50 36 L100 0 M0 100 L50 56 L100 100" fill="none" stroke={theme.line} strokeWidth="1" vectorEffect="non-scaling-stroke" />
              <path d="M0 100 L50 56 L100 100 Z" fill={shade} opacity="0.55" />
            </svg>
            <span className="absolute inset-x-0 px-6 text-center" style={{ top: '64%' }}>
              <span className="block font-serif italic leading-tight" style={{ color: theme.ink, fontSize: Math.max(20, Math.min(30, cardW * 0.085)) }}>
                {name}
              </span>
            </span>
          </span>

          {/* top flap, hinged along the top edge */}
          <span
            aria-hidden="true"
            className="absolute left-0 top-0"
            style={{
              width: ew,
              height: flapH,
              transformOrigin: 'top center',
              transformStyle: 'preserve-3d',
              transform: `rotateX(${step >= 1 ? 178 : 0}deg)`,
              transition: 'transform 0.8s cubic-bezier(0.22,1,0.36,1) 0.12s',
              zIndex: step >= 2 ? 1 : 4,
            }}
          >
            <svg style={face} className="size-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <path d="M0 0 L100 0 L54 94 Q50 100 46 94 Z" fill={paper} stroke={theme.line} strokeWidth="1" vectorEffect="non-scaling-stroke" />
            </svg>
            <svg style={{ ...face, transform: 'rotateX(180deg)' }} className="size-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <path d="M0 0 L100 0 L54 94 Q50 100 46 94 Z" fill={liner} />
            </svg>
          </span>

          {/* wax seal over the flap's tip */}
          <motion.span
            aria-hidden="true"
            className="absolute left-1/2"
            style={{ top: flapH - seal * 0.55, width: seal, height: seal, marginLeft: -seal / 2, zIndex: 5, filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.18))' }}
            animate={step >= 1 ? { scale: 1.25, opacity: 0 } : { scale: 1, opacity: 1 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            <svg viewBox="0 0 40 40" className="size-full" dangerouslySetInnerHTML={{ __html: sealSvg(style, 20, 20, 12, monogramText, colors, esc) }} />
          </motion.span>
        </button>
      </motion.div>

      <motion.p
        className="mt-10 text-sm tracking-wide text-muted"
        animate={{ opacity: opening ? 0 : [0.55, 1, 0.55] }}
        transition={opening ? { duration: 0.3 } : { duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
      >
        Tap the envelope to open
      </motion.p>
    </div>
  )
}

// ---------------------------------------------------------------- card

function FlipCard({ frontHtml, backHtml, width }: { frontHtml: string; backHtml: string; width: number }) {
  const [back, setBack] = useState(false)
  const height = width * RATIO
  const shadow = '0 24px 48px -22px rgba(0,0,0,0.38), 0 2px 6px rgba(0,0,0,0.08)'
  return (
    <div className="mt-6 flex flex-col items-center">
      <div style={{ perspective: 1600 }}>
        <button
          type="button"
          onClick={() => setBack((b) => !b)}
          aria-label={back ? 'Show the front of the card' : 'Turn the card over'}
          className="relative block rounded-[2px] outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-4 focus-visible:ring-offset-cream"
          style={{ width, height }}
        >
          <span
            className="absolute inset-0 block"
            style={{ transformStyle: 'preserve-3d', transform: `rotateY(${back ? 180 : 0}deg)`, transition: 'transform 0.9s cubic-bezier(0.22,1,0.36,1)' }}
          >
            <span className="block" style={{ ...face, boxShadow: shadow }}>
              <CardFace html={frontHtml} width={width} />
            </span>
            <span className="block" style={{ ...face, transform: 'rotateY(180deg)', boxShadow: shadow }}>
              <CardFace html={backHtml} width={width} />
            </span>
          </span>
        </button>
      </div>
      <button
        type="button"
        onClick={() => setBack((b) => !b)}
        className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-sm text-muted transition hover:bg-paper/70 hover:text-ink"
      >
        <RotateCw aria-hidden="true" className="size-3.5" strokeWidth={1.6} />
        {back ? 'Show the front' : 'Turn the card over'}
      </button>
    </div>
  )
}

// ---------------------------------------------------------------- what to do next

function Actions({ inv, settings, code, rsvpOpen, respondBy }: { inv: VirtualInvitation; settings: WeddingSettings; code: string; rsvpOpen: boolean; respondBy: string | null }) {
  const replied = inv.attendanceStatus
  const seatOpen = replied === 'attending' && isFinderOpen(settings.seatingConfig)
  const primary = 'inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-ink px-8 text-[0.95rem] font-medium text-ivory shadow-soft transition hover:bg-ink-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2'

  let message: ReactNode = null
  let action: ReactNode = null
  if (replied === 'attending') {
    message = 'You’ve told us you’re coming. Thank you — we can’t wait to celebrate with you.'
    if (seatOpen)
      action = (
        <Link to="/seat" state={{ name: inv.inviteeName }} className={primary}>
          <Armchair aria-hidden="true" className="size-4" strokeWidth={1.6} />
          Find my seat
        </Link>
      )
  } else if (replied === 'declining') {
    message = 'Thank you for letting us know. You’ll be missed.'
  } else if (rsvpOpen) {
    action = (
      <Link to={`/rsvp?invite=${encodeURIComponent(code)}&from=card`} className={primary}>
        {settings.rsvpButtonLabel?.trim() || 'RSVP'}
      </Link>
    )
    if (respondBy) message = `Please reply by ${respondBy}.`
  } else {
    message = settings.rsvpClosedMessage || 'Our RSVP list is now closed.'
  }

  const link = 'inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm text-ink-soft underline-offset-4 transition hover:text-ink hover:underline'
  return (
    <div className="mt-6 flex w-full max-w-md flex-col items-center text-center">
      {action}
      {message && <p className={`max-w-sm font-serif text-lg italic leading-relaxed text-ink-soft ${action ? 'mt-4' : ''}`}>{message}</p>}
      <nav aria-label="More about the wedding" className="mt-8 flex flex-wrap justify-center gap-x-1 gap-y-1">
        <Link to="/" className={link}>
          <Globe aria-hidden="true" className="size-3.5" strokeWidth={1.6} />
          Our wedding website
        </Link>
        <a href={calendarUrl(settings)} target="_blank" rel="noopener noreferrer" className={link}>
          <CalendarPlus aria-hidden="true" className="size-3.5" strokeWidth={1.6} />
          Add to calendar
        </a>
        {settings.churchMapUrl && (
          <a href={settings.churchMapUrl} target="_blank" rel="noopener noreferrer" className={link}>
            <MapPin aria-hidden="true" className="size-3.5" strokeWidth={1.6} />
            Ceremony map
          </a>
        )}
        {settings.receptionMapUrl && (
          <a href={settings.receptionMapUrl} target="_blank" rel="noopener noreferrer" className={link}>
            <MapPin aria-hidden="true" className="size-3.5" strokeWidth={1.6} />
            Reception map
          </a>
        )}
      </nav>
    </div>
  )
}

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <section className="flex max-w-md flex-1 flex-col items-center justify-center text-center">
      <h1 className="text-3xl leading-tight text-ink sm:text-4xl">{title}</h1>
      <p className="mt-4 leading-relaxed text-ink-soft">{body}</p>
      <Link
        to="/rsvp"
        className="mt-8 inline-flex min-h-12 items-center justify-center rounded-full bg-ink px-8 text-[0.95rem] font-medium text-ivory shadow-soft transition hover:bg-ink-soft"
      >
        Find my invitation
      </Link>
    </section>
  )
}
