import { useEffect, useMemo, useState } from 'react'
import { Eye, Pencil, Plus, Printer, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAdminData } from '../hooks/useAdminData'
import { useToast } from '../hooks/useToast'
import { createInvitation, deleteInvitation, recordRsvpForGuest, setIncludedGuests, updateInvitation } from '../services/adminService'
import type { InvitationInput, InvitationWithRSVP } from '../types/rsvp'
import { toFriendlyMessage } from '../utils/errors'
import { formatShortDate } from '../utils/formatting'
import { normalizeName } from '../utils/validation'
import { includedGuestNames } from '../utils/guests'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { ResponsiveTable, type Column } from '../components/ui/ResponsiveTable'
import { TableSkeleton } from '../components/ui/Skeleton'
import type { SeatingTable } from '../types/seating'
import { useWeddingSettings } from '../hooks/useWeddingSettings'
import { useEntourageLinks } from '../hooks/useEntourageLinks'
import { entouragePositions } from '../utils/positions'
import { InvitationFormModal, type RecordChoice } from '../components/admin/InvitationFormModal'
import { ResponseDetailModal } from '../components/admin/ResponseDetailModal'
import { AttendanceBadge } from '../components/admin/StatusBadges'
import { PageHeader, Panel } from '../components/admin/PageHeader'
import { FilterTabs, SearchInput } from '../components/admin/FilterTabs'
import { HeadcountSummary } from '../components/admin/HeadcountSummary'
import { SIDE_LABEL, bySide, type SideFilter } from '../utils/headcount'
import type { PrintablesHandoff } from './AdminPrintables'

export default function AdminInvitations() {
  const { data, loading, error, reload } = useAdminData()
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [side, setSide] = useState<SideFilter>('all')
  const navigate = useNavigate()
  const toPrint = (state: PrintablesHandoff) => navigate('/admin/printables', { state })
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<InvitationWithRSVP | null>(null)
  const [saving, setSaving] = useState(false)
  const [toDelete, setToDelete] = useState<InvitationWithRSVP | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [viewing, setViewing] = useState<InvitationWithRSVP | null>(null)
  const [newTables, setNewTables] = useState<SeatingTable[]>([])
  const { settings } = useWeddingSettings()
  const { links } = useEntourageLinks()
  const autoPositions = useMemo(() => entouragePositions(settings?.entourage ?? [], links), [settings, links])
  const tables = useMemo(() => {
    const base = data?.tables ?? []
    return [...base, ...newTables.filter((t) => !base.some((b) => b.id === t.id))]
  }, [data, newTables])

  useEffect(() => {
    document.title = 'Invitations · Wedding admin'
  }, [])

  const sideList = useMemo(() => bySide(data?.invitations ?? [], side), [data, side])
  const rows = useMemo(() => {
    const q = normalizeName(query)
    return q ? sideList.filter((i) => normalizeName(i.inviteeName).includes(q)) : sideList
  }, [sideList, query])

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }
  const openEdit = (inv: InvitationWithRSVP) => {
    setEditing(inv)
    setFormOpen(true)
  }

  const tryRecord = async (id: string, record: RecordChoice) => {
    try {
      await recordRsvpForGuest(id, record.status, record.mobile)
      return true
    } catch (e) {
      toast.error(toFriendlyMessage(e))
      return false
    }
  }

  const save = async (input: InvitationInput, included: string[], record: RecordChoice | null) => {
    setSaving(true)
    try {
      if (editing) {
        await updateInvitation(editing.id, input)
        const before = includedGuestNames(editing)
        const changed = before.length !== included.length || before.some((n, i) => n !== included[i])
        if (changed) await setIncludedGuests(editing.id, included)
        const ok = record ? await tryRecord(editing.id, record) : true
        if (ok) toast.success(record ? 'Invitation updated and response recorded.' : 'Invitation updated.')
      } else {
        const created = await createInvitation(input)
        if (included.length) await setIncludedGuests(created.id, included)
        const ok = record ? await tryRecord(created.id, record) : true
        if (ok) toast.success(record ? 'Invitation added and response recorded.' : 'Invitation added.')
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
        variant="subtle"
        onClick={() => toPrint({ select: [inv.id] })}
        icon={<Printer aria-hidden="true" className="size-3.5" />}
        aria-label={`Print the invitation for ${inv.inviteeName}`}
      >
        Print
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
    { key: 'side', header: 'Side', cell: (r) => <Badge tone={r.side === 'bride' ? 'rose' : 'gold'}>{r.side === 'bride' ? 'Bride' : 'Groom'}</Badge>, className: 'whitespace-nowrap' },
    { key: 'table', header: 'Table', cell: (r) => r.tableNumber || '—' },
    {
      key: 'included',
      header: 'Included Guests',
      cell: (r) => {
        const names = includedGuestNames(r)
        return names.length ? <span className="text-ink-soft">{names.join(', ')}</span> : '—'
      },
    },
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
          <>
            <Button variant="outline" onClick={() => toPrint({ side })} icon={<Printer aria-hidden="true" className="size-4" />}>
              Print invitations
            </Button>
            <Button onClick={openCreate} icon={<Plus aria-hidden="true" className="size-4" />}>
              Add Invitation
            </Button>
          </>
        }
      />
      {data && <HeadcountSummary invitations={data.invitations} side={side} />}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FilterTabs
          label="Guest side"
          value={side}
          onChange={setSide}
          options={[
            { value: 'all', label: 'All', count: data?.invitations.length },
            { value: 'groom', label: 'Groom’s side', count: data ? bySide(data.invitations, 'groom').length : undefined },
            { value: 'bride', label: 'Bride’s side', count: data ? bySide(data.invitations, 'bride').length : undefined },
          ]}
        />
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
            empty={query ? 'No invitations match your search.' : side !== 'all' ? `No invitations on the ${SIDE_LABEL[side]} yet.` : 'No invitations yet. Add your first invitation.'}
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
        tables={tables}
        invitations={data?.invitations ?? []}
        onTableCreated={(t) => setNewTables((l) => [...l, t])}
        autoPosition={editing ? autoPositions.get(`${editing.id}:`) ?? '' : ''}
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
