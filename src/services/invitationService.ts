import { supabase } from '../lib/supabase'
import type { InvitationLookup } from '../types/rsvp'
import { FRIENDLY_ERRORS, FriendlyError, logError } from '../utils/errors'
import { normalizeSpaces } from '../utils/validation'

type LookupRow = {
  invitation_id: string
  invitee_name: string
  table_number: string | null
  max_additional_guests: number
  has_existing_response: boolean
  included_guests: string[] | null
}

function toLookup(row: LookupRow): InvitationLookup {
  return {
    invitationId: row.invitation_id,
    inviteeName: row.invitee_name,
    tableNumber: row.table_number,
    maxAdditionalGuests: Math.max(0, row.max_additional_guests ?? 0),
    hasExistingResponse: Boolean(row.has_existing_response),
    includedGuests: Array.isArray(row.included_guests) ? row.included_guests.filter(Boolean) : [],
  }
}

/**
 * Public invitation search. Calls the secure `find_invitation` RPC, which only
 * returns the one matching active invitation — the guest list is never exposed.
 * Returns null when there is no match.
 */
export async function findInvitationByName(fullName: string): Promise<InvitationLookup | null> {
  const searchName = normalizeSpaces(fullName)
  if (!searchName) return null
  const { data, error } = await supabase.rpc('find_invitation', { search_name: searchName })
  if (error) {
    logError('findInvitationByName', error)
    throw new FriendlyError(FRIENDLY_ERRORS.generic)
  }
  const row = Array.isArray(data) ? (data[0] as LookupRow | undefined) : undefined
  return row ? toLookup(row) : null
}

/**
 * Future-ready: supports personal links such as /#/rsvp?invite=abc123.
 * The name search remains the primary flow; guests never need a code.
 */
export async function findInvitationByCode(code: string): Promise<InvitationLookup | null> {
  const clean = code.trim()
  if (!clean || clean.length > 64) return null
  const { data, error } = await supabase.rpc('find_invitation_by_code', { invite_code: clean })
  if (error) {
    logError('findInvitationByCode', error)
    throw new FriendlyError(FRIENDLY_ERRORS.generic)
  }
  const row = Array.isArray(data) ? (data[0] as LookupRow | undefined) : undefined
  return row ? toLookup(row) : null
}
