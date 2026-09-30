import type { Plugin } from 'vite'

/**
 * Build-time link preview (Open Graph) tags.
 *
 * Messenger, Viber and Facebook don't run JavaScript when they build a link
 * preview, so the couple's names, date, intro and hero photo are fetched from
 * the public wedding_settings row at build time and written into index.html.
 * The GitHub workflow rebuilds on every push and once a day.
 */
interface Options {
  supabaseUrl?: string
  anonKey?: string
  siteUrl?: string
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function longDate(iso: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '')
  if (!m) return ''
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

function previewImage(url: string): string {
  try {
    const u = new URL(url)
    if (u.hostname === 'images.unsplash.com') {
      u.searchParams.set('w', '1200')
      u.searchParams.set('h', '630')
      u.searchParams.set('fit', 'crop')
      u.searchParams.set('q', '80')
    }
    return u.toString()
  } catch {
    return ''
  }
}

export function weddingMeta({ supabaseUrl, anonKey, siteUrl }: Options): Plugin {
  return {
    name: 'wedding-meta',
    async transformIndexHtml(html) {
      let title = 'Our Wedding'
      let description = 'With joyful hearts, we invite you to celebrate with us.'
      let image = ''

      if (supabaseUrl && anonKey) {
        try {
          const res = await fetch(
            `${supabaseUrl}/rest/v1/wedding_settings?select=couple_names,wedding_date,story_text,hero_image_url&limit=1`,
            { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` }, signal: AbortSignal.timeout(8000) },
          )
          if (res.ok) {
            const [s] = (await res.json()) as { couple_names?: string; wedding_date?: string; story_text?: string; hero_image_url?: string }[]
            if (s?.couple_names) {
              const date = longDate(s.wedding_date)
              title = date ? `${s.couple_names} · ${date}` : s.couple_names
              description = s.story_text?.trim() || `${s.couple_names} are getting married${date ? ` on ${date}` : ''}. Kindly RSVP.`
              image = s.hero_image_url ? previewImage(s.hero_image_url) : ''
            }
          } else {
            console.warn(`[wedding-meta] settings request failed: ${res.status}`)
          }
        } catch (e) {
          console.warn('[wedding-meta] could not load settings, using defaults', e)
        }
      }

      const tags = [
        `<title>${esc(title)}</title>`,
        `<meta name="description" content="${esc(description)}" />`,
        `<meta property="og:type" content="website" />`,
        `<meta property="og:title" content="${esc(title)}" />`,
        `<meta property="og:description" content="${esc(description)}" />`,
        siteUrl ? `<meta property="og:url" content="${esc(siteUrl)}" />` : '',
        image ? `<meta property="og:image" content="${esc(image)}" />` : '',
        image ? `<meta property="og:image:width" content="1200" />` : '',
        image ? `<meta property="og:image:height" content="630" />` : '',
        `<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}" />`,
        `<meta name="twitter:title" content="${esc(title)}" />`,
        `<meta name="twitter:description" content="${esc(description)}" />`,
        image ? `<meta name="twitter:image" content="${esc(image)}" />` : '',
      ]
        .filter(Boolean)
        .join('\n    ')

      return html.replace('<!-- wedding-meta -->', tags)
    },
  }
}
