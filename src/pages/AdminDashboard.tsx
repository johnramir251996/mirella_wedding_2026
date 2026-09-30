import { useEffect, useMemo, useState } from 'react'
import { CalendarClock, CalendarHeart, CheckCircle2, Clock, Download, Mail, RefreshCw, UserPlus, Users, XCircle } from 'lucide-react'
import { useAdminData } from '../hooks/useAdminData'
import { useToast } from '../hooks/useToast'
import { computeAnalytics } from '../services/analyticsService'
import { listRecentActivity } from '../services/adminService'
import type { ActivityLog } from '../types/rsvp'
import { buildRSVPCsv, downloadCsv } from '../utils/csvExport'
import { formatDateTime, formatDeadlineDateTime } from '../utils/formatting'
import { Link } from 'react-router-dom'
import { useWeddingSettings } from '../hooks/useWeddingSettings'
import { useAllQuestions } from '../hooks/useAllQuestions'
import { isRsvpOpen } from '../services/settingsService'
import { cn } from '../components/ui/cn'
import { Button } from '../components/ui/Button'
import { Skeleton } from '../components/ui/Skeleton'
import { StatCard } from '../components/admin/StatCard'
import { BarChartCard } from '../components/admin/BarChartCard'
import { PageHeader, Panel } from '../components/admin/PageHeader'

const ACTION_LABEL: Record<string, string> = {
  invitation_created: 'Invitation created',
  invitation_updated: 'Invitation updated',
  invitation_deleted: 'Invitation deleted',
  rsvp_deleted: 'RSVP deleted',
  guest_status_changed: 'Guest status changed',
  settings_updated: 'Website settings changed',
  gift_settings_updated: 'Gift settings changed',
  gallery_photo_added: 'Gallery photo added',
  gallery_photo_removed: 'Gallery photo removed',
  included_guests_updated: 'Included guests updated',
  outfit_image_added: 'Outfit image added',
  outfit_image_removed: 'Outfit image removed',
  rsvp_exported: 'RSVP data exported',
  question_added: 'RSVP question added',
  question_updated: 'RSVP question changed',
  question_deleted: 'RSVP question deleted',
}

