import { supabase, WEDDING_ASSETS_BUCKET } from '../lib/supabase'
import type { Tables } from '../types/database'
import type { GalleryImage } from '../types/wedding'
import { FRIENDLY_ERRORS, FriendlyError, logError } from '../utils/errors'
import { compressImage } from '../utils/media'

export const GALLERY_LIMIT = 30
export const VIDEO_MAX_MB = 30

const fromRow = (r: Tables<'gallery_images'>): GalleryImage => ({
  id: r.id,
  imageUrl: r.image_url,
  caption: r.caption ?? '',
  sortOrder: r.sort_order,
  isVisible: r.is_visible,
})

async function list(context: string): Promise<GalleryImage[]> {
  const { data, error } = await supabase
    .from('gallery_images')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) {
    logError(context, error)
    throw new FriendlyError(FRIENDLY_ERRORS.generic)
  }
  return ((data ?? []) as Tables<'gallery_images'>[]).map(fromRow)
}

export async function listVisibleGallery(): Promise<GalleryImage[]> {
  return (await list('listVisibleGallery')).filter((g) => g.isVisible)
}

export const listAllGallery = () => list('listAllGallery')

const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`

async function uploadToBucket(folder: string, file: File): Promise<string> {
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin'
  const path = `${folder}/${newId()}.${ext}`
  const { error } = await supabase.storage
    .from(WEDDING_ASSETS_BUCKET)
    .upload(path, file, { cacheControl: '31536000', upsert: false, contentType: file.type })
  if (error) {
    logError(`upload:${folder}`, error)
    throw new FriendlyError('The file could not be uploaded. Please try again.')
  }
  return supabase.storage.from(WEDDING_ASSETS_BUCKET).getPublicUrl(path).data.publicUrl
}

/** Deletes a file from the assets bucket if the URL points there (best effort). */
export async function removeAssetByUrl(url: string): Promise<void> {
  const marker = `/object/public/${WEDDING_ASSETS_BUCKET}/`
  const i = url.indexOf(marker)
  if (i < 0) return
  const { error } = await supabase.storage.from(WEDDING_ASSETS_BUCKET).remove([decodeURIComponent(url.slice(i + marker.length))])
  if (error) logError('removeAssetByUrl', error)
}

function insertError(context: string, error: { message?: string } | null): never {
  logError(context, error)
  if ((error?.message ?? '').includes('GALLERY_LIMIT_REACHED')) {
    throw new FriendlyError(`The gallery can hold up to ${GALLERY_LIMIT} photos. Remove one to add another.`)
  }
  throw new FriendlyError('The photo could not be added. Please try again.')
}

export async function addGalleryFromUrl(imageUrl: string, caption: string, sortOrder: number): Promise<void> {
  const { error } = await supabase
    .from('gallery_images')
    .insert({ image_url: imageUrl.trim(), caption: caption.trim() || null, sort_order: sortOrder })
  if (error) insertError('addGalleryFromUrl', error)
}

/** Compresses (≈2000px, WebP/JPEG) then uploads and adds the photo. */
export async function addGalleryFromFile(file: File, sortOrder: number): Promise<void> {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/heic', 'image/heif']
  if (!allowed.includes(file.type)) throw new FriendlyError(`“${file.name}” isn’t a supported photo. Please use JPG, PNG or WebP.`)
  const small = await compressImage(file)
  if (small.size > 10 * 1024 * 1024) throw new FriendlyError(`“${file.name}” is too large even after resizing.`)
  const url = await uploadToBucket('gallery', small)
  try {
    await addGalleryFromUrl(url, '', sortOrder)
  } catch (e) {
    void removeAssetByUrl(url)
    throw e
  }
}

export async function updateGalleryImage(id: string, patch: Partial<Pick<GalleryImage, 'caption' | 'isVisible'>>): Promise<void> {
  const row: { caption?: string | null; is_visible?: boolean } = {}
  if (patch.caption !== undefined) row.caption = patch.caption.trim() || null
  if (patch.isVisible !== undefined) row.is_visible = patch.isVisible
  const { error } = await supabase.from('gallery_images').update(row).eq('id', id)
  if (error) {
    logError('updateGalleryImage', error)
    throw new FriendlyError('The change could not be saved. Please try again.')
  }
}

export async function reorderGallery(ids: string[]): Promise<void> {
  const results = await Promise.all(ids.map((id, i) => supabase.from('gallery_images').update({ sort_order: i + 1 }).eq('id', id)))
  const failed = results.find((r) => r.error)
  if (failed) {
    logError('reorderGallery', failed.error)
    throw new FriendlyError('The new order could not be saved. Please try again.')
  }
}

export async function deleteGalleryImage(image: GalleryImage): Promise<void> {
  const { error } = await supabase.from('gallery_images').delete().eq('id', image.id)
  if (error) {
    logError('deleteGalleryImage', error)
    throw new FriendlyError('The photo could not be removed. Please try again.')
  }
  void removeAssetByUrl(image.imageUrl)
}

/** Prenup video upload: MP4/WebM up to 30 MB. */
export async function uploadVideoFile(file: File): Promise<string> {
  if (!['video/mp4', 'video/webm'].includes(file.type)) throw new FriendlyError('Please choose an MP4 or WebM video.')
  if (file.size > VIDEO_MAX_MB * 1024 * 1024) {
    throw new FriendlyError(`That video is ${(file.size / 1024 / 1024).toFixed(0)} MB. The limit is ${VIDEO_MAX_MB} MB — please use a YouTube link for longer videos.`)
  }
  return uploadToBucket('video', file)
}

export async function uploadVideoPoster(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new FriendlyError('Please choose an image for the cover.')
  return uploadToBucket('video', await compressImage(file, 1920, 0.8))
}
