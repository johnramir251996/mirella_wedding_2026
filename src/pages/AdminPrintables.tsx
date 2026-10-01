import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import QRCode from 'qrcode'
import { CheckCircle2, Mail, Printer, Wallet } from 'lucide-react'
import { useAdminData } from '../hooks/useAdminData'
import { useEntourageLinks } from '../hooks/useEntourageLinks'
import { entouragePositions, invitationPosition } from '../utils/positions'
import { useToast } from '../hooks/useToast'
import { useWeddingSettings } from '../hooks/useWeddingSettings'
import { getGiftSettings } from '../services/giftService'
import { markInvitationsPrinted, updateInvitationPosition } from '../services/adminService'
import { isRsvpOpen } from '../services/settingsService'
import type { InvitationWithRSVP, PositionMode } from '../types/rsvp'
import { bySide, type SideFilter } from '../utils/headcount'
import { FilterTabs } from '../components/admin/FilterTabs'
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
  orientationMarkHtml,
  type CardSize,
  type Paper,
  type PrintTheme,
} from '../utils/printables'
import { siteLinks } from '../utils/share'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { cn } from '../components/ui/cn'
import { PageHeader } from '../components/admin/PageHeader'
import { STYLES, resolveTheme, type StyleId } from '../theme/themes'
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
  const { settings } = useWeddingSettings()
  // Printables follow the website's design style; another can be tried here without changing the website.
  const savedStyle = resolveTheme(settings?.theme).style
  const [designPick, setDesignPick] = useState<StyleId | null>(null)
  const design = designPick ?? savedStyle
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
        <PageHeader title="Printables" description="Print-ready paper invitations and a cut-and-fold money envelope, in your website’s design, colours and fonts." />
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
          <label className="flex items-center gap-2 text-sm text-ink-soft">
            Design
            <select className="input-base min-h-10 w-auto py-1.5" value={design} onChange={(e) => setDesignPick(e.target.value as StyleId)}>
              {STYLES.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name}
                  {st.id === savedStyle ? ' (your website)' : ''}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      {tab === 'invitations' ? <InvitationsTab paper={paper} design={design} /> : <EnvelopeTab paper={paper} design={design} />}
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

/** Sent from the Invitations page: which invitations to pre-select and which side to show. */
export interface PrintablesHandoff {
  select?: string[]
  side?: SideFilter
}

