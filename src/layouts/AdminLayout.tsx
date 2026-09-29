import { useCallback, useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ExternalLink, Heart, LayoutDashboard, LogOut, Mail, Menu, MessageSquareHeart, Settings, Shirt, UserPlus, X } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { useWeddingSettings } from '../hooks/useWeddingSettings'
import type { AdminOutletContext } from '../hooks/useAdminData'
import { loadAdminData, type AdminData } from '../services/adminService'
import { toFriendlyMessage } from '../utils/errors'
import { cn } from '../components/ui/cn'

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/invitations', label: 'Invitations', icon: Mail },
  { to: '/admin/responses', label: 'Responses', icon: MessageSquareHeart },
  { to: '/admin/guests', label: 'Additional Guests', icon: UserPlus },
  { to: '/admin/outfits', label: 'Outfit Gallery', icon: Shirt },
  { to: '/admin/settings', label: 'Website Settings', icon: Settings },
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

  const logout = async () => {
    await signOut()
    toast.show('You have been signed out.')
    navigate('/admin/login', { replace: true })
  }

  const context: AdminOutletContext = { data, loading, error, reload }

  const nav = (
    <nav aria-label="Admin" className="flex flex-1 flex-col gap-1">
      {NAV.map((item) => (
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
      <div className="mt-auto space-y-1 border-t border-line pt-4">
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
        {session?.user.email && <p className="truncate px-3 pt-2 text-xs text-muted">{session.user.email}</p>}
      </div>
    </nav>
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
    <div className="min-h-[100svh] bg-ivory">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col gap-8 border-r border-line bg-paper px-4 py-6 lg:flex">
        <div className="px-2">{brand}</div>
        {nav}
      </aside>

      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-paper/95 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur lg:hidden">
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
          <div className="fixed inset-0 z-40 lg:hidden">
            <motion.div
              className="absolute inset-0 bg-ink/40"
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
              className="absolute inset-y-0 left-0 flex w-[min(80vw,300px)] flex-col gap-6 bg-paper px-4 pb-6 pt-[max(1.25rem,env(safe-area-inset-top))] shadow-lift"
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

      <main className="px-4 pb-16 pt-6 sm:px-6 lg:ml-64 lg:px-10 lg:pt-10">
        <div className="mx-auto max-w-6xl">
          <Outlet context={context} />
        </div>
      </main>
    </div>
  )
}
