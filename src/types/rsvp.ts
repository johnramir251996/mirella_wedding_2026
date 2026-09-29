export type AttendanceStatus = 'attending' | 'declining'
export type RSVPStatus = AttendanceStatus | 'pending'
export type NeedsTransportation = 'yes' | 'no' | 'not_sure'
export type VehicleType = 'sedan' | 'suv' | 'van' | 'motorcycle' | 'other'
export type FoodOption = 'vegetable' | 'pasta' | 'fish' | 'pork' | 'beef' | 'chicken'
export type GuestStatus = 'pending' | 'approved' | 'declined'
export type YesNo = 'yes' | 'no'

/** The only invitation information the public RSVP page ever receives. */
export interface InvitationLookup {
  invitationId: string
  inviteeName: string
  tableNumber: string | null
  maxAdditionalGuests: number
  hasExistingResponse: boolean
}

/** Client-side form state (strings/unions, before conversion for the RPC). */
export interface RSVPFormState {
  attendance: AttendanceStatus | null
  hasTransportation: YesNo | null
  needsTransportation: NeedsTransportation | null
  vehicleType: VehicleType | null
  comingFrom: string
  foodPreferences: FoodOption[]
  hasFoodRestrictions: YesNo | null
  foodRestrictions: string
  accessibilityNeeds: string
  bringingGuest: YesNo | null
  guestNames: string[]
}

/** Clean payload that is sent to the submit_rsvp RPC. */
export interface RSVPSubmission {
  invitationId: string
  attendanceStatus: AttendanceStatus
  hasTransportation: boolean | null
  needsTransportation: NeedsTransportation | null
  vehicleType: VehicleType | null
  comingFrom: string | null
  foodPreferences: FoodOption[]
  hasFoodRestrictions: boolean | null
  foodRestrictions: string | null
  accessibilityNeeds: string | null
  additionalGuests: string[]
}

// ----- Admin-side shapes ------------------------------------------------------

export interface Invitation {
  id: string
  inviteeName: string
  invitationCode: string
  tableNumber: string | null
  maxAdditionalGuests: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface InvitationInput {
  inviteeName: string
  tableNumber: string
  maxAdditionalGuests: number
  isActive: boolean
}

export interface RSVPResponse {
  id: string
  invitationId: string
  attendanceStatus: AttendanceStatus
  hasTransportation: boolean | null
  needsTransportation: NeedsTransportation | null
  vehicleType: VehicleType | null
  comingFrom: string | null
  foodPreferences: FoodOption[]
  hasFoodRestrictions: boolean | null
  foodRestrictions: string | null
  accessibilityNeeds: string | null
  bringingAdditionalGuest: boolean
  submittedAt: string
  updatedAt: string
}

export interface AdditionalGuest {
  id: string
  invitationId: string
  rsvpResponseId: string
  guestName: string
  status: GuestStatus
  createdAt: string
  updatedAt: string
}

/** An invitation joined with its (optional) current response and guests. */
export interface InvitationWithRSVP extends Invitation {
  response: RSVPResponse | null
  guests: AdditionalGuest[]
  status: RSVPStatus
}

export interface GuestWithInvitation extends AdditionalGuest {
  invitedBy: string
  tableNumber: string | null
}

export interface ActivityLog {
  id: string
  action: string
  targetTable: string | null
  targetId: string | null
  details: Record<string, unknown>
  createdAt: string
}
