import { useCallback, useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Armchair, ExternalLink, Heart, ListChecks, Images, LayoutDashboard, Palette, LogOut, Mail, Menu, MessageSquareHeart, Printer, QrCode, Settings, Shirt, UserPlus, Users, X } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { useWeddingSettings } from '../hooks/useWeddingSettings'
import type { AdminOutletContext } from '../hooks/useAdminData'
import { loadAdminData, type AdminData } from '../services/adminService'
import { toFriendlyMessage } from '../utils/errors'
import { cn } from '../components/ui/cn'

const NAV_GROUPS: { title: string | null; items: { to: string; label: string; icon: typeof Mail; end?: boolean }[] }[] = [
  { title: null, items: [{ to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true }] },
  {
    title: 'Guests',
    items: [
      { to: '/admin/invitations', label: 'Invitations', icon: Mail },
      { to: '/admin/responses', label: 'Responses', icon: MessageSquareHeart },
      { to: '/admin/guests', label: 'Additional Guests', icon: UserPlus },
      { to: '/admin/questions', label: 'RSVP Questions', icon: ListChecks },
      { to: '/admin/seating', label: 'Seating', icon: Armchair },
    ],
  },
  {
    title: 'Website',
    items: [
      { to: '/admin/media', label: 'Photos & Video', icon: Images },
      { to: '/admin/outfits', label: 'Outfit Gallery', icon: Shirt },
      { to: '/admin/entourage', label: 'Entourage', icon: Users },
      { to: '/admin/look', label: 'Look & Feel', icon: Palette },
      { to: '/admin/settings', label: 'Website Settings', icon: Settings },
    ],
  },
  {
    title: 'Share',
    items: [
      { to: '/admin/share', label: 'Share & QR', icon: QrCode },
      { to: '/admin/printables', label: 'Printables', icon: Printer },
    ],
  },
]

export default function AdminLayout() {
  const { signOut, session } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const { settings } = useWeddingSettings()
  const [menuOpen, setMenuOpen] = useState(false)
  const [data, setData] = useState<AdminData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setData(await loadAdminData())
    } catch (e) {
      setError(toFriendlyMessage(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  // While the phone menu is open, the page behind it must not scroll.
  useEffect(() => {
    if (!menuOpen) return
    const html = document.documentElement
    const body = document.body
    const prev = { html: html.style.overflow, body: body.style.overflow, touch: body.style.touchAction }
    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false)
    window.addEventListener('keydown', onKey)
    return () => {
      html.style.overflow = prev.html
      body.style.overflow = prev.body
      body.style.touchAction = prev.touch
      window.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  const logout = async () => {
    await signOut()
    toast.show('You have been signed out.')
    navigate('/admin/login', { replace: true })
  }

  const context: AdminOutletContext = { data, loading, error, reload }

  // Scrolling list of pages + a footer that always stays visible.
  const nav = (
    <div className="flex min-h-0 flex-1 flex-col">
      <nav aria-label="Admin" className="-mx-1 min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 pb-2">
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi} className={cn(gi > 0 && 'mt-4')}>
            {group.title && <p className="mb-1 px-3 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted">{group.title}</p>}
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      'flex min-h-11 items-center gap-3 rounded-lg px-3 text-[0.95rem] transition',
                      isActive ? 'bg-ink text-ivory shadow-soft' : 'text-ink-soft hover:bg-cream hover:text-ink',
                    )
                  }
                >
                  <item.icon aria-hidden="true" className="size-[18px]" strokeWidth={1.6} />
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="shrink-0 space-y-1 border-t border-line pt-3">
        <a
          href="#/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-[0.95rem] text-ink-soft transition hover:bg-cream hover:text-ink"
        >
          <ExternalLink aria-hidden="true" className="size-[18px]" strokeWidth={1.6} />
          View website
        </a>
        <button
          type="button"
          onClick={logout}
          className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-[0.95rem] text-ink-soft transition hover:bg-rose/10 hover:text-rose"
        >
          <LogOut aria-hidden="true" className="size-[18px]" strokeWidth={1.6} />
          Logout
        </button>
        {session?.user.email && <p className="truncate px-3 pt-1 text-xs text-muted">{session.user.email}</p>}
      </div>
    </div>
  )

  const brand = (
    <div className="flex items-center gap-2.5">
      <span className="flex size-9 items-center justify-center rounded-full border border-champagne/60 text-champagne">
        <Heart aria-hidden="true" className="size-4" strokeWidth={1.5} />
      </span>
      <div className="leading-tight">
        <p className="font-serif text-xl text-ink">{settings?.coupleNames || 'Our Wedding'}</p>
        <p className="text-[0.65rem] uppercase tracking-[0.22em] text-muted">Wedding admin</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-[100svh] bg-ivory print:min-h-0">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 print:hidden flex-col gap-6 border-r border-line bg-paper px-4 py-6 lg:flex">
        <div className="px-2">{brand}</div>
        {nav}
      </aside>

      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-paper/95 print:hidden px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur lg:hidden">
        {brand}
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
          aria-expanded={menuOpen}
          aria-controls="admin-mobile-menu"
          className="rounded-lg p-2.5 text-ink hover:bg-cream"
        >
          <Menu className="size-6" />
        </button>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <div className="fixed inset-0 z-40 overscroll-none lg:hidden">
            <motion.div
              className="absolute inset-0 touch-none bg-ink/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
            />
            <motion.aside
              id="admin-mobile-menu"
              role="dialog"
              aria-modal="true"
              aria-label="Admin menu"
              className="absolute left-0 top-0 flex h-[100dvh] w-[min(82vw,300px)] flex-col gap-5 bg-paper px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] shadow-lift"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
            >
              <div className="flex items-center justify-between px-2">
                {brand}
                <button type="button" onClick={() => setMenuOpen(false)} aria-label="Close menu" className="rounded-lg p-2 hover:bg-cream">
                  <X className="size-5" />
                </button>
              </div>
              {nav}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <main className="px-4 pb-16 pt-6 sm:px-6 lg:ml-64 lg:px-10 lg:pt-10 print:m-0 print:p-0">
        <div className="mx-auto max-w-6xl print:max-w-none">
          <Outlet context={context} />
        </div>
      </main>
    </div>
  )
}
