import { useCallback, useEffect, useState } from 'react'
import {
  ServerCrash,
  AlertCircle,
  AlertTriangle,
  Database,
  RefreshCw,
  Trash2,
  Copy,
  Check,
  Eye,
  Search,
  X,
} from 'lucide-react'
import Swal from 'sweetalert2'
import AdminPageHeader from '../../components/AdminPageHeader'
import AdminModal from '../../components/AdminModal'
import DataTable, { type Action, type Column } from '../../components/DataTable'
import { apiFetch } from '../../lib/api'
import type {
  ApiRequestLog,
  ApiRequestLogDetail,
  ApiRequestLogStats,
  LaravelPaginator,
} from '../../types/apiAdmin'

const STATUS_CLASSES = [
  { value: '', label: 'Toutes les erreurs' },
  { value: '5', label: 'Erreurs serveur (5xx)' },
  { value: '4', label: 'Erreurs de requête (4xx)' },
] as const

const CLIENT_TYPES = [
  { value: 'ALL', label: 'Toutes les sources' },
  { value: 'pos', label: 'Caisse (POS)' },
  { value: 'web', label: 'Navigateur (web)' },
  { value: 'autre', label: 'Autre' },
  { value: 'inconnu', label: 'Inconnue' },
] as const

const PERIODS = [
  { value: 24, label: 'Dernières 24 h' },
  { value: 24 * 7, label: '7 derniers jours' },
  { value: 24 * 30, label: '30 derniers jours' },
] as const

