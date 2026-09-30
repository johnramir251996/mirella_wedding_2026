import type { InvitationWithRSVP } from '../types/rsvp'

export interface SeatPerson {
  key: string
  invitationId: string
  guestId: string | null
  name: string
  /** The invitee's name, for "party of …" grouping. */
  partyName: string
  isInvitee: boolean
}

/** Everyone who can be seated on an invitation (invitee + included + approved requests). */
export function partyMembers(inv: InvitationWithRSVP): SeatPerson[] {
  return [
    { key: `${inv.id}:`, invitationId: inv.id, guestId: null, name: inv.inviteeName, partyName: inv.inviteeName, isInvitee: true },
    ...inv.guests
      .filter((g) => g.addedBy === 'admin' || g.status === 'approved')
      .map((g) => ({ key: `${inv.id}:${g.id}`, invitationId: inv.id, guestId: g.id, name: g.guestName, partyName: inv.inviteeName, isInvitee: false })),
  ]
}

/** People confirmed to attend: parties whose RSVP is "attending". */
export function attendingPeople(invitations: InvitationWithRSVP[]): SeatPerson[] {
  return invitations.filter((i) => i.isActive && i.status === 'attending').flatMap(partyMembers)
}

/** People planned per table (for "seats left"): declined parties don't count. */
export function plannedPerTable(invitations: InvitationWithRSVP[], excludeInvitationId?: string): Map<string, number> {
  const m = new Map<string, number>()
  for (const inv of invitations) {
    if (!inv.tableId || inv.id === excludeInvitationId || inv.status === 'declining' || !inv.isActive) continue
    m.set(inv.tableId, (m.get(inv.tableId) ?? 0) + partyMembers(inv).length)
  }
  return m
}
