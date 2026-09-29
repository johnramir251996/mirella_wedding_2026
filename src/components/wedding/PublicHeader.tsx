import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export function PublicHeader() {
  return (
    <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-8">
      <Link to="/" className="inline-flex min-h-11 items-center gap-2 rounded px-1 text-sm text-muted transition hover:text-ink">
        <ArrowLeft aria-hidden="true" className="size-4" strokeWidth={1.5} />
        <span>Wedding details</span>
      </Link>
      <Link to="/" aria-label="Home" className="font-serif text-2xl italic text-champagne">
        M &amp; E
      </Link>
    </header>
  )
}