function statusBadge(status: number) {
  const cls =
    status >= 500
      ? 'bg-red-100 text-red-800'
      : status === 401 || status === 403
        ? 'bg-amber-100 text-amber-800'
        : 'bg-orange-100 text-orange-800'
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${cls}`}>
      {status}
    </span>
  )
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString('fr-FR')
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 break-words text-xs font-semibold text-gray-900">{value || '—'}</p>
    </div>
  )
}

export default function RequestLogsPage() {
  const [logs, setLogs] = useState<ApiRequestLog[]>([])
  const [stats, setStats] = useState<ApiRequestLogStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filtres
  const [statusClass, setStatusClass] = useState('')
  const [clientType, setClientType] = useState('ALL')
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [fingerprint, setFingerprint] = useState('')
  const [periodHours, setPeriodHours] = useState<number>(24)

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Détail
  const [detail, setDetail] = useState<ApiRequestLogDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [pruning, setPruning] = useState(false)

  const loadStats = useCallback(() => {
    apiFetch<ApiRequestLogStats>(`/Admin/request-logs/stats?hours=${periodHours}`)
      .then(setStats)
      .catch(() => setStats(null))
  }, [periodHours])

  const loadLogs = useCallback(
    (page = 1) => {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('per_page', '50')
      if (statusClass) params.set('status_class', statusClass)
      if (clientType !== 'ALL') params.set('client_type', clientType)
      if (searchTerm.trim()) params.set('q', searchTerm.trim())
      if (dateFrom) params.set('date_from', dateFrom)
      if (dateTo) params.set('date_to', dateTo)
      if (fingerprint) params.set('fingerprint', fingerprint)

      apiFetch<LaravelPaginator<ApiRequestLog>>(`/Admin/request-logs?${params.toString()}`)
        .then((res) => {
          setLogs(res.data ?? [])
          setCurrentPage(res.current_page ?? 1)
          setTotalPages(res.last_page ?? 1)
          setTotalCount(res.total ?? 0)
        })
        .catch((err) => {
          setError(
            err instanceof Error ? err.message : 'Impossible de charger le journal des requêtes.'
          )
        })
        .finally(() => setLoading(false))
    },
    [statusClass, clientType, searchTerm, dateFrom, dateTo, fingerprint]
  )

  useEffect(() => {
    loadStats()
  }, [loadStats])

  useEffect(() => {
    loadLogs(1)
  }, [loadLogs])

  const openDetail = (log: ApiRequestLog) => {
    setDetailLoading(true)
    setDetail({ data: log, same_error: null })
    apiFetch<ApiRequestLogDetail>(`/Admin/request-logs/${log.id}`)
      .then(setDetail)
      .catch(() => undefined)
      .finally(() => setDetailLoading(false))
  }

  const copy = (key: string, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  const handlePrune = async () => {
    const result = await Swal.fire({
      title: 'Supprimer les anciennes lignes ?',
      text: 'Les lignes de plus de 30 jours seront supprimées. Le nettoyage automatique fait déjà cela chaque nuit.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'Oui, supprimer',
      cancelButtonText: 'Annuler',
    })
    if (!result.isConfirmed) return

    try {
      setPruning(true)
      const res = await apiFetch<{ deleted: number }>('/Admin/request-logs/prune', {
        method: 'DELETE',
        json: { days: 30 },
      })
      Swal.fire({
        icon: 'success',
        title: 'Nettoyage terminé',
        text: `${res.deleted} ligne(s) supprimée(s).`,
        timer: 2500,
        showConfirmButton: false,
      })
      loadStats()
      loadLogs(1)
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Erreur',
        text: err instanceof Error ? err.message : 'Impossible de nettoyer le journal.',
      })
    } finally {
      setPruning(false)
    }
  }

  const columns: Column<ApiRequestLog>[] = [
    {
      key: 'created_at',
      label: 'Date / Heure',
      nowrap: true,
      render: (_v, item) => (
        <span className="font-mono text-xs text-gray-600">{formatDate(item.created_at)}</span>
      ),
    },
    {
      key: 'status_code',
      label: 'Statut',
      nowrap: true,
      render: (_v, item) => statusBadge(item.status_code),
    },
    {
      key: 'endpoint',
      label: 'Requête',
      render: (_v, item) => (
        <div className="max-w-xs">
          <p className="font-mono text-xs font-semibold text-gray-900">
            <span className="mr-1.5 rounded bg-gray-100 px-1.5 py-0.5 text-[10px]">
              {item.method}
            </span>
            {item.endpoint}
          </p>
          {item.action && (
            <p className="mt-0.5 truncate font-mono text-[11px] text-gray-500">{item.action}</p>
          )}
        </div>
      ),
    },
    {
      key: 'user_name',
      label: 'Qui',
      render: (_v, item) => (
        <div className="text-xs">
          <p className="font-medium text-gray-800">
            {item.user_name || item.user_email || (item.user_id ? `#${item.user_id}` : 'Non connecté')}
          </p>
          <p className="text-gray-500">
            {item.organization?.name ??
              (item.organization_id ? `Organisation #${item.organization_id}` : '—')}
          </p>
        </div>
      ),
    },
    {
      key: 'client_type',
      label: 'Où',
      render: (_v, item) => (
        <div className="text-xs text-gray-600">
          <p className="font-medium uppercase">{item.client_type ?? '—'}</p>
          <p className="text-gray-500">
            {[
              item.cash_register_id
                ? (item.cash_register?.name ?? `Caisse #${item.cash_register_id}`)
                : null,
              item.store_id ? (item.store?.name ?? `Magasin #${item.store_id}`) : null,
              item.app_version,
            ]
              .filter(Boolean)
              .join(' · ') || '—'}
          </p>
        </div>
      ),
    },
    {
      key: 'error_message',
      label: 'Message',
      render: (_v, item) => (
        <div className="max-w-md">
          <p className="line-clamp-2 text-xs text-gray-800">{item.error_message || '—'}</p>
          {item.exception_class && (
            <p className="mt-0.5 truncate font-mono text-[11px] text-red-600">
              {item.exception_class}
            </p>
          )}
        </div>
      ),
    },
  ]

  const actions: Action<ApiRequestLog>[] = [
    { label: 'Inspecter', icon: Eye, onClick: (item) => openDetail(item) },
  ]

  const log = detail?.data

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={
          <span className="flex items-center gap-3">
            <ServerCrash className="h-8 w-8 text-blue-600" />
            Journal des requêtes
          </span>
        }
        action={
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-xs font-medium text-gray-500">
              Compteurs :
              <select
                value={periodHours}
                onChange={(e) => setPeriodHours(Number(e.target.value))}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none"
              >
                {PERIODS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={handlePrune}
              disabled={pruning}
              className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-700 shadow-sm transition hover:bg-red-100 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              Nettoyer (&gt; 30 jours)
            </button>
            <button
              type="button"
              onClick={() => {
                loadStats()
                loadLogs(currentPage)
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
            >
              <RefreshCw className="h-4 w-4" />
              Actualiser
            </button>
          </div>
        }
      />

      {/* KPI */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">Erreurs sur la période</span>
            <AlertCircle className="h-4 w-4 text-gray-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">{stats?.in_period ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">Erreurs serveur (5xx)</span>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-red-600">{stats?.server_errors ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">Erreurs de requête (4xx)</span>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-600">{stats?.client_errors ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">Lignes en base</span>
            <Database className="h-4 w-4 text-gray-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">{stats?.total_rows ?? 0}</p>
        </div>
      </div>

      {/* Erreurs les plus fréquentes */}
      {stats && stats.top_errors.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="mb-3 text-sm font-semibold text-gray-800">
            Erreurs les plus fréquentes sur la période
          </p>
          <div className="space-y-2">
            {stats.top_errors.map((t) => (
              <button
                key={t.fingerprint}
                type="button"
                onClick={() => setFingerprint(t.fingerprint)}
                className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition hover:bg-blue-50 ${
                  fingerprint === t.fingerprint
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-gray-100 bg-gray-50/50'
                }`}
              >
                <span className="w-14 shrink-0 rounded-full bg-gray-900 px-2 py-0.5 text-center text-xs font-bold text-white">
                  × {t.occurrences}
                </span>
                {t.sample && statusBadge(t.sample.status_code)}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-mono text-xs font-semibold text-gray-900">
                    {t.sample?.method} {t.sample?.endpoint}
                  </span>
                  <span className="block truncate text-[11px] text-gray-500">
                    {t.sample?.error_message || t.sample?.exception_class || '—'}
                  </span>
                </span>
                <span className="hidden shrink-0 text-[11px] text-gray-400 sm:block">
                  dernière : {formatDate(t.last_seen)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <select
          value={statusClass}
          onChange={(e) => setStatusClass(e.target.value)}
          className="rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 text-xs font-medium text-gray-700 focus:border-blue-500 focus:bg-white focus:outline-none"
        >
          {STATUS_CLASSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        <select
          value={clientType}
          onChange={(e) => setClientType(e.target.value)}
          className="rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 text-xs font-medium text-gray-700 focus:border-blue-500 focus:bg-white focus:outline-none"
        >
          {CLIENT_TYPES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          aria-label="Du"
          className="rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 text-xs text-gray-700 focus:border-blue-500 focus:bg-white focus:outline-none"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          aria-label="Au"
          className="rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 text-xs text-gray-700 focus:border-blue-500 focus:bg-white focus:outline-none"
        />

        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Chemin, action, message, utilisateur, identifiant de requête…"
            className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2 pl-9 pr-3 text-xs font-medium text-gray-700 placeholder-gray-400 focus:border-blue-500 focus:bg-white focus:outline-none"
          />
        </div>

        {fingerprint && (
          <button
            type="button"
            onClick={() => setFingerprint('')}
            className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700"
          >
            Une seule erreur
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <DataTable
        columns={columns}
        data={logs}
        actions={actions}
        loading={loading}
        searchable={false}
        serverPagination={{
          currentPage,
          lastPage: totalPages,
          total: totalCount,
          onPageChange: (p) => loadLogs(p),
        }}
        emptyMessage="Aucune erreur ne correspond à ces critères."
      />

      {/* Détail */}
      {log && (
        <AdminModal
          open
          title={`Erreur ${log.status_code} — ${log.method} ${log.endpoint}`}
          onClose={() => setDetail(null)}
          wide
        >
          <div className="space-y-4 text-sm">
            {detail?.same_error && detail.same_error.count > 1 && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                <span>
                  Cette erreur s'est produite <strong>{detail.same_error.count} fois</strong> (de{' '}
                  {formatDate(detail.same_error.first_seen)} à{' '}
                  {formatDate(detail.same_error.last_seen)}).
                </span>
                {log.fingerprint && (
                  <button
                    type="button"
                    onClick={() => {
                      setFingerprint(log.fingerprint ?? '')
                      setDetail(null)
                    }}
                    className="rounded-lg border border-amber-300 bg-white px-2.5 py-1 font-semibold text-amber-800 hover:bg-amber-100"
                  >
                    Voir toutes les occurrences
                  </button>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 rounded-xl bg-gray-50 p-4 sm:grid-cols-4">
              <Field label="Date / heure" value={formatDate(log.created_at)} />
              <Field label="Statut" value={statusBadge(log.status_code)} />
              <Field
                label="Durée"
                value={log.duration_ms != null ? `${log.duration_ms} ms` : null}
              />
              <Field
                label="Identifiant de requête"
                value={
                  log.request_id ? (
                    <button
                      type="button"
                      onClick={() => copy('rid', log.request_id ?? '')}
                      className="inline-flex items-center gap-1 font-mono text-[11px] text-blue-700 hover:underline"
                    >
                      {copied === 'rid' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      {log.request_id.slice(0, 8)}…
                    </button>
                  ) : null
                }
              />
              <Field
                label="Qui"
                value={[log.user_name, log.user_email].filter(Boolean).join(' · ') || null}
              />
              <Field
                label="Organisation"
                value={log.organization?.name ?? (log.organization_id ? `#${log.organization_id}` : null)}
              />
              <Field
                label="Magasin"
                value={log.store_id ? (log.store?.name ?? `#${log.store_id}`) : null}
              />
              <Field
                label="Caisse"
                value={
                  log.cash_register_id
                    ? (log.cash_register?.name ?? `#${log.cash_register_id}`)
                    : null
                }
              />
              <Field label="Appareil (jeton)" value={log.token_id ? `#${log.token_id}` : null} />
              <Field label="Source" value={log.client_type} />
              <Field
                label="Application"
                value={[log.platform, log.app_version].filter(Boolean).join(' ') || null}
              />
              <Field label="Adresse IP" value={log.ip_address} />
              <Field label="Route" value={log.route_name} />
              <Field label="Code qui a traité l'appel" value={log.action} />
              <Field label="Exception" value={log.exception_class} />
              <Field label="Emplacement dans le code" value={log.exception_location} />
            </div>

            {log.user_agent && (
              <p className="break-words font-mono text-[11px] text-gray-500">
                User-agent : {log.user_agent}
              </p>
            )}

            <div>
              <p className="mb-1 text-xs font-semibold text-gray-700">Message</p>
              <div className="overflow-x-auto whitespace-pre-wrap rounded-xl border border-gray-200 bg-gray-900 p-3.5 font-mono text-xs text-green-400">
                {log.error_message || '—'}
              </div>
            </div>

            {log.stack_trace && (
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-700">Trace d'exécution</p>
                  <button
                    type="button"
                    onClick={() => copy('trace', log.stack_trace ?? '')}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-600 shadow-sm hover:bg-gray-50"
                  >
                    {copied === 'trace' ? (
                      <span className="font-semibold text-emerald-600">Copié !</span>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Copier
                      </>
                    )}
                  </button>
                </div>
                <pre className="max-h-64 overflow-auto rounded-xl border border-gray-200 bg-gray-900 p-3.5 font-mono text-xs leading-relaxed text-gray-300">
                  {log.stack_trace}
                </pre>
              </div>
            )}

            {detailLoading && !log.request_payload && (
              <p className="text-xs text-gray-400">Chargement du détail…</p>
            )}

            {log.request_payload && (
              <div>
                <p className="mb-1 text-xs font-semibold text-gray-700">
                  Contenu envoyé (valeurs sensibles masquées)
                </p>
                <pre className="max-h-56 overflow-auto rounded-xl border border-gray-200 bg-gray-50 p-3.5 font-mono text-xs text-gray-800">
                  {JSON.stringify(log.request_payload, null, 2)}
                </pre>
              </div>
            )}

            {log.response_payload && (
              <div>
                <p className="mb-1 text-xs font-semibold text-gray-700">Réponse renvoyée</p>
                <pre className="max-h-56 overflow-auto rounded-xl border border-gray-200 bg-gray-50 p-3.5 font-mono text-xs text-gray-800">
                  {JSON.stringify(log.response_payload, null, 2)}
                </pre>
              </div>
            )}

            <div className="mt-6 flex items-center justify-end border-t border-gray-200 pt-4">
              <button
                type="button"
                onClick={() => setDetail(null)}
                className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
              >
                Fermer
              </button>
            </div>
          </div>
        </AdminModal>
      )}
    </div>
  )
}
