import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, Eye, EyeOff, ImagePlus, Save, Trash2 } from 'lucide-react'
import { useToast } from '../hooks/useToast'
import { setCachedWeddingSettings } from '../hooks/useWeddingSettings'
import { addOutfitFromFile, addOutfitFromUrl, deleteOutfit, listAllOutfits, reorderOutfits, updateOutfit } from '../services/outfitService'
import { getWeddingSettings, updateOutfitSectionSettings } from '../services/settingsService'
import type { OutfitGender, OutfitImage, OutfitSectionSettings } from '../types/wedding'
import { toFriendlyMessage } from '../utils/errors'
import { isValidHttpUrl } from '../utils/validation'
import { Button } from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { TextAreaField, TextField } from '../components/ui/FormField'
import { Modal } from '../components/ui/Modal'
import { Skeleton } from '../components/ui/Skeleton'
import { Spinner } from '../components/ui/Spinner'
import { cn } from '../components/ui/cn'
import { PageHeader } from '../components/admin/PageHeader'
import { MotifCard } from '../components/admin/MotifCard'

const GROUPS: { gender: OutfitGender; title: string }[] = [
  { gender: 'male', title: 'For Him' },
  { gender: 'female', title: 'For Her' },
]

export default function AdminOutfits() {
  const toast = useToast()
  const [outfits, setOutfits] = useState<OutfitImage[] | null>(null)
  const [settingsId, setSettingsId] = useState<string | null>(null)
  const [section, setSection] = useState<OutfitSectionSettings | null>(null)
  const [savingSection, setSavingSection] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [addFor, setAddFor] = useState<OutfitGender | null>(null)
  const [toDelete, setToDelete] = useState<OutfitImage | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      setOutfits(await listAllOutfits())
    } catch (e) {
      setLoadError(toFriendlyMessage(e))
    }
  }, [])

  useEffect(() => {
    document.title = 'Outfit gallery · Wedding admin'
    void reload()
    getWeddingSettings()
      .then((s) => {
        setSettingsId(s.id)
        setSection({ outfitTitle: s.outfitTitle, outfitSubtitle: s.outfitSubtitle, outfitSectionVisible: s.outfitSectionVisible })
      })
      .catch((e) => setLoadError(toFriendlyMessage(e)))
  }, [reload])

  const saveSection = async (e: FormEvent) => {
    e.preventDefault()
    if (!settingsId || !section) return
    setSavingSection(true)
    try {
      const saved = await updateOutfitSectionSettings(settingsId, section)
      setCachedWeddingSettings(saved)
      toast.success('Section settings saved.')
    } catch (err) {
      toast.error(toFriendlyMessage(err))
    } finally {
      setSavingSection(false)
    }
  }

  const run = async (id: string, action: () => Promise<void>, success?: string) => {
    setBusyId(id)
    try {
      await action()
      if (success) toast.success(success)
      await reload()
    } catch (err) {
      toast.error(toFriendlyMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  const move = (group: OutfitImage[], index: number, dir: -1 | 1) => {
    const target = index + dir
    if (target < 0 || target >= group.length) return
    const ids = group.map((o) => o.id)
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    void run(group[index].id, () => reorderOutfits(ids))
  }

  const confirmDelete = async () => {
    if (!toDelete) return
    setDeleting(true)
    try {
      await deleteOutfit(toDelete.id)
      toast.success('Image removed.')
      setToDelete(null)
      await reload()
    } catch (err) {
      toast.error(toFriendlyMessage(err))
    } finally {
      setDeleting(false)
    }
  }

  if (loadError) {
    return (
      <>
        <PageHeader title="Outfit Gallery" />
        <p role="alert" className="rounded-lg border border-rose/30 bg-rose/5 px-4 py-3 text-sm text-rose">
          {loadError}
        </p>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Outfit Gallery"
        description="Dress code motif and attire inspiration shown on the home page, below the wedding details."
      />

      {section ? (
        <form onSubmit={saveSection} className="mb-6 rounded-xl border border-line bg-paper p-5 shadow-soft sm:p-6">
          <div className="grid gap-5 md:grid-cols-2">
            <TextField
              label="Section title"
              value={section.outfitTitle}
              onChange={(v) => setSection({ ...section, outfitTitle: v })}
              maxLength={80}
            />
            <TextAreaField
              label="Short description"
              value={section.outfitSubtitle}
              onChange={(v) => setSection({ ...section, outfitSubtitle: v })}
              maxLength={240}
              rows={2}
            />
          </div>
          <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex cursor-pointer items-center gap-3 text-sm text-ink-soft">
              <input
                type="checkbox"
                checked={section.outfitSectionVisible}
                onChange={(e) => setSection({ ...section, outfitSectionVisible: e.target.checked })}
                className="size-5 accent-[#2b2a28]"
              />
              Show this section on the website
            </label>
            <Button type="submit" loading={savingSection} loadingText="Saving…" icon={<Save aria-hidden="true" className="size-4" />}>
              Save section
            </Button>
          </div>
        </form>
      ) : (
        <Skeleton className="mb-6 h-40" />
      )}

      <MotifCard />

      <div className="grid gap-6 lg:grid-cols-2">
        {GROUPS.map(({ gender, title }) => {
          const group = (outfits ?? []).filter((o) => o.gender === gender)
          return (
            <section key={gender} aria-labelledby={`group-${gender}`} className="rounded-xl border border-line bg-paper p-5 shadow-soft sm:p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h2 id={`group-${gender}`} className="text-2xl text-ink">
                    {title}
                  </h2>
                  <p className="text-sm text-muted">
                    {outfits ? `${group.length} ${group.length === 1 ? 'image' : 'images'} · ${group.filter((g) => g.isVisible).length} shown` : 'Loading…'}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setAddFor(gender)} icon={<ImagePlus aria-hidden="true" className="size-4" />}>
                  Add image
                </Button>
              </div>

              {!outfits ? (
                <div className="space-y-3">
                  <Skeleton className="h-28" />
                  <Skeleton className="h-28" />
                </div>
              ) : group.length === 0 ? (
                <p className="rounded-lg border border-dashed border-line px-4 py-10 text-center text-sm text-muted">No images yet.</p>
              ) : (
                <ol className="space-y-3">
                  {group.map((o, i) => (
                    <OutfitRow
                      key={o.id}
                      outfit={o}
                      busy={busyId === o.id}
                      first={i === 0}
                      last={i === group.length - 1}
                      onMove={(dir) => move(group, i, dir)}
                      onToggle={() =>
                        void run(o.id, () => updateOutfit(o.id, { isVisible: !o.isVisible }), o.isVisible ? 'Image hidden.' : 'Image shown.')
                      }
                      onCaption={(caption) => void run(o.id, () => updateOutfit(o.id, { caption }), 'Caption saved.')}
                      onDelete={() => setToDelete(o)}
                    />
                  ))}
                </ol>
              )}
            </section>
          )
        })}
      </div>

      <AddOutfitModal
        gender={addFor}
        nextOrder={(outfits ?? []).filter((o) => o.gender === addFor).length + 1}
        onClose={() => setAddFor(null)}
        onAdded={async () => {
          setAddFor(null)
          toast.success('Image added.')
          await reload()
        }}
      />

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Remove this image?"
        message={`“${toDelete?.caption || 'Untitled image'}” will be removed from the website.`}
        destructive
        confirmLabel="Remove image"
        loading={deleting}
        loadingText="Removing…"
        onCancel={() => !deleting && setToDelete(null)}
        onConfirm={confirmDelete}
      />
    </>
  )
}

function OutfitRow({
  outfit,
  busy,
  first,
  last,
  onMove,
  onToggle,
  onCaption,
  onDelete,
}: {
  outfit: OutfitImage
  busy: boolean
  first: boolean
  last: boolean
  onMove: (dir: -1 | 1) => void
  onToggle: () => void
  onCaption: (caption: string) => void
  onDelete: () => void
}) {
  const [caption, setCaption] = useState(outfit.caption)
  const name = outfit.caption || 'image'
  return (
    <li className={cn('flex gap-4 rounded-lg border p-3', outfit.isVisible ? 'border-line' : 'border-dashed border-line bg-ivory/60')}>
      <img
        src={outfit.imageUrl}
        alt=""
        className={cn('h-28 w-21 shrink-0 rounded object-cover', !outfit.isVisible && 'opacity-50')}
        loading="lazy"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <label className="sr-only" htmlFor={`caption-${outfit.id}`}>
          Caption
        </label>
        <input
          id={`caption-${outfit.id}`}
          value={caption}
          maxLength={120}
          placeholder="Caption (optional)"
          onChange={(e) => setCaption(e.target.value)}
          onBlur={() => caption.trim() !== outfit.caption && onCaption(caption)}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          className="input-base min-h-10 py-2 text-sm"
        />
        <div className="flex flex-wrap items-center gap-1">
          <IconButton label={`Move ${name} up`} onClick={() => onMove(-1)} disabled={first || busy}>
            <ArrowUp className="size-4" />
          </IconButton>
          <IconButton label={`Move ${name} down`} onClick={() => onMove(1)} disabled={last || busy}>
            <ArrowDown className="size-4" />
          </IconButton>
          <IconButton label={outfit.isVisible ? `Hide ${name}` : `Show ${name}`} onClick={onToggle} disabled={busy}>
            {outfit.isVisible ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
          </IconButton>
          <IconButton label={`Remove ${name}`} onClick={onDelete} disabled={busy} danger>
            <Trash2 className="size-4" />
          </IconButton>
          {busy && <Spinner label="Saving" className="ml-1 text-xs text-muted" />}
          {!outfit.isVisible && <span className="ml-auto rounded-full bg-cream px-2 py-0.5 text-xs text-muted">Hidden</span>}
        </div>
      </div>
    </li>
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
        'flex size-9 items-center justify-center rounded-md text-muted transition disabled:opacity-30',
        danger ? 'hover:bg-rose/10 hover:text-rose' : 'hover:bg-cream hover:text-ink',
      )}
    >
      {children}
    </button>
  )
}

function AddOutfitModal({
  gender,
  nextOrder,
  onClose,
  onAdded,
}: {
  gender: OutfitGender | null
  nextOrder: number
  onClose: () => void
  onAdded: () => void
}) {
  const [mode, setMode] = useState<'upload' | 'url'>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [url, setUrl] = useState('')
  const [caption, setCaption] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!gender) return
    setMode('upload')
    setFile(null)
    setUrl('')
    setCaption('')
    setError(null)
  }, [gender])

  useEffect(() => {
    if (!file) {
      setPreview(null)
      return
    }
    const objectUrl = URL.createObjectURL(file)
    setPreview(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [file])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!gender) return
    setError(null)
    if (mode === 'upload' && !file) return setError('Please choose an image to upload.')
    if (mode === 'url' && (!url.trim() || !isValidHttpUrl(url))) return setError('Please enter a full image link starting with https://')
    setSaving(true)
    try {
      if (mode === 'upload' && file) await addOutfitFromFile(gender, file, caption, nextOrder)
      else await addOutfitFromUrl(gender, url, caption, nextOrder)
      onAdded()
    } catch (err) {
      setError(toFriendlyMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const shown = mode === 'upload' ? preview : isValidHttpUrl(url) && url.trim() ? url.trim() : null

  return (
    <Modal
      open={Boolean(gender)}
      onClose={onClose}
      locked={saving}
      title={gender === 'female' ? 'Add outfit — For Her' : 'Add outfit — For Him'}
      description="Portrait photos (3:4) look best."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="add-outfit-form" loading={saving} loadingText={mode === 'upload' ? 'Uploading…' : 'Adding…'}>
            Add image
          </Button>
        </>
      }
    >
      <form id="add-outfit-form" onSubmit={submit} noValidate className="space-y-5">
        <div role="tablist" aria-label="Image source" className="flex gap-1 rounded-lg bg-cream p-1">
          {(['upload', 'url'] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={cn('flex-1 rounded-md px-3 py-2 text-sm transition', mode === m ? 'bg-paper text-ink shadow-soft' : 'text-muted hover:text-ink')}
            >
              {m === 'upload' ? 'Upload a photo' : 'Paste an image link'}
            </button>
          ))}
        </div>

        {mode === 'upload' ? (
          <div>
            <input
              ref={fileRef}
              id="outfit-file"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              className="sr-only"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <Button variant="outline" onClick={() => fileRef.current?.click()} icon={<ImagePlus aria-hidden="true" className="size-4" />}>
              {file ? 'Choose a different photo' : 'Choose photo'}
            </Button>
            <p className="mt-2 text-xs text-muted">{file ? file.name : 'JPG, PNG, WebP or AVIF, up to 10 MB.'}</p>
          </div>
        ) : (
          <TextField label="Image link" type="url" value={url} onChange={setUrl} placeholder="https://…" />
        )}

        {shown && <img src={shown} alt="Preview" className="mx-auto aspect-[3/4] w-40 rounded object-cover shadow-soft" />}

        <TextField label="Caption (optional)" value={caption} onChange={setCaption} maxLength={120} placeholder="e.g. Barong Tagalog" />

        {error && (
          <p role="alert" className="text-sm text-rose">
            {error}
          </p>
        )}
      </form>
    </Modal>
  )
}
