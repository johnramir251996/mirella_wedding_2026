/**
 * Print-ready layouts (millimetres) for the money envelope and paper
 * invitations. Plain HTML/SVG strings so they render identically on screen,
 * in the browser's print dialog and in tests. All user text is escaped.
 */

export type Paper = 'a4' | 'legal'

/** Landscape sheet sizes in mm. */
export const SHEETS: Record<Paper, { w: number; h: number; label: string }> = {
  a4: { w: 297, h: 210, label: 'A4' },
  legal: { w: 355.6, h: 215.9, label: 'Legal (8.5 × 14 in)' },
}

export interface PrintTheme {
  ink: string
  soft: string
  muted: string
  accent: string
  accentLight: string
  paper: string
  line: string
  serif: string
  sans: string
}

/** Font stacks may contain double quotes, which would break style="…" attributes. */
function safe(t: PrintTheme): PrintTheme {
  const q = (v: string) => v.replace(/"/g, "'")
  return { ...t, serif: q(t.serif), sans: q(t.sans) }
}

export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

/** "Mir & Ella" → names with a styled ampersand. */
function coupleHtml(names: string, t: PrintTheme): string {
  const parts = names.split(/\s*(?:&|and)\s*/i).filter(Boolean)
  if (parts.length < 2) return esc(names)
  return `${esc(parts[0])} <span style="font-style:italic;color:${t.accent}">&amp;</span> ${esc(parts.slice(1).join(' & '))}`
}

// ---------------------------------------------------------------- money envelope

/** Finished envelope ≈ 175 × 90 mm — fits peso bills folded once (or flat). */
export const ENV = { W: 175, H: 90, side: 18, top: 38, bottom: 58 }
export const ENV_FLAT = { w: ENV.W + ENV.side * 2, h: ENV.top + ENV.H + ENV.bottom } // 211 × 186

export interface EnvelopeOptions {
  coupleNames: string
  dateText: string
  monogram: string
  theme: PrintTheme
  /** e.g. "Our Lady of the Pillar Parish · 2:00 PM" */
  ceremony?: string
  reception?: string
}

export function envelopeSvg({ coupleNames, dateText, monogram, theme, ceremony = '', reception = '' }: EnvelopeOptions): string {
  const t = safe(theme)
  const { W, H, side: s, top: tf, bottom: bf } = ENV
  const x0 = s
  const y0 = tf // front panel top-left
  const cut = `fill="none" stroke="${t.ink}" stroke-width="0.35"`
  const fold = `fill="none" stroke="${t.muted}" stroke-width="0.3" stroke-dasharray="2.2 1.6"`
  const r = 5 // corner radius on flaps

  // Outline (cut line), clockwise from the front panel's top-left corner.
  const outline = [
    `M ${x0} ${y0}`,
    // top flap
    `L ${x0 + 16} ${y0 - tf + r}`,
    `Q ${x0 + 18} ${y0 - tf} ${x0 + 18 + r} ${y0 - tf}`,
    `L ${x0 + W - 18 - r} ${y0 - tf}`,
    `Q ${x0 + W - 18} ${y0 - tf} ${x0 + W - 16} ${y0 - tf + r}`,
    `L ${x0 + W} ${y0}`,
    // right side flap
    `L ${x0 + W + s - 2} ${y0 + 10}`,
    `Q ${x0 + W + s} ${y0 + 11} ${x0 + W + s} ${y0 + 14}`,
    `L ${x0 + W + s} ${y0 + H - 14}`,
    `Q ${x0 + W + s} ${y0 + H - 11} ${x0 + W + s - 2} ${y0 + H - 10}`,
    `L ${x0 + W} ${y0 + H}`,
    // bottom flap
    `L ${x0 + W - 8} ${y0 + H + bf - r}`,
    `Q ${x0 + W - 9} ${y0 + H + bf} ${x0 + W - 9 - r} ${y0 + H + bf}`,
    `L ${x0 + 9 + r} ${y0 + H + bf}`,
    `Q ${x0 + 9} ${y0 + H + bf} ${x0 + 8} ${y0 + H + bf - r}`,
    `L ${x0} ${y0 + H}`,
    // left side flap
    `L ${2} ${y0 + H - 10}`,
    `Q ${0} ${y0 + H - 11} ${0} ${y0 + H - 14}`,
    `L ${0} ${y0 + 14}`,
    `Q ${0} ${y0 + 11} ${2} ${y0 + 10}`,
    'Z',
  ].join(' ')

  const cx = x0 + W / 2
  const parts = coupleNames.split(/\s*(?:&|and)\s*/i).filter(Boolean)
  const coupleSvg =
    parts.length >= 2
      ? `${esc(parts[0])} <tspan font-style="italic" fill="${t.accent}">&amp;</tspan> ${esc(parts.slice(1).join(' & '))}`
      : esc(coupleNames)
  const nameSize = Math.min(12, 250 / Math.max(8, coupleNames.length))
  // Bottom-flap content is designed "as seen on the back" then turned 180° so it reads upright once folded.
  const bcx = cx
  const bcy = y0 + H + bf / 2
  // (The far edge of this flap is overlapped ~6 mm by the top flap, so content starts lower.)
  const backLines = [0, 1, 2]
    .map((i) => `<line x1="${x0 + 22}" x2="${x0 + W - 22}" y1="${y0 + H + 34 + i * 7.5}" y2="${y0 + H + 34 + i * 7.5}" stroke="${t.line}" stroke-width="0.3"/>`)
    .join('')
  const bottomContent = `
    <g transform="rotate(180 ${bcx} ${bcy})">
      <text x="${x0 + 22}" y="${y0 + H + 18}" font-family="${t.sans}" font-size="2.9" letter-spacing="0.5" fill="${t.accent}">FROM</text>
      <line x1="${x0 + 34}" x2="${x0 + W - 22}" y1="${y0 + H + 18.5}" y2="${y0 + H + 18.5}" stroke="${t.line}" stroke-width="0.3"/>
      <text x="${x0 + 22}" y="${y0 + H + 28}" font-family="${t.sans}" font-size="2.9" letter-spacing="0.5" fill="${t.accent}">A MESSAGE FOR THE COUPLE</text>
      ${backLines}
    </g>`

  // Top flap: a small wax-seal monogram, turned 180° to face up when closed.
  const tcy = y0 - tf / 2 + 3
  const topContent = `
    <g transform="rotate(180 ${cx} ${tcy})">
      <circle cx="${cx}" cy="${tcy}" r="8.5" fill="${t.accentLight}" stroke="${t.accent}" stroke-width="0.4"/>
      <text x="${cx}" y="${tcy + 1.6}" text-anchor="middle" font-family="${t.serif}" font-style="italic" font-size="5.2" fill="${t.ink}">${esc(monogram)}</text>
    </g>`

  const details = [
    ['CEREMONY', ceremony],
    ['RECEPTION', reception],
  ].filter(([, v]) => v.trim())
  const hasDetails = details.length > 0
  const detailSize = (v: string) => Math.min(2.8, 150 / Math.max(40, v.length + 12) * 1.9)
  const front = `
    <rect x="${x0 + 5}" y="${y0 + 5}" width="${W - 10}" height="${H - 10}" fill="none" stroke="${t.accent}" stroke-width="0.35"/>
    <rect x="${x0 + 6.6}" y="${y0 + 6.6}" width="${W - 13.2}" height="${H - 13.2}" fill="none" stroke="${t.accent}" stroke-width="0.15"/>
    <text x="${cx}" y="${y0 + (hasDetails ? 18 : 27)}" text-anchor="middle" font-family="${t.sans}" font-size="2.8" letter-spacing="1.2" fill="${t.accent}">WITH LOVE &amp; BEST WISHES FOR</text>
    <text x="${cx}" y="${y0 + (hasDetails ? 36 : 51)}" text-anchor="middle" font-family="${t.serif}" font-size="${hasDetails ? Math.min(nameSize, 11) : nameSize}" fill="${t.ink}">${coupleSvg}</text>
    <line x1="${cx - 12}" x2="${cx + 12}" y1="${y0 + (hasDetails ? 43.5 : 62)}" y2="${y0 + (hasDetails ? 43.5 : 62)}" stroke="${t.accent}" stroke-width="0.3"/>
    <text x="${cx}" y="${y0 + (hasDetails ? 51 : 70)}" text-anchor="middle" font-family="${t.sans}" font-size="2.9" letter-spacing="1.4" fill="${t.ink}">${esc(dateText.toUpperCase())}</text>
    ${details
      .map(
        ([label, value], i) =>
          `<text x="${cx}" y="${y0 + 60 + i * 8}" text-anchor="middle" font-family="${t.sans}" font-size="${detailSize(value)}" fill="${t.soft}"><tspan fill="${t.accent}" letter-spacing="0.5">${label}</tspan>  ·  ${esc(value)}</text>`,
      )
      .join('')}`

  const glue = (x: number) => `
    <text x="${x}" y="${y0 + H / 2}" text-anchor="middle" font-family="${t.sans}" font-size="2.3" letter-spacing="0.6" fill="${t.muted}" transform="rotate(-90 ${x} ${y0 + H / 2})">GLUE</text>`

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ENV_FLAT.w}mm" height="${ENV_FLAT.h}mm" viewBox="0 0 ${ENV_FLAT.w} ${ENV_FLAT.h}">
    <path d="${outline}" fill="${t.paper}"/>
    ${front}
    ${bottomContent}
    ${topContent}
    ${glue(s / 2)}${glue(x0 + W + s / 2)}
    <path d="${outline}" ${cut}/>
    <line x1="${x0}" y1="${y0}" x2="${x0 + W}" y2="${y0}" ${fold}/>
    <line x1="${x0}" y1="${y0 + H}" x2="${x0 + W}" y2="${y0 + H}" ${fold}/>
    <line x1="${x0}" y1="${y0}" x2="${x0}" y2="${y0 + H}" ${fold}/>
    <line x1="${x0 + W}" y1="${y0}" x2="${x0 + W}" y2="${y0 + H}" ${fold}/>
  </svg>`
}

export interface NoteCardOptions {
  coupleNames: string
  theme: PrintTheme
  /** Inline SVG of the gift QR (optional). */
  qrImageUrl?: string | null
  width: number
  height: number
}

/** A small message card that fits inside the envelope. */
export function noteCardHtml({ coupleNames, theme, qrImageUrl, width, height }: NoteCardOptions): string {
  const t = safe(theme)
  const lines = Math.max(4, Math.floor((height - (qrImageUrl ? 58 : 34)) / 8))
  return `<div style="box-sizing:border-box;width:${width}mm;height:${height}mm;border:0.35mm solid ${t.ink};background:${t.paper};padding:6mm 6mm 5mm;display:flex;flex-direction:column;font-family:${t.sans};color:${t.ink}">
    <div style="text-align:center;font-size:2.6mm;letter-spacing:0.5mm;color:${t.accent}">A NOTE FOR</div>
    <div style="text-align:center;font-family:${t.serif};font-size:6.2mm;line-height:1.1;margin-top:1.5mm">${coupleHtml(coupleNames, t)}</div>
    <div style="margin-top:4mm;flex:1;display:flex;flex-direction:column;justify-content:space-around">
      ${Array.from({ length: lines }, () => `<div style="border-bottom:0.25mm solid ${t.line};height:0"></div>`).join('')}
    </div>
    <div style="margin-top:3mm;font-size:2.6mm;color:${t.soft}">From: <span style="display:inline-block;width:70%;border-bottom:0.25mm solid ${t.line}"></span></div>
    ${
      qrImageUrl
        ? `<div style="margin-top:4mm;display:flex;align-items:center;gap:3mm;border-top:0.25mm solid ${t.line};padding-top:3mm">
            <img src="${esc(qrImageUrl)}" alt="" style="width:20mm;height:20mm;object-fit:contain"/>
            <div style="font-size:2.5mm;line-height:1.35;color:${t.soft}">Prefer to send your gift digitally? Scan with GCash, Maya or your banking app.</div>
          </div>`
        : ''
    }
  </div>`
}

// ---------------------------------------------------------------- invitation cards

export type CardSize = '5x7' | '4x6'
export const CARD_SIZES: Record<CardSize, { w: number; h: number; label: string; perSheet: Record<Paper, number> }> = {
  '5x7': { w: 127, h: 177.8, label: '5 × 7 in', perSheet: { a4: 2, legal: 2 } },
  '4x6': { w: 101.6, h: 152.4, label: '4 × 6 in', perSheet: { a4: 2, legal: 3 } },
}

export interface InvitationCardOptions {
  guestName: string
  withNames: string[]
  coupleNames: string
  dateText: string
  ceremony: string
  reception: string
  respondBy: string | null
  qrSvg: string
  shortLink: string
  theme: PrintTheme
  size: CardSize
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join('')
  return `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`
}

/** A personalised invitation card, designed at 5×7 in and scaled for 4×6. */
export function invitationCardHtml(o: InvitationCardOptions): string {
  const t = safe(o.theme)
  const base = CARD_SIZES['5x7']
  const size = CARD_SIZES[o.size]
  const k = size.w / base.w
  const inner = `<div style="box-sizing:border-box;width:${base.w}mm;height:${base.h}mm;padding:9mm 10mm 11mm;background:${t.paper};color:${t.ink};font-family:${t.sans};position:relative;display:flex;flex-direction:column;align-items:center;text-align:center">
    <div style="position:absolute;inset:4.5mm;border:0.4mm solid ${t.accent}"></div>
    <div style="position:absolute;inset:6mm;border:0.15mm solid ${t.accent}"></div>
    <div style="margin-top:4mm;font-size:2.7mm;letter-spacing:0.9mm;color:${t.accent}">TOGETHER WITH THEIR FAMILIES</div>
    <div style="margin-top:5mm;font-family:${t.serif};font-size:13mm;line-height:1.02;font-weight:300">${coupleHtml(o.coupleNames, t)}</div>
    <div style="margin-top:4mm;font-family:${t.serif};font-style:italic;font-size:4.2mm;color:${t.soft}">request the pleasure of your company</div>
    <div style="margin-top:5mm;width:22mm;border-top:0.3mm solid ${t.accent}"></div>
    <div style="margin-top:5mm;font-size:2.6mm;letter-spacing:0.6mm;color:${t.muted}">DEAR</div>
    <div style="margin-top:1.5mm;font-family:${t.serif};font-size:7.4mm;line-height:1.1">${esc(o.guestName)}</div>
    ${o.withNames.length ? `<div style="margin-top:1.5mm;font-family:${t.serif};font-style:italic;font-size:4mm;color:${t.soft};max-width:95mm">together with ${esc(joinNames(o.withNames))}</div>` : ''}
    <div style="margin-top:6mm;font-size:3.6mm;letter-spacing:0.9mm;font-weight:500">${esc(o.dateText.toUpperCase())}</div>
    ${o.ceremony ? `<div style="margin-top:3mm;font-size:3.1mm;line-height:1.45;color:${t.soft}"><span style="letter-spacing:0.4mm;color:${t.accent}">CEREMONY</span><br/>${esc(o.ceremony)}</div>` : ''}
    ${o.reception ? `<div style="margin-top:2.5mm;font-size:3.1mm;line-height:1.45;color:${t.soft}"><span style="letter-spacing:0.4mm;color:${t.accent}">RECEPTION</span><br/>${esc(o.reception)}</div>` : ''}
    <div style="margin-top:auto;display:flex;flex-direction:column;align-items:center;text-align:center">
      <div style="display:flex;align-items:center;gap:2.5mm;color:${t.accent};font-size:2.4mm"><span style="width:14mm;border-top:0.3mm solid ${t.accent}"></span>◆<span style="width:14mm;border-top:0.3mm solid ${t.accent}"></span></div>
      <div style="margin-top:3.5mm;width:24mm;height:24mm">${o.qrSvg}</div>
      <div style="margin-top:2.2mm;font-size:3mm;letter-spacing:0.5mm;color:${t.ink};font-weight:500">SCAN TO RSVP</div>
      ${o.respondBy ? `<div style="margin-top:1mm;font-size:2.7mm;color:${t.soft}">Please respond on or before <b style="color:${t.ink}">${esc(o.respondBy)}</b></div>` : ''}
      <div style="margin-top:0.8mm;word-break:break-all;color:${t.muted};font-size:2.2mm;max-width:95mm">${esc(o.shortLink)}</div>
    </div>
  </div>`
  if (k === 1) return inner
  return `<div style="width:${size.w}mm;height:${size.h}mm;overflow:hidden"><div style="transform:scale(${k});transform-origin:top left">${inner}</div></div>`
}

/** Thin corner crop marks around a card placed at (x, y) on a sheet (all mm). */
export function cropMarksSvg(sheetW: number, sheetH: number, cards: { x: number; y: number; w: number; h: number }[], color: string): string {
  const m = 4
  const g = 1.5
  const lines = cards
    .flatMap(({ x, y, w, h }) =>
      [
        [x, y],
        [x + w, y],
        [x, y + h],
        [x + w, y + h],
      ].flatMap(([cx, cy]) => {
        const sx = cx === x ? -1 : 1
        const sy = cy === y ? -1 : 1
        return [
          `<line x1="${cx + sx * g}" y1="${cy}" x2="${cx + sx * (g + m)}" y2="${cy}"/>`,
          `<line x1="${cx}" y1="${cy + sy * g}" x2="${cx}" y2="${cy + sy * (g + m)}"/>`,
        ]
      }),
    )
    .join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${sheetW}mm" height="${sheetH}mm" viewBox="0 0 ${sheetW} ${sheetH}" style="position:absolute;inset:0;pointer-events:none"><g stroke="${color}" stroke-width="0.2">${lines}</g></svg>`
}

