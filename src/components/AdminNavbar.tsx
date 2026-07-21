import { useState } from 'react'
import { ChevronDown, LogOut, Menu, Shield } from 'lucide-react'
import { useAdminAuth } from '../contexts/AdminAuthContext'
import { userDisplayName, userInitials } from '../lib/userDisplay'

interface AdminNavbarProps {
  onLogoutClick: () => void
  onMenuClick: () => void
}

export default function AdminNavbar({ onLogoutClick, onMenuClick }: AdminNavbarProps) {
  const { user } = useAdminAuth()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const roleLabel = user?.platform_role?.name?.trim() || 'Admin'

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-gray-200 bg-white/80 px-4 backdrop-blur-md transition-all duration-300 lg:px-8">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:hidden"
        >
          <Menu className="h-6 w-6" />
        </button>

        <img
          src="/lynx_400px.png"
          alt="Lynx"
          className="h-8 w-auto object-contain lg:hidden"
        />
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        <div className="hidden items-center gap-2 rounded-full bg-blue-50 px-3 py-1 lg:flex">
          <Shield className="h-3.5 w-3.5 text-blue-600" />
          <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
            {roleLabel}
          </span>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-3 rounded-xl p-1.5 transition-all hover:bg-gray-50"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-bold text-white shadow-sm ring-2 ring-white md:h-10 md:w-10 md:text-sm">
              {userInitials(user)}
            </div>
            <div className="hidden flex-col items-start md:flex">
              <span className="text-sm font-semibold text-gray-900 leading-none">
                {userDisplayName(user)}
              </span>
              <span className="mt-1 text-xs text-gray-500 leading-none">
                {user?.email}
              </span>
            </div>
            <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`} />
          </button>

          {showUserMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowUserMenu(false)}
              ></div>
              <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-2xl border border-gray-100 bg-white p-2 shadow-xl ring-1 ring-black/5 z-20">
                <div className="px-3 py-2 md:hidden">
                  <p className="text-sm font-semibold text-gray-900">{userDisplayName(user)}</p>
                  <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                </div>
                <div className="h-px bg-gray-100 my-1 md:hidden"></div>
                <button
                  onClick={() => {
                    onLogoutClick()
                    setShowUserMenu(false)
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
                  Déconnexion
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
