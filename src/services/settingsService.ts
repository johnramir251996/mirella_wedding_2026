import { supabase, WEDDING_ASSETS_BUCKET } from '../lib/supabase'
import type { Json, Tables } from '../types/database'
import type { InfoSection, SectionIconName, WeddingSettings, WeddingSettingsInput } from '../types/wedding'
import { FriendlyError, logError } from '../utils/errors'

export const SECTION_ICONS: { value: SectionIconName; label: string }[] = [
  { value: 'shirt', label: 'Attire' },
  { value: 'church', label: 'Church' },
  { value: 'wine', label: 'Toast' },
  { value: 'camera-off', label: 'No cameras' },
  { value: 'gift', label: 'Gift' },
  { value: 'car', label: 'Car' },
  { value: 'parking', label: 'Parking' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'clock', label: 'Clock' },
  { value: 'music', label: 'Music' },
  { value: 'utensils', label: 'Dining' },
  { value: 'map-pin', label: 'Location' },
  { value: 'heart', label: 'Heart' },
  { value: 'info', label: 'Info' },
]

const ICON_VALUES = new Set<string>(SECTION_ICONS.map((i) => i.value))

export function newSectionId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `section-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function parseSections(value: Json): InfoSection[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return []
    const o = item as Record<string, Json | undefined>
    const title = typeof o.title === 'string' ? o.title : ''
    const body = typeof o.body === 'string' ? o.body : ''
    if (!title && !body) return []
    const icon = typeof o.icon === 'string' && ICON_VALUES.has(o.icon) ? (o.icon as SectionIconName) : 'info'
    return [
      {
        id: typeof o.id === 'string' && o.id ? o.id : `section-${index}`,
        title,
        body,
        icon,
        visible: o.visible !== false,
      },
    ]
  })
}

function fromRow(row: Tables<'wedding_settings'>): WeddingSettings {
  return {
    id: row.id,
    coupleNames: row.couple_names ?? '',
    weddingDate: row.wedding_date ?? '',
    heroTitle: row.hero_title ?? row.couple_names ?? '',
    heroSubtitle: row.hero_subtitle ?? '',
    heroImageUrl: row.hero_image_url ?? '',
    churchName: row.church_name ?? '',
    churchMapUrl: row.church_map_url ?? '',
    receptionName: row.reception_name ?? '',
    receptionMapUrl: row.reception_map_url ?? '',
    storyText: row.story_text ?? '',
    closingMessage: row.closing_message ?? '',
    sections: parseSections(row.additional_info),
    updatedAt: row.updated_at,
  }
}

const emptyToNull = (v: string) => (v.trim() ? v.trim() : null)

/** Public: loads the single wedding_settings row that drives the website. */
export async function getWeddingSettings(): Promise<WeddingSettings> {
  const { data, error } = await supabase.from('wedding_settings').select('*').limit(1).maybeSingle()
  if (error || !data) {
    logError('getWeddingSettings', error ?? 'No wedding_settings row found. Did you run supabase/schema.sql?')
    throw new FriendlyError()
  }
  return fromRow(data as Tables<'wedding_settings'>)
}

/** Admin: saves all website settings. */
export async function updateWeddingSettings(id: string, input: WeddingSettingsInput): Promise<WeddingSettings> {
  const sections = input.sections.map((s) => ({
    id: s.id,
    title: s.title.trim(),
    body: s.body.trim(),
    icon: s.icon,
    visible: s.visible,
  }))
  const { data, error } = await supabase
    .from('wedding_settings')
    .update({
      couple_names: input.coupleNames.trim(),
      wedding_date: input.weddingDate,
      hero_title: emptyToNull(input.heroTitle),
      hero_subtitle: emptyToNull(input.heroSubtitle),
      hero_image_url: emptyToNull(input.heroImageUrl),
      church_name: emptyToNull(input.churchName),
      church_map_url: emptyToNull(input.churchMapUrl),
      reception_name: emptyToNull(input.receptionName),
      reception_map_url: emptyToNull(input.receptionMapUrl),
      story_text: emptyToNull(input.storyText),
      closing_message: emptyToNull(input.closingMessage),
      additional_info: sections as unknown as Json,
    })
    .eq('id', id)
    .select('*')
    .single()
  if (error || !data) {
    logError('updateWeddingSettings', error)
    throw new FriendlyError('We couldn’t save the website settings. Please try again.')
  }
  return fromRow(data as Tables<'wedding_settings'>)
}

/**
 * Admin: uploads an image to the public `wedding-assets` bucket and returns its
 * public URL. `name` is the logical file name, e.g. "hero".
 */
export async function uploadWeddingAsset(file: File, name: 'hero' | 'logo' | 'background' = 'hero'): Promise<string> {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']
  if (!allowed.includes(file.type)) throw new FriendlyError('Please choose a JPG, PNG, WebP or AVIF image.')
  if (file.size > 10 * 1024 * 1024) throw new FriendlyError('Please choose an image smaller than 10 MB.')

  const ext = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1]
  // A timestamped path avoids stale CDN caches when the image is replaced.
  const path = `${name}-${Date.now()}.${ext}`
  const { error } = await supabase.storage.from(WEDDING_ASSETS_BUCKET).upload(path, file, {
    cacheControl: '31536000',
    upsert: false,
    contentType: file.type,
  })
  if (error) {
    logError('uploadWeddingAsset', error)
    throw new FriendlyError('The image could not be uploaded. Please check the storage setup and try again.')
  }
  const { data } = supabase.storage.from(WEDDING_ASSETS_BUCKET).getPublicUrl(path)
  return data.publicUrl
}
