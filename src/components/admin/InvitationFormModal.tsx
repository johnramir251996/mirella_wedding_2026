import { useEffect, useState, type FormEvent } from 'react'
import { Copy, Plus, X } from 'lucide-react'
import type { InvitationInput, InvitationWithRSVP } from '../../types/rsvp'
import { LIMITS, normalizeName, normalizeSpaces, validateInvitation, type InvitationErrors } from '../../utils/validation'
import { Button } from '../ui/Button'
import { TextField } from '../ui/FormField'
import { Modal } from '../ui/Modal'
import { TablePicker } from './TablePicker'
import type { SeatingTable } from '../../types/seating'
import { plannedPerTable } from '../../utils/seatingPeople'

interface Props {
  open: boolean
  invitation: InvitationWithRSVP | null // null = create
  saving: boolean
  onClose: () => void
  /** includedGuests = names the couple invites together with the invitee. */
  onSave: (input: InvitationInput, includedGuests: string[]) => void
  onCopyLink?: (code: string) => void
  tables: SeatingTable[]
  invitations: InvitationWithRSVP[]
  onTableCreated: (table: SeatingTable) => void
}

const EMPTY: InvitationInput = { inviteeName: '', tableId: null, maxAdditionalGuests: 0, isActive: true }

export function InvitationFormModal({ open, invitation, saving, onClose, onSave, onCopyLink, tables, invitations, onTableCreated }: Props) {
  const [values, setValues] = useState<InvitationInput>(EMPTY)
  const [errors, setErrors] = useState<InvitationErrors>({})
  const [included, setIncluded] = useState<string[]>([])
  const [includedErrors, setIncludedErrors] = useState<Record<number, string>>({})

  useEffect(() => {
    if (!open) return
    setErrors({})
    setIncludedErrors({})
    setIncluded(invitation ? invitation.guests.filter((g) => g.addedBy === 'admin').map((g) => g.guestName) : [])
    setValues(
      invitation
        ? {
            inviteeName: invitation.inviteeName,
            tableId: invitation.tableId,
            maxAdditionalGuests: invitation.maxAdditionalGuests,
            isActive: invitation.isActive,
          }
        : EMPTY,
    )
  }, [open, invitation])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const found = validateInvitation(values)
    setErrors(found)

    const perRow: Record<number, string> = {}
    const seen = new Set<string>([normalizeName(values.inviteeName)])
    included.forEach((raw, i) => {
      const key = normalizeName(raw)
      if (!key) return
      if (raw.trim().length > LIMITS.guestName) perRow[i] = `Please keep names under ${LIMITS.guestName} characters.`
      else if (seen.has(key)) perRow[i] = 'This name is already on the invitation.'
      seen.add(key)
    })
    setIncludedErrors(perRow)

    if (Object.keys(found).length || Object.keys(perRow).length) return
    onSave(values, included.map(normalizeSpaces).filter(Boolean))
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      locked={saving}
      title={invitation ? 'Edit Invitation' : 'Add Invitation'}
      description={invitation ? 'Changes apply to the RSVP page immediately.' : 'Guests find their invitation by searching this exact name.'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="invitation-form" loading={saving} loadingText="Saving…" className="sm:min-w-36">
            {invitation ? 'Save Changes' : 'Add Invitation'}
          </Button>
        </>
      }
    >
      <form id="invitation-form" onSubmit={submit} noValidate className="space-y-5">
        <TextField
          label="Invitee Name"
          value={values.inviteeName}
          onChange={(v) => setValues((s) => ({ ...s, inviteeName: v }))}
          maxLength={LIMITS.inviteeName}
          error={errors.inviteeName}
          required
          data-autofocus
          autoComplete="off"
        />
        <TablePicker
          tables={tables}
          used={plannedPerTable(invitations, invitation?.id)}
          partySize={1 + included.filter((n) => n.trim()).length}
          value={values.tableId}
          onChange={(tableId) => setValues((s) => ({ ...s, tableId }))}
          onTableCreated={onTableCreated}
        />
        <TextField
          label="Maximum Additional Guests"
          type="number"
          inputMode="numeric"
          min={0}
          max={LIMITS.maxAdditionalGuestsPerInvitation}
          value={String(values.maxAdditionalGuests)}
          onChange={(v) => setValues((s) => ({ ...s, maxAdditionalGuests: v === '' ? 0 : Math.trunc(Number(v)) }))}
          hint="Extra guests the invitee may request on the RSVP form (₱799 each, needs your approval). 0 hides that question."
          error={errors.maxAdditionalGuests}
        />
        <fieldset className="rounded-lg border border-line px-4 pb-4 pt-3">
          <legend className="px-1 text-[0.95rem] font-medium text-ink-soft">Included guests</legend>
          <p className="mb-3 text-sm text-muted">
            People you’re inviting together with {values.inviteeName.trim() || 'this invitee'} — e.g. a spouse or children. They’re shown on the
            invitation after it opens and are confirmed automatically.
          </p>
          <div className="space-y-2.5">
            {included.map((name, i) => (
              <div key={i}>
                <div className="flex items-center gap-2">
                  <label className="sr-only" htmlFor={`included-${i}`}>
                    Included guest {i + 1}
                  </label>
                  <input
                    id={`included-${i}`}
                    value={name}
                    maxLength={LIMITS.guestName}
                    placeholder="Full name"
                    autoComplete="off"
                    onChange={(e) => setIncluded((list) => list.map((n, j) => (j === i ? e.target.value : n)))}
                    aria-invalid={includedErrors[i] ? true : undefined}
                    className="input-base min-h-11 py-2.5"
                  />
                  <button
                    type="button"
                    onClick={() => setIncluded((list) => list.filter((_, j) => j !== i))}
                    aria-label={`Remove included guest ${name || i + 1}`}
                    className="flex size-11 shrink-0 items-center justify-center rounded-md text-muted transition hover:bg-rose/10 hover:text-rose"
                  >
                    <X className="size-4" />
                  </button>
                </div>
                {includedErrors[i] && (
                  <p role="alert" className="mt-1 text-sm text-rose">
                    {includedErrors[i]}
                  </p>
                )}
              </div>
            ))}
          </div>
          {included.length < 20 && (
            <Button
              variant="subtle"
              size="sm"
              className="mt-3"
              icon={<Plus aria-hidden="true" className="size-4" />}
              onClick={() => {
                setIncluded((list) => [...list, ''])
                window.setTimeout(() => document.getElementById(`included-${included.length}`)?.focus(), 50)
              }}
            >
              Add included guest
            </Button>
          )}
        </fieldset>
        <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-line bg-ivory/60 px-4 py-3.5">
          <span>
            <span className="block text-[0.95rem] font-medium text-ink-soft">Active</span>
            <span className="block text-sm text-muted">Inactive invitations can’t be found on the RSVP page.</span>
          </span>
          <input
            type="checkbox"
            checked={values.isActive}
            onChange={(e) => setValues((s) => ({ ...s, isActive: e.target.checked }))}
            className="size-5 shrink-0 accent-ink"
          />
        </label>
        {invitation && onCopyLink && (
          <div className="rounded-lg border border-dashed border-line px-4 py-3 text-sm text-muted">
            <p>
              Internal invitation code: <code className="rounded bg-cream px-1.5 py-0.5 text-ink">{invitation.invitationCode}</code>
            </p>
            <button
              type="button"
              onClick={() => onCopyLink(invitation.invitationCode)}
              className="mt-2 inline-flex items-center gap-1.5 rounded text-gold underline-offset-4 hover:underline"
            >
              <Copy aria-hidden="true" className="size-3.5" /> Copy personal RSVP link (optional)
            </button>
          </div>
        )}
      </form>
    </Modal>
  )
}
