import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowLeft, ArrowRight, Eye, EyeOff, Film, ImagePlus, Link2, Save, Trash2, Upload } from 'lucide-react'
import { useToast } from '../hooks/useToast'
import { setCachedWeddingSettings } from '../hooks/useWeddingSettings'
import {
  addGalleryFromFile,
  addGalleryFromUrl,
  deleteGalleryImage,
  GALLERY_LIMIT,
  listAllGallery,
  removeAssetByUrl,
  reorderGallery,
  updateGalleryImage,
  uploadVideoFile,
  uploadVideoPoster,
  VIDEO_MAX_MB,
} from '../services/galleryService'
import { getWeddingSettings, updateGallerySettings, updateVideoSettings } from '../services/settingsService'
import type { GalleryImage, GallerySettings, VideoSettings } from '../types/wedding'
import { toFriendlyMessage } from '../utils/errors'
import { parseVideoUrl } from '../utils/media'
import { isValidHttpUrl } from '../utils/validation'
import { Button } from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { TextAreaField, TextField } from '../components/ui/FormField'
import { Skeleton } from '../components/ui/Skeleton'
import { Spinner } from '../components/ui/Spinner'
import { cn } from '../components/ui/cn'
import { PageHeader } from '../components/admin/PageHeader'

const isSample = (url: string) => url.startsWith('samples/') || url.includes('images.unsplash.com')

