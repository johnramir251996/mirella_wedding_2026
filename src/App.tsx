import { lazy, Suspense } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { isSupabaseConfigured } from './lib/supabase'
import { AuthProvider } from './components/admin/AuthProvider'
import { ProtectedRoute } from './components/admin/ProtectedRoute'
import { ToastProvider } from './components/ui/ToastProvider'
import { PageLoader } from './components/ui/Spinner'
import { SetupNotice } from './components/ui/SetupNotice'
import { ScrollToTop } from './components/ui/ScrollToTop'
import { ThemeProvider } from './theme/ThemeProvider'
import Home from './pages/Home'
import RSVP from './pages/RSVP'
import NotFound from './pages/NotFound'

// Admin code (and the charting library) is only downloaded by administrators.
const AdminLogin = lazy(() => import('./pages/AdminLogin'))
const AdminLayout = lazy(() => import('./layouts/AdminLayout'))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))
const AdminInvitations = lazy(() => import('./pages/AdminInvitations'))
const AdminResponses = lazy(() => import('./pages/AdminResponses'))
const AdminGuests = lazy(() => import('./pages/AdminGuests'))
const AdminSettings = lazy(() => import('./pages/AdminSettings'))
const AdminOutfits = lazy(() => import('./pages/AdminOutfits'))
const AdminEntourage = lazy(() => import('./pages/AdminEntourage'))
const AdminMedia = lazy(() => import('./pages/AdminMedia'))
const AdminLookFeel = lazy(() => import('./pages/AdminLookFeel'))
const AdminShare = lazy(() => import('./pages/AdminShare'))

/*
 * HashRouter is used on purpose: GitHub Pages is static hosting with no
 * server-side rewrites, so /rsvp or /admin would 404 on refresh with
 * BrowserRouter. With hash routes (/#/rsvp) every refresh and deep link works.
 */
export default function App() {
  if (!isSupabaseConfigured) return <SetupNotice />

  return (
    <HashRouter>
      <ScrollToTop />
      <ToastProvider>
        <ThemeProvider>
        <AuthProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/rsvp" element={<RSVP />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<AdminDashboard />} />
                <Route path="invitations" element={<AdminInvitations />} />
                <Route path="responses" element={<AdminResponses />} />
                <Route path="guests" element={<AdminGuests />} />
                <Route path="outfits" element={<AdminOutfits />} />
                <Route path="entourage" element={<AdminEntourage />} />
                <Route path="media" element={<AdminMedia />} />
                <Route path="look" element={<AdminLookFeel />} />
                <Route path="share" element={<AdminShare />} />
                <Route path="settings" element={<AdminSettings />} />
                <Route path="*" element={<Navigate to="/admin" replace />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
        </ThemeProvider>
      </ToastProvider>
    </HashRouter>
  )
}
