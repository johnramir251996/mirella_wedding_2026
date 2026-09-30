/**
 * Look & Feel: templates, font pairings and colour derivation.
 *
 * Every template is defined by three base colours (background, text, accent),
 * a heading/body font pair and a hero layout. All other shades used by the
 * site are derived from those three and adjusted until they pass WCAG
 * contrast, so any combination the couple picks stays readable.
 */

export type HeroLayout = 'center' | 'left' | 'split' | 'framed'

export interface ThemeSettings {
  template: string
  headingFont?: string
  bodyFont?: string
  background?: string
  text?: string
  accent?: string
  heroLayout?: HeroLayout
}

export interface FontOption {
  id: string
  family: string
  /** Google Fonts css2 axis spec ('' = regular only). Must match the family's real axes. */
  spec: string
  fallback: string
}

export const HEADING_FONTS: FontOption[] = [
  { id: 'cormorant', family: 'Cormorant Garamond', spec: 'ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500', fallback: 'Georgia, serif' },
  { id: 'playfair', family: 'Playfair Display', spec: 'ital,wght@0,400;0,500;0,600;1,400;1,500', fallback: 'Georgia, serif' },
  { id: 'eb-garamond', family: 'EB Garamond', spec: 'ital,wght@0,400;0,500;0,600;1,400;1,500', fallback: 'Georgia, serif' },
  { id: 'lora', family: 'Lora', spec: 'ital,wght@0,400;0,500;0,600;1,400;1,500', fallback: 'Georgia, serif' },
  { id: 'libre-baskerville', family: 'Libre Baskerville', spec: 'ital,wght@0,400;0,700;1,400', fallback: 'Georgia, serif' },
  { id: 'bodoni', family: 'Bodoni Moda', spec: 'ital,wght@0,400;0,500;0,600;1,400;1,500', fallback: 'Didot, Georgia, serif' },
  { id: 'dm-serif', family: 'DM Serif Display', spec: 'ital@0;1', fallback: 'Georgia, serif' },
  { id: 'marcellus', family: 'Marcellus', spec: '', fallback: 'Georgia, serif' },
  { id: 'cinzel', family: 'Cinzel', spec: 'wght@400;500;600', fallback: 'Georgia, serif' },
  { id: 'italiana', family: 'Italiana', spec: '', fallback: 'Georgia, serif' },
]

export const BODY_FONTS: FontOption[] = [
  { id: 'jost', family: 'Jost', spec: 'wght@300;400;500;600', fallback: 'Helvetica Neue, Arial, sans-serif' },
  { id: 'montserrat', family: 'Montserrat', spec: 'wght@300;400;500;600', fallback: 'Helvetica Neue, Arial, sans-serif' },
  { id: 'lato', family: 'Lato', spec: 'wght@300;400;700', fallback: 'Helvetica Neue, Arial, sans-serif' },
  { id: 'inter', family: 'Inter', spec: 'wght@300;400;500;600', fallback: 'Helvetica Neue, Arial, sans-serif' },
  { id: 'dm-sans', family: 'DM Sans', spec: 'wght@300;400;500;600', fallback: 'Helvetica Neue, Arial, sans-serif' },
  { id: 'josefin', family: 'Josefin Sans', spec: 'wght@300;400;500;600', fallback: 'Helvetica Neue, Arial, sans-serif' },
  { id: 'raleway', family: 'Raleway', spec: 'wght@300;400;500;600', fallback: 'Helvetica Neue, Arial, sans-serif' },
  { id: 'nunito-sans', family: 'Nunito Sans', spec: 'wght@300;400;600', fallback: 'Helvetica Neue, Arial, sans-serif' },
  { id: 'karla', family: 'Karla', spec: 'wght@300;400;500;600', fallback: 'Helvetica Neue, Arial, sans-serif' },
]

export interface Template {
  id: string
  name: string
  description: string
  background: string
  text: string
  accent: string
  headingFont: string
  bodyFont: string
  heroLayout: HeroLayout
}

