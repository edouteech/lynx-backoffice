import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { apiFetch } from '../../lib/api'
import type { ApiAdminUser } from '../../types/apiAdmin'
import { cn, cardUi } from '../../lib/pageLayout'

const ui = {
  alertWarn:
    'rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900',
}

type MembershipRow = { id: number; orgId: number | null; org: string; role: string }

function memberships(u: ApiAdminUser): MembershipRow[] {
  const ms = u.organization_memberships ?? []
  return ms
    .map((m) => ({
      id: Number(m.id ?? 0),
      orgId: m.organization?.id ?? null,
      org: m.organization?.name ?? '—',
      role: m.role?.name ?? '—',
    }))
    .sort((a, b) => a.org.localeCompare(b.org, 'fr'))
}

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [user, setUser] = useState<ApiAdminUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const all = useMemo(() => (user ? memberships(user) : []), [user])
  const platform = user?.platform_role?.name ?? '—'

  useEffect(() => {
    if (!id) {
      queueMicrotask(() => setLoading(false))
      return
    }
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const u = await apiFetch<ApiAdminUser>(`/Admin/users/${id}`)
        if (!cancelled) setUser(u)
      } catch (e) {
        if (!cancelled) {
          setUser(null)
          setError(e instanceof Error ? e.message : 'Chargement impossible.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id])

  if (loading) {
    return (
      <div>
        <div className={cardUi.container}>
          <div className="flex items-center justify-between gap-3">
            <div className="h-5 w-48 animate-pulse rounded bg-gray-200" />
            <div className="h-9 w-40 animate-pulse rounded-lg bg-gray-200" />
          </div>

          <div className={cn(cardUi.card, cardUi.cardPad)}>
            <div className="space-y-3">
              <div className="h-7 w-72 animate-pulse rounded bg-gray-200" />
              <div className="h-4 w-60 animate-pulse rounded bg-gray-100" />
              <div className="mt-4 grid gap-2 sm:grid-cols-3 lg:max-w-xl lg:grid-cols-3">
                <div className="h-20 animate-pulse rounded-xl bg-gray-100" />
                <div className="h-20 animate-pulse rounded-xl bg-gray-100" />
                <div className="h-20 animate-pulse rounded-xl bg-gray-100" />
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className={cn(cardUi.card, cardUi.cardPad, 'lg:col-span-2')}>
              <div className="h-4 w-28 animate-pulse rounded bg-gray-200" />
              <div className="mt-4 grid gap-5 sm:grid-cols-2">
                <div className="h-12 animate-pulse rounded bg-gray-100" />
                <div className="h-12 animate-pulse rounded bg-gray-100" />
                <div className="h-12 animate-pulse rounded bg-gray-100" />
                <div className="h-12 animate-pulse rounded bg-gray-100" />
              </div>
            </div>
            <div className={cn(cardUi.card, cardUi.cardPad)}>
              <div className="h-4 w-28 animate-pulse rounded bg-gray-200" />
              <div className="mt-4 space-y-2">
                <div className="h-5 w-40 animate-pulse rounded bg-gray-100" />
                <div className="h-5 w-56 animate-pulse rounded bg-gray-100" />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !user) {
    return (
      <div>
        <Link
          to="/users"
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-[#3B82F6] hover:text-[#2563EB]"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à la liste
        </Link>
        <div className={ui.alertWarn} role="status">
          {error ?? 'Utilisateur introuvable.'}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/users"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#3B82F6] hover:text-[#2563EB]"
        >
          <ArrowLeft className="h-4 w-4" />
          Utilisateurs
        </Link>
      </div>

      <div className={cardUi.container}>
        <section className="grid gap-6 lg:grid-cols-3">
          <div className={cn(cardUi.card, cardUi.cardPad, 'lg:col-span-2')}>
            <h2 className={cardUi.sectionLabel}>Informations</h2>
            <dl className="mt-4 grid gap-5 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Nom complet
                </dt>
                <dd className="mt-1 text-sm text-gray-900">{user.name}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  E-mail
                </dt>
                <dd className="mt-1 break-all text-sm text-gray-900">
                  {user.email}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Téléphone
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {user.phone?.trim() ? user.phone : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Rôle plateforme
                </dt>
                <dd className="mt-1 text-sm text-gray-900">{platform}</dd>
              </div>
            </dl>
          </div>

          <div className={cn(cardUi.card, cardUi.cardPad)}>
            <h2 className={cardUi.sectionLabel}>Compte</h2>
            <div className="mt-4 space-y-2">
              <p className="text-sm text-gray-600">
                Organisations:{' '}
                <span className="font-medium text-gray-900">{all.length}</span>
              </p>
            </div>
          </div>
        </section>

        <section className={cn(cardUi.card, 'overflow-hidden')}>
          <div className="border-b border-gray-200 p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Organisations
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Organisations auxquelles cet utilisateur est rattaché.
            </p>
          </div>

          <div className="overflow-x-auto">
            {all.length === 0 ? (
              <div className="px-6 py-10 text-center text-gray-500">
                Aucune organisation associée.
              </div>
            ) : (
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-gray-600">Organisation</th>
                    <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-gray-600">Rôle</th>
                  </tr>
                </thead>
                <tbody>
                  {all.map((m, idx) => (
                    <tr
                      key={`${m.id}-${idx}`}
                      className="border-b border-gray-100 transition-colors last:border-0 hover:bg-gray-50/80"
                    >
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {m.orgId ? (
                          <Link
                            to={`/organizations/${m.orgId}`}
                            className="text-[#3B82F6] hover:underline"
                          >
                            {m.org}
                          </Link>
                        ) : (
                          m.org
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-700">{m.role}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