function InvitationsTab({ paper, design }: { paper: Paper; design: StyleId }) {
  const toast = useToast()
  const { data, reload } = useAdminData()
  const { settings } = useWeddingSettings()
  const location = useLocation()
  const [handoff] = useState<PrintablesHandoff>(() => (location.state as PrintablesHandoff | null) ?? {})
  const [size, setSize] = useState<CardSize>('5x7')
  const [showAll, setShowAll] = useState(false)
  const [side, setSide] = useState<SideFilter>(handoff.side ?? 'all')
  const [selected, setSelected] = useState<Set<string>>(() => new Set(handoff.select ?? []))
  // Position edits made here show in the preview straight away, while they save.
  const [posEdits, setPosEdits] = useState<Record<string, { mode: PositionMode; label: string }>>({})
  const [qr, setQr] = useState<Record<string, string>>({})
  const [askMark, setAskMark] = useState(false)
  const [view, setView] = useState<View>('sheets')
  const [printSide, setPrintSide] = useState<'front' | 'back' | 'both'>('front')
  const [sheetNo, setSheetNo] = useState(0) // 0 = all sheets
  const [rotateBacks, setRotateBacks] = useState(false)
  const [showPositions, setShowPositions] = useState(true)
  const { links: entLinks } = useEntourageLinks()
  const autoPositions = useMemo(() => entouragePositions(settings?.entourage ?? [], entLinks), [settings, entLinks])
  const effective = (inv: InvitationWithRSVP): InvitationWithRSVP => {
    const e = posEdits[inv.id]
    return e ? { ...inv, positionMode: e.mode, positionLabel: e.label } : inv
  }
  const positionOf = (inv: InvitationWithRSVP) => (showPositions ? invitationPosition(effective(inv), autoPositions) : '')
  const savePosition = async (inv: InvitationWithRSVP, mode: PositionMode, label: string) => {
    setPosEdits((p) => ({ ...p, [inv.id]: { mode, label } }))
    try {
      await updateInvitationPosition(inv.id, mode, label)
      void reload()
    } catch (e) {
      toast.error(toFriendlyMessage(e))
      setPosEdits((p) => {
        const n = { ...p }
        delete n[inv.id]
        return n
      })
    }
  }
  const withNamesOf = (inv: InvitationWithRSVP) =>
    inv.guests
      .filter((g) => g.addedBy === 'admin')
      .map((g) => {
        const pos = showPositions ? autoPositions.get(`${inv.id}:${g.id}`) : undefined
        return pos ? `${g.guestName} (${pos})` : g.guestName
      })
  const box = useWidth()
  const [marking, setMarking] = useState(false)
  const theme = useMemo(() => ({ ...readTheme(), style: design }), [settings?.theme, design])
  const links = useMemo(() => siteLinks(), [])

  // Arriving with invitations that already responded: show everyone so they're visible.
  useEffect(() => {
    if (!data || !handoff.select?.length) return
    if (data.invitations.some((i) => handoff.select!.includes(i.id) && i.status !== 'pending')) setShowAll(true)
  }, [data, handoff])

  const active = useMemo(() => (data?.invitations ?? []).filter((i) => i.isActive && (showAll || i.status === 'pending')), [data, showAll])
  const list = useMemo(() => bySide(active, side).sort((a, b) => a.inviteeName.localeCompare(b.inviteeName)), [active, side])
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
  const groups = chunk(chosen, perSheet)
  const backCard = invitationBackHtml({
    coupleNames: settings?.coupleNames ?? '',
    dateText: settings ? formatWeddingDate(settings.weddingDate) : '',
    monogram: settings ? monogram(settings.coupleNames, '&') : '',
    theme,
    size,
  })
  const layouts = groups.map((group) => layoutRow(s.w, s.h, group.length === perSheet ? perSheet : group.length, card.w, card.h))
  const fronts = groups.map((group, gi) => {
    const pos = layouts[gi]
    const cards = group
      .map((inv, k) => {
        const html = invitationCardHtml({
          guestName: inv.inviteeName,
          position: positionOf(inv),
          withNames: withNamesOf(inv),
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
    return cards + cropMarksSvg(s.w, s.h, pos, theme.muted) + orientationMarkHtml('front', gi + 1, groups.length, theme) + calibrationHtml(theme)
  })
  // Every card back is identical and the row is centred, so each back lands
  // exactly behind a front whichever way the sheet is turned over.
  const backs = groups.map((_, gi) => {
    const pos = layouts[gi]
    const inner =
      pos.map((p) => `<div style="position:absolute;left:${p.x}mm;top:${p.y}mm">${backCard}</div>`).join('') +
      cropMarksSvg(s.w, s.h, pos, theme.muted) +
      orientationMarkHtml('back', gi + 1, groups.length, theme)
    return rotateBacks ? `<div style="position:absolute;inset:0;transform:rotate(180deg)">${inner}</div>` : inner
  })
  const pick = <T,>(list: T[]) => (sheetNo > 0 ? list.slice(sheetNo - 1, sheetNo) : list)
  const sheets =
    printSide === 'front' ? pick(fronts) : printSide === 'back' ? pick(backs) : pick(fronts.map((f, i) => [f, backs[i]])).flat()

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
          <div className="mb-3">
            <FilterTabs
              label="Guest side"
              value={side}
              onChange={setSide}
              options={[
                { value: 'all', label: 'All', count: active.length },
                { value: 'groom', label: 'Groom', count: bySide(active, 'groom').length },
                { value: 'bride', label: 'Bride', count: bySide(active, 'bride').length },
              ]}
            />
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
                <li key={i.id} className="py-1.5">
                  <label className="flex cursor-pointer items-center gap-3 rounded-md px-1 py-1 text-sm hover:bg-cream/60">
                    <input type="checkbox" checked={selected.has(i.id)} onChange={() => toggle(i.id)} className="size-4 accent-ink" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-ink">{i.inviteeName}</span>
                      {i.guests.some((g) => g.addedBy === 'admin') && (
                        <span className="block truncate text-xs text-muted">+ {i.guests.filter((g) => g.addedBy === 'admin').map((g) => g.guestName).join(', ')}</span>
                      )}
                    </span>
                    {i.printedAt && <Badge tone="gray">Printed {formatDateTime(i.printedAt).split(',')[0]}</Badge>}
                  </label>
                  <PositionPicker
                    invitation={effective(i)}
                    auto={autoPositions.get(`${i.id}:`) ?? ''}
                    onSave={(mode, label) => void savePosition(i, mode, label)}
                  />
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
          <div>
            <p className="mb-1.5 text-sm text-ink-soft">What to print</p>
            <div role="radiogroup" aria-label="What to print" className="grid grid-cols-3 gap-1 rounded-lg bg-cream p-1">
              {(
                [
                  { v: 'front', l: 'Fronts' },
                  { v: 'back', l: 'Backs' },
                  { v: 'both', l: 'Both sides' },
                ] as const
              ).map((o) => (
                <button
                  key={o.v}
                  type="button"
                  role="radio"
                  aria-checked={printSide === o.v}
                  onClick={() => setPrintSide(o.v)}
                  className={cn('rounded-md px-2 py-1.5 text-sm transition', printSide === o.v ? 'bg-paper text-ink shadow-soft' : 'text-muted hover:text-ink')}
                >
                  {o.l}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-muted">
              {printSide === 'both' ? 'For printers that print both sides automatically (duplex).' : 'Print the fronts, put the pages back in the printer, then print the backs.'}
            </p>
          </div>
          {groups.length > 1 && (
            <label className="flex items-center justify-between gap-2 text-sm text-ink-soft">
              Sheets
              <select className="input-base min-h-10 w-auto max-w-[60%] py-1.5" value={sheetNo} onChange={(e) => setSheetNo(Number(e.target.value))}>
                <option value={0}>All {groups.length} sheets</option>
                {groups.map((g, i) => (
                  <option key={i} value={i + 1}>
                    Sheet {i + 1}: {g.map((x) => x.inviteeName.split(' ')[0]).join(', ')}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="flex items-start justify-between gap-3 text-sm text-ink-soft">
            <span>
              Show positions under names
              <span className="block text-xs text-muted">E.g. “Maid of Honor”. Set per invitation, or taken from the Entourage.</span>
            </span>
            <input type="checkbox" checked={showPositions} onChange={(e) => setShowPositions(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-ink" />
          </label>
          {printSide !== 'front' && (
            <label className="flex items-start justify-between gap-3 text-sm text-ink-soft">
              <span>
                Turn the backs upside-down
                <span className="block text-xs text-muted">Tick this if your test print came out with the “▲ TOP EDGE” labels on opposite edges.</span>
              </span>
              <input type="checkbox" checked={rotateBacks} onChange={(e) => setRotateBacks(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-ink" />
            </label>
          )}
          <Button fullWidth disabled={!chosen.length} onClick={() => window.print()} icon={<Printer aria-hidden="true" className="size-4" />}>
            {printSide === 'front' ? 'Print fronts' : printSide === 'back' ? 'Print backs' : 'Print both sides'}
            {sheetNo > 0 ? ` (sheet ${sheetNo})` : groups.length > 1 ? ` (${groups.length} sheets)` : ''}
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
          <p className="font-medium text-ink">Printing both sides by hand</p>
          <ol className="mt-1 list-decimal space-y-1 pl-5">
            <li>Try one sheet on plain paper first.</li>
            <li>
              Choose <strong>Fronts</strong> and print.
            </li>
            <li>Put the printed page back into the tray so the blank side will be printed (check your printer’s paper icon), keeping the “▲ TOP EDGE” in mind.</li>
            <li>
              Choose <strong>Backs</strong> and print.
            </li>
            <li>Hold it up to a light: both “▲ TOP EDGE” labels should be on the same edge and the corner marks should line up. If the back is upside-down, tick “Turn the backs upside-down”.</li>
          </ol>
          <p className="mt-2 text-xs text-muted">One sheet at a time? Pick it under “Sheets”. The back has no border, so a millimetre of printer drift won’t show.</p>
        </Tips>
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
              position: chosen[0] ? positionOf(chosen[0]) : 'Maid of Honor',
              withNames: chosen[0] ? withNamesOf(chosen[0]) : [],
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

function EnvelopeTab({ paper, design }: { paper: Paper; design: StyleId }) {
  const { settings } = useWeddingSettings()
  const [copies, setCopies] = useState(1)
  const [withQr, setWithQr] = useState(true)
  const [giftQr, setGiftQr] = useState<string | null>(null)
  const theme = useMemo(() => ({ ...readTheme(), style: design }), [settings?.theme, design])
  const [view, setView] = useState<View>('sheets')
  const box = useWidth()

  useEffect(() => {
    getGiftSettings()
      .then((g) => setGiftQr(g.qrImageUrl || null))
      .catch(() => setGiftQr(null))
  }, [])

  const s = SHEETS[paper]
  const envSvg = envelopeSvg({
    coupleNames: settings?.coupleNames ?? '',
    dateText: settings ? formatWeddingDate(settings.weddingDate, 'full') : '',
    monogram: settings ? monogram(settings.coupleNames, '&') : '',
    theme,
    ceremony: [settings?.churchName, settings?.ceremonyTime].filter(Boolean).join(' · '),
    reception: [settings?.receptionName, settings?.receptionTime].filter(Boolean).join(' · '),
    giftQrUrl: withQr ? giftQr : null,
  })
  const sheetHtml = `<div style="position:absolute;left:${(s.w - ENV_FLAT.w) / 2}mm;top:${(s.h - ENV_FLAT.h) / 2}mm">${envSvg}</div>` + calibrationHtml(theme)

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
          <label className={cn('flex items-center justify-between gap-2 text-sm', giftQr ? 'text-ink-soft' : 'text-muted')}>
            <span>
              Gift QR on the envelope
              <span className="block text-xs text-muted">
                {giftQr ? 'Printed on the front: “Or send your gift online”. Without it, your monogram seal goes there.' : 'Upload your GCash / InstaPay QR in Website Settings first.'}
              </span>
            </span>
            <input type="checkbox" disabled={!giftQr} checked={Boolean(giftQr) && withQr} onChange={(e) => setWithQr(e.target.checked)} className="size-5 shrink-0 accent-ink" />
          </label>
          <Button fullWidth onClick={() => window.print()} icon={<Printer aria-hidden="true" className="size-4" />}>
            Print {copies} {copies === 1 ? 'envelope' : 'envelopes'}
          </Button>
        </section>
        <Tips>
          <p className="font-medium text-ink">Folding the policy envelope</p>
          <ol className="mt-1 list-decimal space-y-1 pl-5">
            <li>
              Print at <strong>Actual size / 100%</strong> on 120–160 gsm paper. The bar at the bottom should measure 5 cm.
            </li>
            <li>Cut along the solid outline (including the little half-circle).</li>
            <li>Fold the back panel under the front along the long dashed line.</li>
            <li>Fold the long glue strip and the short bottom flap onto the back, over the areas marked “GLUE”, and press flat.</li>
            <li>Slip the bills in flat through the top, then fold the rounded flap down over the back — close it with a sticker.</li>
          </ol>
          <p className="mt-2 text-xs text-muted">Finished size about 9.2 × 18.5 cm — peso bills fit without folding. Guests write a message and their name on the back.</p>
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

// ---------------------------------------------------------------- position per invitation

/** Same three choices as in Add/Edit Invitation; saves to the invitation. */
function PositionPicker({ invitation, auto, onSave }: { invitation: InvitationWithRSVP; auto: string; onSave: (mode: PositionMode, label: string) => void }) {
  const [draft, setDraft] = useState(invitation.positionLabel)
  useEffect(() => setDraft(invitation.positionLabel), [invitation.positionLabel])
  const id = `pos-${invitation.id}`
  const commit = () => {
    if (draft.trim() !== invitation.positionLabel.trim()) onSave('custom', draft)
  }
  return (
    <div className="ml-8 mt-1 flex flex-wrap items-center gap-1.5 text-xs">
      <label htmlFor={id} className="text-muted">
        Position
      </label>
      <select
        id={id}
        className="input-base min-h-8 w-auto py-0.5 pl-2 pr-7 text-xs"
        value={invitation.positionMode}
        onChange={(e) => onSave(e.target.value as PositionMode, e.target.value === 'custom' ? draft : invitation.positionLabel)}
      >
        <option value="auto">From entourage{auto ? ` (${auto})` : ' (not linked)'}</option>
        <option value="custom">Type it</option>
        <option value="none">Don’t show</option>
      </select>
      {invitation.positionMode === 'custom' && (
        <input
          aria-label={`Position for ${invitation.inviteeName}`}
          className="input-base min-h-8 min-w-0 flex-1 basis-32 py-0.5 text-xs"
          value={draft}
          maxLength={80}
          placeholder="e.g. Ninang"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              ;(e.target as HTMLInputElement).blur()
            }
          }}
        />
      )}
    </div>
  )
}
