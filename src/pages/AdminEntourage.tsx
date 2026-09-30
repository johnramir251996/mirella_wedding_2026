import { useEffect, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, Plus, Save, Trash2, X } from 'lucide-react'
import { useToast } from '../hooks/useToast'
import { setCachedWeddingSettings } from '../hooks/useWeddingSettings'
import { getWeddingSettings, newSectionId, updateEntourage } from '../services/settingsService'
import type { EntourageGroup, EntourageSettings } from '../types/wedding'
import { toFriendlyMessage } from '../utils/errors'
import { Button } from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { TextField } from '../components/ui/FormField'
import { Skeleton } from '../components/ui/Skeleton'
import { cn } from '../components/ui/cn'
import { PageHeader } from '../components/admin/PageHeader'

const PRESET_GROUPS: { title: string; layout: EntourageGroup['layout'] }[] = [
  { title: 'Parents of the Groom', layout: 'pairs' },
  { title: 'Parents of the Bride', layout: 'pairs' },
  { title: 'Principal Sponsors', layout: 'pairs' },
  { title: 'Officiating Priest', layout: 'list' },
  { title: 'Best Man', layout: 'list' },
  { title: 'Maid of Honor', layout: 'list' },
  { title: 'Matron of Honor', layout: 'list' },
  { title: 'Secondary Sponsors', layout: 'pairs' },
  { title: 'Groomsmen', layout: 'pairs' },
  { title: 'Bridesmaids', layout: 'pairs' },
  { title: 'Bearers', layout: 'list' },
  { title: 'Flower Girls', layout: 'pairs' },
]

function move<T>(list: T[], index: number, dir: -1 | 1): T[] {
  const target = index + dir
  if (target < 0 || target >= list.length) return list
  const next = [...list]
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}