export default function AdminMedia() {
  const toast = useToast()
  const [settingsId, setSettingsId] = useState<string | null>(null)
  const [gallery, setGallery] = useState<GallerySettings | null>(null)
  const [gallerySaved, setGallerySaved] = useState('')
  const [video, setVideo] = useState<VideoSettings | null>(null)
  const [videoSaved, setVideoSaved] = useState('')
  const [photos, setPhotos] = useState<GalleryImage[] | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [uploading, setUploading] = useState<{ done: number; total: number } | null>(null)
  const [toDelete, setToDelete] = useState<GalleryImage | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [urlToAdd, setUrlToAdd] = useState('')
  const [savingGallery, setSavingGallery] = useState(false)
  const [savingVideo, setSavingVideo] = useState(false)
  const [videoUploading, setVideoUploading] = useState(false)
  const [posterUploading, setPosterUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const photoInput = useRef<HTMLInputElement>(null)
  const videoInput = useRef<HTMLInputElement>(null)
  const posterInput = useRef<HTMLInputElement>(null)

  const reloadPhotos = useCallback(async () => {
    try {
      setPhotos(await listAllGallery())
    } catch (e) {
      setError(toFriendlyMessage(e))
    }
  }, [])

  useEffect(() => {
    document.title = 'Photos & Video · Wedding admin'
    void reloadPhotos()
    getWeddingSettings()
      .then((s) => {
        setSettingsId(s.id)
        const g: GallerySettings = { galleryVisible: s.galleryVisible, galleryTitle: s.galleryTitle, gallerySubtitle: s.gallerySubtitle, galleryLayout: s.galleryLayout }
        const v: VideoSettings = { videoVisible: s.videoVisible, videoTitle: s.videoTitle, videoCaption: s.videoCaption, videoUrl: s.videoUrl, videoPosterUrl: s.videoPosterUrl }
        setGallery(g)
        setGallerySaved(JSON.stringify(g))
        setVideo(v)
        setVideoSaved(JSON.stringify(v))
      })
      .catch((e) => setError(toFriendlyMessage(e)))
  }, [reloadPhotos])

  if (error) {
    return (
      <>
        <PageHeader title="Photos & Video" />
        <p role="alert" className="rounded-lg border border-rose/30 bg-rose/5 px-4 py-3 text-sm text-rose">
          {error}
        </p>
      </>
    )
  }

  const saveGallery = async () => {
    if (!settingsId || !gallery) return
    setSavingGallery(true)
    try {
      const s = await updateGallerySettings(settingsId, gallery)
      setCachedWeddingSettings(s)
      setGallerySaved(JSON.stringify(gallery))
      toast.success('Gallery settings saved.')
    } catch (e) {
      toast.error(toFriendlyMessage(e))
    } finally {
      setSavingGallery(false)
    }
  }

  const saveVideo = async (next: VideoSettings | null = video) => {
    if (!settingsId || !next) return
    if (next.videoUrl && parseVideoUrl(next.videoUrl).kind === 'none') {
      toast.error('Please paste a YouTube or Vimeo link, or upload an MP4.')
      return
    }
    setSavingVideo(true)
    try {
      const old = JSON.parse(videoSaved || '{}') as Partial<VideoSettings>
      const s = await updateVideoSettings(settingsId, next)
      setCachedWeddingSettings(s)
      setVideo(next)
      setVideoSaved(JSON.stringify(next))
      if (old.videoUrl && old.videoUrl !== next.videoUrl) void removeAssetByUrl(old.videoUrl)
      if (old.videoPosterUrl && old.videoPosterUrl !== next.videoPosterUrl) void removeAssetByUrl(old.videoPosterUrl)
      toast.success('Video settings saved.')
    } catch (e) {
      toast.error(toFriendlyMessage(e))
    } finally {
      setSavingVideo(false)
    }
  }

  const onPhotos = async (files: FileList | null) => {
    if (!files?.length || !photos) return
    const room = GALLERY_LIMIT - photos.length
    const list = Array.from(files).slice(0, Math.max(room, 0))
    if (files.length > room) toast.show(`Only ${Math.max(room, 0)} more photo${room === 1 ? '' : 's'} can be added (limit ${GALLERY_LIMIT}).`)
    if (!list.length) return
    setUploading({ done: 0, total: list.length })
    let order = photos.length
    let failed = 0
    for (const f of list) {
      try {
        order += 1
        await addGalleryFromFile(f, order)
      } catch (e) {
        failed++
        toast.error(toFriendlyMessage(e))
      }
      setUploading((u) => (u ? { ...u, done: u.done + 1 } : u))
    }
    setUploading(null)
    if (photoInput.current) photoInput.current.value = ''
    if (list.length - failed > 0) toast.success(`${list.length - failed} photo${list.length - failed === 1 ? '' : 's'} added.`)
    await reloadPhotos()
  }

  const addByUrl = async () => {
    if (!photos) return
    if (!isValidHttpUrl(urlToAdd) || !urlToAdd.trim().startsWith('https://')) {
      toast.error('Please paste a full image link starting with https://')
      return
    }
    try {
      await addGalleryFromUrl(urlToAdd, '', photos.length + 1)
      setUrlToAdd('')
      toast.success('Photo added.')
      await reloadPhotos()
    } catch (e) {
      toast.error(toFriendlyMessage(e))
    }
  }

  const run = async (id: string, action: () => Promise<void>, success?: string) => {
    setBusyId(id)
    try {
      await action()
      if (success) toast.success(success)
      await reloadPhotos()
    } catch (e) {
      toast.error(toFriendlyMessage(e))
    } finally {
      setBusyId(null)
    }
  }

  const move = (i: number, dir: -1 | 1) => {
    if (!photos) return
    const t = i + dir
    if (t < 0 || t >= photos.length) return
    const ids = photos.map((p) => p.id)
    ;[ids[i], ids[t]] = [ids[t], ids[i]]
    void run(photos[i].id, () => reorderGallery(ids))
  }

  const confirmDelete = async () => {
    if (!toDelete) return
    setDeleting(true)
    try {
      await deleteGalleryImage(toDelete)
      toast.success('Photo removed.')
      setToDelete(null)
      await reloadPhotos()
    } catch (e) {
      toast.error(toFriendlyMessage(e))
    } finally {
      setDeleting(false)
    }
  }

  const onVideoFile = async (file: File | undefined) => {
    if (!file || !video) return
    setVideoUploading(true)
    try {
      const url = await uploadVideoFile(file)
      setVideo({ ...video, videoUrl: url })
      toast.success('Video uploaded. Click “Save video” to publish it.')
    } catch (e) {
      toast.error(toFriendlyMessage(e))
    } finally {
      setVideoUploading(false)
      if (videoInput.current) videoInput.current.value = ''
    }
  }

  const onPosterFile = async (file: File | undefined) => {
    if (!file || !video) return
    setPosterUploading(true)
    try {
      const url = await uploadVideoPoster(file)
      setVideo({ ...video, videoPosterUrl: url })
      toast.success('Cover image uploaded. Click “Save video” to publish it.')
    } catch (e) {
      toast.error(toFriendlyMessage(e))
    } finally {
      setPosterUploading(false)
      if (posterInput.current) posterInput.current.value = ''
    }
  }

  const parsed = video ? parseVideoUrl(video.videoUrl) : { kind: 'none' as const }
  const sampleCount = photos?.filter((p) => isSample(p.imageUrl)).length ?? 0

  return (
    <>
      <PageHeader title="Photos & Video" description="Your couple photos and prenup film, shown right after the introduction on the home page." />

      {/* ---------------- Gallery ---------------- */}
      <section aria-labelledby="gallery-admin-heading" className="rounded-xl border border-line bg-paper p-5 shadow-soft sm:p-6">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="gallery-admin-heading" className="text-2xl text-ink">
              Photo Gallery
            </h2>
            <p className="mt-1 text-sm text-muted">
              {photos ? `${photos.length} of ${GALLERY_LIMIT} photos` : 'Loading…'} · Photos are resized automatically to keep the site fast.
            </p>
          </div>
          {gallery && (
            <Button onClick={() => void saveGallery()} loading={savingGallery} loadingText="Saving…" disabled={JSON.stringify(gallery) === gallerySaved} icon={<Save aria-hidden="true" className="size-4" />}>
              Save section
            </Button>
          )}
        </div>

        {gallery ? (
          <div className="grid gap-5 md:grid-cols-2">
            <TextField label="Section title" value={gallery.galleryTitle} onChange={(v) => setGallery({ ...gallery, galleryTitle: v })} maxLength={80} />
            <TextField label="Short description" value={gallery.gallerySubtitle} onChange={(v) => setGallery({ ...gallery, gallerySubtitle: v })} maxLength={200} />
            <fieldset className="md:col-span-2">
              <legend className="mb-2 text-[0.95rem] font-medium text-ink-soft">Layout</legend>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { v: 'grid', t: 'Photo grid', d: 'Magazine-style, mixed sizes' },
                    { v: 'carousel', t: 'Carousel', d: 'Swipe through, one row' },
                  ] as const
                ).map((o) => (
                  <label
                    key={o.v}
                    className={cn(
                      'cursor-pointer rounded-lg border px-4 py-2.5 text-sm transition has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-gold',
                      gallery.galleryLayout === o.v ? 'border-ink bg-ink/[0.03]' : 'border-line hover:border-champagne',
                    )}
                  >
                    <input type="radio" name="gallery-layout" className="sr-only" checked={gallery.galleryLayout === o.v} onChange={() => setGallery({ ...gallery, galleryLayout: o.v })} />
                    <span className="block font-medium text-ink">{o.t}</span>
                    <span className="block text-muted">{o.d}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="flex cursor-pointer items-center gap-3 text-sm text-ink-soft md:col-span-2">
              <input type="checkbox" checked={gallery.galleryVisible} onChange={(e) => setGallery({ ...gallery, galleryVisible: e.target.checked })} className="size-5 accent-ink" />
              Show the photo gallery on the website
            </label>
          </div>
        ) : (
          <Skeleton className="h-32" />
        )}

        <div className="mt-6 flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-end">
          <div>
            <input ref={photoInput} type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif" className="sr-only" id="gallery-upload" onChange={(e) => void onPhotos(e.target.files)} />
            <Button
              onClick={() => photoInput.current?.click()}
              loading={Boolean(uploading)}
              loadingText={uploading ? `Uploading ${uploading.done + 1} of ${uploading.total}…` : undefined}
              disabled={!photos || photos.length >= GALLERY_LIMIT}
              icon={<ImagePlus aria-hidden="true" className="size-4" />}
            >
              Upload photos
            </Button>
          </div>
          <div className="flex flex-1 gap-2">
            <label className="sr-only" htmlFor="gallery-url">
              Image link
            </label>
            <input id="gallery-url" value={urlToAdd} onChange={(e) => setUrlToAdd(e.target.value)} placeholder="…or paste an image link (https://)" className="input-base min-h-11 py-2" />
            <Button variant="subtle" onClick={() => void addByUrl()} disabled={!urlToAdd.trim()} icon={<Link2 aria-hidden="true" className="size-4" />}>
              Add
            </Button>
          </div>
        </div>
        {sampleCount > 0 && (
          <p className="mt-3 rounded-lg bg-champagne-light/40 px-3 py-2 text-sm text-ink-soft">
            {sampleCount} sample photo{sampleCount === 1 ? ' is' : 's are'} still showing. Hide or remove them once your own photos are in.
          </p>
        )}

        <div className="mt-5">
          {!photos ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square" />
              ))}
            </div>
          ) : photos.length === 0 ? (
            <p className="rounded-lg border border-dashed border-line px-4 py-10 text-center text-sm text-muted">No photos yet.</p>
          ) : (
            <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {photos.map((p, i) => (
                <PhotoTile
                  key={p.id}
                  photo={p}
                  index={i}
                  busy={busyId === p.id}
                  first={i === 0}
                  last={i === photos.length - 1}
                  sample={isSample(p.imageUrl)}
                  onMove={(d) => move(i, d)}
                  onToggle={() => void run(p.id, () => updateGalleryImage(p.id, { isVisible: !p.isVisible }), p.isVisible ? 'Photo hidden.' : 'Photo shown.')}
                  onCaption={(caption) => void run(p.id, () => updateGalleryImage(p.id, { caption }), 'Caption saved.')}
                  onDelete={() => setToDelete(p)}
                />
              ))}
            </ol>
          )}
        </div>
      </section>

      {/* ---------------- Video ---------------- */}
      <section aria-labelledby="video-admin-heading" className="mt-6 rounded-xl border border-line bg-paper p-5 shadow-soft sm:p-6">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="video-admin-heading" className="text-2xl text-ink">
              Prenup Video
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-muted">
              Best: paste an unlisted <strong className="font-medium text-ink-soft">YouTube</strong> or Vimeo link — no size limit and smooth on mobile data. Or upload an MP4 up to {VIDEO_MAX_MB} MB
              (about 1–2 minutes in 1080p).
            </p>
          </div>
          {video && (
            <Button onClick={() => void saveVideo()} loading={savingVideo} loadingText="Saving…" disabled={JSON.stringify(video) === videoSaved} icon={<Save aria-hidden="true" className="size-4" />}>
              Save video
            </Button>
          )}
        </div>

        {!video ? (
          <Skeleton className="h-48" />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="space-y-5">
              <TextField
                label="YouTube / Vimeo link or video URL"
                value={video.videoUrl.startsWith('samples/') ? '' : video.videoUrl}
                placeholder={video.videoUrl.startsWith('samples/') ? 'Currently showing the sample film' : 'https://youtu.be/…'}
                onChange={(v) => setVideo({ ...video, videoUrl: v })}
                hint={
                  video.videoUrl && parsed.kind !== 'none'
                    ? parsed.kind === 'youtube'
                      ? 'YouTube video detected.'
                      : parsed.kind === 'vimeo'
                        ? 'Vimeo video detected.'
                        : video.videoUrl.startsWith('samples/')
                          ? 'Sample film. Paste a link or upload an MP4 to replace it.'
                          : 'Video file.'
                    : undefined
                }
                error={video.videoUrl && parsed.kind === 'none' ? 'This link isn’t recognised. Use a YouTube or Vimeo link, or an https link to an MP4.' : undefined}
              />
              <div className="flex flex-wrap gap-2">
                <input ref={videoInput} type="file" accept="video/mp4,video/webm" className="sr-only" id="video-upload" onChange={(e) => void onVideoFile(e.target.files?.[0])} />
                <Button variant="outline" onClick={() => videoInput.current?.click()} loading={videoUploading} loadingText="Uploading… this can take a minute" icon={<Upload aria-hidden="true" className="size-4" />}>
                  Upload MP4 (max {VIDEO_MAX_MB} MB)
                </Button>
                <input ref={posterInput} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" id="poster-upload" onChange={(e) => void onPosterFile(e.target.files?.[0])} />
                <Button variant="subtle" onClick={() => posterInput.current?.click()} loading={posterUploading} loadingText="Uploading…" icon={<ImagePlus aria-hidden="true" className="size-4" />}>
                  {video.videoPosterUrl ? 'Change cover image' : 'Add cover image'}
                </Button>
                {video.videoPosterUrl && (
                  <Button variant="ghost" onClick={() => setVideo({ ...video, videoPosterUrl: '' })}>
                    Remove cover
                  </Button>
                )}
              </div>
              <TextField label="Section title" value={video.videoTitle} onChange={(v) => setVideo({ ...video, videoTitle: v })} maxLength={80} />
              <TextAreaField label="Caption (optional)" value={video.videoCaption} onChange={(v) => setVideo({ ...video, videoCaption: v })} maxLength={240} rows={2} />
              <label className="flex cursor-pointer items-center gap-3 text-sm text-ink-soft">
                <input type="checkbox" checked={video.videoVisible} onChange={(e) => setVideo({ ...video, videoVisible: e.target.checked })} className="size-5 accent-ink" />
                Show the video on the website
              </label>
            </div>

            <div>
              <p className="mb-2 text-[0.95rem] font-medium text-ink-soft">Preview</p>
              <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-lg bg-[#1d1b19]">
                {video.videoPosterUrl || parsed.kind === 'youtube' ? (
                  <img src={video.videoPosterUrl || (parsed.kind === 'youtube' ? parsed.thumbnail : '')} alt="" className="size-full object-cover" />
                ) : parsed.kind === 'file' ? (
                  <video src={parsed.src} muted playsInline className="size-full object-cover" />
                ) : (
                  <Film className="size-8 text-ivory/40" />
                )}
              </div>
              <p className="mt-2 text-xs text-muted">Guests see this cover with a play button. The video only loads when they press play.</p>
            </div>
          </div>
        )}
      </section>

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Remove this photo?"
        message={`“${toDelete?.caption || 'This photo'}” will be removed from the website.`}
        destructive
        confirmLabel="Remove photo"
        loading={deleting}
        loadingText="Removing…"
        onCancel={() => !deleting && setToDelete(null)}
        onConfirm={() => void confirmDelete()}
      />
    </>
  )
}

