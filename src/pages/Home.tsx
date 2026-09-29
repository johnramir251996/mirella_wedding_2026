import { useEffect } from 'react'
import { useWeddingSettings } from '../hooks/useWeddingSettings'
import { useOutfits } from '../hooks/useOutfits'
import { Hero } from '../components/wedding/Hero'
import { Introduction } from '../components/wedding/Introduction'
import { Venues } from '../components/wedding/Venues'
import { InfoSections } from '../components/wedding/InfoSections'
import { OutfitGallery } from '../components/wedding/OutfitGallery'
import { RSVPCallout } from '../components/wedding/RSVPCallout'
import { Footer } from '../components/wedding/Footer'
import { PageLoader } from '../components/ui/Spinner'
import { PublicError } from '../components/wedding/PublicError'
import { formatWeddingDate } from '../utils/formatting'

export default function Home() {
  const { settings, loading, error, refresh } = useWeddingSettings()
  const outfits = useOutfits()

  useEffect(() => {
    if (settings) document.title = `${settings.coupleNames} · ${formatWeddingDate(settings.weddingDate)}`
  }, [settings])

  if (loading && !settings) return <PageLoader />
  if (error || !settings) return <PublicError message={error ?? undefined} onRetry={() => refresh()} />

  return (
    <>
      <Hero settings={settings} />
      <main>
        <Introduction settings={settings} />
        <Venues settings={settings} />
        <InfoSections sections={settings.sections} />
        {settings.outfitSectionVisible && outfits.length > 0 && (
          <OutfitGallery title={settings.outfitTitle} subtitle={settings.outfitSubtitle} images={outfits} />
        )}
        <RSVPCallout weddingDate={settings.weddingDate} />
      </main>
      <Footer coupleNames={settings.coupleNames} weddingDate={settings.weddingDate} closingMessage={settings.closingMessage} />
    </>
  )
}
