import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Building2,
  ClipboardList,
  LayoutDashboard,
  Users,
  UserCog,
  ShieldCheck,
  Activity,
  Terminal,
  ScrollText,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'

type NavItem = {
  path: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  children?: {
    path: string
    label: string
    icon: React.ComponentType<{ className?: string }>
  }[]
}

const nav: NavItem[] = [
  { path: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { path: 'subscriptions', label: 'Licences', icon: ShieldCheck },
  {
    path: 'organization-requests',
    label: 'Demandes d’inscription',
    icon: ClipboardList,
  },
  { path: 'organizations', label: 'Organisations', icon: Building2 },
  { path: 'owners', label: 'Propriétaires', icon: UserCog },
  { path: 'users', label: 'Utilisateurs', icon: Users },
  {
    path: 'logs',
    label: 'Logs',
    icon: ScrollText,
    children: [
      { path: 'audit-logs', label: 'Logs POS', icon: Activity },
      { path: 'system-logs', label: 'Logs Système', icon: Terminal },
    ],
  },
]

export default function AdminSidebar({ collapsed = false }: { collapsed?: boolean }) {
  const location = useLocation()
  const navigate = useNavigate()
  const active = location.pathname.replace(/^\//, '') || 'dashboard'

  const isLogsActive =
    active === 'audit-logs' ||
    active.startsWith('audit-logs/') ||
    active === 'system-logs' ||
    active.startsWith('system-logs/')

  const [logsOpen, setLogsOpen] = useState(isLogsActive)

  function go(path: string) {
    navigate(`/${path}`)
  }

  return (
    <div className="flex h-full w-full flex-col bg-[#0F2E4A] shadow-2xl backdrop-blur-xl">
      <div className="shrink-0 border-b border-white/10 p-6">
        {collapsed ? (
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-[#3B82F6] text-sm font-bold text-white">
            L
          </div>
        ) : (
          <div className="flex flex-col items-center text-center">
            <img
              src="/lynx_400px.png"
              alt="Lynx"
              className=" object-contain"
              loading="lazy"
            />
          </div>
        )}
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-4 py-6">
        {nav.map((item) => {
          if (item.children && item.children.length > 0) {
            const isChildActive = item.children.some(
              (c) => active === c.path || active.startsWith(`${c.path}/`)
            )

            return (
              <div key={item.path} className="mb-3">
                <button
                  type="button"
                  onClick={() => {
                    if (collapsed) {
                      go(item.children![0].path)
                    } else {
                      setLogsOpen((prev) => !prev)
                    }
                  }}
                  title={collapsed ? item.label : undefined}
                  className={`flex w-full transform items-center gap-3 rounded-2xl px-4 py-4 text-left transition-all duration-300 hover:scale-105 ${
                    collapsed ? 'justify-center px-0' : ''
                  } ${
                    isChildActive
                      ? 'bg-[#3B82F6]/25 text-white font-semibold'
                      : 'text-white/80 hover:bg-[#3B82F6]/20 hover:text-white'
                  }`}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 font-semibold">{item.label}</span>
                      {logsOpen ? (
                        <ChevronDown className="h-4 w-4 text-white/70 transition-transform duration-200" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-white/70 transition-transform duration-200" />
                      )}
                    </>
                  )}
                </button>

                {!collapsed && logsOpen && (
                  <div className="mt-1 space-y-1 pl-4">
                    {item.children.map((sub) => {
                      const isSubActive =
                        active === sub.path || active.startsWith(`${sub.path}/`)
                      return (
                        <button
                          key={sub.path}
                          type="button"
                          onClick={() => go(sub.path)}
                          className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-all duration-200 ${
                            isSubActive
                              ? 'bg-[#3B82F6] text-white font-medium shadow-md'
                              : 'text-white/70 hover:bg-[#3B82F6]/20 hover:text-white'
                          }`}
                        >
                          <sub.icon className="h-4 w-4 shrink-0" />
                          <span className="text-sm">{sub.label}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          }

          const isActive =
            active === item.path || active.startsWith(`${item.path}/`)

          return (
            <button
              key={item.path}
              type="button"
              onClick={() => go(item.path)}
              title={collapsed ? item.label : undefined}
              className={`mb-3 flex w-full transform items-center gap-3 rounded-2xl px-4 py-4 text-left transition-all duration-500 hover:scale-105 ${
                collapsed ? 'justify-center px-0' : ''
              } ${
                isActive
                  ? 'translate-x-2 scale-105 bg-[#3B82F6] text-white shadow-xl'
                  : 'text-white/80 hover:translate-x-1 hover:bg-[#3B82F6]/20 hover:text-white'
              }`}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span className="font-semibold">{item.label}</span>}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