function PhotoTile({
  photo,
  index,
  busy,
  first,
  last,
  sample,
  onMove,
  onToggle,
  onCaption,
  onDelete,
}: {
  photo: GalleryImage
  index: number
  busy: boolean
  first: boolean
  last: boolean
  sample: boolean
  onMove: (dir: -1 | 1) => void
  onToggle: () => void
  onCaption: (caption: string) => void
  onDelete: () => void
}) {
  const [caption, setCaption] = useState(photo.caption)
  return (
    <li className={cn('overflow-hidden rounded-lg border bg-paper', photo.isVisible ? 'border-line' : 'border-dashed border-line')}>
      <div className="relative aspect-square bg-cream">
        <img src={photo.imageUrl} alt="" loading="lazy" className={cn('size-full object-cover', !photo.isVisible && 'opacity-40')} />
        <span className="absolute left-2 top-2 rounded-full bg-ink/70 px-2 py-0.5 text-xs text-ivory">{index + 1}</span>
        {sample && <span className="absolute right-2 top-2 rounded-full bg-paper/90 px-2 py-0.5 text-xs text-muted">Sample</span>}
        {busy && (
          <span className="absolute inset-0 flex items-center justify-center bg-paper/60">
            <Spinner />
          </span>
        )}
      </div>
      <div className="p-2">
        <label className="sr-only" htmlFor={`gcap-${photo.id}`}>
          Caption for photo {index + 1}
        </label>
        <input
          id={`gcap-${photo.id}`}
          value={caption}
          maxLength={120}
          placeholder="Caption (optional)"
          onChange={(e) => setCaption(e.target.value)}
          onBlur={() => caption.trim() !== photo.caption && onCaption(caption)}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          className="w-full rounded border border-transparent bg-transparent px-1.5 py-1 text-sm text-ink placeholder:text-muted/70 hover:border-line focus:border-champagne focus:outline-none"
        />
        <div className="mt-1 flex items-center justify-between">
          <Icon label="Move earlier" onClick={() => onMove(-1)} disabled={first || busy}>
            <ArrowLeft className="size-4" />
          </Icon>
          <Icon label="Move later" onClick={() => onMove(1)} disabled={last || busy}>
            <ArrowRight className="size-4" />
          </Icon>
          <Icon label={photo.isVisible ? 'Hide photo' : 'Show photo'} onClick={onToggle} disabled={busy}>
            {photo.isVisible ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
          </Icon>
          <Icon label="Remove photo" onClick={onDelete} disabled={busy} danger>
            <Trash2 className="size-4" />
          </Icon>
        </div>
      </div>
    </li>
  )
}

function Icon({ label, onClick, disabled, danger, children }: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn('flex size-9 items-center justify-center rounded-md text-muted transition disabled:opacity-30', danger ? 'hover:bg-rose/10 hover:text-rose' : 'hover:bg-cream hover:text-ink')}
    >
      {children}
    </button>
  )
}
