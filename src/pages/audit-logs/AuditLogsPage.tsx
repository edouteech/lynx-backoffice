import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  Eye,
  Info,
  RefreshCw,
  Wifi,
  WifiOff,
  Filter,
  RotateCcw,
  Trash2,
} from 'lucide-react'
import Swal from 'sweetalert2'
import AdminPageHeader from '../../components/AdminPageHeader'
import AdminModal from '../../components/AdminModal'
import DataTable, { type Action, type Column } from '../../components/DataTable'
import { DateRangePicker } from '../../components/DateRangePicker'
import { apiFetch } from '../../lib/api'
import type {
  ApiOrganization,
  ApiPosLog,
  LaravelPaginator,
} from '../../types/apiAdmin'

export type PosLogMetrics = {
  total_period: number
  errors_period: number
  warnings_period: number
  info_period: number
  logs_last_24h: number
  total_logs?: number
  errors_last_24h?: number
  warnings_last_24h?: number
}

const LOG_LEVELS = [
  { value: 'ALL', label: 'Tous les niveaux' },
  { value: 'CRITICAL', label: 'Critique (CRITICAL)' },
  { value: 'ERROR', label: 'Erreur (ERROR)' },
  { value: 'WARNING', label: 'Avertissement (WARNING)' },
  { value: 'INFO', label: 'Information (INFO)' },
  { value: 'DEBUG', label: 'Debug (DEBUG)' },
] as const

