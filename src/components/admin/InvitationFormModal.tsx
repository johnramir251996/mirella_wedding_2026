import { useEffect, useState, type FormEvent } from 'react'
import { Copy } from 'lucide-react'
import type { Invitation, InvitationInput } from '../../types/rsvp'
import { LIMITS, validateInvitation, type InvitationErrors } from '../../utils/validation'
import { Button } from '../ui/Button'
import { TextField } from '../ui/FormField'
import { Modal } from '../ui/Modal'

interface Props {
  open: boolean
  invitation: Invitation | null // null = create
  saving: boolean
  onClose: () => void
  onSave: (input: InvitationInput) => void
  onCopyLink?: (code: string) => void
}

const EMPTY: InvitationInput = { inviteeName: '', tableNumber: '', maxAdditionalGuests: 0, isActive: true }

export function InvitationFormModal({ open, invitation, saving, onClose, onSave, onCopyLink }: Props) {
  const [values, setValues] = useState<InvitationInput>(EMPTY)
  const [errors, setErrors] = useState<InvitationErrors>({})

  useEffect(() => {
    if (!open) return
    setErrors({})
    setValues(
      invitation
        ? {
            inviteeName: invitation.inviteeName,
            tableNumber: invitation.tableNumber ?? '',
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
    if (Object.keys(found).length) return
    onSave(values)
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
        <TextField
          label="Table Number"
          value={values.tableNumber}
          onChange={(v) => setValues((s) => ({ ...s, tableNumber: v }))}
          maxLength={LIMITS.tableNumber}
          hint="Any text: 5, VIP, A1, Family Table…"
          error={errors.tableNumber}
          autoComplete="off"
        />
        <TextField
          label="Maximum Additional Guests"
          type="number"
          inputMode="numeric"
          min={0}
          max={LIMITS.maxAdditionalGuestsPerInvitation}
          value={String(values.maxAdditionalGuests)}
          onChange={(v) => setValues((s) => ({ ...s, maxAdditionalGuests: v === '' ? 0 : Math.trunc(Number(v)) }))}
          hint="0 hides the additional-guest question for this invitee."
          error={errors.maxAdditionalGuests}
        />
        <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-line bg-ivory/60 px-4 py-3.5">
          <span>
            <span className="block text-[0.95rem] font-medium text-ink-soft">Active</span>
            <span className="block text-sm text-muted">Inactive invitations can’t be found on the RSVP page.</span>
          </span>
          <input
            type="checkbox"
            checked={values.isActive}
            onChange={(e) => setValues((s) => ({ ...s, isActive: e.target.checked }))}
            className="size-5 shrink-0 accent-[#2b2a28]"
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
