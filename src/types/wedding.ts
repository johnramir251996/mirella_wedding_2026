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
  updatedAt: string
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

export type WeddingSettingsInput = Omit<WeddingSettings, 'id' | 'updatedAt' | 'outfitTitle' | 'outfitSubtitle' | 'outfitSectionVisible'>

export interface OutfitSectionSettings {
  outfitTitle: string
  outfitSubtitle: string
  outfitSectionVisible: boolean
}
