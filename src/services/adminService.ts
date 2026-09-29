import { supabase } from '../lib/supabase'
import type { Tables } from '../types/database'
import type {
  ActivityLog,
  AdditionalGuest,
  AttendanceStatus,
  FoodOption,
  GuestStatus,
  GuestWithInvitation,
  Invitation,
  InvitationInput,
  InvitationWithRSVP,
  NeedsTransportation,
  RSVPResponse,
  VehicleType,
} from '../types/rsvp'
import { FRIENDLY_ERRORS, FriendlyError, logError } from '../utils/errors'
import { normalizeSpaces } from '../utils/validation'

// ----- Auth ---------------------------------------------------------------------

export async function signInAdmin(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
  if (error) {
    logError('signInAdmin', error)
    throw new FriendlyError('The email or password is incorrect.')
  }
  const admin = await checkIsAdmin()
  if (!admin) {
    await supabase.auth.signOut()
    throw new FriendlyError('This account does not have administrator access.')
  }
}

export async function signOutAdmin(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) logError('signOutAdmin', error)
}

/** True when the signed-in user is listed in public.admin_users. */
export async function checkIsAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_admin')
  if (error) {
    logError('checkIsAdmin', error)
    return false
  }
  return data === true
}

// ----- Mapping ------------------------------------------------------------------

const mapInvitation = (r: Tables<'invitations'>): Invitation => ({
  id: r.id,
  inviteeName: r.invitee_name,
  invitationCode: r.invitation_code,
  tableNumber: r.table_number,
  maxAdditionalGuests: r.max_additional_guests,
  isActive: r.is_active,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})

const mapResponse = (r: Tables<'rsvp_responses'>): RSVPResponse => ({
  id: r.id,
  invitationId: r.invitation_id,
  attendanceStatus: r.attendance_status as AttendanceStatus,
  hasTransportation: r.has_transportation,
  needsTransportation: r.needs_transportation as NeedsTransportation | null,
  vehicleType: r.vehicle_type as VehicleType | null,
  comingFrom: r.coming_from,
  foodPreferences: (r.food_preferences ?? []) as FoodOption[],
  hasFoodRestrictions: r.has_food_restrictions,
  foodRestrictions: r.food_restrictions,
  accessibilityNeeds: r.accessibility_needs,
  bringingAdditionalGuest: r.bringing_additional_guest,
  submittedAt: r.submitted_at,
  updatedAt: r.updated_at,
})

const mapGuest = (r: Tables<'additional_guests'>): AdditionalGuest => ({
  id: r.id,
  invitationId: r.invitation_id,
  rsvpResponseId: r.rsvp_response_id,
  guestName: r.guest_name,
  status: r.status as GuestStatus,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})

// ----- Loading ------------------------------------------------------------------

const PAGE = 1000

/** Reads every row of a query, page by page (PostgREST caps rows per request). */
async function fetchAll<R>(
  label: string,
  query: (from: number, to: number) => PromiseLike<{ data: R[] | null; error: unknown }>,
): Promise<R[]> {
  const rows: R[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await query(from, from + PAGE - 1)
    if (error) {
      logError(`fetchAll:${label}`, error)
      throw new FriendlyError(FRIENDLY_ERRORS.generic)
    }
    const page = data ?? []
    rows.push(...page)
    if (page.length < PAGE) break
  }
  return rows
}

export interface AdminData {
  invitations: InvitationWithRSVP[]
  guests: GuestWithInvitation[]
}

