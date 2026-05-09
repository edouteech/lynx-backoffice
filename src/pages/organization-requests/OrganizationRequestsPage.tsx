import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Eye, Search, X } from 'lucide-react'
import TableExportButton from '../../components/TableExportButton'
import type { ExportCell } from '../../lib/tableExport'
import { apiFetch } from '../../lib/api'
import type {
  ApiOrgRegistrationRequest,
  LaravelPaginator,
} from '../../types/apiAdmin'
import { formatDate, statusBadge, statusLabel } from './organizationRequestUi'

const EXPORT_HEADERS = [
  'Organisation',
  'Contact',
  'E-mail',
  'Soumis le',
  'Statut',
] as const

export default function OrganizationRequestsPage() {
  const [rows, setRows] = useState<ApiOrgRegistrationRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [busyId, setBusyId] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch<LaravelPaginator<ApiOrgRegistrationRequest>>(
        '/Admin/organization-registration-requests?per_page=100',
      )
      setRows(res.data ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chargement impossible.')
      setRows([])
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

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return rows
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(s) ||
        r.email.toLowerCase().includes(s) ||
        (r.owner_name ?? '').toLowerCase().includes(s),
    )
  }, [rows, q])

  const exportRows = useMemo((): ExportCell[][] => {
    return filtered.map((r) => [
      r.name,
      r.owner_name ?? '—',
      r.email,
      formatDate(r.created_at),
      statusLabel(r.status),
    ])
  }, [filtered])

  async function handleApprove(id: number) {
    if (!window.confirm('Approuver cette demande et créer le compte ?')) return
    setBusyId(id)
    setError(null)
    try {
      await apiFetch(`/Admin/organization-registration-requests/${id}/approve`, {
        method: 'POST',
      })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Approbation impossible.')
    } finally {
      setBusyId(null)
    }
  }

  async function handleReject(id: number) {
    const reason = window.prompt('Motif du refus (optionnel) :') ?? ''
    setBusyId(id)
    setError(null)
    try {
      await apiFetch(`/Admin/organization-registration-requests/${id}/reject`, {
        method: 'POST',
        json: { rejection_reason: reason.trim() || null },
      })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Refus impossible.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="ml-64 min-h-screen flex-1 bg-[#EFF6FF] p-8">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">
            Demandes de création d’organisation
          </h1>
          <p className="mt-1 text-gray-600">
            Les entreprises qui demandent l’ouverture d’un compte apparaissent ici
            jusqu’à validation ou refus.
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
              placeholder="Rechercher une demande…"
              className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-[#3B82F6] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
              aria-label="Rechercher une demande"
            />
          </div>
          <TableExportButton
            filename="demandes-organisations"
            title="Demandes de création d’organisation"
            headers={[...EXPORT_HEADERS]}
            rows={exportRows}
          />
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="px-6 py-12 text-center text-gray-500">Chargement…</div>
          ) : (
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-gray-600">
                  <th className="px-6 py-3 font-semibold">Organisation</th>
                  <th className="px-6 py-3 font-semibold">Contact</th>
                  <th className="px-6 py-3 font-semibold">Soumis le</th>
                  <th className="px-6 py-3 font-semibold">Statut</th>
                  <th className="px-6 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-10 text-center text-gray-500"
                    >
                      Aucune demande.
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => (
                    <tr
                      key={r.id}
                      className="border-b border-gray-100 last:border-0"
                    >
                      <td className="px-6 py-4 font-medium text-gray-900">
                        <Link
                          to={`/organization-requests/${r.id}`}
                          className="text-[#3B82F6] hover:underline"
                        >
                          {r.name}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-gray-700">
                        <div>{r.owner_name ?? '—'}</div>
                        <div className="text-xs text-gray-500">{r.email}</div>
                      </td>
                      <td className="px-6 py-4 text-gray-700">
                        {formatDate(r.created_at)}
                      </td>
                      <td className="px-6 py-4">{statusBadge(r.status)}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Link
                            to={`/organization-requests/${r.id}`}
                            aria-label={`Voir la fiche : ${r.name}`}
                            title={`Voir la fiche : ${r.name}`}
                            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#3B82F6]/30 bg-[#3B82F6] text-white shadow-sm transition-colors hover:bg-[#2563EB]"
                          >
                            <Eye className="h-4 w-4" aria-hidden />
                          </Link>
                          {r.status === 'pending' && (
                            <>
                              <button
                                type="button"
                                disabled={busyId === r.id}
                                onClick={() => void handleApprove(r.id)}
                                aria-label="Approuver cette demande"
                                title="Approuver"
                                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <Check className="h-4 w-4" aria-hidden />
                              </button>
                              <button
                                type="button"
                                disabled={busyId === r.id}
                                onClick={() => void handleReject(r.id)}
                                aria-label="Refuser cette demande"
                                title="Refuser"
                                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-red-200 bg-white text-red-800 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <X className="h-4 w-4" aria-hidden />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
