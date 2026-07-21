import { LogOut, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import AdminSidebar from './AdminSidebar'
import AdminNavbar from './AdminNavbar'
import { useAdminAuth } from '../contexts/AdminAuthContext'

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { logout } = useAdminAuth()
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

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
    <div className="flex w-full min-h-screen bg-[#EFF6FF]">
      {/* Sidebar - Desktop always visible, Mobile toggleable */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <AdminSidebar />
      </div>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col lg:ml-64 min-w-0 overflow-x-hidden">
        <AdminNavbar
          onLogoutClick={() => setShowLogoutConfirm(true)}
          onMenuClick={() => setIsSidebarOpen(true)}
        />

        <main className="flex-1 w-full px-4 py-6 lg:px-8 lg:py-8">
          {children}
        </main>

        <footer className="border-t border-gray-200 bg-white px-6 py-3">
          <div className="text-center text-sm text-gray-600">
            Lynx — administration
          </div>
        </footer>
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
