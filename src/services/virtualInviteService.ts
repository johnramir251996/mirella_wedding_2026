import { supabase } from '../lib/supabase'
import type { AttendanceStatus, PositionMode } from '../types/rsvp'
import { FRIENDLY_ERRORS, FriendlyError, logError } from '../utils/errors'

/** What the virtual invitation page shows for one personal code. */
export interface VirtualInvitation {
  inviteeName: string
  includedGuests: string[]
  /** null = hasn't replied yet. */
  attendanceStatus: AttendanceStatus | null
  positionMode: PositionMode
  positionLabel: string
  /** Entourage member linked to the invitee (for the "auto" position). */
  positionMemberId: string | null
}

/**
 * Public: loads the virtual invitation for a personal code and records that it
 * was opened (opens by a signed-in admin aren't counted). Null when the code
 * doesn't match an active invitation.
 */
export async function openInvitation(code: string): Promise<VirtualInvitation | null> {
  const clean = code.trim()
  if (!clean || clean.length > 64) return null
  const { data, error } = await supabase.rpc('open_invitation', { invite_code: clean })
  if (error) {
    logError('openInvitation', error)
    throw new FriendlyError(FRIENDLY_ERRORS.generic)
  }
  const row = Array.isArray(data) ? data[0] : undefined
  if (!row) return null
  const st = row.attendance_status
  const mode = row.position_mode
  return {
    inviteeName: row.invitee_name,
    includedGuests: Array.isArray(row.included_guests) ? row.included_guests.filter(Boolean) : [],
    attendanceStatus: st === 'attending' || st === 'declining' ? st : null,
    positionMode: mode === 'custom' || mode === 'none' ? mode : 'auto',
    positionLabel: row.position_label ?? '',
    positionMemberId: row.position_member_id ?? null,
  }
}

export interface InvitationOpen {
  firstOpenedAt: string
  lastOpenedAt: string
  count: number
}

/** Admin: when each invitation link was opened, keyed by invitation id. */
export async function getInvitationOpens(): Promise<Map<string, InvitationOpen>> {
  const { data, error } = await supabase.from('invitation_opens').select('invitation_id, first_opened_at, last_opened_at, open_count')
  if (error) {
    logError('getInvitationOpens', error)
    throw new FriendlyError('We couldn’t load who opened their invitation.')
  }
  return new Map((data ?? []).map((r) => [r.invitation_id, { firstOpenedAt: r.first_opened_at, lastOpenedAt: r.last_opened_at, count: r.open_count }]))
}

/** Admin: forgets that an invitation was opened (e.g. after testing the link). */
export async function clearInvitationOpen(invitationId: string): Promise<void> {
  const { error } = await supabase.from('invitation_opens').delete().eq('invitation_id', invitationId)
  if (error) {
    logError('clearInvitationOpen', error)
    throw new FriendlyError('We couldn’t reset this. Please try again.')
  }
}

/** Which "Good to know" sections are ticked in Printables (null = the first three) and which titles are bold. */
export interface CardBackPrefs {
  backIds: string[] | null
  boldIds: string[]
}

let backPrefsCache: Promise<CardBackPrefs> | null = null

/** Public: the Printables "Good to know" selection, so on-screen card backs match the printed ones. */
export function getCardBackPrefs(): Promise<CardBackPrefs> {
  if (!backPrefsCache) {
    backPrefsCache = Promise.resolve(supabase.rpc('card_back_prefs')).then(({ data, error }) => {
      if (error) {
        logError('getCardBackPrefs', error)
        backPrefsCache = null
        return { backIds: null, boldIds: [] }
      }
      const o = data && typeof data === 'object' && !Array.isArray(data) ? (data as Record<string, unknown>) : {}
      const list = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : null)
      return { backIds: list(o.backIds), boldIds: list(o.boldIds) ?? [] }
    })
  }
  return backPrefsCache
}

export interface CardDetails {
  positionMode: PositionMode
  positionLabel: string
  positionMemberId: string | null
}

/** Public: the invitee's position for the card (for invitations found by name or code). */
export async function getInvitationCardDetails(invitationId: string): Promise<CardDetails | null> {
  const { data, error } = await supabase.rpc('invitation_card_details', { p_invitation_id: invitationId })
  if (error) {
    logError('getInvitationCardDetails', error)
    return null
  }
  const row = Array.isArray(data) ? data[0] : undefined
  if (!row) return null
  const mode = row.position_mode
  return {
    positionMode: mode === 'custom' || mode === 'none' ? mode : 'auto',
    positionLabel: row.position_label ?? '',
    positionMemberId: row.position_member_id ?? null,
  }
}

/** Public: counts opening the envelope on the RSVP page as "Opened" (never blocks the guest). */
export async function recordInvitationOpen(invitationId: string): Promise<void> {
  const { error } = await supabase.rpc('record_invitation_open', { p_invitation_id: invitationId })
  if (error) logError('recordInvitationOpen', error)
}
