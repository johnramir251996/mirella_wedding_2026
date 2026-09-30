import { useEffect, useState } from 'react'
import { CalendarClock, RotateCcw, Save, XCircle } from 'lucide-react'
import { useToast } from '../../hooks/useToast'
import { setCachedWeddingSettings } from '../../hooks/useWeddingSettings'
import { getWeddingSettings, isRsvpOpen, updateRsvpSettings } from '../../services/settingsService'
import type { RsvpSettings } from '../../types/wedding'
import { toFriendlyMessage } from '../../utils/errors'
import { formatDeadlineDateTime, fromManilaParts, toManilaParts } from '../../utils/formatting'
import { Button } from '../ui/Button'
import { TextAreaField } from '../ui/FormField'
import { Skeleton } from '../ui/Skeleton'
import { Badge } from '../ui/Badge'

/** RSVP deadline, open/closed switch, closed message and quick "reopen" actions. */
export function RsvpSettingsCard() {
  const toast = useToast()
  const [id, setId] = useState<string | null>(null)
  const [saved, setSaved] = useState<RsvpSettings | null>(null)
  const [open, setOpen] = useState(true)
  const [hasDeadline, setHasDeadline] = useState(false)
  const [date, setDate] = useState('')
  const [time, setTime] = useState('23:59')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = (s: RsvpSettings) => {
    setSaved(s)
    setOpen(s.rsvpOpen)
    setHasDeadline(Boolean(s.rsvpDeadline))
    const parts = s.rsvpDeadline ? toManilaParts(s.rsvpDeadline) : null
    setDate(parts?.date ?? '')
    setTime(parts?.time ?? '23:59')
    setMessage(s.rsvpClosedMessage)
  }

  useEffect(() => {
    getWeddingSettings()
      .then((s) => {
        setId(s.id)
        load(s)
      })
      .catch((e) => setError(toFriendlyMessage(e)))
  }, [])

  const persist = async (next: RsvpSettings, success: string) => {
    if (!id) return
    setSaving(true)
    try {
      const s = await updateRsvpSettings(id, next)
      setCachedWeddingSettings(s)
      load(s)
      toast.success(success)
    } catch (e) {
      toast.error(toFriendlyMessage(e))
    } finally {
      setSaving(false)
    }
  }

  const save = () => {
    if (hasDeadline && !date) {
      toast.error('Please choose the deadline date, or turn the deadline off.')
      return
    }
    void persist(
      { rsvpOpen: open, rsvpDeadline: hasDeadline ? fromManilaParts(date, time) : null, rsvpClosedMessage: message },
      'RSVP settings saved.',
    )
  }

  const reopenFor = (days: number) => {
    const d = new Date(Date.now() + days * 86_400_000)
    const parts = toManilaParts(d.toISOString())
    void persist(
      { rsvpOpen: true, rsvpDeadline: fromManilaParts(parts.date, '23:59'), rsvpClosedMessage: message },
      `RSVP reopened until ${formatDeadlineDateTime(fromManilaParts(parts.date, '23:59'))}.`,
    )
  }

  if (error) {
    return (
      <p role="alert" className="text-sm text-rose">
        {error}
      </p>
    )
  }
  if (!saved) return <Skeleton className="h-56" />

  const liveOpen = isRsvpOpen(saved)
  const dirty =
    open !== saved.rsvpOpen ||
    message !== saved.rsvpClosedMessage ||
    (hasDeadline ? fromManilaParts(date || '2000-01-01', time) : null) !== (saved.rsvpDeadline ? new Date(saved.rsvpDeadline).toISOString() : null)

  return (
    <section id="rsvp-settings" aria-labelledby="rsvp-settings-heading" className="scroll-mt-24 rounded-xl border border-line bg-paper p-5 shadow-soft sm:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="rsvp-settings-heading" className="text-2xl text-ink">
            RSVP Deadline
          </h2>
          <p className="mt-1 text-sm text-muted">After the deadline the RSVP buttons disappear and new responses are refused.</p>
        </div>
        <Badge tone={liveOpen ? 'green' : 'rose'}>
          {liveOpen ? (saved.rsvpDeadline ? `Open until ${formatDeadlineDateTime(saved.rsvpDeadline)}` : 'Open, no deadline') : 'Closed'}
        </Badge>
      </div>

      <div className="space-y-5">
        <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-line bg-ivory/60 px-4 py-3.5">
          <span>
            <span className="block text-[0.95rem] font-medium text-ink-soft">Accept RSVPs</span>
            <span className="block text-sm text-muted">Turn off to close RSVPs immediately, whatever the deadline.</span>
          </span>
          <input type="checkbox" checked={open} onChange={(e) => setOpen(e.target.checked)} className="size-5 shrink-0 accent-ink" />
        </label>

        <div className="rounded-lg border border-line px-4 py-4">
          <label className="flex cursor-pointer items-center gap-3 text-[0.95rem] font-medium text-ink-soft">
            <input type="checkbox" checked={hasDeadline} onChange={(e) => setHasDeadline(e.target.checked)} className="size-5 accent-ink" />
            Close RSVPs automatically on a date
          </label>
          {hasDeadline && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="rsvp-deadline-date" className="mb-2 block text-sm font-medium text-ink-soft">
                  Deadline date
                </label>
                <input id="rsvp-deadline-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input-base" />
              </div>
              <div>
                <label htmlFor="rsvp-deadline-time" className="mb-2 block text-sm font-medium text-ink-soft">
                  Time (Philippine time)
                </label>
                <input id="rsvp-deadline-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className="input-base" />
              </div>
            </div>
          )}
        </div>

        <TextAreaField
          label="Message shown when RSVPs are closed"
          value={message}
          onChange={setMessage}
          maxLength={400}
          rows={2}
        />

        <div className="flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button variant="subtle" size="sm" onClick={() => reopenFor(7)} disabled={saving} icon={<RotateCcw aria-hidden="true" className="size-4" />}>
              Reopen for 7 days
            </Button>
            <Button variant="subtle" size="sm" onClick={() => reopenFor(14)} disabled={saving} icon={<CalendarClock aria-hidden="true" className="size-4" />}>
              Reopen for 14 days
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void persist({ rsvpOpen: true, rsvpDeadline: null, rsvpClosedMessage: message }, 'Deadline removed. RSVPs are open.')}
              disabled={saving}
              icon={<XCircle aria-hidden="true" className="size-4" />}
            >
              Remove deadline
            </Button>
          </div>
          <Button onClick={save} loading={saving} loadingText="Saving…" disabled={!dirty} icon={<Save aria-hidden="true" className="size-4" />}>
            Save RSVP settings
          </Button>
        </div>
      </div>
    </section>
  )
}