export default function AdminDashboard() {
  const { data, loading, error, reload } = useAdminData()
  const toast = useToast()
  const [activity, setActivity] = useState<ActivityLog[] | null>(null)

  useEffect(() => {
    document.title = 'Dashboard · Wedding admin'
  }, [])

  useEffect(() => {
    if (!data) return
    let active = true
    listRecentActivity(8).then((a) => active && setActivity(a))
    return () => {
      active = false
    }
  }, [data])

  const { settings } = useWeddingSettings()
  const questions = useAllQuestions()
  const questionCharts = useMemo(() => {
    const responses = (data?.invitations ?? []).map((i) => i.response).filter((r) => r !== null)
    return questions
      .filter((q) => q.type === 'single' || q.type === 'multiple' || q.type === 'yes_no')
      .map((q) => {
        const labels = q.type === 'yes_no' ? ['yes', 'no'] : q.options
        const counts = new Map(labels.map((l) => [l, 0]))
        let answered = 0
        for (const r of responses) {
          const a = r.customAnswers[q.id]
          const list = Array.isArray(a) ? a : typeof a === 'string' ? [a] : []
          if (list.length) answered++
          for (const v of list) if (typeof v === 'string' && counts.has(v)) counts.set(v, (counts.get(v) ?? 0) + 1)
        }
        return {
          id: q.id,
          title: q.question,
          description: `${answered} ${answered === 1 ? 'answer' : 'answers'}${q.isActive ? '' : ' · question hidden'}`,
          data: labels.map((l) => ({ label: q.type === 'yes_no' ? (l === 'yes' ? 'Yes' : 'No') : l, value: counts.get(l) ?? 0 })),
        }
      })
  }, [data, questions])
  const rsvpOpen = settings ? isRsvpOpen(settings) : true
  const stats = useMemo(() => (data ? computeAnalytics(data.invitations, data.guests) : null), [data])
  const messages = useMemo(
    () =>
      (data?.invitations ?? [])
        .filter((i) => i.response?.attendanceStatus === 'attending' && i.response.messageToCouple)
        .map((i) => ({ id: i.id, name: i.inviteeName, message: i.response!.messageToCouple!, at: i.response!.updatedAt }))
        .sort((a, b) => b.at.localeCompare(a.at)),
    [data],
  )

  const exportCsv = () => {
    if (!data) return
    const date = new Date().toISOString().slice(0, 10)
    downloadCsv(`mir-ella-rsvp-${date}.csv`, buildRSVPCsv(data.invitations, questions))
    toast.success('RSVP data exported.')
  }

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Live overview of invitations and RSVPs."
        actions={
          <>
            <Button variant="subtle" onClick={() => void reload()} disabled={loading} icon={<RefreshCw aria-hidden="true" className={loading ? 'size-4 animate-spin' : 'size-4'} />}>
              Refresh
            </Button>
            <Button onClick={exportCsv} disabled={!data || loading} icon={<Download aria-hidden="true" className="size-4" />}>
              Export RSVP Data
            </Button>
          </>
        }
      />

      {settings && (
        <Link
          to="/admin/settings"
          className={cn(
            'mb-6 flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm transition hover:shadow-soft',
            rsvpOpen ? 'border-sage/30 bg-sage/5 text-ink-soft' : 'border-rose/30 bg-rose/5 text-rose',
          )}
        >
          <span className="flex items-center gap-2">
            <CalendarClock aria-hidden="true" className="size-4 shrink-0" />
            {rsvpOpen
              ? settings.rsvpDeadline
                ? `RSVPs are open until ${formatDeadlineDateTime(settings.rsvpDeadline)} (PH time).`
                : 'RSVPs are open — no deadline set.'
              : 'RSVPs are closed. Guests can no longer respond.'}
          </span>
          <span className="shrink-0 text-xs font-medium uppercase tracking-[0.14em]">{rsvpOpen ? 'Set deadline' : 'Reopen'}</span>
        </Link>
      )}

      {error && (
        <p role="alert" className="mb-6 rounded-lg border border-rose/30 bg-rose/5 px-4 py-3 text-sm text-rose">
          {error}
        </p>
      )}

      {!stats ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5" role="status" aria-label="Loading dashboard">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
          <Skeleton className="col-span-full h-72" />
        </div>
      ) : (
        <div className="space-y-8">
          <section aria-label="RSVP summary" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            <StatCard label="Total Invitations" value={stats.totalInvitations} icon={<Mail className="size-5" />} hint={`${stats.activeInvitations} active`} />
            <StatCard label="Attending" value={stats.attending} icon={<CheckCircle2 className="size-5" />} hint={`${stats.responseRate}% responded`} />
            <StatCard label="Declining" value={stats.declining} icon={<XCircle className="size-5" />} />
            <StatCard label="Pending" value={stats.pending} icon={<Clock className="size-5" />} hint="No response yet" />
            <StatCard label="Additional Guest Requests" value={stats.pendingGuestRequests} icon={<UserPlus className="size-5" />} hint="Awaiting approval" />
          </section>

          <section aria-labelledby="headcount-heading">
            <h2 id="headcount-heading" className="mb-3 font-sans text-sm font-semibold uppercase tracking-[0.14em] text-muted">
              Headcount for catering
            </h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <StatCard
                label="Invited Guests"
                value={stats.invitedGuests}
                icon={<Users className="size-5" />}
                hint={`${stats.invitedGuests - stats.includedGuests} invitees + ${stats.includedGuests} included guests`}
              />
              <StatCard
                emphasis
                label="Expected Attendees"
                value={stats.expectedAttendees}
                icon={<CalendarHeart className="size-5" />}
                hint={`${stats.attending} attending invitees + ${stats.expectedAttendees - stats.attending} of their confirmed guests`}
              />
              <StatCard label="Pending Additional Guest Requests" value={stats.pendingGuestRequests} icon={<Clock className="size-5" />} hint="Not counted until approved" />
            </div>
          </section>

          <section aria-label="Charts" className="grid gap-4 lg:grid-cols-2">
            <BarChartCard
              title="Attendance"
              description="All invitations"
              data={[
                { label: 'Attending', value: stats.attending },
                { label: 'Declining', value: stats.declining },
                { label: 'Pending', value: stats.pending },
              ]}
              emptyText="No invitations yet."
            />
            <BarChartCard
              title="Transportation"
              description="Attending guests"
              data={[
                { label: 'Own vehicle', value: stats.transportation.ownVehicle },
                { label: 'Need transport', value: stats.transportation.needTransport },
                { label: 'Not sure yet', value: stats.transportation.notSure },
              ]}
            />
            <BarChartCard
              title="Food preferences"
              description="Selections across attending RSVPs"
              data={[...stats.food].sort((a, b) => b.count - a.count).map((f) => ({ label: f.label, value: f.count }))}
            />
            <div className="grid gap-4">
              <BarChartCard
                title="Dietary restrictions"
                description="Attending guests"
                data={[
                  { label: 'No restrictions', value: stats.dietary.none },
                  { label: 'Has restrictions', value: stats.dietary.has },
                ]}
              />
              <BarChartCard
                title="Additional guests"
                description="Requests by status"
                data={[
                  { label: 'Pending', value: stats.pendingGuestRequests },
                  { label: 'Approved', value: stats.approvedGuests },
                  { label: 'Declined', value: stats.declinedGuests },
                ]}
                emptyText="No additional guest requests yet."
              />
            </div>
          </section>

          {questionCharts.length > 0 && (
            <section aria-labelledby="custom-q-heading">
              <h2 id="custom-q-heading" className="mb-3 font-sans text-sm font-semibold uppercase tracking-[0.14em] text-muted">
                Your RSVP questions
              </h2>
              <div className="grid gap-4 lg:grid-cols-2">
                {questionCharts.map((c) => (
                  <BarChartCard key={c.id} title={c.title} description={c.description} data={c.data} />
                ))}
              </div>
            </section>
          )}

          <section aria-labelledby="messages-heading">
            <h2 id="messages-heading" className="mb-3 font-sans text-sm font-semibold uppercase tracking-[0.14em] text-muted">
              Messages from guests
            </h2>
            <Panel>
              {messages.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-muted">No messages yet. They’ll appear here as guests RSVP.</p>
              ) : (
                <ul className="grid gap-px bg-line/60 sm:grid-cols-2">
                  {messages.map((m) => (
                    <li key={m.id} className="bg-paper px-5 py-4">
                      <p className="font-serif text-lg italic leading-snug text-ink">“{m.message}”</p>
                      <p className="mt-2 text-xs text-muted">
                        — {m.name} · {formatDateTime(m.at)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </section>

          <section aria-labelledby="activity-heading">
            <h2 id="activity-heading" className="mb-3 font-sans text-sm font-semibold uppercase tracking-[0.14em] text-muted">
              Recent admin activity
            </h2>
            <Panel>
              {activity === null ? (
                <div className="space-y-2 p-4">
                  <Skeleton className="h-8" />
                  <Skeleton className="h-8" />
                </div>
              ) : activity.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-muted">No admin activity recorded yet.</p>
              ) : (
                <ul className="divide-y divide-line/70">
                  {activity.map((a) => (
                    <li key={a.id} className="flex flex-col gap-0.5 px-5 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-ink">
                        {ACTION_LABEL[a.action] ?? a.action}
                        {describe(a) && <span className="text-muted"> · {describe(a)}</span>}
                      </span>
                      <span className="text-xs text-muted">{formatDateTime(a.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </section>
        </div>
      )}
    </>
  )
}

function describe(a: ActivityLog): string {
  const d = a.details
  if (typeof d.invitee_name === 'string') return d.invitee_name
  if (typeof d.guest_name === 'string') return `${d.guest_name}: ${String(d.from)} → ${String(d.to)}`
  if (Array.isArray(d.included_guests)) return (d.included_guests as string[]).join(', ') || 'none'
  if (typeof d.caption === 'string') return d.caption
  const after = d.after as Record<string, unknown> | undefined
  if (after && typeof after.invitee_name === 'string') return after.invitee_name
  if (Array.isArray(d.changed_fields)) return (d.changed_fields as string[]).join(', ').replace(/_/g, ' ')
  return ''
}
