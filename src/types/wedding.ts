import type { ThemeSettings } from '../theme/themes'

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
  entourage: EntourageGroup[]
  entourageVisible: boolean
  entourageTitle: string
  entourageSubtitle: string
  motifTitle: string
  motifColors: MotifColor[]
  galleryVisible: boolean
  galleryTitle: string
  gallerySubtitle: string
  galleryLayout: 'grid' | 'carousel'
  videoVisible: boolean
  videoTitle: string
  videoCaption: string
  videoUrl: string
  videoPosterUrl: string
  theme: ThemeSettings
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
  galleryLayout: 'grid' | 'carousel'
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
>

export interface OutfitSectionSettings {
  outfitTitle: string
  outfitSubtitle: string
  outfitSectionVisible: boolean
}