export const TEMPLATES: Template[] = [
  { id: 'classic', name: 'Classic Ivory', description: 'Ivory, charcoal and champagne — timeless.', background: '#FAF7F2', text: '#2B2A28', accent: '#B89B6A', headingFont: 'cormorant', bodyFont: 'jost', heroLayout: 'center' },
  { id: 'sage', name: 'Sage Garden', description: 'Soft greens for garden and outdoor weddings.', background: '#F6F7F2', text: '#26302A', accent: '#7F9377', headingFont: 'eb-garamond', bodyFont: 'lato', heroLayout: 'framed' },
  { id: 'rose', name: 'Dusty Rose', description: 'Blush and rose, romantic and warm.', background: '#FBF5F3', text: '#3A2A2B', accent: '#C08A86', headingFont: 'playfair', bodyFont: 'montserrat', heroLayout: 'split' },
  { id: 'filipiniana', name: 'Filipiniana', description: 'Capiz ivory with deep maroon, inspired by Filipino heritage.', background: '#FBF8F1', text: '#2E1F1C', accent: '#8C2F39', headingFont: 'marcellus', bodyFont: 'jost', heroLayout: 'framed' },
  { id: 'terracotta', name: 'Terracotta', description: 'Sun-warmed sand and clay, relaxed and boho.', background: '#FAF4EE', text: '#33261F', accent: '#C0714F', headingFont: 'cormorant', bodyFont: 'karla', heroLayout: 'left' },
  { id: 'minimal', name: 'Modern Minimal', description: 'Crisp white and black, editorial and clean.', background: '#FFFFFF', text: '#141414', accent: '#8C8C8C', headingFont: 'bodoni', bodyFont: 'inter', heroLayout: 'split' },
  { id: 'coastal', name: 'Coastal Blue', description: 'Dusty blue and sand for beach and island weddings.', background: '#F6F8F9', text: '#1F2A33', accent: '#6F8FA6', headingFont: 'lora', bodyFont: 'nunito-sans', heroLayout: 'left' },
  { id: 'lavender', name: 'Lavender Mist', description: 'Soft lilac, light and dreamy.', background: '#F9F7FB', text: '#2D2835', accent: '#9C8AB4', headingFont: 'cormorant', bodyFont: 'josefin', heroLayout: 'center' },
  { id: 'emerald', name: 'Emerald & Gold', description: 'Deep emerald with gold, formal and grand.', background: '#F7F6F1', text: '#1F3029', accent: '#B08D4C', headingFont: 'cinzel', bodyFont: 'raleway', heroLayout: 'center' },
  { id: 'burgundy', name: 'Burgundy Romance', description: 'Rich burgundy on cream, perfect for December.', background: '#FBF7F4', text: '#2B1A1D', accent: '#7E2A3A', headingFont: 'dm-serif', bodyFont: 'dm-sans', heroLayout: 'framed' },
]

export const HERO_LAYOUTS: { id: HeroLayout; name: string; description: string }[] = [
  { id: 'center', name: 'Full photo, centred', description: 'Names centred over a full-screen photo.' },
  { id: 'left', name: 'Full photo, left', description: 'Names at the lower left over the photo.' },
  { id: 'split', name: 'Split', description: 'Names on one side, photo on the other.' },
  { id: 'framed', name: 'Arched frame', description: 'Photo in an arched frame on a paper background.' },
]

export const DEFAULT_THEME: ThemeSettings = { template: 'classic' }

// ---------------------------------------------------------------- colour math