const LOG_CATEGORIES = [
  { value: 'ALL', label: 'Toutes les catégories' },
  { value: 'system', label: 'Système & Crashs' },
  { value: 'hardware', label: 'Matériel & Imprimante' },
  { value: 'checkout', label: 'Encaissement & Ventes' },
  { value: 'shift', label: 'Sessions de caisse' },
  { value: 'cart', label: 'Panier & Remises' },
  { value: 'auth', label: 'Connexion & PIN' },
  { value: 'refund', label: 'Remboursements & Rachats' },
  { value: 'journal', label: 'Journal & Annulations' },
  { value: 'fiscal', label: 'Fiscalité DGI' },
  { value: 'sync', label: 'Synchronisation' },
  { value: 'workspace', label: 'Espace de travail' },
  { value: 'kds', label: 'Commandes cuisine (KDS)' },
] as const

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function formatInputDateTime(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function defaultYearRange(): { from: string; to: string } {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0)
  const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999)
  return { from: formatInputDateTime(start), to: formatInputDateTime(end) }
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<ApiPosLog[]>([])
  const [stats, setStats] = useState<PosLogMetrics | null>(null)
  const [organizations, setOrganizations] = useState<ApiOrganization[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filtres
  const [selectedOrgId, setSelectedOrgId] = useState<string>('')
  const [selectedLevel, setSelectedLevel] = useState<string>('ALL')
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')
  const [searchTerm, setSearchTerm] = useState('')
  const [range, setRange] = useState<{ from: string; to: string }>(defaultYearRange)

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Inspection détail modal
  const [inspectLog, setInspectLog] = useState<ApiPosLog | null>(null)
  const [copiedTrace, setCopiedTrace] = useState(false)

  // Charger la liste des organisations pour le filtre
  useEffect(() => {
    apiFetch<LaravelPaginator<ApiOrganization>>('/Admin/organizations?per_page=100')
      .then((res) => setOrganizations(res.data ?? []))
      .catch(() => setOrganizations([]))
  }, [])

  // Charger les stats dynamiques filtrées
  const loadStats = useCallback(() => {
    const params = new URLSearchParams()
    if (selectedOrgId) params.set('organization_id', selectedOrgId)
    if (selectedCategory !== 'ALL') params.set('category', selectedCategory)
    if (searchTerm.trim()) params.set('q', searchTerm.trim())
    if (range.from) params.set('date_from', range.from)
    if (range.to) params.set('date_to', range.to)

    apiFetch<PosLogMetrics>(`/Admin/logs/stats?${params.toString()}`)
      .then(setStats)
      .catch(() => setStats(null))
  }, [selectedOrgId, selectedCategory, searchTerm, range.from, range.to])

  // Charger les logs avec filtres
  const loadLogs = useCallback(
    async (page = 1) => {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams()
        params.set('page', String(page))
        params.set('per_page', '30')

        if (selectedOrgId) params.set('organization_id', selectedOrgId)
        if (selectedLevel !== 'ALL') params.set('level', selectedLevel)
        if (selectedCategory !== 'ALL') params.set('category', selectedCategory)
        if (searchTerm.trim()) params.set('q', searchTerm.trim())
        if (range.from) params.set('date_from', range.from)
        if (range.to) params.set('date_to', range.to)

        const res = await apiFetch<LaravelPaginator<ApiPosLog>>(`/Admin/logs?${params.toString()}`)
        setLogs(res.data ?? [])
        setCurrentPage(res.current_page ?? 1)
        setTotalPages(res.last_page ?? 1)
        setTotalCount(res.total ?? 0)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Impossible de charger les logs.')
        setLogs([])
      } finally {
        setLoading(false)
      }
    },
    [selectedOrgId, selectedLevel, selectedCategory, searchTerm, range.from, range.to]
  )

  useEffect(() => {
    loadLogs(1)
    loadStats()
  }, [loadLogs, loadStats])

  function handleFilterSubmit(e: React.FormEvent) {
    e.preventDefault()
    loadLogs(1)
    loadStats()
  }

  function handleResetFilters() {
    setSelectedOrgId('')
    setSelectedLevel('ALL')
    setSelectedCategory('ALL')
    setSearchTerm('')
    setRange(defaultYearRange())
  }

  async function handlePurge() {
    const { value: formValues } = await Swal.fire({
      title: 'Purger les logs POS',
      html: `
        <div style="text-align: left; font-size: 14px; display: flex; flex-direction: column; gap: 14px;">
          <div>
            <label style="display: block; font-weight: 600; margin-bottom: 5px; color: #374151;">Ancienneté des logs à purger :</label>
            <select id="swal-prune-days" class="swal2-select" style="width: 100%; margin: 0; font-size: 14px; height: 38px; border-radius: 8px;">
              <option value="7">Logs plus anciens que 7 jours</option>
              <option value="15">Logs plus anciens que 15 jours</option>
              <option value="30" selected>Logs plus anciens que 30 jours (Recommandé)</option>
              <option value="90">Logs plus anciens que 90 jours</option>
              <option value="0">Tous les logs enregistrés (Purge totale)</option>
            </select>
          </div>
          <div>
            <label style="display: block; font-weight: 600; margin-bottom: 5px; color: #374151;">Niveau de sévérité ciblé :</label>
            <select id="swal-prune-level" class="swal2-select" style="width: 100%; margin: 0; font-size: 14px; height: 38px; border-radius: 8px;">
              <option value="ALL" selected>Tous les niveaux (y compris erreurs & crashs)</option>
              <option value="DEBUG">DEBUG uniquement</option>
              <option value="INFO">INFO uniquement</option>
              <option value="WARNING">WARNING uniquement</option>
            </select>
          </div>
        </div>
      `,
      focusConfirm: false,
      icon: 'info',
      showCancelButton: true,
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Continuer ➔',
      cancelButtonText: 'Annuler',
      preConfirm: () => {
        const days = (document.getElementById('swal-prune-days') as HTMLSelectElement).value
        const level = (document.getElementById('swal-prune-level') as HTMLSelectElement).value
        return { days, level }
      },
    })

    if (!formValues) return

    // 2ème confirmation de sécurité avant exécution irréversible
    const daysLabel =
      formValues.days === '0'
        ? 'TOUS les logs enregistrés (Purge intégrale)'
        : `Les logs de plus de ${formValues.days} jours`

    const levelLabel =
      formValues.level === 'ALL'
        ? 'Tous les niveaux (DEBUG, INFO, WARNING, ERROR, CRITICAL)'
        : `Uniquement le niveau ${formValues.level}`

    const orgLabel = selectedOrgId
      ? (organizations.find((o) => String(o.id) === selectedOrgId)?.name ?? `Org #${selectedOrgId}`)
      : 'Toutes les organisations'

    const secondConfirm = await Swal.fire({
      title: 'Confirmation définitive requise',
      html: `
        <div style="text-align: left; font-size: 14px; line-height: 1.6; color: #374151;">
          <p style="margin-bottom: 12px; font-weight: 600; color: #b91c1c;">
            ⚠️ Attention : Cette action est irréversible et supprimera définitivement les données de télémétrie sélectionnées.
          </p>
          <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px; margin-bottom: 12px;">
            <ul style="margin: 0; padding-left: 20px; list-style-type: disc;">
              <li><strong>Période ciblée :</strong> ${daysLabel}</li>
              <li><strong>Sévérité :</strong> ${levelLabel}</li>
              <li><strong>Organisation :</strong> ${orgLabel}</li>
            </ul>
          </div>
          <p style="font-weight: 500;">Êtes-vous absolument sûr de vouloir purger ces enregistrements ?</p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Oui, purger définitivement',
      cancelButtonText: 'Annuler',
    })

    if (!secondConfirm.isConfirmed) return

    try {
      const params = new URLSearchParams()
      params.set('days', formValues.days)
      if (formValues.level !== 'ALL') {
        params.set('level', formValues.level)
      }
      if (selectedOrgId) {
        params.set('organization_id', selectedOrgId)
      }

      const res = await apiFetch<{ success: boolean; deleted: number; message: string }>(
        `/Admin/logs/prune?${params.toString()}`,
        { method: 'DELETE' }
      )

      await loadLogs(1)
      loadStats()
      await Swal.fire({
        title: 'Purge effectuée',
        text: res.message || `${res.deleted} logs supprimés.`,
        icon: 'success',
      })
    } catch (e) {
      await Swal.fire('Erreur', e instanceof Error ? e.message : 'Échec de la purge.', 'error')
    }
  }

  function handleCopyTrace(trace: string) {
    navigator.clipboard.writeText(trace)
    setCopiedTrace(true)
    setTimeout(() => setCopiedTrace(false), 2000)
  }

  function getLevelBadge(level: string) {
    const l = level.toUpperCase()
    switch (l) {
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-800">
            <AlertCircle className="h-3.5 w-3.5 text-rose-600" />
            CRITICAL
          </span>
        )
      case 'ERROR':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
            <AlertCircle className="h-3.5 w-3.5 text-red-500" />
            ERROR
          </span>
        )
      case 'WARNING':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
            WARNING
          </span>
        )
      case 'INFO':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-semibold text-sky-800">
            <Info className="h-3.5 w-3.5 text-sky-600" />
            INFO
          </span>
        )
      case 'DEBUG':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
            DEBUG
          </span>
        )
    }
  }

  function formatDate(iso: string) {
    try {
      const d = new Date(iso)
      if (isNaN(d.getTime())) return iso
      return new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(d)
    } catch {
      return iso
    }
  }

  function formatFullDate(iso: string) {
    try {
      const d = new Date(iso)
      if (isNaN(d.getTime())) return iso
      return new Intl.DateTimeFormat('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(d)
    } catch {
      return iso
    }
  }

  function timeAgo(iso: string) {
    try {
      const d = new Date(iso)
      const now = new Date()
      const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000)
      if (isNaN(diffSec) || diffSec < 0) return ''
      if (diffSec < 60) return "À l'instant"
      if (diffSec < 3600) return `Il y a ${Math.floor(diffSec / 60)} min`
      if (diffSec < 86400) return `Il y a ${Math.floor(diffSec / 3600)} h`
      const days = Math.floor(diffSec / 86400)
      return `Il y a ${days} jour${days > 1 ? 's' : ''}`
    } catch {
      return ''
    }
  }

  // Colonnes DataTable
  const columns = useMemo<Column<ApiPosLog>[]>(
    () => [
      {
        key: 'timestamp',
        label: 'Date / Heure',
        sortable: true,
        render: (_, log) => (
          <span className="font-mono text-xs text-gray-700">
            {formatDate(log.timestamp)}
          </span>
        ),
      },
      {
        key: 'level',
        label: 'Niveau',
        render: (_, log) => getLevelBadge(log.level),
      },
      {
        key: 'organization',
        label: 'Organisation & Magasin',
        render: (_, log) => (
          <div>
            <div className="font-medium text-gray-900">
              {log.organization?.name ?? (log.organization_id ? `Org #${log.organization_id}` : '—')}
            </div>
            {log.store?.name && (
              <div className="text-xs text-gray-500">{log.store.name}</div>
            )}
          </div>
        ),
      },
      {
        key: 'user_name',
        label: 'Caissier / Caisse',
        render: (_, log) => (
          <div>
            <div className="font-medium text-gray-900">
              {log.user_name ?? log.user?.name ?? '—'}
            </div>
            <div className="text-xs text-gray-500">
              {log.cash_register?.name ?? (log.register_id ? `Caisse #${log.register_id}` : 'Sans caisse')}
              {log.period_code ? ` • ${log.period_code}` : ''}
            </div>
          </div>
        ),
      },
      {
        key: 'category',
        label: 'Catégorie & Action',
        render: (_, log) => {
          const cat = LOG_CATEGORIES.find((c) => c.value === log.category)
          return (
            <div>
              <span className="inline-block rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                {cat?.label ?? log.category}
              </span>
              <div className="mt-1 font-mono text-xs font-semibold text-gray-900">
                {log.action}
              </div>
            </div>
          )
        },
      },
      {
        key: 'is_online',
        label: 'Connectivité',
        render: (_, log) => (
          <div>
            <div className="flex items-center gap-1.5">
              {log.is_online ? (
                <span className="inline-flex items-center gap-1 text-emerald-600 font-medium text-xs">
                  <Wifi className="h-3.5 w-3.5" />
                  En ligne
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-gray-400 font-medium text-xs">
                  <WifiOff className="h-3.5 w-3.5" />
                  Hors-ligne
                </span>
              )}
            </div>
            <div className="text-gray-400 text-xs mt-0.5">
              {log.platform ? `${log.platform} ` : ''}
              {log.app_version ? `v${log.app_version}` : ''}
            </div>
          </div>
        ),
      },
      {
        key: 'error_message',
        label: 'Détails / Erreur',
        render: (_, log) => (
          <div className="max-w-xs truncate text-xs">
            {log.error_message ? (
              <span className="font-semibold text-red-600 truncate block">
                {log.error_message}
              </span>
            ) : log.details ? (
              <span className="font-mono text-gray-500 truncate block">
                {JSON.stringify(log.details)}
              </span>
            ) : (
              <span className="text-gray-400">—</span>
            )}
          </div>
        ),
      },
    ],
    []
  )

  // Actions DataTable
  const actions = useMemo<Action<ApiPosLog>[]>(
    () => [
      {
        label: 'Inspecter',
        icon: Eye,
        onClick: (log) => setInspectLog(log),
        variant: 'primary',
      },
    ],
    []
  )

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={
          <span className="flex items-center gap-2">
            <Activity className="h-8 w-8 text-blue-600" />
            Logs POS
          </span>
        }
        description="Surveillance en temps réel des terminaux caisses, détection des incidents, crashs et traçabilité des opérations de vente."
        action={
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handlePurge}
              className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100 transition-colors shadow-sm"
              title="Purger les logs anciens ou selon un niveau"
            >
              <Trash2 className="h-4 w-4 text-red-600" />
              Purger
            </button>

            <button
              type="button"
              onClick={() => {
                loadLogs(currentPage)
                loadStats()
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </button>
          </div>
        }
      />

      {/* 1. Barre de filtres (sans la recherche qui est intégrée au DataTable) */}
      <form
        onSubmit={handleFilterSubmit}
        className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
      >
        <div className="flex flex-wrap items-center gap-3">
          {/* Organisation */}
          <div className="min-w-[200px] flex-1 sm:flex-initial">
            <select
              value={selectedOrgId}
              onChange={(e) => setSelectedOrgId(e.target.value)}
              className="w-full rounded-xl border border-gray-300 py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Toutes les organisations</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>

          {/* Niveau */}
          <div className="min-w-[150px]">
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="w-full rounded-xl border border-gray-300 py-2 px-3 text-sm font-medium focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {LOG_LEVELS.map((lvl) => (
                <option key={lvl.value} value={lvl.value}>
                  {lvl.label}
                </option>
              ))}
            </select>
          </div>

          {/* Catégorie */}
          <div className="min-w-[180px]">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full rounded-xl border border-gray-300 py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {LOG_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Sélecteur de période DateRangePicker unifié */}
          <div>
            <DateRangePicker
              from={range.from}
              to={range.to}
              onRangeChange={(from, to) => setRange({ from, to })}
            />
          </div>

          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <Filter className="h-4 w-4" />
            Filtrer
          </button>

          {(selectedOrgId || selectedLevel !== 'ALL' || selectedCategory !== 'ALL' || searchTerm) && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900"
              title="Réinitialiser tous les filtres"
            >
              <RotateCcw className="h-4 w-4 text-gray-400" />
              Réinitialiser
            </button>
          )}
        </div>
      </form>

      {/* 2. Cartes KPI réactives aux filtres et à la période */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">Événements (période)</p>
            <Activity className="h-5 w-5 text-gray-400" />
          </div>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {stats ? (stats.total_period ?? stats.total_logs ?? 0).toLocaleString() : '—'}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">Activité (dernières 24h)</p>
            <CheckCircle2 className="h-5 w-5 text-blue-500" />
          </div>
          <p className="mt-2 text-3xl font-bold text-blue-600">
            {stats ? stats.logs_last_24h.toLocaleString() : '—'}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">Erreurs & Crashs</p>
            <AlertCircle className="h-5 w-5 text-red-500" />
          </div>
          <p
            className={`mt-2 text-3xl font-bold ${
              stats && (stats.errors_period ?? stats.errors_last_24h ?? 0) > 0
                ? 'text-red-600'
                : 'text-gray-900'
            }`}
          >
            {stats ? (stats.errors_period ?? stats.errors_last_24h ?? 0).toLocaleString() : '—'}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">Avertissements</p>
            <AlertTriangle className="h-5 w-5 text-amber-500" />
          </div>
          <p
            className={`mt-2 text-3xl font-bold ${
              stats && (stats.warnings_period ?? stats.warnings_last_24h ?? 0) > 0
                ? 'text-amber-600'
                : 'text-gray-900'
            }`}
          >
            {stats ? (stats.warnings_period ?? stats.warnings_last_24h ?? 0).toLocaleString() : '—'}
          </p>
        </div>
      </div>

      {/* Message d'erreur éventuel */}
      {error && (
        <div className="rounded-xl bg-red-50 p-4 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* 3. Tableau des logs standard (DataTable identique aux autres pages) */}
      <DataTable<ApiPosLog>
        data={logs}
        columns={columns}
        actions={actions}
        loading={loading}
        searchable={true}
        searchPlaceholder="Rechercher par action, erreur, caissier, device…"
        onSearch={(q) => {
          setSearchTerm(q)
        }}
        serverPagination={{
          currentPage,
          lastPage: totalPages,
          total: totalCount,
          onPageChange: (p) => loadLogs(p),
        }}
        emptyMessage="Aucun log ne correspond aux critères de recherche."
      />

      {/* Modal d'inspection détaillée du log */}
      {inspectLog && (
        <AdminModal
          open={Boolean(inspectLog)}
          title={`Détails du Log #${inspectLog.id} — ${inspectLog.action}`}
          onClose={() => setInspectLog(null)}
          wide={true}
        >
          <div className="space-y-5 text-sm">
            {/* Résumé de l'événement */}
            <div className="grid grid-cols-2 gap-4 rounded-xl bg-gray-50 p-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-gray-500">Date et heure</p>
                <p className="text-sm font-semibold text-gray-900 mt-1">
                  {formatFullDate(inspectLog.timestamp)}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-500">
                  <span>{timeAgo(inspectLog.timestamp)}</span>
                  <span>•</span>
                  <span className="font-mono text-[11px] text-gray-400">
                    UTC: {inspectLog.timestamp.replace('T', ' ').replace('Z', '')}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-500">Niveau de sévérité</p>
                <div className="mt-1">{getLevelBadge(inspectLog.level)}</div>
              </div>

              <div>
                <p className="text-xs text-gray-500">Catégorie</p>
                <p className="font-semibold text-gray-900 mt-1">
                  {LOG_CATEGORIES.find((c) => c.value === inspectLog.category)?.label ?? inspectLog.category}
                </p>
                <p className="text-[11px] font-mono text-gray-400 mt-0.5">
                  code: {inspectLog.category}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">Organisation</p>
                <p className="font-medium text-gray-900 mt-1">
                  {inspectLog.organization?.name ?? `ID: ${inspectLog.organization_id ?? '—'}`}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">Point de vente / Caisse</p>
                <p className="font-medium text-gray-900 mt-1">
                  {inspectLog.store?.name ?? '—'} /{' '}
                  {inspectLog.cash_register?.name ?? `ID: ${inspectLog.register_id ?? '—'}`}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">Caissier</p>
                <p className="font-medium text-gray-900 mt-1">
                  {inspectLog.user_name ?? inspectLog.user?.name ?? '—'}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">Appareil (Device UUID)</p>
                <p className="font-mono text-xs text-gray-700 mt-1 truncate" title={inspectLog.device_id ?? ''}>
                  {inspectLog.device_id ?? '—'}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">Plateforme & Version</p>
                <p className="text-gray-900 mt-1">
                  {inspectLog.platform ?? 'inconnue'} • v{inspectLog.app_version ?? '—'}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">Code Période / Shift</p>
                <p className="font-mono text-xs text-gray-900 mt-1">
                  {inspectLog.period_code ?? '—'}
                </p>
              </div>
            </div>

            {/* Message d'erreur éventuel */}
            {inspectLog.error_message && (
              <div>
                <p className="text-xs font-semibold uppercase text-red-700">Message d'erreur</p>
                <div className="mt-1 rounded-xl border border-red-200 bg-red-50 p-3 text-red-800 font-mono text-xs whitespace-pre-wrap">
                  {inspectLog.error_message}
                </div>
              </div>
            )}

            {/* Stack trace Flutter / exception */}
            {inspectLog.stack_trace && (
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase text-gray-700">
                    Trace d'exécution (Stack Trace)
                  </p>
                  <button
                    type="button"
                    onClick={() => handleCopyTrace(inspectLog.stack_trace!)}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                  >
                    {copiedTrace ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="text-emerald-600">Copié !</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 text-gray-500" />
                        <span>Copier la trace</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="mt-2 max-h-60 overflow-y-auto rounded-xl bg-gray-900 p-4 text-xs font-mono text-emerald-400">
                  {inspectLog.stack_trace}
                </pre>
              </div>
            )}

            {/* Payload JSON de détails */}
            {inspectLog.details && Object.keys(inspectLog.details).length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase text-gray-700">
                  Détails contextuels (JSON)
                </p>
                <pre className="mt-2 max-h-56 overflow-y-auto rounded-xl bg-gray-900 p-4 text-xs font-mono text-sky-300">
                  {JSON.stringify(inspectLog.details, null, 2)}
                </pre>
              </div>
            )}

            {/* Pied de modal */}
            <div className="flex items-center justify-end border-t border-gray-200 pt-4 mt-6">
              <button
                type="button"
                onClick={() => setInspectLog(null)}
                className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-sm"
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