/** Loads invitations, responses and additional guests (admin only — enforced by RLS). */
export async function loadAdminData(): Promise<AdminData> {
  const [invRows, respRows, guestRows] = await Promise.all([
    fetchAll<Tables<'invitations'>>('invitations', (a, b) =>
      supabase.from('invitations').select('*').order('created_at', { ascending: true }).range(a, b),
    ),
    fetchAll<Tables<'rsvp_responses'>>('rsvp_responses', (a, b) =>
      supabase.from('rsvp_responses').select('*').order('submitted_at', { ascending: true }).range(a, b),
    ),
    fetchAll<Tables<'additional_guests'>>('additional_guests', (a, b) =>
      supabase.from('additional_guests').select('*').order('created_at', { ascending: true }).range(a, b),
    ),
  ])

  const responses = new Map(respRows.map((r) => [r.invitation_id, mapResponse(r)]))
  const guestsByInvitation = new Map<string, AdditionalGuest[]>()
  for (const g of guestRows.map(mapGuest)) {
    const list = guestsByInvitation.get(g.invitationId) ?? []
    list.push(g)
    guestsByInvitation.set(g.invitationId, list)
  }

  const invitations: InvitationWithRSVP[] = invRows
    .map(mapInvitation)
    .map((inv): InvitationWithRSVP => {
      const response = responses.get(inv.id) ?? null
      return {
        ...inv,
        response,
        guests: guestsByInvitation.get(inv.id) ?? [],
        status: response ? response.attendanceStatus : 'pending',
      }
    })
    .sort((a, b) => a.inviteeName.localeCompare(b.inviteeName))

  const byId = new Map(invitations.map((i) => [i.id, i]))
  const guests: GuestWithInvitation[] = guestRows
    .map(mapGuest)
    .map((g) => ({
      ...g,
      invitedBy: byId.get(g.invitationId)?.inviteeName ?? '—',
      tableNumber: byId.get(g.invitationId)?.tableNumber ?? null,
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  return { invitations, guests }
}

// ----- Invitations --------------------------------------------------------------

function invitationError(context: string, error: { code?: string } | null): never {
  logError(context, error)
  if (error?.code === '23505') {
    throw new FriendlyError('An active invitation with this name already exists. Add a detail to make it unique, e.g. "Maria Santos (Tita)".')
  }
  if (error?.code === '23514') throw new FriendlyError('Please check the invitation details and try again.')
  throw new FriendlyError('We couldn’t save the invitation. Please try again.')
}

function toInvitationRow(input: InvitationInput) {
  return {
    invitee_name: normalizeSpaces(input.inviteeName),
    table_number: input.tableNumber.trim() ? input.tableNumber.trim() : null,
    max_additional_guests: input.maxAdditionalGuests,
    is_active: input.isActive,
  }
}

export async function createInvitation(input: InvitationInput): Promise<Invitation> {
  const { data, error } = await supabase.from('invitations').insert(toInvitationRow(input)).select('*').single()
  if (error || !data) invitationError('createInvitation', error)
  return mapInvitation(data as Tables<'invitations'>)
}

export async function updateInvitation(id: string, input: InvitationInput): Promise<Invitation> {
  const { data, error } = await supabase.from('invitations').update(toInvitationRow(input)).eq('id', id).select('*').single()
  if (error || !data) invitationError('updateInvitation', error)
  return mapInvitation(data as Tables<'invitations'>)
}

/** Deletes the invitation; its RSVP and additional guests are removed by ON DELETE CASCADE. */
export async function deleteInvitation(id: string): Promise<void> {
  const { error } = await supabase.from('invitations').delete().eq('id', id)
  if (error) {
    logError('deleteInvitation', error)
    throw new FriendlyError('We couldn’t delete the invitation. Please try again.')
  }
}

// ----- Responses & guests -------------------------------------------------------

/** Deletes an RSVP response only. The invitation stays and becomes Pending again. */
export async function deleteResponse(responseId: string): Promise<void> {
  const { error } = await supabase.from('rsvp_responses').delete().eq('id', responseId)
  if (error) {
    logError('deleteResponse', error)
    throw new FriendlyError('We couldn’t delete the response. Please try again.')
  }
}

export async function updateGuestStatus(guestId: string, status: GuestStatus): Promise<void> {
  const { error } = await supabase.from('additional_guests').update({ status }).eq('id', guestId)
  if (error) {
    logError('updateGuestStatus', error)
    throw new FriendlyError('We couldn’t update the guest status. Please try again.')
  }
}

// ----- Activity -----------------------------------------------------------------

export async function listRecentActivity(limit = 8): Promise<ActivityLog[]> {
  const { data, error } = await supabase
    .from('admin_activity_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) {
    logError('listRecentActivity', error)
    return []
  }
  return ((data ?? []) as Tables<'admin_activity_logs'>[]).map((r) => ({
    id: r.id,
    action: r.action,
    targetTable: r.target_table,
    targetId: r.target_id,
    details: r.details && typeof r.details === 'object' && !Array.isArray(r.details) ? (r.details as Record<string, unknown>) : {},
    createdAt: r.created_at,
  }))
}

/** Manual log entry (most admin actions are logged automatically by database triggers). */
export async function logActivity(action: string, targetTable: string | null, targetId: string | null, details: Record<string, string | number | boolean | null> = {}): Promise<void> {
  const { data: userData } = await supabase.auth.getUser()
  const userId = userData.user?.id
  if (!userId) return
  const { error } = await supabase.from('admin_activity_logs').insert({
    admin_user_id: userId,
    action,
    target_table: targetTable,
    target_id: targetId,
    details,
  })
  if (error) logError('logActivity', error)
}