const HEX = /^#[0-9a-fA-F]{6}$/
export const isHex = (v: unknown): v is string => typeof v === 'string' && HEX.test(v)

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
function hex([r, g, b]: [number, number, number]): string {
  return '#' + [r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('').toUpperCase()
}
/** Mix a toward b by t (0..1). */
export function mix(a: string, b: string, t: number): string {
  const A = rgb(a)
  const B = rgb(b)
  return hex([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t])
}
function luminance(h: string): number {
  const [r, g, b] = rgb(h).map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
export function contrast(a: string, b: string): number {
  const la = luminance(a)
  const lb = luminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}
/** Move `color` toward `toward` until it reaches `min` contrast against `bg`. */
function ensure(color: string, bg: string, toward: string, min: number): string {
  let c = color
  for (let i = 0; i < 40 && contrast(c, bg) < min; i++) c = mix(c, toward, 0.08)
  return c
}

export interface Palette {
  ivory: string
  cream: string
  paper: string
  linen: string
  line: string
  ink: string
  inkSoft: string
  muted: string
  champagne: string
  champagneLight: string
  gold: string
}

/** Full site palette from three base colours, with contrast guaranteed. */
export function derivePalette(background: string, text: string, accent: string): Palette {
  const bg = background
  const ink = ensure(text, bg, luminance(bg) > 0.5 ? '#000000' : '#FFFFFF', 7)
  return {
    ivory: bg,
    cream: mix(bg, accent, 0.08),
    paper: mix(bg, '#FFFFFF', 0.6),
    linen: mix(bg, accent, 0.2),
    line: mix(bg, accent, 0.28),
    ink,
    inkSoft: ensure(mix(ink, bg, 0.18), bg, ink, 7),
    muted: ensure(mix(ink, bg, 0.42), mix(bg, accent, 0.08), ink, 4.6),
    champagne: accent,
    champagneLight: mix(accent, bg, 0.62),
    gold: ensure(accent, mix(bg, accent, 0.08), ink, 4.6),
  }
}

export interface ContrastCheck {
  label: string
  ratio: number
  min: number
  ok: boolean
}

export function contrastReport(p: Palette): ContrastCheck[] {
  const checks: [string, string, string, number][] = [
    ['Body text on background', p.ink, p.ivory, 7],
    ['Secondary text on background', p.muted, p.ivory, 4.5],
    ['Accent labels on background', p.gold, p.ivory, 4.5],
    ['Button text (background on text colour)', p.ivory, p.ink, 4.5],
  ]
  return checks.map(([label, a, b, min]) => {
    const ratio = contrast(a, b)
    return { label, ratio, min, ok: ratio >= min }
  })
}

// ---------------------------------------------------------------- resolving

export interface ResolvedTheme {
  templateId: string
  palette: Palette
  heading: FontOption
  body: FontOption
  heroLayout: HeroLayout
}

export const findTemplate = (id: string | undefined) => TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0]
export const findHeading = (id: string | undefined) => HEADING_FONTS.find((f) => f.id === id)
export const findBody = (id: string | undefined) => BODY_FONTS.find((f) => f.id === id)

export function resolveTheme(s: ThemeSettings | null | undefined): ResolvedTheme {
  const t = findTemplate(s?.template)
  const background = isHex(s?.background) ? s.background : t.background
  const text = isHex(s?.text) ? s.text : t.text
  const accent = isHex(s?.accent) ? s.accent : t.accent
  return {
    templateId: t.id,
    palette: derivePalette(background, text, accent),
    heading: findHeading(s?.headingFont) ?? findHeading(t.headingFont) ?? HEADING_FONTS[0],
    body: findBody(s?.bodyFont) ?? findBody(t.bodyFont) ?? BODY_FONTS[0],
    heroLayout: (HERO_LAYOUTS.some((h) => h.id === s?.heroLayout) ? s?.heroLayout : t.heroLayout) as HeroLayout,
  }
}

export function parseThemeSettings(value: unknown): ThemeSettings {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return DEFAULT_THEME
  const o = value as Record<string, unknown>
  const str = (k: string) => (typeof o[k] === 'string' && o[k] ? (o[k] as string) : undefined)
  return {
    template: str('template') ?? 'classic',
    headingFont: str('headingFont'),
    bodyFont: str('bodyFont'),
    background: isHex(o.background) ? o.background : undefined,
    text: isHex(o.text) ? o.text : undefined,
    accent: isHex(o.accent) ? o.accent : undefined,
    heroLayout: (['center', 'left', 'split', 'framed'] as const).find((h) => h === o.heroLayout),
  }
}

export function googleFontsHref(fonts: FontOption[]): string {
  const families = fonts
    .filter((f, i, all) => all.findIndex((x) => x.family === f.family) === i)
    .map((f) => `family=${f.family.replace(/ /g, '+')}${f.spec ? `:${f.spec}` : ''}`)
  return `https://fonts.googleapis.com/css2?${families.join('&')}&display=swap`
}

/** CSS custom properties consumed by the Tailwind theme tokens in index.css. */
export function themeVars(t: ResolvedTheme): Record<string, string> {
  const p = t.palette
  return {
    '--color-ivory': p.ivory,
    '--color-cream': p.cream,
    '--color-paper': p.paper,
    '--color-linen': p.linen,
    '--color-line': p.line,
    '--color-ink': p.ink,
    '--color-ink-soft': p.inkSoft,
    '--color-muted': p.muted,
    '--color-champagne': p.champagne,
    '--color-champagne-light': p.champagneLight,
    '--color-gold': p.gold,
    '--font-serif': `"${t.heading.family}", ${t.heading.fallback}`,
    '--font-sans': `"${t.body.family}", ${t.body.fallback}`,
  }
}
