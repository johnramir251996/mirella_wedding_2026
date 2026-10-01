import type { ThemeSettings } from '../theme/themes'
import type { RsvpConfig } from './questions'
import type { SeatingConfig } from './seating'

export type SectionIconName =
  | 'shirt'
  | 'church'
  | 'wine'
  | 'camera-off'
  | 'gift'
  | 'car'
  | 'hotel'
  | 'clock'
  | 'parking'
  | 'info'
  | 'heart'
  | 'music'
  | 'utensils'
  | 'map-pin'

export interface InfoSection {
  /** Stable id used as React key; generated client-side for new sections. */
  id: string
  title: string
  body: string
  icon: SectionIconName
  visible: boolean
}

export interface WeddingSettings {
  id: string
  coupleNames: string
  weddingDate: string // ISO date, YYYY-MM-DD
  heroTitle: string
  heroSubtitle: string
  heroImageUrl: string
  churchName: string
  /** Optional, e.g. "3:00 PM" */
  ceremonyTime: string
  receptionTime: string
  churchMapUrl: string
  receptionName: string
  receptionMapUrl: string
  storyText: string
  closingMessage: string
  sections: InfoSection[]
  outfitTitle: string
  outfitSubtitle: string
  outfitSectionVisible: boolean
  rsvpDeadline: string | null
  rsvpOpen: boolean
  rsvpClosedMessage: string
  rsvpShowDeadline: boolean
  rsvpButtonLabel: string
  entourage: EntourageGroup[]
  entourageVisible: boolean
  entourageTitle: string
  entourageSubtitle: string
  motifTitle: string
  motifColors: MotifColor[]
  galleryVisible: boolean
  galleryTitle: string
  gallerySubtitle: string
  galleryLayout: GalleryLayout
  videoVisible: boolean
  videoTitle: string
  videoCaption: string
  videoUrl: string
  videoPosterUrl: string
  theme: ThemeSettings
  rsvpConfig: RsvpConfig
  seatingConfig: SeatingConfig
  updatedAt: string
}

export interface GalleryImage {
  id: string
  imageUrl: string
  caption: string
  sortOrder: number
  isVisible: boolean
}

export interface GallerySettings {
  galleryVisible: boolean
  galleryTitle: string
  gallerySubtitle: string
  galleryLayout: GalleryLayout
}

export interface VideoSettings {
  videoVisible: boolean
  videoTitle: string
  videoCaption: string
  videoUrl: string
  videoPosterUrl: string
}

export interface EntourageMember {
  id: string
  name: string
  /** Optional sub-role, e.g. "Candle", "Ring", "Ninong". */
  role: string
}

export interface EntourageGroup {
  id: string
  title: string
  /** pairs = two columns (sponsors, couples); list = single column. */
  layout: 'pairs' | 'list'
  members: EntourageMember[]
}

export interface MotifColor {
  id: string
  name: string
  hex: string
}

export interface RsvpSettings {
  rsvpDeadline: string | null
  rsvpOpen: boolean
  rsvpClosedMessage: string
  /** Show the "respond by <date, time>" line to guests. */
  rsvpShowDeadline: boolean
  /** Text on the RSVP buttons, e.g. "Confirm Attendance". */
  rsvpButtonLabel: string
}

export interface EntourageSettings {
  entourage: EntourageGroup[]
  entourageVisible: boolean
  entourageTitle: string
  entourageSubtitle: string
}

export interface MotifSettings {
  motifTitle: string
  motifColors: MotifColor[]
}

export interface GiftSettings {
  isVisible: boolean
  placement: 'private' | 'public'
  title: string
  message: string
  qrImageUrl: string
}

export interface PublicGift {
  title: string
  message: string
  qrImageUrl: string
}

export type OutfitGender = 'male' | 'female'

export interface OutfitImage {
  id: string
  gender: OutfitGender
  imageUrl: string
  caption: string
  sortOrder: number
  isVisible: boolean
}

export type WeddingSettingsInput = Omit<
  WeddingSettings,
  | 'id'
  | 'updatedAt'
  | 'outfitTitle'
  | 'outfitSubtitle'
  | 'outfitSectionVisible'
  | keyof RsvpSettings
  | keyof EntourageSettings
  | keyof MotifSettings
  | keyof GallerySettings
  | keyof VideoSettings
  | 'theme'
  | 'rsvpConfig'
  | 'seatingConfig'
>

export interface OutfitSectionSettings {
  outfitTitle: string
  outfitSubtitle: string
  outfitSectionVisible: boolean
}

/** How the couple's photos are shown on the home page (Admin → Photos & Video). */
export type GalleryLayout = 'grid' | 'carousel' | 'polaroid' | 'filmstrip' | 'mosaic' | 'story' | 'deck' | 'coverflow' | 'arches' | 'timeline'

export const GALLERY_LAYOUTS: { id: GalleryLayout; name: string; description: string }[] = [
  { id: 'grid', name: 'Magazine grid', description: 'Mixed-size photo grid' },
  { id: 'carousel', name: 'Swipe carousel', description: 'One row with arrows' },
  { id: 'polaroid', name: 'Polaroid wall', description: 'Tilted instant photos with captions' },
  { id: 'filmstrip', name: 'Film strip', description: 'Two rows drifting like a reel' },
  { id: 'mosaic', name: 'Featured mosaic', description: 'One big photo that changes, with tiles' },
  { id: 'story', name: 'Story', description: 'One photo at a time, like Instagram stories' },
  { id: 'deck', name: 'Card deck', description: 'Swipe photos away like cards' },
  { id: 'coverflow', name: 'Coverflow', description: '3D photos sliding past the centre' },
  { id: 'arches', name: 'Arched frames', description: 'Gallery wall of arches and ovals' },
  { id: 'timeline', name: 'Our timeline', description: 'Photos along a line, chapter by chapter' },
]
