import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import QRCode from 'qrcode'
import { CheckCircle2, Mail, Printer, Wallet } from 'lucide-react'
import { useAdminData } from '../hooks/useAdminData'
import { useToast } from '../hooks/useToast'
import { useWeddingSettings } from '../hooks/useWeddingSettings'
import { getGiftSettings } from '../services/giftService'
import { markInvitationsPrinted } from '../services/adminService'
import { isRsvpOpen } from '../services/settingsService'
import type { InvitationWithRSVP } from '../types/rsvp'
import { toFriendlyMessage } from '../utils/errors'
import { formatDateTime, formatDeadlineDate, formatWeddingDate, monogram } from '../utils/formatting'
import {
  CARD_SIZES,
  ENV_FLAT,
  SHEETS,
  calibrationHtml,
  cropMarksSvg,
  envelopeSvg,
  invitationBackHtml,
  invitationCardHtml,
  layoutRow,
  noteCardHtml,
  type CardSize,
  type Paper,
  type PrintTheme,
} from '../utils/printables'
import { siteLinks } from '../utils/share'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { cn } from '../components/ui/cn'
import { PageHeader } from '../components/admin/PageHeader'
import { Card3D, Envelope3D } from '../components/printables/Preview3D'

type Tab = 'invitations' | 'envelope'
const PX_PER_MM = 96 / 25.4

function readTheme(): PrintTheme {
  const cs = getComputedStyle(document.documentElement)
  const v = (name: string, d: string) => cs.getPropertyValue(name).trim() || d
  return {
    ink: v('--color-ink', '#2b2a28'),
    soft: v('--color-ink-soft', '#55504a'),
    muted: v('--color-muted', '#8a847b'),
    accent: v('--color-gold', '#b89b6a'),
    accentLight: v('--color-champagne-light', '#efe4cf'),
    paper: v('--color-paper', '#fffdf9'),
    line: v('--color-line', '#d9d0c1'),
    serif: v('--font-serif', 'Georgia, serif'),
    sans: v('--font-sans', 'Arial, sans-serif'),
  }
}

const chunk = <T,>(list: T[], n: number) => Array.from({ length: Math.ceil(list.length / n) }, (_, i) => list.slice(i * n, i * n + n))

