import { useEffect, useState } from 'react'
import { useWeddingSettings } from '../hooks/useWeddingSettings'
import { useOutfits } from '../hooks/useOutfits'
import { Hero } from '../components/wedding/Hero'
import { Introduction } from '../components/wedding/Introduction'
import { Venues } from '../components/wedding/Venues'
import { InfoSections } from '../components/wedding/InfoSections'
import { OutfitGallery } from '../components/wedding/OutfitGallery'
import { MotifSection } from '../components/wedding/MotifSwatches'
import { Entourage } from '../components/wedding/Entourage'
import { GiftCard } from '../components/wedding/GiftCard'
import { Reveal } from '../components/wedding/Reveal'
import { RSVPCallout } from '../components/wedding/RSVPCallout'
import { Footer } from '../components/wedding/Footer'
import { PageLoader } from '../components/ui/Spinner'
import { PublicError } from '../components/wedding/PublicError'
import { isRsvpOpen } from '../services/settingsService'
import { getPublicGift } from '../services/giftService'
import type { PublicGift } from '../types/wedding'
import { formatWeddingDate } from '../utils/formatting'

export default function Home() {
  const { settings, loading, error, refresh } = useWeddingSettings()
  const outfits = useOutfits()
  const [gift, setGift] = useState<PublicGift | null>(null)

  useEffect(() => {
    if (settings) document.title = `${settings.coupleNames} · ${formatWeddingDate(settings.weddingDate)}`
  }, [settings])

  useEffect(() => {
    let active = true
    getPublicGift().then((g) => active && setGift(g))
    return () => {
      active = false
    }
  }, [])

  if (loading && !settings) return <PageLoader />
  if (error || !settings) return <PublicError message={error ?? undefined} onRetry={() => refresh()} />

  const showOutfits = settings.outfitSectionVisible && outfits.length > 0

  return (
    <>
      <Hero settings={settings} />
      <main>
        <Introduction settings={settings} />
        <Venues settings={settings} />
        <InfoSections sections={settings.sections} />
        {showOutfits ? (
          <OutfitGallery
            title={settings.outfitTitle}
            subtitle={settings.outfitSubtitle}
            images={outfits}
            motifTitle={settings.motifTitle}
            motifColors={settings.motifColors}
          />
        ) : (
          <MotifSection title={settings.motifTitle} colors={settings.motifColors} />
        )}
        {settings.entourageVisible && (
          <Entourage title={settings.entourageTitle} subtitle={settings.entourageSubtitle} groups={settings.entourage} />
        )}
        {gift && (
          <section aria-label={gift.title} className="px-5 pt-8 sm:px-8">
            <Reveal>
              <GiftCard gift={gift} />
            </Reveal>
          </section>
        )}
        <RSVPCallout
          weddingDate={settings.weddingDate}
          open={isRsvpOpen(settings)}
          deadline={settings.rsvpDeadline}
          closedMessage={settings.rsvpClosedMessage}
        />
      </main>
      <Footer coupleNames={settings.coupleNames} weddingDate={settings.weddingDate} closingMessage={settings.closingMessage} />
    </>
  )
}
