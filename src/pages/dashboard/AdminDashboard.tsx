import { useEffect, useState } from 'react'
import { Building2, ClipboardList, Users } from 'lucide-react'
import { apiFetch } from '../../lib/api'
import type {
  ApiOrgRegistrationRequest,
  ApiOrganization,
  ApiAdminUser,
  LaravelPaginator,
} from '../../types/apiAdmin'

export default function AdminDashboard() {
  const [pending, setPending] = useState<number | null>(null)
  const [orgTotal, setOrgTotal] = useState<number | null>(null)
  const [userTotal, setUserTotal] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setError(null)
      try {
        const [reqRes, orgRes, userRes] = await Promise.all([
          apiFetch<LaravelPaginator<ApiOrgRegistrationRequest>>(
            '/Admin/organization-registration-requests?status=pending&per_page=1',
          ),
          apiFetch<LaravelPaginator<ApiOrganization>>(
            '/Admin/organizations?per_page=1',
          ),
          apiFetch<LaravelPaginator<ApiAdminUser>>('/Admin/users?per_page=1'),
        ])
        if (!cancelled) {
          setPending(reqRes.total ?? 0)
          setOrgTotal(orgRes.total ?? 0)
          setUserTotal(userRes.total ?? 0)
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Chargement impossible.')
          setPending(null)
          setOrgTotal(null)
          setUserTotal(null)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  function n(v: number | null) {
    if (v === null) return '—'
    return String(v)
  }

  return (
    <div className="ml-64 min-h-screen flex-1 bg-[#EFF6FF] p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold text-gray-900">
          Tableau de bord
        </h1>
        <p className="mt-1 text-gray-600">
          Vue d’ensemble des demandes, organisations et utilisateurs.
        </p>
      </header>

      {error && (
        <div
          className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          role="status"
        >
          {error}
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-[#3B82F6]/15 p-3 text-[#3B82F6]">
              <ClipboardList className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">
                Demandes en attente
              </p>
              <p className="text-2xl font-semibold text-gray-900">
                {n(pending)}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-500/15 p-3 text-emerald-700">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">
                Organisations
              </p>
              <p className="text-2xl font-semibold text-gray-900">
                {n(orgTotal)}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-violet-500/15 p-3 text-violet-700">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Utilisateurs</p>
              <p className="text-2xl font-semibold text-gray-900">
                {n(userTotal)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
