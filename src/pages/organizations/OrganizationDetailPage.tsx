import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Eye, Pencil, Search, Trash2, Users } from 'lucide-react'
import { apiFetch } from '../../lib/api'
import type {
  ApiAdminUser,
  ApiOrganization,
  ApiOrganizationDetail,
  LaravelPaginator,
} from '../../types/apiAdmin'
import { formatCreatedAt, orgIsActive, OrgActiveSwitch } from './organizationUi'

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(' ')
}

const layout = {
  page: 'ml-64 min-h-screen flex-1 bg-gradient-to-b from-[#EFF6FF] to-white px-6 py-10 lg:px-10',
  container: 'w-full max-w-none space-y-6',
  card: 'rounded-xl border border-gray-200 bg-white shadow-sm',
  cardPad: 'p-6',
  subtle: 'text-sm text-gray-600',
  title: 'truncate text-2xl font-semibold text-gray-900',
  sectionLabel: 'text-sm font-semibold uppercase tracking-wide text-gray-500',
}

const ui = {
  button:
    'inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/40',
  buttonNeutral: 'border-gray-200 bg-white text-[#3B82F6] hover:bg-blue-50',
  buttonDanger:
    'border-red-200 bg-white text-red-700 hover:bg-red-50 disabled:opacity-50',
  iconButton:
    'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-[#3B82F6] transition-colors hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/40',
  badge:
    'inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700',
  alertDanger:
    'rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800',
  alertWarn:
    'rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900',
}

function dash(v: string | null | undefined) {
  const t = v?.trim()
  return t ? t : '—'
}

function membershipForOrg(u: ApiAdminUser, orgId: number) {
  const ms = u.organization_memberships ?? []
  return ms.find((m) => m.organization?.id === orgId) ?? null
}

