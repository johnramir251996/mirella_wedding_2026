import { useEffect, useMemo, useState } from 'react'
import { CalendarHeart, CheckCircle2, Clock, Download, Mail, RefreshCw, UserPlus, Users, XCircle } from 'lucide-react'
import { useAdminData } from '../hooks/useAdminData'
import { useToast } from '../hooks/useToast'
import { computeAnalytics } from '../services/analyticsService'
import { listRecentActivity } from '../services/adminService'
import type { ActivityLog } from '../types/rsvp'
import { buildRSVPCsv, downloadCsv } from '../utils/csvExport'
import { formatDateTime } from '../utils/formatting'
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
  rsvp_exported: 'RSVP data exported',
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

  const stats = useMemo(() => (data ? computeAnalytics(data.invitations, data.guests) : null), [data])

  const exportCsv = () => {
    if (!data) return
    const date = new Date().toISOString().slice(0, 10)
    downloadCsv(`mir-ella-rsvp-${date}.csv`, buildRSVPCsv(data.invitations))
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
              <StatCard label="Invited Guests" value={stats.invitedGuests} icon={<Users className="size-5" />} hint="Primary invitees on active invitations" />
              <StatCard
                emphasis
                label="Expected Attendees"
                value={stats.expectedAttendees}
                icon={<CalendarHeart className="size-5" />}
                hint={`${stats.attending} attending + ${stats.expectedAttendees - stats.attending} approved guests`}
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
  const after = d.after as Record<string, unknown> | undefined
  if (after && typeof after.invitee_name === 'string') return after.invitee_name
  if (Array.isArray(d.changed_fields)) return (d.changed_fields as string[]).join(', ').replace(/_/g, ' ')
  return ''
}
