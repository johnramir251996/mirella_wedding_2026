import { supabase } from '../lib/supabase'
import { getAdminPreference, saveAdminPreference } from './preferencesService'
import { getDisplayPrefs } from './displayPrefsService'
import { FriendlyError, logError } from '../utils/errors'

/** Admin → Raffle settings (stored in admin preferences under "raffle"). */
export interface RaffleSettings {
  /** The public raffle page: hidden, visible, or visible from a date and time. */
  mode: 'hidden' | 'visible' | 'scheduled'
  from: string | null
  /** Whose names are on the wheel. */
  pool: 'all' | 'groom' | 'bride'
  attendingOnly: boolean
  /** auto = names partly hidden until the wedding day; on / off = always / never. */
  mask: 'auto' | 'on' | 'off'
  removeWinners: boolean
  extraNames: string[]
  excluded: string[]
  /** first = the first name the wheel lands on wins; last = each spin knocks a name out, the last one left wins. */
  drawMode: 'first' | 'last'
  /** Last one standing: how many consolation prizes (2nd, 3rd …) before the winner. */
  consolations: number
  /** Prizes by place: [winner, 2nd, 3rd, …]. */
  prizes: string[]
  /** Last one standing: quick spins until this many names are left, then full spins. */
  finalsAt: number
}

export const DEFAULT_RAFFLE: RaffleSettings = {
  mode: 'hidden',
  from: null,
  pool: 'all',
  attendingOnly: false,
  mask: 'auto',
  removeWinners: true,
  extraNames: [],
  excluded: [],
  drawMode: 'first',
  consolations: 2,
  prizes: [],
  finalsAt: 5,
}

const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])
const pick = <T extends string>(v: unknown, allowed: readonly T[], d: T): T => (allowed.includes(v as T) ? (v as T) : d)

export async function getRaffleSettings(): Promise<RaffleSettings> {
  const v = (await getAdminPreference<Record<string, unknown>>('raffle')) ?? {}
  return {
    mode: pick(v.mode, ['hidden', 'visible', 'scheduled'] as const, 'hidden'),
    from: typeof v.from === 'string' && v.from ? v.from : null,
    pool: pick(v.pool, ['all', 'groom', 'bride'] as const, 'all'),
    attendingOnly: v.attendingOnly === true,
    mask: pick(v.mask, ['auto', 'on', 'off'] as const, 'auto'),
    removeWinners: v.removeWinners !== false,
    extraNames: strings(v.extraNames),
    excluded: strings(v.excluded),
    drawMode: pick(v.drawMode, ['first', 'last'] as const, 'first'),
    consolations: Math.min(10, Math.max(0, Math.round(Number(v.consolations ?? 2)) || 0)),
    prizes: Array.isArray(v.prizes) ? v.prizes.map((x) => (typeof x === 'string' ? x : '')) : [],
    finalsAt: Math.min(20, Math.max(2, Math.round(Number(v.finalsAt ?? 5)) || 5)),
  }
}

export async function saveRaffleSettings(s: RaffleSettings): Promise<void> {
  await saveAdminPreference('raffle', s)
  void getDisplayPrefs(true)
}

export interface PoolName {
  name: string
  side: 'groom' | 'bride'
  attending: boolean
}

/** Admin: everyone who could be on the wheel (invitees, included guests, approved extras). */
export async function getRafflePool(): Promise<PoolName[]> {
  const { data, error } = await supabase.rpc('raffle_pool')
  if (error) {
    logError('getRafflePool', error)
    throw new FriendlyError('We couldn’t load the guest names.')
  }
  const rows = (Array.isArray(data) ? data : []) as { name: string; side: string; attending: boolean }[]
  return rows.map((r) => ({ name: r.name, side: r.side === 'bride' ? 'bride' : 'groom', attending: Boolean(r.attending) }))
}

export interface RaffleDraw {
  id: string
  name: string
  prize: string | null
  /** 1 = winner, 2 / 3 … = consolation (last one standing); null = first-spin-wins. */
  place: number | null
  drawnAt: string
}

