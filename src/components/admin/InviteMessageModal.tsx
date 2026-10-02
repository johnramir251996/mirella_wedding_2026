import { useEffect, useMemo, useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { TextAreaField } from '../ui/FormField'
import { DEFAULT_INVITE_MESSAGE, INVITE_PLACEHOLDERS, buildInviteMessage } from '../../utils/inviteMessage'

interface Props {
  open: boolean
  template: string
  saving: boolean
  /** Used for the preview. */
  sample: { name: string; date: string; couple: string; link: string }
  onClose: () => void
  onSave: (text: string) => void
}

/** Edit the message that's copied with each guest's virtual invitation link. */
export function InviteMessageModal({ open, template, saving, sample, onClose, onSave }: Props) {
  const [text, setText] = useState(template)
  useEffect(() => {
    if (open) setText(template)
  }, [open, template])

  const preview = useMemo(() => buildInviteMessage(text, sample), [text, sample])
  const insert = (key: string) => setText((t) => (t.endsWith('\n') || !t ? t + key : `${t} ${key}`))

  return (
    <Modal
      open={open}
      onClose={onClose}
      locked={saving}
      size="lg"
      title="Invitation message"
      description="This is copied together with each guest’s invitation link, ready to paste into Messenger, Viber or a text."
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="ghost" onClick={() => setText(DEFAULT_INVITE_MESSAGE)} disabled={saving}>
            Use the suggested message
          </Button>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => onSave(text)} loading={saving} loadingText="Saving…">
              Save message
            </Button>
          </div>
        </div>
      }
    >
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <TextAreaField label="Message" value={text} onChange={setText} rows={11} maxLength={1500} showCounter />
          <p className="mt-3 text-sm text-muted">Tap to add:</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {INVITE_PLACEHOLDERS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => insert(p.key)}
                className="rounded-full border border-line bg-paper px-3 py-1 text-xs text-ink-soft transition hover:border-champagne hover:text-ink"
              >
                {p.label} <span className="text-muted">{p.key}</span>
              </button>
            ))}
          </div>
          {!/\{link\}/i.test(text) && <p className="mt-3 text-sm text-muted">The link will be added at the end.</p>}
        </div>
        <div>
          <p className="mb-2 text-[0.95rem] font-medium text-ink-soft">Preview</p>
          <div className="whitespace-pre-wrap break-words rounded-2xl rounded-bl-md bg-cream px-4 py-3 text-[0.95rem] leading-relaxed text-ink">{preview}</div>
        </div>
      </div>
    </Modal>
  )
}