export default function AdminEntourage() {
  const toast = useToast()
  const [id, setId] = useState<string | null>(null)
  const [values, setValues] = useState<EntourageSettings | null>(null)
  const [savedJson, setSavedJson] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preset, setPreset] = useState('')
  const [groupToDelete, setGroupToDelete] = useState<EntourageGroup | null>(null)

  useEffect(() => {
    document.title = 'Entourage · Wedding admin'
    getWeddingSettings()
      .then((s) => {
        const v: EntourageSettings = {
          entourage: s.entourage,
          entourageVisible: s.entourageVisible,
          entourageTitle: s.entourageTitle,
          entourageSubtitle: s.entourageSubtitle,
        }
        setId(s.id)
        setValues(v)
        setSavedJson(JSON.stringify(v))
      })
      .catch((e) => setError(toFriendlyMessage(e)))
  }, [])

  const dirty = values ? JSON.stringify(values) !== savedJson : false

  useEffect(() => {
    if (!dirty) return
    const handler = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  if (error) {
    return (
      <>
        <PageHeader title="Entourage" />
        <p role="alert" className="rounded-lg border border-rose/30 bg-rose/5 px-4 py-3 text-sm text-rose">
          {error}
        </p>
      </>
    )
  }
  if (!values || !id) {
    return (
      <>
        <PageHeader title="Entourage" />
        <Skeleton className="h-96" />
      </>
    )
  }

  const setGroups = (entourage: EntourageGroup[]) => setValues({ ...values, entourage })
  const updateGroup = (gid: string, patch: Partial<EntourageGroup>) => setGroups(values.entourage.map((g) => (g.id === gid ? { ...g, ...patch } : g)))

  const addGroup = (title: string, layout: EntourageGroup['layout']) => {
    const g: EntourageGroup = { id: newSectionId(), title, layout, members: [{ id: newSectionId(), name: '', role: '' }] }
    setGroups([...values.entourage, g])
    window.setTimeout(() => document.getElementById(`member-${g.members[0].id}`)?.focus(), 60)
  }

  const save = async () => {
    if (values.entourage.some((g) => !g.title.trim())) {
      toast.error('Every group needs a title.')
      return
    }
    setSaving(true)
    try {
      const s = await updateEntourage(id, values)
      setCachedWeddingSettings(s)
      const v: EntourageSettings = {
        entourage: s.entourage,
        entourageVisible: s.entourageVisible,
        entourageTitle: s.entourageTitle,
        entourageSubtitle: s.entourageSubtitle,
      }
      setValues(v)
      setSavedJson(JSON.stringify(v))
      toast.success('Entourage saved.')
    } catch (e) {
      toast.error(toFriendlyMessage(e))
    } finally {
      setSaving(false)
    }
  }

  const usedTitles = new Set(values.entourage.map((g) => g.title.toLowerCase()))

  return (
    <>
      <PageHeader
        title="Entourage"
        description="Listed on the website in this order — arrange it as your processional."
        actions={
          <Button onClick={() => void save()} loading={saving} loadingText="Saving…" disabled={!dirty} icon={<Save aria-hidden="true" className="size-4" />}>
            Save changes
          </Button>
        }
      />

      <div className="mb-6 rounded-xl border border-line bg-paper p-5 shadow-soft sm:p-6">
        <div className="grid gap-5 md:grid-cols-2">
          <TextField label="Section title" value={values.entourageTitle} onChange={(v) => setValues({ ...values, entourageTitle: v })} maxLength={80} />
          <TextField label="Short description" value={values.entourageSubtitle} onChange={(v) => setValues({ ...values, entourageSubtitle: v })} maxLength={200} />
        </div>
        <label className="mt-5 flex cursor-pointer items-center gap-3 text-sm text-ink-soft">
          <input
            type="checkbox"
            checked={values.entourageVisible}
            onChange={(e) => setValues({ ...values, entourageVisible: e.target.checked })}
            className="size-5 accent-ink"
          />
          Show the entourage on the website
        </label>
      </div>

      <ol className="space-y-4">
        {values.entourage.map((g, gi) => (
          <li key={g.id} className="rounded-xl border border-line bg-paper p-4 shadow-soft sm:p-5">
            <div className="flex flex-wrap items-end gap-3">
              <TextField
                className="min-w-48 flex-1"
                label={`Group ${gi + 1}`}
                value={g.title}
                onChange={(v) => updateGroup(g.id, { title: v })}
                maxLength={80}
                placeholder="e.g. Principal Sponsors"
              />
              <div>
                <label htmlFor={`layout-${g.id}`} className="mb-2 block text-[0.95rem] font-medium text-ink-soft">
                  Layout
                </label>
                <select
                  id={`layout-${g.id}`}
                  value={g.layout}
                  onChange={(e) => updateGroup(g.id, { layout: e.target.value as EntourageGroup['layout'] })}
                  className="input-base w-auto"
                >
                  <option value="pairs">Two columns</option>
                  <option value="list">One column</option>
                </select>
              </div>
              <div className="flex gap-1 pb-1">
                <IconButton label={`Move ${g.title || 'group'} up`} onClick={() => setGroups(move(values.entourage, gi, -1))} disabled={gi === 0}>
                  <ArrowUp className="size-4" />
                </IconButton>
                <IconButton label={`Move ${g.title || 'group'} down`} onClick={() => setGroups(move(values.entourage, gi, 1))} disabled={gi === values.entourage.length - 1}>
                  <ArrowDown className="size-4" />
                </IconButton>
                <IconButton label={`Delete ${g.title || 'group'}`} onClick={() => setGroupToDelete(g)} danger>
                  <Trash2 className="size-4" />
                </IconButton>
              </div>
            </div>

            <ul className="mt-4 space-y-2">
              {g.members.map((m, mi) => (
                <li key={m.id} className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                  <label className="sr-only" htmlFor={`member-${m.id}`}>
                    Name {mi + 1} in {g.title}
                  </label>
                  <input
                    id={`member-${m.id}`}
                    value={m.name}
                    maxLength={150}
                    placeholder="Full name, e.g. Mr. & Mrs. Antonio Reyes"
                    onChange={(e) => updateGroup(g.id, { members: g.members.map((x) => (x.id === m.id ? { ...x, name: e.target.value } : x)) })}
                    className="input-base min-h-11 flex-1 basis-full py-2.5 sm:basis-auto"
                  />
                  <label className="sr-only" htmlFor={`role-${m.id}`}>
                    Role for {m.name || `name ${mi + 1}`} (optional)
                  </label>
                  <input
                    id={`role-${m.id}`}
                    value={m.role}
                    maxLength={40}
                    placeholder="Role (optional)"
                    onChange={(e) => updateGroup(g.id, { members: g.members.map((x) => (x.id === m.id ? { ...x, role: e.target.value } : x)) })}
                    className="input-base min-h-11 flex-1 py-2.5 sm:max-w-44"
                  />
                  <div className="flex">
                    <IconButton label="Move up" onClick={() => updateGroup(g.id, { members: move(g.members, mi, -1) })} disabled={mi === 0}>
                      <ArrowUp className="size-4" />
                    </IconButton>
                    <IconButton label="Move down" onClick={() => updateGroup(g.id, { members: move(g.members, mi, 1) })} disabled={mi === g.members.length - 1}>
                      <ArrowDown className="size-4" />
                    </IconButton>
                    <IconButton label={`Remove ${m.name || 'name'}`} onClick={() => updateGroup(g.id, { members: g.members.filter((x) => x.id !== m.id) })} danger>
                      <X className="size-4" />
                    </IconButton>
                  </div>
                </li>
              ))}
            </ul>
            <Button
              variant="subtle"
              size="sm"
              className="mt-3"
              icon={<Plus aria-hidden="true" className="size-4" />}
              onClick={() => {
                const nm = { id: newSectionId(), name: '', role: '' }
                updateGroup(g.id, { members: [...g.members, nm] })
                window.setTimeout(() => document.getElementById(`member-${nm.id}`)?.focus(), 60)
              }}
            >
              Add name
            </Button>
          </li>
        ))}
      </ol>

      <div className="mt-6 flex flex-col gap-3 rounded-xl border border-dashed border-line p-5 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="preset-group" className="mb-2 block text-[0.95rem] font-medium text-ink-soft">
            Add a group
          </label>
          <select id="preset-group" value={preset} onChange={(e) => setPreset(e.target.value)} className="input-base">
            <option value="">Choose a common group…</option>
            {PRESET_GROUPS.filter((p) => !usedTitles.has(p.title.toLowerCase())).map((p) => (
              <option key={p.title} value={p.title}>
                {p.title}
              </option>
            ))}
            <option value="__custom">Custom group…</option>
          </select>
        </div>
        <Button
          variant="outline"
          icon={<Plus aria-hidden="true" className="size-4" />}
          disabled={!preset}
          onClick={() => {
            const p = PRESET_GROUPS.find((x) => x.title === preset)
            addGroup(p ? p.title : '', p ? p.layout : 'list')
            setPreset('')
          }}
        >
          Add group
        </Button>
      </div>

      {dirty && (
        <div className="sticky bottom-0 z-20 -mx-4 mt-6 border-t border-line bg-paper/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:-mx-6 sm:px-6 lg:mx-0 lg:rounded-xl lg:border">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted">You have unsaved changes.</p>
            <Button onClick={() => void save()} loading={saving} loadingText="Saving…" icon={<Save aria-hidden="true" className="size-4" />}>
              Save changes
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(groupToDelete)}
        title="Delete this group?"
        message={`“${groupToDelete?.title || 'Untitled group'}” and its names will be removed when you save.`}
        destructive
        confirmLabel="Delete group"
        onCancel={() => setGroupToDelete(null)}
        onConfirm={() => {
          if (groupToDelete) setGroups(values.entourage.filter((x) => x.id !== groupToDelete.id))
          setGroupToDelete(null)
        }}
      />
    </>
  )
}

function IconButton({ label, onClick, disabled, danger, children }: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        'flex size-10 items-center justify-center rounded-md text-muted transition disabled:opacity-30',
        danger ? 'hover:bg-rose/10 hover:text-rose' : 'hover:bg-cream hover:text-ink',
      )}
    >
      {children}
    </button>
  )
}