/** Positions for n equal cards centred on a sheet with a gap between them. */
export function layoutRow(sheetW: number, sheetH: number, n: number, w: number, h: number, gap = 12): { x: number; y: number; w: number; h: number }[] {
  const total = n * w + (n - 1) * gap
  const x0 = (sheetW - total) / 2
  const y = (sheetH - h) / 2
  return Array.from({ length: n }, (_, i) => ({ x: x0 + i * (w + gap), y, w, h }))
}

/** "Print at 100%" check: a 50 mm bar in the sheet's corner. */
export function calibrationHtml(theme: PrintTheme): string {
  const t = safe(theme)
  return `<div style="position:absolute;left:8mm;bottom:5mm;display:flex;align-items:center;gap:2mm;font-family:${t.sans};font-size:2.2mm;color:${t.muted}">
    <div style="width:50mm;height:1.6mm;border:0.2mm solid ${t.muted};border-top:none"></div>
    <span>Print at 100% (Actual size) — this bar should measure 5 cm</span>
  </div>`
}

/**
 * Back of an invitation card. Deliberately frameless and centred, so a
 * millimetre or two of printer drift when printing the reverse doesn't show.
 */
export function invitationBackHtml(o: { coupleNames: string; dateText: string; monogram: string; theme: PrintTheme; size: CardSize }): string {
  const t = safe(o.theme)
  const s = CARD_SIZES[o.size]
  const k = s.w / CARD_SIZES['5x7'].w
  return `<div style="box-sizing:border-box;width:${s.w}mm;height:${s.h}mm;background:${t.paper};display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:${t.sans}">
    <div style="width:${24 * k}mm;height:${24 * k}mm;border-radius:50%;border:0.4mm solid ${t.accent};display:flex;align-items:center;justify-content:center;font-family:${t.serif};font-style:italic;font-size:${8.5 * k}mm;color:${t.ink}">${esc(o.monogram)}</div>
    <div style="margin-top:${5 * k}mm;font-family:${t.serif};font-size:${5 * k}mm;color:${t.ink}">${coupleHtml(o.coupleNames, t)}</div>
    <div style="margin-top:${2 * k}mm;font-size:${2.6 * k}mm;letter-spacing:0.8mm;color:${t.accent}">${esc(o.dateText.toUpperCase())}</div>
  </div>`
}

/**
 * Orientation label printed in the sheet margin on both sides, so the
 * reverse is fed the right way round ("▲ TOP" edges must match).
 */
export function orientationMarkHtml(side: 'front' | 'back', sheetNo: number, total: number, theme: PrintTheme): string {
  const t = safe(theme)
  const label = side === 'front' ? 'FRONT' : 'BACK'
  return `<div style="position:absolute;left:0;right:0;top:3.5mm;display:flex;justify-content:center;font-family:${t.sans};font-size:2.6mm;letter-spacing:0.5mm;color:${t.muted}">
      <span style="border:0.25mm solid ${t.muted};border-radius:1mm;padding:0.6mm 2mm">▲ TOP EDGE &nbsp;·&nbsp; ${label} &nbsp;·&nbsp; SHEET ${sheetNo} OF ${total}</span>
    </div>
    ${
      side === 'back'
        ? `<div style="position:absolute;left:0;right:0;bottom:3.5mm;text-align:center;font-family:${t.sans};font-size:2.3mm;color:${t.muted}">Print on the reverse of FRONT sheet ${sheetNo}. Both “▲ TOP EDGE” labels should be on the same edge of the paper.</div>`
        : ''
    }`
}
