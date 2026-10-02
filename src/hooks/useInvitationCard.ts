import { useEffect, useMemo, useState } from 'react'
import { useWeddingSettings } from './useWeddingSettings'
import { useResolvedTheme } from '../theme/themeContext'
import { getCardBackPrefs, type CardBackPrefs } from '../services/virtualInviteService'
import { invitationBackHtml, invitationCardHtml, type PrintTheme } from '../utils/printables'
import { readTheme } from '../utils/printTheme'
import { measureCardFit } from '../utils/cardFit'
import { formatWeddingDate, monogram } from '../utils/formatting'

/** Who the on-screen card is for. */
export interface CardGuest {
  inviteeName: string
  includedGuests: string[]
  /** e.g. "Groom's Mother" ('' for none). */
  position: string
  /** Shown on the front while they still need to reply. */
  respondBy: string | null
}

/**
 * The invitation card (front and back) for the screen: the same layout as the
 * printed card in the website's design style, without the QR. The back carries
 * the "Good to know" sections ticked in Printables (bold titles included).
 * Text shrinks a little when a card is very full; the back always shows the
 * ticked sections, at the smallest size if needed — it's never left blank.
 */
export function useInvitationCard(guest: CardGuest | null) {
  const { settings } = useWeddingSettings()
  const resolved = useResolvedTheme()
  const [theme, setTheme] = useState<PrintTheme | null>(null)
  const [prefs, setPrefs] = useState<CardBackPrefs | null>(null)
  const [fits, setFits] = useState({ front: 1, back: 1 })

  useEffect(() => {
    let alive = true
    getCardBackPrefs().then((p) => alive && setPrefs(p))
    return () => {
      alive = false
    }
  }, [])

  // Read the colours after the site theme has been applied to the page.
  useEffect(() => {
    if (!settings) return
    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => setTheme({ ...readTheme(), style: resolved.style }))
    })
    return () => cancelAnimationFrame(raf)
  }, [settings, resolved])

  const sections = useMemo(() => {
    const visible = (settings?.sections ?? []).filter((x) => x.visible && (x.title.trim() || x.body.trim()))
    const ids = new Set(prefs?.backIds ?? visible.slice(0, 3).map((x) => x.id))
    const bold = new Set(prefs?.boldIds ?? [])
    return visible.filter((x) => ids.has(x.id)).map((x) => ({ title: x.title, body: x.body, bold: bold.has(x.id) }))
  }, [settings, prefs])

  const makeFront = (fit: number) =>
    guest && settings && theme
      ? invitationCardHtml({
          guestName: guest.inviteeName,
          position: guest.position,
          withNames: guest.includedGuests,
          coupleNames: settings.coupleNames,
          dateText: formatWeddingDate(settings.weddingDate, 'full'),
          ceremony: [settings.churchName, settings.ceremonyTime].filter(Boolean).join(' · '),
          reception: [settings.receptionName, settings.receptionTime].filter(Boolean).join(' · '),
          respondBy: guest.respondBy,
          qrSvg: '',
          shortLink: '',
          theme,
          size: '5x7',
          virtual: true,
          fit,
        })
      : ''
  const makeBack = (fit: number) =>
    settings && theme
      ? invitationBackHtml({
          coupleNames: settings.coupleNames,
          dateText: formatWeddingDate(settings.weddingDate),
          monogram: monogram(settings.coupleNames, '&'),
          theme,
          size: '5x7',
          sections,
          fit,
        })
      : ''

  const key = JSON.stringify([guest, theme, sections, settings?.coupleNames, settings?.weddingDate, settings?.churchName, settings?.ceremonyTime, settings?.receptionName, settings?.receptionTime])

  useEffect(() => {
    if (!makeFront(1)) return
    let alive = true
    const host = document.createElement('div')
    host.setAttribute('aria-hidden', 'true')
    Object.assign(host.style, { position: 'fixed', left: '-10000px', top: '0', width: '127mm', visibility: 'hidden', pointerEvents: 'none' })
    document.body.appendChild(host)
    const run = () => {
      if (!alive) return
      try {
        setFits({ front: measureCardFit(makeFront, host).fit, back: measureCardFit(makeBack, host).fit })
      } catch {
        setFits({ front: 1, back: 1 })
      }
    }
    document.fonts.ready.then(run, run)
    return () => {
      alive = false
      host.remove()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const ready = Boolean(guest && settings && theme && prefs)
  return {
    ready,
    theme,
    frontHtml: ready ? makeFront(fits.front) : '',
    backHtml: ready ? makeBack(fits.back) : '',
    monogramText: settings ? monogram(settings.coupleNames, '&') : '',
  }
}
