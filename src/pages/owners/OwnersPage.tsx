import { useCallback, useEffect, useMemo, useState } from 'react'
import { Eye, Search } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import TableExportButton from '../../components/TableExportButton'
import type { ExportCell } from '../../lib/tableExport'
import { apiFetch } from '../../lib/api'
import type { ApiOrganization, LaravelPaginator } from '../../types/apiAdmin'
import { orgIsActive, OrgActiveSwitch } from '../organizations/organizationUi'

type OwnerKey = string

type OwnerGroupRow = {
  ownerKey: OwnerKey
  ownerId: number | null
  ownerName: string
  ownerEmail: string
  organizations: Array<{
    id: number
    name: string
    membersCount: number | null
    isActive: boolean
  }>
}

const OWNER_EXPORT_HEADERS = [
  'Nom',
  'E-mail',
  'Organisation',
  'Membres',
] as const

function asText(v: string | null | undefined) {
  const t = v?.trim()
  return t ? t : '—'
}

function inferMembersCount(org: ApiOrganization): number | null {
  const o = org as unknown as Record<string, unknown>
  const candidates = [
    o.members_count,
    o.users_count,
    o.membersCount,
    o.member_count,
    o.members,
  ]
  for (const c of candidates) {
    if (typeof c === 'number' && Number.isFinite(c)) return c
    if (typeof c === 'string' && c.trim() && Number.isFinite(Number(c))) {
      return Number(c)
    }
  }
  return null
}

function ownerKeyOf(org: ApiOrganization): OwnerKey {
  const id = org.created_by?.id
  const email = org.created_by?.email?.trim().toLowerCase()
  if (id != null) return `id:${id}`
  if (email) return `email:${email}`
  return 'unknown'
}

function ownerLabel(org: ApiOrganization): { id: number | null; name: string; email: string } {
  const id = org.created_by?.id ?? null
  const name = org.created_by?.name?.trim() || '—'
  const email = org.created_by?.email?.trim() || '—'
  return { id, name, email }
}

function buildGroups(orgs: ApiOrganization[]): OwnerGroupRow[] {
  const map = new Map<OwnerKey, OwnerGroupRow>()
  for (const org of orgs) {
    const key = ownerKeyOf(org)
    const owner = ownerLabel(org)
    const existing =
      map.get(key) ??
      ({
        ownerKey: key,
        ownerId: owner.id,
        ownerName: owner.name,
        ownerEmail: owner.email,
        organizations: [],
      } satisfies OwnerGroupRow)

    existing.organizations.push({
      id: org.id,
      name: org.name,
      membersCount: inferMembersCount(org),
      isActive: orgIsActive(org),
    })
    map.set(key, existing)
  }

  return Array.from(map.values())
    .map((g) => ({
      ...g,
      organizations: [...g.organizations].sort((a, b) =>
        a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }),
      ),
    }))
    .sort((a, b) => {
      const aUnknown = a.ownerKey === 'unknown'
      const bUnknown = b.ownerKey === 'unknown'
      if (aUnknown !== bUnknown) return aUnknown ? 1 : -1
      return a.ownerEmail.localeCompare(b.ownerEmail, 'fr', { sensitivity: 'base' })
    })
}

