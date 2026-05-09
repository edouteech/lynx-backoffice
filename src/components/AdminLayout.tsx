import { LogOut, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import AdminSidebar from './AdminSidebar'
import { useAdminAuth } from '../contexts/AdminAuthContext'

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { logout } = useAdminAuth()
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await logout()
    } finally {
      setLoggingOut(false)
      setShowLogoutConfirm(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <div className="flex flex-1">
        <AdminSidebar onLogoutClick={() => setShowLogoutConfirm(true)} />
        <div className="flex flex-1 flex-col">
          {children}
          <footer className="ml-64 mt-auto border-t border-gray-200 bg-white px-6 py-3">
            <div className="text-center text-sm text-gray-600">
              Lynx — administration
            </div>
          </footer>
        </div>
      </div>

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              Confirmer la déconnexion
            </h3>
            <p className="mb-6 text-gray-600">
              Vous quitterez la console d’administration.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                disabled={loggingOut}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                <X className="h-4 w-4 shrink-0" aria-hidden />
                Annuler
              </button>
              <button
                type="button"
                onClick={() => void handleLogout()}
                disabled={loggingOut}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#3B82F6] px-4 py-2 text-white transition-colors hover:bg-[#2563EB] disabled:opacity-60"
              >
                <LogOut className="h-4 w-4 shrink-0" aria-hidden />
                {loggingOut ? 'Déconnexion…' : 'Déconnexion'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
