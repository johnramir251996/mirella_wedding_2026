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
  return (data ?? []).map((r) => ({ name: r.name, side: r.side === 'bride' ? 'bride' : 'groom', attending: Boolean(r.attending) }))
}

export interface RaffleDraw {
  id: string
  name: string
  prize: string | null
  drawnAt: string
}

export async function getRaffleDraws(): Promise<RaffleDraw[]> {
  const { data, error } = await supabase.from('raffle_draws').select('id, name, prize, drawn_at').order('drawn_at', { ascending: false })
  if (error) {
    logError('getRaffleDraws', error)
    throw new FriendlyError('We couldn’t load the winners.')
  }
  return (data ?? []).map((r) => ({ id: r.id, name: r.name, prize: r.prize, drawnAt: r.drawn_at }))
}

export async function addRaffleDraw(name: string, prize: string): Promise<RaffleDraw> {
  const { data, error } = await supabase
    .from('raffle_draws')
    .insert({ name: name.slice(0, 150), prize: prize.trim() ? prize.trim().slice(0, 150) : null })
    .select('id, name, prize, drawn_at')
    .single()
  if (error || !data) {
    logError('addRaffleDraw', error)
    throw new FriendlyError('The winner couldn’t be saved. Please write it down and try again.')
  }
  return { id: data.id, name: data.name, prize: data.prize, drawnAt: data.drawn_at }
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
