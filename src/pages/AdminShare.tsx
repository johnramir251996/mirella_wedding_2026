import { useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import { Copy, Download, ExternalLink, FileImage, Share2 } from 'lucide-react'
import { useToast } from '../hooks/useToast'
import { useWeddingSettings } from '../hooks/useWeddingSettings'
import { copyText, shareOrCopy, shareTargets, siteLinks } from '../utils/share'
import { formatWeddingDate } from '../utils/formatting'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import { cn } from '../components/ui/cn'
import { PageHeader } from '../components/admin/PageHeader'

type Target = 'home' | 'rsvp'
const INK = '#2B2A28'
const IVORY = '#FAF7F2'
const GOLD = '#B89B6A'

function download(href: string, filename: string) {
  const a = document.createElement('a')
  a.href = href
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
}

export default function AdminShare() {
  const toast = useToast()
  const { settings } = useWeddingSettings()
  const links = useMemo(() => siteLinks(), [])
  const [target, setTarget] = useState<Target>('rsvp')
  const [qrSvg, setQrSvg] = useState('')
  const [busy, setBusy] = useState(false)
  const url = links[target]
  const couple = settings?.coupleNames ?? 'Our wedding'
  const shareText = `${couple} are getting married! Kindly RSVP here:`

  useEffect(() => {
    document.title = 'Share & QR · Wedding admin'
  }, [])

  useEffect(() => {
    let active = true
    QRCode.toString(url, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: INK, light: '#FFFFFF' } })
      .then((svg) => active && setQrSvg(svg))
      .catch(() => active && setQrSvg(''))
    return () => {
      active = false
    }
  }, [url])

  const copy = async (text: string) => {
    toast.show((await copyText(text)) ? 'Link copied.' : text)
  }

  const downloadPng = async () => {
    const data = await QRCode.toDataURL(url, { width: 1200, margin: 2, errorCorrectionLevel: 'M', color: { dark: INK, light: '#FFFFFF' } })
    download(data, `wedding-${target}-qr.png`)
  }

  const downloadSvg = () => {
    const blob = new Blob([qrSvg], { type: 'image/svg+xml' })
    const href = URL.createObjectURL(blob)
    download(href, `wedding-${target}-qr.svg`)
    setTimeout(() => URL.revokeObjectURL(href), 1000)
  }

  /** A 4×5.5 inch printable card (1200×1650 px) with names, date and the QR. */
  const downloadCard = async () => {
    setBusy(true)
    try {
      await Promise.all([
        document.fonts.load('italic 96px "Cormorant Garamond"'),
        document.fonts.load('500 30px "Jost"'),
      ]).catch(() => undefined)
      const W = 1200
      const H = 1650
      const canvas = document.createElement('canvas')
      canvas.width = W
      canvas.height = H
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('canvas')

      ctx.fillStyle = IVORY
      ctx.fillRect(0, 0, W, H)
      ctx.strokeStyle = GOLD
      ctx.globalAlpha = 0.6
      ctx.lineWidth = 2
      ctx.strokeRect(40, 40, W - 80, H - 80)
      ctx.globalAlpha = 1
      ctx.textAlign = 'center'

      const spaced = (text: string, y: number, font: string, color: string, spacing: number) => {
        ctx.font = font
        ctx.fillStyle = color
        ;(ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${spacing}px`
        ctx.fillText(text, W / 2, y)
        ;(ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = '0px'
      }

      spaced(target === 'rsvp' ? 'KINDLY RSVP' : 'OUR WEDDING', 190, '500 30px "Jost", sans-serif', '#8A6E45', 10)
      ctx.font = 'italic 104px "Cormorant Garamond", Georgia, serif'
      ctx.fillStyle = INK
      ctx.fillText(couple, W / 2, 330, W - 160)
      if (settings?.weddingDate) spaced(formatWeddingDate(settings.weddingDate).toUpperCase(), 410, '500 30px "Jost", sans-serif', '#4A4640', 8)

      const qr = await QRCode.toDataURL(url, { width: 680, margin: 1, errorCorrectionLevel: 'M', color: { dark: INK, light: '#FFFFFF' } })
      const img = new Image()
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = reject
        img.src = qr
      })
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(W / 2 - 370, 500, 740, 740)
      ctx.drawImage(img, W / 2 - 340, 530, 680, 680)

      ctx.font = 'italic 44px "Cormorant Garamond", Georgia, serif'
      ctx.fillStyle = '#4A4640'
      ctx.fillText(target === 'rsvp' ? 'Scan to open your invitation & RSVP' : 'Scan to visit our wedding website', W / 2, 1340)
      ctx.font = '26px "Jost", sans-serif'
      ctx.fillStyle = '#6B655C'
      ctx.fillText(url.replace(/^https?:\/\//, ''), W / 2, 1420, W - 160)

      download(canvas.toDataURL('image/png'), `wedding-${target}-card.png`)
    } catch {
      toast.error('The printable card could not be created. Please try the plain QR download.')
    } finally {
      setBusy(false)
    }
  }

  const targets = shareTargets(url, shareText)

  return (
    <>
      <PageHeader title="Share & QR" description="Send your website link and print QR codes for paper invitations." />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-line bg-paper p-5 shadow-soft sm:p-6" aria-labelledby="links-heading">
          <h2 id="links-heading" className="text-2xl text-ink">
            Your links
          </h2>
          <div className="mt-5 space-y-4">
            {(
              [
                { key: 'home', label: 'Wedding website', href: links.home },
                { key: 'rsvp', label: 'RSVP page', href: links.rsvp },
              ] as const
            ).map((l) => (
              <div key={l.key}>
                <p className="mb-1.5 text-sm font-medium text-ink-soft">{l.label}</p>
                <div className="flex gap-2">
                  <input readOnly value={l.href} aria-label={`${l.label} link`} className="input-base min-h-11 flex-1 py-2 text-sm" onFocus={(e) => e.target.select()} />
                  <Button variant="subtle" onClick={() => void copy(l.href)} icon={<Copy aria-hidden="true" className="size-4" />} aria-label={`Copy ${l.label} link`}>
                    Copy
                  </Button>
                  <a
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Open ${l.label}`}
                    className="flex size-11 shrink-0 items-center justify-center rounded-md text-muted transition hover:bg-cream hover:text-ink"
                  >
                    <ExternalLink className="size-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>

          <h3 className="mt-8 text-sm font-semibold uppercase tracking-[0.14em] text-muted">Share the {target === 'rsvp' ? 'RSVP' : 'website'} link</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              onClick={async () => {
                const r = await shareOrCopy(url, couple)
                if (r === 'copied') toast.show('Link copied — paste it in Messenger or Viber.')
              }}
              icon={<Share2 aria-hidden="true" className="size-4" />}
            >
              Share…
            </Button>
            <a className="inline-flex min-h-11 items-center rounded-md bg-cream px-4 text-sm text-ink transition hover:bg-linen" href={targets.messenger}>
              Messenger
            </a>
            <a className="inline-flex min-h-11 items-center rounded-md bg-cream px-4 text-sm text-ink transition hover:bg-linen" href={targets.viber}>
              Viber
            </a>
            <a className="inline-flex min-h-11 items-center rounded-md bg-cream px-4 text-sm text-ink transition hover:bg-linen" href={targets.whatsapp} target="_blank" rel="noopener noreferrer">
              WhatsApp
            </a>
            <a className="inline-flex min-h-11 items-center rounded-md bg-cream px-4 text-sm text-ink transition hover:bg-linen" href={targets.facebook} target="_blank" rel="noopener noreferrer">
              Facebook
            </a>
          </div>
          <p className="mt-2 text-xs text-muted">Messenger and Viber buttons open the apps on phones. On a computer, use Copy.</p>

          <div className="mt-8 rounded-lg border border-dashed border-line p-4 text-sm text-muted">
            <p className="font-medium text-ink-soft">Link preview</p>
            <p className="mt-1">
              When the link is pasted in Messenger, Viber or Facebook it shows your names, date, introduction and hero photo. The preview is refreshed every time
              the site is published and once a day. Apps may keep an older preview cached for a while.
            </p>
          </div>
        </section>

        <section className="rounded-xl border border-line bg-paper p-5 shadow-soft sm:p-6" aria-labelledby="qr-heading">
          <h2 id="qr-heading" className="text-2xl text-ink">
            QR code
          </h2>
          <div role="radiogroup" aria-label="QR code opens" className="mt-4 flex gap-1 rounded-lg bg-cream p-1">
            {(['rsvp', 'home'] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={target === t}
                onClick={() => setTarget(t)}
                className={cn('flex-1 rounded-md px-3 py-2 text-sm transition', target === t ? 'bg-paper text-ink shadow-soft' : 'text-muted hover:text-ink')}
              >
                {t === 'rsvp' ? 'Opens RSVP page' : 'Opens website'}
              </button>
            ))}
          </div>

          <div className="mx-auto mt-6 flex aspect-square w-full max-w-64 items-center justify-center rounded-xl bg-white p-3 shadow-soft ring-1 ring-line">
            {qrSvg ? <div className="size-full [&>svg]:size-full" dangerouslySetInnerHTML={{ __html: qrSvg }} /> : <Spinner />}
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button onClick={() => void downloadCard()} loading={busy} loadingText="Creating…" icon={<FileImage aria-hidden="true" className="size-4" />}>
              Printable card (PNG)
            </Button>
            <Button variant="subtle" onClick={() => void downloadPng()} icon={<Download aria-hidden="true" className="size-4" />}>
              QR only (PNG)
            </Button>
            <Button variant="subtle" onClick={downloadSvg} disabled={!qrSvg} icon={<Download aria-hidden="true" className="size-4" />}>
              QR only (SVG)
            </Button>
          </div>
          <p className="mt-3 text-center text-xs text-muted">SVG stays sharp at any print size — best for your printer or layout artist.</p>
        </section>
      </div>
    </>
  )
}
