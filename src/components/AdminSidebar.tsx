import { useLocation, useNavigate } from 'react-router-dom'
import {
  Building2,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Users,
  UserCog,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react'
import { useAdminAuth } from '../contexts/AdminAuthContext'

const nav = [
  { path: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { path: 'subscriptions', label: 'Abonnements', icon: ShieldCheck },
  {
    path: 'organization-requests',
    label: 'Demandes d’inscription',
    icon: ClipboardList,
  },
  { path: 'organizations', label: 'Organisations', icon: Building2 },
  { path: 'owners', label: 'Propriétaires', icon: UserCog },
  { path: 'users', label: 'Utilisateurs', icon: Users },
] as const

export default function AdminSidebar({
  onLogoutClick,
}: {
  onLogoutClick: () => void
}) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAdminAuth()
  const roleLabel =
    user?.platform_role?.name?.trim() || 'Admin'
  const active = location.pathname.replace(/^\//, '') || 'dashboard'

  function go(path: string) {
    navigate(`/${path}`)
  }

  return (
    <div className="fixed flex h-full w-64 flex-col bg-[#0F2E4A] shadow-2xl backdrop-blur-xl">
      <div className="shrink-0 border-b border-white/10 p-6">
        <div className="flex flex-col items-center text-center">
          <img
            src="/lynx_400px.png"
            alt="Lynx"
            className=" object-contain"
            loading="lazy"
          />
          <p className="mt-1 text-xs font-medium text-white/65">{roleLabel}</p>
        </div>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-4 py-6">
        {nav.map((item) => {
          const isActive =
            active === item.path || active.startsWith(`${item.path}/`)
          return (
            <button
              key={item.path}
              type="button"
              onClick={() => go(item.path)}
              className={`mb-3 flex w-full transform items-center gap-3 rounded-2xl px-4 py-4 text-left transition-all duration-500 hover:scale-105 ${
                isActive
                  ? 'translate-x-2 scale-105 bg-[#3B82F6] text-white shadow-xl'
                  : 'text-white/80 hover:translate-x-1 hover:bg-[#3B82F6]/20 hover:text-white'
              }`}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span className="font-semibold">{item.label}</span>
            </button>
          )
        })}
      </nav>

      <div className="shrink-0 px-4 pb-6 pt-3">
        <div className="rounded-2xl border border-white/20 bg-[#EFF6FF]/25 p-4 backdrop-blur-xl">
          <div className="mb-3 flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-[#3B82F6] to-[#2563EB] text-sm font-bold text-white">
              {user?.email?.slice(0, 2).toUpperCase() ?? 'A'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">
                {roleLabel}
              </p>
              <p className="truncate text-xs text-white/60">{user?.email}</p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-white/50" aria-hidden />
          </div>
          <button
            type="button"
            onClick={onLogoutClick}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs text-white/80 transition-all duration-300 hover:bg-[#3B82F6]/20 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Déconnexion
          </button>
        </div>
      </div>
    </div>
  )
}