export default function OrganizationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [org, setOrg] = useState<ApiOrganizationDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [toggling, setToggling] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [employees, setEmployees] = useState<ApiAdminUser[]>([])
  const [employeesLoading, setEmployeesLoading] = useState(false)
  const [employeesError, setEmployeesError] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const orgId = Number(id)

  const employeeRows = useMemo(() => {
    if (!Number.isFinite(orgId)) return []
    const s = q.trim().toLowerCase()
    const base = employees
      .map((u) => ({ u, m: membershipForOrg(u, orgId) }))
      .filter((x) => x.m != null) as Array<{
      u: ApiAdminUser
      m: NonNullable<ReturnType<typeof membershipForOrg>>
    }>

    if (!s) return base
    const match = (v: string) => v.toLowerCase().includes(s)
    return base.filter(({ u, m }) => {
      const role = m.role?.name ?? ''
      return match(u.name) || match(u.email) || match(role)
    })
  }, [employees, orgId, q])

  const load = useCallback(async () => {
    if (!id) {
      setOrg(null)
      setLoadError('Identifiant manquant.')
      setLoading(false)
      return
    }
    setLoading(true)
    setLoadError(null)
    setActionError(null)
    try {
      const data = await apiFetch<ApiOrganizationDetail>(
        `/Admin/organizations/${id}`,
      )
      setOrg(data)
    } catch (e) {
      setOrg(null)
      setLoadError(
        e instanceof Error ? e.message : 'Chargement impossible.',
      )
    } finally {
      setLoading(false)
    }
  }, [id])

  const loadEmployees = useCallback(async () => {
    if (!id) return
    const orgId = Number(id)
    if (!Number.isFinite(orgId)) return
    setEmployeesLoading(true)
    setEmployeesError(null)
    try {
      const res = await apiFetch<LaravelPaginator<ApiAdminUser>>(
        '/Admin/users?per_page=500',
      )
      const rows = res.data ?? []
      const filtered = rows.filter((u) => membershipForOrg(u, orgId) != null)
      setEmployees(filtered)
    } catch (e) {
      setEmployees([])
      setEmployeesError(
        e instanceof Error ? e.message : 'Chargement de l’équipe impossible.',
      )
    } finally {
      setEmployeesLoading(false)
    }
  }, [id])

  useEffect(() => {
    const t = requestAnimationFrame(() => {
      void Promise.all([load(), loadEmployees()])
    })
    return () => cancelAnimationFrame(t)
  }, [load, loadEmployees])

  async function handleToggleActive() {
    if (!id || !org) return
    const next = !orgIsActive(org)
    setToggling(true)
    setActionError(null)
    try {
      const updated = await apiFetch<ApiOrganization>(
        `/Admin/organizations/${id}`,
        { method: 'PATCH', json: { is_active: next } },
      )
      setOrg((prev) => (prev ? { ...prev, ...updated } : prev))
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : 'Mise à jour du statut impossible.',
      )
    } finally {
      setToggling(false)
    }
  }

  async function handleDelete() {
    if (!id || !org) return
    if (
      !window.confirm(
        `Supprimer l’organisation « ${org.name} » ? Cette action est définitive.`,
      )
    ) {
      return
    }
    setDeleting(true)
    setActionError(null)
    try {
      await apiFetch(`/Admin/organizations/${id}`, { method: 'DELETE' })
      navigate('/organizations', { replace: true })
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : 'Suppression impossible.',
      )
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className={layout.page}>
        <div className={layout.container}>
          <div className="flex items-center justify-between gap-3">
            <div className="h-5 w-48 animate-pulse rounded bg-gray-200" />
            <div className="h-9 w-64 animate-pulse rounded-lg bg-gray-200" />
          </div>

          <div className={cn(layout.card, layout.cardPad)}>
            <div className="space-y-3">
              <div className="h-7 w-72 animate-pulse rounded bg-gray-200" />
              <div className="h-4 w-60 animate-pulse rounded bg-gray-100" />
              <div className="mt-4 flex gap-2">
                <div className="h-6 w-24 animate-pulse rounded-full bg-gray-100" />
                <div className="h-6 w-24 animate-pulse rounded-full bg-gray-100" />
                <div className="h-6 w-24 animate-pulse rounded-full bg-gray-100" />
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className={cn(layout.card, layout.cardPad, 'lg:col-span-2')}>
              <div className="h-4 w-28 animate-pulse rounded bg-gray-200" />
              <div className="mt-4 grid gap-5 sm:grid-cols-2">
                <div className="h-12 animate-pulse rounded bg-gray-100" />
                <div className="h-12 animate-pulse rounded bg-gray-100" />
                <div className="h-12 animate-pulse rounded bg-gray-100" />
                <div className="h-12 animate-pulse rounded bg-gray-100" />
              </div>
            </div>
            <div className={cn(layout.card, layout.cardPad)}>
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

  if (!org) {
    return (
      <div className={layout.page}>
        <Link
          to="/organizations"
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-[#3B82F6] hover:text-[#2563EB]"
        >
          <ArrowLeft className="h-4 w-4" />
          Organisations
        </Link>
        <div
          className={ui.alertWarn}
          role="status"
        >
          {loadError ?? 'Organisation introuvable.'}
        </div>
      </div>
    )
  }

  const active = orgIsActive(org)

  return (
    <div className={layout.page}>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/organizations"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#3B82F6] hover:text-[#2563EB]"
        >
          <ArrowLeft className="h-4 w-4" />
          Organisations
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm">
            <span className="text-sm text-gray-600">Activée</span>
            <OrgActiveSwitch
              isActive={active}
              disabled={toggling}
              onToggle={() => void handleToggleActive()}
            />
          </div>
          <button
            type="button"
            onClick={() =>
              navigate('/organizations', {
                state: { editOrganizationId: org.id },
              })
            }
            className={cn(ui.button, ui.buttonNeutral)}
          >
            <Pencil className="h-4 w-4 shrink-0" aria-hidden />
            Modifier
          </button>
          <button
            type="button"
            disabled={deleting}
            onClick={() => void handleDelete()}
            className={cn(ui.button, ui.buttonDanger)}
          >
            <Trash2 className="h-4 w-4 shrink-0" aria-hidden />
            Supprimer
          </button>
        </div>
      </div>

      {actionError && (
        <div
          className={cn('mb-4', ui.alertDanger)}
          role="alert"
        >
          {actionError}
        </div>
      )}

      <div className={layout.container}>
        <section className={cn(layout.card, layout.cardPad)}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <h1 className={layout.title}>{org.name}</h1>
            </div>

            <div className="grid gap-2 sm:grid-cols-3 lg:max-w-xl lg:grid-cols-3">
              <div className="rounded-xl border border-gray-200 bg-[#EFF6FF] p-3">
                <div className="flex items-center gap-2 text-[#3B82F6]">
                  <Users className="h-5 w-5" aria-hidden />
                  <p className="text-xs font-semibold uppercase tracking-wide">
                    Équipe
                  </p>
                </div>
                <p className="mt-2 text-2xl font-semibold text-gray-900">
                  {employeesLoading ? '—' : employeeRows.length}
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Créée le
                </p>
                <p className="mt-2 text-sm font-medium text-gray-900">
                  {formatCreatedAt(org.created_at)}
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Statut
                </p>
                <div className="mt-2 inline-flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${active ? 'bg-emerald-500' : 'bg-gray-400'}`}
                    aria-hidden
                  />
                  <span className="text-sm font-medium text-gray-900">
                    {active ? 'Active' : 'Désactivée'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className={cn(layout.card, layout.cardPad, 'lg:col-span-2')}>
            <h2 className={layout.sectionLabel}>Informations</h2>
            <dl className="mt-4 grid gap-5 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Pays
                </dt>
                <dd className="mt-1 text-sm text-gray-900">{dash(org.country)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Raison sociale
                </dt>
                <dd className="mt-1 text-sm text-gray-900">{dash(org.legal_name)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Devise
                </dt>
                <dd className="mt-1 text-sm text-gray-900">{dash(org.currency)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Téléphone
                </dt>
                <dd className="mt-1 text-sm text-gray-900">{dash(org.phone)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Adresse
                </dt>
                <dd className="mt-1 text-sm text-gray-900">{dash(org.address)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  N° fiscal
                </dt>
                <dd className="mt-1 text-sm text-gray-900">{dash(org.tax_id)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  N° immatriculation
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {dash(org.company_registration_number)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Fuseau
                </dt>
                <dd className="mt-1 text-sm text-gray-900">{dash(org.timezone)}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Logo
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {org.logo ? (
                    <img
                      src={org.logo}
                      alt=""
                      className="mt-2 h-16 w-auto max-w-xs rounded border border-gray-200 bg-white object-contain"
                    />
                  ) : (
                    '—'
                  )}
                </dd>
              </div>
            </dl>
          </div>

          <div className={cn(layout.card, layout.cardPad)}>
            <h2 className={layout.sectionLabel}>Propriétaire</h2>
            <div className="mt-4 space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {org.created_by?.name ?? '—'}
                </p>
                <p className="text-sm text-gray-600">{org.created_by?.email ?? '—'}</p>
              </div>
              {org.created_by?.id != null && (
                <Link
                  to={`/users/${org.created_by.id}`}
                  className={cn(ui.button, 'px-3 py-2', ui.buttonNeutral)}
                >
                  <Eye className="h-4 w-4" aria-hidden />
                  Voir l’utilisateur
                </Link>
              )}
            </div>
          </div>
        </section>

        <section className={cn(layout.card, 'overflow-hidden')}>
          <div className="flex flex-col gap-3 border-b border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Équipe</h2>
              <p className="mt-1 text-sm text-gray-600">
                Membres rattachés à cette organisation.
              </p>
            </div>
            <div className="relative min-w-0 max-w-md flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Rechercher par nom, e-mail ou rôle…"
                className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm shadow-sm focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30"
              />
            </div>
          </div>

          {employeesError && (
            <div
              className={cn('m-4', ui.alertWarn)}
              role="status"
            >
              {employeesError}
            </div>
          )}

          <div className="overflow-x-auto">
            {employeesLoading ? (
              <div className="px-6 py-12 text-center text-gray-500">
                Chargement…
              </div>
            ) : (
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-gray-600">
                    <th className="px-6 py-3 font-semibold">Nom</th>
                    <th className="px-6 py-3 font-semibold">E-mail</th>
                    <th className="px-6 py-3 font-semibold">Rôle</th>
                    <th className="px-6 py-3 text-right font-semibold">Détail</th>
                  </tr>
                </thead>
                <tbody>
                  {employeeRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-6 py-10 text-center text-gray-500"
                      >
                        {employees.length === 0
                          ? 'Aucun membre de l’équipe.'
                          : 'Aucun résultat pour cette recherche.'}
                      </td>
                    </tr>
                  ) : (
                    employeeRows.map(({ u, m }, idx) => (
                      <tr
                        key={u.id}
                        className={cn(
                          'border-b border-gray-100 last:border-0 hover:bg-gray-50',
                          idx % 2 === 1 && 'bg-gray-50/40',
                        )}
                      >
                        <td className="px-6 py-4 font-medium text-gray-900">
                          <Link
                            to={`/users/${u.id}`}
                            className="text-[#3B82F6] hover:underline"
                          >
                            {u.name}
                          </Link>
                        </td>
                        <td className="px-6 py-4 break-all text-gray-700">
                          {u.email}
                        </td>
                        <td className="px-6 py-4 text-gray-700">
                          {m.role?.name ?? '—'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end">
                            <Link
                              to={`/users/${u.id}`}
                              aria-label={`Voir la fiche : ${u.name}`}
                              title="Voir la fiche"
                              className={ui.iconButton}
                            >
                              <Eye className="h-4 w-4" aria-hidden />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
