import type { InvitationInput, RSVPFormState, RSVPSubmission } from '../types/rsvp'

/** Limits shared with the database constraints in supabase/schema.sql. */
export const LIMITS = {
  inviteeName: 150,
  tableNumber: 50,
  comingFrom: 120,
  foodRestrictions: 120,
  accessibility: 255,
  guestName: 150,
  messageToCouple: 500,
  maxFoodSelections: 4,
  maxAdditionalGuestsPerInvitation: 10,
} as const

/** Trim + collapse internal whitespace. */
export function normalizeSpaces(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

/**
 * Philippine mobile number → "+639XXXXXXXXX", or null when invalid.
 * Same rules as public.normalize_ph_mobile() in the database.
 */
export function normalizePhMobile(value: string): string | null {
  const d = value.replace(/[^0-9]/g, '')
  if (/^639\d{9}$/.test(d)) return `+${d}`
  if (/^09\d{9}$/.test(d)) return `+63${d.slice(1)}`
  if (/^9\d{9}$/.test(d)) return `+63${d}`
  return null
}

/** "+639171234567" → "0917 123 4567" */
export function formatPhMobile(value: string | null | undefined): string {
  if (!value) return '—'
  const n = normalizePhMobile(value)
  if (!n) return value
  const local = `0${n.slice(3)}`
  return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`
}

/** Same normalisation as public.normalize_name() in the database. */
export function normalizeName(value: string): string {
  return normalizeSpaces(value).toLowerCase()
}

export type RSVPErrors = Partial<
  Record<
    | 'attendance'
    | 'hasTransportation'
    | 'needsTransportation'
    | 'vehicleType'
    | 'comingFrom'
    | 'foodPreferences'
    | 'hasFoodRestrictions'
    | 'foodRestrictions'
    | 'accessibilityNeeds'
    | 'bringingGuest'
    | 'guestNames'
    | 'messageToCouple'
    | 'mobileNumber',
    string
  >
> & { guestNameAt?: Record<number, string> }

export function validateRSVP(form: RSVPFormState, maxAdditionalGuests: number): RSVPErrors {
  const errors: RSVPErrors = {}

  if (!form.attendance) {
    errors.attendance = 'Please let us know if you can join us.'
    return errors
  }
  if (!form.mobileNumber.trim()) errors.mobileNumber = 'Please enter your mobile number.'
  else if (!normalizePhMobile(form.mobileNumber)) errors.mobileNumber = 'Please enter a valid Philippine mobile number, e.g. 0917 123 4567.'
  if (form.attendance === 'declining') return errors

  if (!form.hasTransportation) {
    errors.hasTransportation = 'Please choose an option.'
  } else if (form.hasTransportation === 'yes' && !form.vehicleType) {
    errors.vehicleType = 'Please choose your vehicle type.'
  } else if (form.hasTransportation === 'no' && !form.needsTransportation) {
    errors.needsTransportation = 'Please choose an option.'
  }

  const comingFrom = normalizeSpaces(form.comingFrom)
  if (!comingFrom) errors.comingFrom = 'Please tell us where you will be coming from.'
  else if (comingFrom.length > LIMITS.comingFrom) errors.comingFrom = `Please keep this under ${LIMITS.comingFrom} characters.`

  if (form.foodPreferences.length > LIMITS.maxFoodSelections) {
    errors.foodPreferences = `You can select up to ${LIMITS.maxFoodSelections} dishes.`
  }

  if (!form.hasFoodRestrictions) {
    errors.hasFoodRestrictions = 'Please choose an option.'
  } else if (form.hasFoodRestrictions === 'yes') {
    const r = form.foodRestrictions.trim()
    if (!r) errors.foodRestrictions = 'Please specify your allergies or dietary restrictions.'
    else if (r.length > LIMITS.foodRestrictions) errors.foodRestrictions = `Please keep this under ${LIMITS.foodRestrictions} characters.`
  }

  if (form.accessibilityNeeds.trim().length > LIMITS.accessibility) {
    errors.accessibilityNeeds = `Please keep this under ${LIMITS.accessibility} characters.`
  }

  if (form.messageToCouple.trim().length > LIMITS.messageToCouple) {
    errors.messageToCouple = `Please keep your message under ${LIMITS.messageToCouple} characters.`
  }

  if (maxAdditionalGuests > 0) {
    if (!form.bringingGuest) {
      errors.bringingGuest = 'Please choose an option.'
    } else if (form.bringingGuest === 'yes') {
      const perIndex: Record<number, string> = {}
      const seen = new Set<string>()
      form.guestNames.forEach((raw, i) => {
        const name = normalizeSpaces(raw)
        if (!name) perIndex[i] = 'Please enter a name or remove this guest.'
        else if (name.length > LIMITS.guestName) perIndex[i] = `Please keep names under ${LIMITS.guestName} characters.`
        else if (seen.has(name.toLowerCase())) perIndex[i] = 'This name is already listed.'
        seen.add(name.toLowerCase())
      })
      if (form.guestNames.length === 0) errors.guestNames = 'Please add your guest’s name.'
      if (form.guestNames.length > maxAdditionalGuests) {
        errors.guestNames = `You may bring up to ${maxAdditionalGuests} additional ${maxAdditionalGuests === 1 ? 'guest' : 'guests'}.`
      }
      if (Object.keys(perIndex).length) {
        errors.guestNameAt = perIndex
        errors.guestNames ??= 'Please check your guest names.'
      }
    }
  }

  return errors
}

export function hasErrors(errors: RSVPErrors): boolean {
  return Object.keys(errors).length > 0
}

/** Converts form state into the exact payload stored in the database. */
export function toSubmission(invitationId: string, form: RSVPFormState, maxAdditionalGuests: number): RSVPSubmission {
  if (form.attendance !== 'attending') {
    return {
      invitationId,
      attendanceStatus: 'declining',
      hasTransportation: null,
      needsTransportation: null,
      vehicleType: null,
      comingFrom: null,
      foodPreferences: [],
      hasFoodRestrictions: null,
      foodRestrictions: null,
      accessibilityNeeds: null,
      additionalGuests: [],
      messageToCouple: null,
      mobileNumber: normalizePhMobile(form.mobileNumber) ?? '',
    }
  }
  const ownVehicle = form.hasTransportation === 'yes'
  const hasRestrictions = form.hasFoodRestrictions === 'yes'
  const access = form.accessibilityNeeds.trim()
  return {
    invitationId,
    attendanceStatus: 'attending',
    hasTransportation: ownVehicle,
    needsTransportation: ownVehicle ? null : form.needsTransportation,
    vehicleType: ownVehicle ? form.vehicleType : null,
    comingFrom: normalizeSpaces(form.comingFrom),
    foodPreferences: [...new Set(form.foodPreferences)].slice(0, LIMITS.maxFoodSelections),
    hasFoodRestrictions: hasRestrictions,
    foodRestrictions: hasRestrictions ? form.foodRestrictions.trim() : null,
    accessibilityNeeds: access ? access : null,
    additionalGuests:
      maxAdditionalGuests > 0 && form.bringingGuest === 'yes'
        ? form.guestNames.map(normalizeSpaces).filter(Boolean).slice(0, maxAdditionalGuests)
        : [],
    messageToCouple: form.messageToCouple.trim() ? form.messageToCouple.trim() : null,
    mobileNumber: normalizePhMobile(form.mobileNumber) ?? '',
  }
}

export type InvitationErrors = Partial<Record<keyof InvitationInput, string>>

export function validateInvitation(input: InvitationInput): InvitationErrors {
  const errors: InvitationErrors = {}
  const name = normalizeSpaces(input.inviteeName)
  if (!name) errors.inviteeName = 'Invitee name is required.'
  else if (name.length > LIMITS.inviteeName) errors.inviteeName = `Please keep the name under ${LIMITS.inviteeName} characters.`
  if (input.tableNumber.trim().length > LIMITS.tableNumber) errors.tableNumber = `Please keep this under ${LIMITS.tableNumber} characters.`
  const max = input.maxAdditionalGuests
  if (!Number.isInteger(max) || max < 0 || max > LIMITS.maxAdditionalGuestsPerInvitation) {
    errors.maxAdditionalGuests = `Enter a whole number from 0 to ${LIMITS.maxAdditionalGuestsPerInvitation}.`
  }
  return errors
}

export function isValidHttpUrl(value: string): boolean {
  if (!value.trim()) return true
  try {
    const u = new URL(value.trim())
    return u.protocol === 'https:' || u.protocol === 'http:'
  } catch {
    return false
  }
}