export default function OwnersPage() {
  const navigate = useNavigate()
  const [orgs, setOrgs] = useState<ApiOrganization[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [togglingId, setTogglingId] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch<LaravelPaginator<ApiOrganization>>(
        '/Admin/organizations?per_page=500',
      )
      setOrgs(res.data ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chargement impossible.')
      setOrgs([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const t = requestAnimationFrame(() => {
      void load()
    })
    return () => cancelAnimationFrame(t)
  }, [load])

  const groups = useMemo(() => buildGroups(orgs), [orgs])

  const filteredGroups = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return groups
    const match = (v: string) => v.toLowerCase().includes(s)

    return groups
      .map((g) => {
        const orgsFiltered = g.organizations.filter((o) => match(o.name))
        const ownerMatched = match(g.ownerName) || match(g.ownerEmail)
        if (ownerMatched) return g
        if (orgsFiltered.length === 0) return null
        return { ...g, organizations: orgsFiltered }
      })
      .filter(Boolean) as OwnerGroupRow[]
  }, [groups, q])

  const exportRows = useMemo((): ExportCell[][] => {
    const out: ExportCell[][] = []
    for (const g of filteredGroups) {
      for (const o of g.organizations) {
        out.push([g.ownerName, g.ownerEmail, o.name, o.membersCount ?? '—'])
      }
    }
    return out
  }, [filteredGroups])

  async function handleToggleActive(orgId: number) {
    const current = orgs.find((o) => o.id === orgId)
    if (!current) return
    const next = !orgIsActive(current)
    setTogglingId(orgId)
    setError(null)
    try {
      const updated = await apiFetch<ApiOrganization>(`/Admin/organizations/${orgId}`, {
        method: 'PATCH',
        json: { is_active: next },
      })
      setOrgs((prev) =>
        prev.map((o) => (o.id === orgId ? { ...o, ...updated } : o)),
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Mise à jour du statut impossible.')
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <div className="ml-64 min-h-screen flex-1 bg-[#EFF6FF] p-8">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Propriétaires</h1>
          <p className="mt-1 text-gray-600">
            Liste des propriétaires et des organisations qu’ils gèrent.
          </p>
        </div>
      </header>

      {error && (
        <div
          className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="relative min-w-0 max-w-md flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher par propriétaire ou organisation…"
              className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-[#3B82F6] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
            />
          </div>
          <TableExportButton
            filename="proprietaires"
            title="Propriétaires"
            headers={[...OWNER_EXPORT_HEADERS]}
            rows={exportRows}
          />
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="px-6 py-12 text-center text-gray-500">Chargement…</div>
          ) : (
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-gray-600">
                  <th className="px-6 py-3 font-semibold">Nom</th>
                  <th className="px-6 py-3 font-semibold">E-mail</th>
                  <th className="px-6 py-3 font-semibold">Organisation</th>
                  <th className="px-6 py-3 font-semibold">Membres</th>
                  <th className="px-6 py-3 font-semibold text-center">Activée</th>
                  <th className="px-6 py-3 text-right font-semibold">Détail</th>
                </tr>
              </thead>
              <tbody>
                {filteredGroups.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                      {orgs.length === 0
                        ? 'Aucune organisation (donc aucun propriétaire).'
                        : 'Aucun résultat pour cette recherche.'}
                    </td>
                  </tr>
                ) : (
                  filteredGroups.flatMap((g) =>
                    g.organizations.map((org, idx) => {
                      const isFirst = idx === 0
                      const rowSpan = g.organizations.length
                      return (
                        <tr
                          key={`${g.ownerKey}:${org.id}`}
                          className="border-b border-gray-100 last:border-0"
                        >
                          {isFirst && (
                            <td
                              rowSpan={rowSpan}
                              className="px-6 py-4 align-top font-medium text-gray-900"
                            >
                              <div className="flex items-start gap-3">
                                <div className="min-w-0">
                                  <div className="truncate">
                                    {g.ownerId != null ? (
                                      <Link
                                        to={`/users/${g.ownerId}`}
                                        className="text-[#3B82F6] hover:underline"
                                      >
                                        {asText(g.ownerName)}
                                      </Link>
                                    ) : (
                                      asText(g.ownerName)
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                          )}
                          {isFirst && (
                            <td
                              rowSpan={rowSpan}
                              className="px-6 py-4 align-top break-all text-gray-700"
                            >
                              {asText(g.ownerEmail)}
                            </td>
                          )}

                          <td className="px-6 py-4 font-medium text-gray-900">
                            <Link
                              to={`/organizations/${org.id}`}
                              className="text-[#3B82F6] hover:underline"
                            >
                              {org.name}
                            </Link>
                          </td>
                          <td className="px-6 py-4 text-gray-700">
                            {org.membersCount ?? '—'}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex justify-center">
                              <OrgActiveSwitch
                                isActive={org.isActive}
                                disabled={togglingId === org.id}
                                onToggle={() => void handleToggleActive(org.id)}
                              />
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={() => navigate(`/organizations/${org.id}`)}
                                aria-label={`Voir la fiche : ${org.name}`}
                                title="Voir la fiche"
                                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-[#3B82F6] hover:bg-blue-50"
                              >
                                <Eye className="h-4 w-4" aria-hidden />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    }),
                  )
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