export default function AdminPrintables() {
  const [tab, setTab] = useState<Tab>('invitations')
  const [paper, setPaper] = useState<Paper>('a4')
  const sheet = SHEETS[paper]

  useEffect(() => {
    document.title = 'Printables · Wedding admin'
  }, [])

  // The browser's print dialog uses this exact page size, with no margins.
  useEffect(() => {
    const el = document.createElement('style')
    el.textContent = `@page { size: ${sheet.w}mm ${sheet.h}mm; margin: 0; }`
    document.head.appendChild(el)
    return () => el.remove()
  }, [sheet.w, sheet.h])

  return (
    <>
      <div className="print:hidden">
        <PageHeader title="Printables" description="Print-ready paper invitations and a cut-and-fold money envelope, in your website’s colours and fonts." />
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div role="tablist" aria-label="Printable type" className="flex gap-1 rounded-lg bg-cream p-1">
            {(
              [
                { v: 'invitations', l: 'Paper invitations', i: Mail },
                { v: 'envelope', l: 'Money envelope', i: Wallet },
              ] as const
            ).map((t) => (
              <button
                key={t.v}
                role="tab"
                type="button"
                aria-selected={tab === t.v}
                onClick={() => setTab(t.v)}
                className={cn('inline-flex items-center gap-2 rounded-md px-3.5 py-2 text-sm transition', tab === t.v ? 'bg-paper text-ink shadow-soft' : 'text-muted hover:text-ink')}
              >
                <t.i aria-hidden="true" className="size-4" /> {t.l}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm text-ink-soft">
            Paper
            <select className="input-base min-h-10 w-auto py-1.5" value={paper} onChange={(e) => setPaper(e.target.value as Paper)}>
              <option value="a4">A4</option>
              <option value="legal">Legal (8.5 × 14 in)</option>
            </select>
          </label>
        </div>
      </div>
      {tab === 'invitations' ? <InvitationsTab paper={paper} /> : <EnvelopeTab paper={paper} />}
    </>
  )
}

// ---------------------------------------------------------------- shared preview

function Sheets({ paper, sheets }: { paper: Paper; sheets: string[] }) {
  const s = SHEETS[paper]
  const [width, setWidth] = useState(800)
  const scale = Math.min(1, width / (s.w * PX_PER_MM))
  return (
    <div
      ref={(el) => {
        if (el && Math.abs(el.clientWidth - width) > 4) setWidth(el.clientWidth)
      }}
      className="space-y-4 print:space-y-0"
    >
      {sheets.map((html, i) => (
        <div
          key={i}
          style={{ height: s.h * PX_PER_MM * scale, '--pv': scale } as CSSProperties}
          className="print-page overflow-hidden rounded-md shadow-card print:!h-auto print:overflow-hidden print:rounded-none print:shadow-none"
        >
          <div
            className="print-sheet origin-top-left [transform:scale(var(--pv))] print:[transform:none]"
            style={{ width: `${s.w}mm`, height: `${s.h - 1}mm` }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      ))}
    </div>
  )
}

type View = 'sheets' | '3d'

function ViewToggle({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  return (
    <div role="radiogroup" aria-label="Preview" className="mb-3 inline-flex gap-1 rounded-lg bg-cream p-1 print:hidden">
      {(
        [
          { v: 'sheets', l: 'Print sheets' },
          { v: '3d', l: '3D preview' },
        ] as const
      ).map((o) => (
        <button
          key={o.v}
          type="button"
          role="radio"
          aria-checked={view === o.v}
          onClick={() => onChange(o.v)}
          className={cn('rounded-md px-3 py-1.5 text-sm transition', view === o.v ? 'bg-paper text-ink shadow-soft' : 'text-muted hover:text-ink')}
        >
          {o.l}
        </button>
      ))}
    </div>
  )
}

/** Measures the available width (for sizing the 3D preview). */
function useWidth() {
  const [width, setWidth] = useState(640)
  const ref = (el: HTMLElement | null) => {
    if (el && Math.abs(el.clientWidth - width) > 4) setWidth(el.clientWidth)
  }
  return { width, ref }
}

function Tips({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-line bg-paper p-4 text-sm text-ink-soft shadow-soft">{children}</div>
}

// ---------------------------------------------------------------- invitations

function InvitationsTab({ paper }: { paper: Paper }) {
  const toast = useToast()
  const { data, reload } = useAdminData()
  const { settings } = useWeddingSettings()
  const [size, setSize] = useState<CardSize>('5x7')
  const [showAll, setShowAll] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [qr, setQr] = useState<Record<string, string>>({})
  const [askMark, setAskMark] = useState(false)
  const [view, setView] = useState<View>('sheets')
  const box = useWidth()
  const [marking, setMarking] = useState(false)
  const theme = useMemo(readTheme, [settings?.theme])
  const links = useMemo(() => siteLinks(), [])

  const list = useMemo(
    () =>
      (data?.invitations ?? [])
        .filter((i) => i.isActive && (showAll || i.status === 'pending'))
        .sort((a, b) => a.inviteeName.localeCompare(b.inviteeName)),
    [data, showAll],
  )
  const chosen = list.filter((i) => selected.has(i.id))
  const linkFor = (i: InvitationWithRSVP) => `${links.rsvp}?invite=${encodeURIComponent(i.invitationCode)}`

  useEffect(() => {
    let active = true
    const missing = chosen.filter((i) => !qr[i.id])
    if (!missing.length) return
    Promise.all(
      missing.map(async (i) => [i.id, await QRCode.toString(linkFor(i), { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#000000', light: '#ffffff00' } })] as const),
    ).then((pairs) => active && setQr((q) => ({ ...q, ...Object.fromEntries(pairs) })))
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chosen.map((c) => c.id).join(',')])

  useEffect(() => {
    const after = () => chosen.length && setAskMark(true)
    window.addEventListener('afterprint', after)
    return () => window.removeEventListener('afterprint', after)
  }, [chosen.length])

  const card = CARD_SIZES[size]
  const perSheet = card.perSheet[paper]
  const s = SHEETS[paper]
  const respondBy = settings && settings.rsvpShowDeadline && settings.rsvpDeadline && isRsvpOpen(settings) ? formatDeadlineDate(settings.rsvpDeadline) : null
  const shortLink = links.home.replace(/^https?:\/\//, '').replace(/\/$/, '')
  const sheets = chunk(chosen, perSheet).map((group) => {
    const pos = layoutRow(s.w, s.h, group.length === perSheet ? perSheet : group.length, card.w, card.h)
    const cards = group
      .map((inv, k) => {
        const html = invitationCardHtml({
          guestName: inv.inviteeName,
          withNames: inv.guests.filter((g) => g.addedBy === 'admin').map((g) => g.guestName),
          coupleNames: settings?.coupleNames ?? '',
          dateText: settings ? formatWeddingDate(settings.weddingDate, 'full') : '',
          ceremony: [settings?.churchName, settings?.ceremonyTime].filter(Boolean).join(' · '),
          reception: [settings?.receptionName, settings?.receptionTime].filter(Boolean).join(' · '),
          respondBy,
          qrSvg: qr[inv.id] ?? '',
          shortLink,
          theme,
          size,
        })
        return `<div style="position:absolute;left:${pos[k].x}mm;top:${pos[k].y}mm">${html}</div>`
      })
      .join('')
    return cards + cropMarksSvg(s.w, s.h, pos, theme.muted) + calibrationHtml(theme)
  })

  const toggle = (id: string) =>
    setSelected((cur) => {
      const n = new Set(cur)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  const mark = async () => {
    setMarking(true)
    try {
      await markInvitationsPrinted(chosen.map((c) => c.id))
      toast.success(`Marked ${chosen.length} as printed.`)
      setAskMark(false)
      setSelected(new Set())
      await reload()
    } catch (e) {
      toast.error(toFriendlyMessage(e))
    } finally {
      setMarking(false)
    }
  }

  return (
    <div className="grid gap-5 print:block xl:grid-cols-[360px_1fr]">
      <aside className="space-y-4 print:hidden">
        <section className="rounded-xl border border-line bg-paper p-4 shadow-soft">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="font-sans text-sm font-semibold text-ink">{showAll ? 'All invitations' : 'Pending — no response yet'}</h2>
            <label className="flex items-center gap-1.5 text-xs text-muted">
              <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} className="accent-ink" /> Show everyone
            </label>
          </div>
          <div className="mb-2 flex flex-wrap gap-2 text-xs">
            <button type="button" className="rounded-md bg-cream px-2.5 py-1.5 hover:bg-linen" onClick={() => setSelected(new Set(list.filter((i) => !i.printedAt).map((i) => i.id)))}>
              Select not yet printed
            </button>
            <button type="button" className="rounded-md bg-cream px-2.5 py-1.5 hover:bg-linen" onClick={() => setSelected(new Set(list.map((i) => i.id)))}>
              Select all
            </button>
            <button type="button" className="rounded-md px-2.5 py-1.5 text-muted hover:bg-cream" onClick={() => setSelected(new Set())}>
              Clear
            </button>
          </div>
          {list.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">{showAll ? 'No invitations yet.' : 'Everyone has responded. 🎉'}</p>
          ) : (
            <ul className="max-h-[55vh] divide-y divide-line overflow-y-auto">
              {list.map((i) => (
                <li key={i.id}>
                  <label className="flex cursor-pointer items-center gap-3 px-1 py-2.5 text-sm hover:bg-cream/60">
                    <input type="checkbox" checked={selected.has(i.id)} onChange={() => toggle(i.id)} className="size-4 accent-ink" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-ink">{i.inviteeName}</span>
                      {i.guests.some((g) => g.addedBy === 'admin') && (
                        <span className="block truncate text-xs text-muted">+ {i.guests.filter((g) => g.addedBy === 'admin').map((g) => g.guestName).join(', ')}</span>
                      )}
                    </span>
                    {i.printedAt && <Badge tone="gray">Printed {formatDateTime(i.printedAt).split(',')[0]}</Badge>}
                  </label>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="space-y-3 rounded-xl border border-line bg-paper p-4 shadow-soft">
          <label className="flex items-center justify-between gap-2 text-sm text-ink-soft">
            Card size
            <select className="input-base min-h-10 w-auto py-1.5" value={size} onChange={(e) => setSize(e.target.value as CardSize)}>
              {(Object.keys(CARD_SIZES) as CardSize[]).map((k) => (
                <option key={k} value={k}>
                  {CARD_SIZES[k].label} — {CARD_SIZES[k].perSheet[paper]} per sheet
                </option>
              ))}
            </select>
          </label>
          <Button fullWidth disabled={!chosen.length} onClick={() => window.print()} icon={<Printer aria-hidden="true" className="size-4" />}>
            Print {chosen.length || ''} {chosen.length === 1 ? 'invitation' : 'invitations'}
          </Button>
          {askMark && chosen.length > 0 && (
            <div className="rounded-lg border border-gold/40 bg-champagne-light/30 p-3 text-sm">
              <p className="text-ink">Did they print well? Mark {chosen.length} as printed so you don’t print them twice.</p>
              <div className="mt-2 flex gap-2">
                <Button size="sm" loading={marking} onClick={() => void mark()} icon={<CheckCircle2 aria-hidden="true" className="size-4" />}>
                  Mark as printed
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setAskMark(false)}>
                  Not now
                </Button>
              </div>
            </div>
          )}
        </section>
        <Tips>
          <p>
            Each card has the guest’s name, their included guests, your date and venues, and a <strong>personal QR code</strong> that opens their own
            invitation — no typing needed. Tables are never printed.
          </p>
          <p className="mt-2">In the print dialog choose <strong>Actual size / 100%</strong>, turn off headers & footers, and use thick paper (200 gsm or more). Cut along the corner marks.</p>
        </Tips>
      </aside>
      <section aria-label="Print preview" className="min-w-0" ref={box.ref}>
        <ViewToggle view={view} onChange={setView} />
        {view === '3d' ? (
          <Card3D
            width={box.width}
            widthMm={CARD_SIZES[size].w}
            heightMm={CARD_SIZES[size].h}
            frontHtml={invitationCardHtml({
              guestName: chosen[0]?.inviteeName ?? 'Your Guest’s Name',
              withNames: chosen[0] ? chosen[0].guests.filter((g) => g.addedBy === 'admin').map((g) => g.guestName) : [],
              coupleNames: settings?.coupleNames ?? '',
              dateText: settings ? formatWeddingDate(settings.weddingDate, 'full') : '',
              ceremony: [settings?.churchName, settings?.ceremonyTime].filter(Boolean).join(' · '),
              reception: [settings?.receptionName, settings?.receptionTime].filter(Boolean).join(' · '),
              respondBy,
              qrSvg: (chosen[0] && qr[chosen[0].id]) || '',
              shortLink,
              theme,
              size,
            })}
            backHtml={invitationBackHtml({
              coupleNames: settings?.coupleNames ?? '',
              dateText: settings ? formatWeddingDate(settings.weddingDate) : '',
              monogram: settings ? monogram(settings.coupleNames, '&') : '',
              theme,
              size,
            })}
          />
        ) : chosen.length === 0 ? (
          <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-line text-sm text-muted print:hidden">
            Tick guests on the left to preview their invitations.
          </div>
        ) : (
          <Sheets paper={paper} sheets={sheets} />
        )}
      </section>
    </div>
  )
}

// ---------------------------------------------------------------- envelope

function EnvelopeTab({ paper }: { paper: Paper }) {
  const { settings } = useWeddingSettings()
  const [copies, setCopies] = useState(1)
  const [withCard, setWithCard] = useState(true)
  const [withQr, setWithQr] = useState(true)
  const [giftQr, setGiftQr] = useState<string | null>(null)
  const theme = useMemo(readTheme, [settings?.theme])
  const [view, setView] = useState<View>('sheets')
  const box = useWidth()

  useEffect(() => {
    getGiftSettings()
      .then((g) => setGiftQr(g.qrImageUrl || null))
      .catch(() => setGiftQr(null))
  }, [])

  const s = SHEETS[paper]
  const card = paper === 'a4' ? { w: 66, h: 100 } : { w: 80, h: 140 }
  const gap = 8
  const total = ENV_FLAT.w + (withCard ? gap + card.w : 0)
  const x = (s.w - total) / 2
  const envSvg = envelopeSvg({
    coupleNames: settings?.coupleNames ?? '',
    dateText: settings ? formatWeddingDate(settings.weddingDate, 'full') : '',
    monogram: settings ? monogram(settings.coupleNames, '&') : '',
    theme,
    ceremony: [settings?.churchName, settings?.ceremonyTime].filter(Boolean).join(' · '),
    reception: [settings?.receptionName, settings?.receptionTime].filter(Boolean).join(' · '),
  })
  const sheetHtml =
    `<div style="position:absolute;left:${x}mm;top:${(s.h - ENV_FLAT.h) / 2}mm">${envSvg}</div>` +
    (withCard
      ? `<div style="position:absolute;left:${x + ENV_FLAT.w + gap}mm;top:${(s.h - card.h) / 2}mm">${noteCardHtml({
          coupleNames: settings?.coupleNames ?? '',
          theme,
          qrImageUrl: withQr ? giftQr : null,
          width: card.w,
          height: card.h,
        })}</div>`
      : '') +
    calibrationHtml(theme)

  return (
    <div className="grid gap-5 print:block xl:grid-cols-[360px_1fr]">
      <aside className="space-y-4 print:hidden">
        <section className="space-y-4 rounded-xl border border-line bg-paper p-4 shadow-soft">
          <label className="flex items-center justify-between gap-2 text-sm text-ink-soft">
            Number of envelopes
            <input
              type="number"
              min={1}
              max={50}
              value={copies}
              onChange={(e) => setCopies(Math.max(1, Math.min(50, Math.trunc(Number(e.target.value) || 1))))}
              className="input-base min-h-10 w-24 py-1.5"
            />
          </label>
          <label className="flex items-center justify-between gap-2 text-sm text-ink-soft">
            Add a message card beside it
            <input type="checkbox" checked={withCard} onChange={(e) => setWithCard(e.target.checked)} className="size-5 accent-ink" />
          </label>
          <label className={cn('flex items-center justify-between gap-2 text-sm', giftQr && withCard ? 'text-ink-soft' : 'text-muted')}>
            <span>
              Gift QR on the card
              {!giftQr && <span className="block text-xs">Upload your QR in Website Settings first.</span>}
            </span>
            <input type="checkbox" disabled={!giftQr || !withCard} checked={Boolean(giftQr) && withCard && withQr} onChange={(e) => setWithQr(e.target.checked)} className="size-5 accent-ink" />
          </label>
          <Button fullWidth onClick={() => window.print()} icon={<Printer aria-hidden="true" className="size-4" />}>
            Print {copies} {copies === 1 ? 'sheet' : 'sheets'}
          </Button>
        </section>
        <Tips>
          <ol className="list-decimal space-y-1 pl-5">
            <li>
              Print at <strong>Actual size / 100%</strong> on 120–160 gsm paper. The bar at the bottom should measure 5 cm.
            </li>
            <li>Cut along the solid outline.</li>
            <li>Fold the two side flaps inwards along the dashed lines.</li>
            <li>Fold the bottom flap up and glue it onto the side flaps (“GLUE”).</li>
            <li>Slip the money in (bills folded once fit easily), then fold the top flap down — seal with a sticker.</li>
          </ol>
          <p className="mt-2 text-xs text-muted">Finished size about 17.5 × 9 cm. Guests write their name and a message on the back.</p>
        </Tips>
      </aside>
      <section aria-label="Print preview" className="min-w-0" ref={box.ref}>
        <ViewToggle view={view} onChange={setView} />
        {view === '3d' ? (
          <Envelope3D svg={envSvg} paper={theme.paper} width={box.width} />
        ) : (
          <Sheets paper={paper} sheets={Array.from({ length: copies }, () => sheetHtml)} />
        )}
      </section>
    </div>
  )
}
