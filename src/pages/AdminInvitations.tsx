import { useEffect, useMemo, useState } from 'react'
import { Eye, Pencil, Plus, Trash2 } from 'lucide-react'
import { useAdminData } from '../hooks/useAdminData'
import { useToast } from '../hooks/useToast'
import { createInvitation, deleteInvitation, updateInvitation } from '../services/adminService'
import type { InvitationInput, InvitationWithRSVP } from '../types/rsvp'
import { toFriendlyMessage } from '../utils/errors'
import { formatShortDate } from '../utils/formatting'
import { normalizeName } from '../utils/validation'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { ResponsiveTable, type Column } from '../components/ui/ResponsiveTable'
import { TableSkeleton } from '../components/ui/Skeleton'
import { InvitationFormModal } from '../components/admin/InvitationFormModal'
import { ResponseDetailModal } from '../components/admin/ResponseDetailModal'
import { AttendanceBadge } from '../components/admin/StatusBadges'
import { PageHeader, Panel } from '../components/admin/PageHeader'
import { SearchInput } from '../components/admin/FilterTabs'

export default function AdminInvitations() {
  const { data, loading, error, reload } = useAdminData()
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<InvitationWithRSVP | null>(null)
  const [saving, setSaving] = useState(false)
  const [toDelete, setToDelete] = useState<InvitationWithRSVP | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [viewing, setViewing] = useState<InvitationWithRSVP | null>(null)

  useEffect(() => {
    document.title = 'Invitations · Wedding admin'
  }, [])

  const rows = useMemo(() => {
    const list = data?.invitations ?? []
    const q = normalizeName(query)
    return q ? list.filter((i) => normalizeName(i.inviteeName).includes(q)) : list
  }, [data, query])

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }
  const openEdit = (inv: InvitationWithRSVP) => {
    setEditing(inv)
    setFormOpen(true)
  }

  const save = async (input: InvitationInput) => {
    setSaving(true)
    try {
      if (editing) {
        await updateInvitation(editing.id, input)
        toast.success('Invitation updated.')
      } else {
        await createInvitation(input)
        toast.success('Invitation added.')
      }
      setFormOpen(false)
      await reload()
    } catch (e) {
      toast.error(toFriendlyMessage(e))
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!toDelete) return
    setDeleting(true)
    try {
      await deleteInvitation(toDelete.id)
      toast.success('Invitation deleted.')
      setToDelete(null)
      await reload()
    } catch (e) {
      toast.error(toFriendlyMessage(e))
    } finally {
      setDeleting(false)
    }
  }

  const copyLink = async (code: string) => {
    const base = `${window.location.origin}${window.location.pathname}`
    const url = `${base}#/rsvp?invite=${encodeURIComponent(code)}`
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Personal RSVP link copied.')
    } catch {
      toast.show(url)
    }
  }

  const actions = (inv: InvitationWithRSVP) => (
    <div className="flex flex-wrap gap-1.5">
      <Button size="sm" variant="subtle" onClick={() => openEdit(inv)} icon={<Pencil aria-hidden="true" className="size-3.5" />} aria-label={`Edit ${inv.inviteeName}`}>
        Edit
      </Button>
      <Button size="sm" variant="subtle" onClick={() => setViewing(inv)} icon={<Eye aria-hidden="true" className="size-3.5" />} aria-label={`View RSVP for ${inv.inviteeName}`}>
        View RSVP
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="text-rose hover:bg-rose/10 hover:text-rose"
        onClick={() => setToDelete(inv)}
        icon={<Trash2 aria-hidden="true" className="size-3.5" />}
        aria-label={`Delete ${inv.inviteeName}`}
      >
        Delete
      </Button>
    </div>
  )

  const columns: Column<InvitationWithRSVP>[] = [
    { key: 'name', header: 'Invitee', cell: (r) => <span className="font-medium text-ink">{r.inviteeName}</span>, hideOnMobile: true },
    { key: 'table', header: 'Table', cell: (r) => r.tableNumber || '—' },
    { key: 'max', header: 'Allowed Additional Guests', cell: (r) => r.maxAdditionalGuests, className: 'text-center md:w-28' },
    { key: 'rsvp', header: 'RSVP', cell: (r) => <AttendanceBadge status={r.status} /> },
    { key: 'active', header: 'Active', cell: (r) => (r.isActive ? <Badge tone="green">Active</Badge> : <Badge>Inactive</Badge>) },
    { key: 'created', header: 'Created', cell: (r) => formatShortDate(r.createdAt), className: 'whitespace-nowrap' },
    { key: 'actions', header: 'Actions', cell: actions, hideOnMobile: true },
  ]

  return (
    <>
      <PageHeader
        title="Invitations"
        description={data ? `${data.invitations.length} invitations` : 'Manage who can RSVP.'}
        actions={
          <Button onClick={openCreate} icon={<Plus aria-hidden="true" className="size-4" />}>
            Add Invitation
          </Button>
        }
      />
      <div className="mb-4">
        <SearchInput label="Search by invitee name" placeholder="Search by invitee name…" value={query} onChange={setQuery} />
      </div>
      {error && (
        <p role="alert" className="mb-4 rounded-lg border border-rose/30 bg-rose/5 px-4 py-3 text-sm text-rose">
          {error}
        </p>
      )}
      <Panel>
        {loading && !data ? (
          <TableSkeleton />
        ) : (
          <ResponsiveTable
            caption="Invitations"
            rows={rows}
            columns={columns}
            rowKey={(r) => r.id}
            mobileTitle={(r) => r.inviteeName}
            mobileActions={actions}
            empty={query ? 'No invitations match your search.' : 'No invitations yet. Add your first invitation.'}
          />
        )}
      </Panel>

      <InvitationFormModal
        open={formOpen}
        invitation={editing}
        saving={saving}
        onClose={() => !saving && setFormOpen(false)}
        onSave={save}
        onCopyLink={copyLink}
      />

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete this invitation?"
        message={
          <>
            <p className="font-medium text-ink">{toDelete?.inviteeName}</p>
            <p className="mt-2">This will also remove its RSVP response and additional guest records.</p>
          </>
        }
        destructive
        confirmLabel="Delete invitation"
        loading={deleting}
        loadingText="Deleting…"
        onCancel={() => !deleting && setToDelete(null)}
        onConfirm={confirmDelete}
      />

      <ResponseDetailModal invitation={viewing} onClose={() => setViewing(null)} />
    </>
  )
}