export async function getRaffleDraws(): Promise<RaffleDraw[]> {
  const { data, error } = await supabase.from('raffle_draws').select('id, name, prize, place, drawn_at').order('drawn_at', { ascending: false })
  if (error) {
    logError('getRaffleDraws', error)
    throw new FriendlyError('We couldn’t load the winners.')
  }
  return (data ?? []).map((r) => ({ id: r.id, name: r.name, prize: r.prize, place: r.place ?? null, drawnAt: r.drawn_at }))
}

export async function addRaffleDraw(name: string, prize: string, place: number | null = null): Promise<RaffleDraw> {
  const { data, error } = await supabase
    .from('raffle_draws')
    .insert({ name: name.slice(0, 150), prize: prize.trim() ? prize.trim().slice(0, 150) : null, place })
    .select('id, name, prize, place, drawn_at')
    .single()
  if (error || !data) {
    logError('addRaffleDraw', error)
    throw new FriendlyError('The winner couldn’t be saved. Please write it down and try again.')
  }
  return { id: data.id, name: data.name, prize: data.prize, place: data.place ?? null, drawnAt: data.drawn_at }
}

export async function deleteRaffleDraw(id: string): Promise<void> {
  const { error } = await supabase.from('raffle_draws').delete().eq('id', id)
  if (error) {
    logError('deleteRaffleDraw', error)
    throw new FriendlyError('We couldn’t remove this winner. Please try again.')
  }
}

/** Public: the names for the raffle page (already masked by the server when needed). */
export async function getPublicWheel(): Promise<{ visible: boolean; masked: boolean; names: string[] }> {
  const { data, error } = await supabase.rpc('raffle_wheel')
  if (error) {
    logError('getPublicWheel', error)
    throw new FriendlyError('The raffle couldn’t be loaded. Please try again.')
  }
  const o = data && typeof data === 'object' && !Array.isArray(data) ? (data as Record<string, unknown>) : {}
  return { visible: o.visible === true, masked: o.masked === true, names: strings(o.names) }
}

const key = (n: string) => n.trim().toLowerCase()

/** The names on the wheel for the current settings (same rules as the public page). */
export function wheelNames(s: RaffleSettings, pool: PoolName[], draws: RaffleDraw[]): string[] {
  const excluded = new Set(s.excluded.map(key))
  const won = new Set(s.removeWinners ? draws.map((d) => key(d.name)) : [])
  const seen = new Set<string>()
  const out: string[] = []
  const add = (n: string) => {
    const k = key(n)
    if (!k || seen.has(k) || excluded.has(k) || won.has(k)) return
    seen.add(k)
    out.push(n.trim())
  }
  for (const p of pool) if ((s.pool === 'all' || p.side === s.pool) && (!s.attendingOnly || p.attending)) add(p.name)
  for (const n of s.extraNames) add(n)
  return out.sort((a, b) => a.localeCompare(b))
}

/** "Rina Gaspar" → "R*** G*****" (same as the server). */
export function maskName(n: string): string {
  return n
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0] + '*'.repeat(Math.max(Math.min(w.length - 1, 6), 2)))
    .join(' ')
}

/** Are names masked right now? auto = until the wedding day (Philippine time). */
export function namesMasked(mask: RaffleSettings['mask'], weddingDate: string | undefined): boolean {
  if (mask === 'on') return true
  if (mask === 'off') return false
  if (!weddingDate) return true
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  return today < weddingDate
}

/** Last one standing: names knocked out in the current round (saved, so a refresh keeps the round). */
export async function getRaffleRound(): Promise<string[]> {
  const v = await getAdminPreference<{ eliminated?: unknown }>('raffle_round')
  return strings(v?.eliminated)
}

export async function saveRaffleRound(eliminated: string[]): Promise<void> {
  await saveAdminPreference('raffle_round', { eliminated })
}

/** "1st", "2nd", "3rd", "4th" … */
export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`
}
