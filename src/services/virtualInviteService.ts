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
