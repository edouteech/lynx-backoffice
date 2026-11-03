import { useCallback, useEffect, useState } from 'react'
import {
  Terminal,
  AlertCircle,
  AlertTriangle,
  Info,
  RefreshCw,
  Trash2,
  Copy,
  Check,
  Eye,
  FileText,
  Search,
} from 'lucide-react'
import Swal from 'sweetalert2'
import AdminPageHeader from '../../components/AdminPageHeader'
import AdminModal from '../../components/AdminModal'
import DataTable, { type Action, type Column } from '../../components/DataTable'
import { apiFetch } from '../../lib/api'
import type {
  ApiSystemLog,
  ApiSystemLogStats,
  LaravelPaginator,
} from '../../types/apiAdmin'

const LOG_LEVELS = [
  { value: 'ALL', label: 'Tous les niveaux' },
  { value: 'ERROR', label: 'Erreur (ERROR / CRITICAL)' },
  { value: 'WARNING', label: 'Avertissement (WARNING)' },
  { value: 'INFO', label: 'Information (INFO)' },
  { value: 'DEBUG', label: 'Debug (DEBUG)' },
] as const

export default function SystemLogsPage() {
  const [logs, setLogs] = useState<ApiSystemLog[]>([])
  const [stats, setStats] = useState<ApiSystemLogStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filtres
  const [selectedLevel, setSelectedLevel] = useState<string>('ALL')
  const [searchTerm, setSearchTerm] = useState('')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Inspection détail modal
  const [inspectLog, setInspectLog] = useState<ApiSystemLog | null>(null)
  const [copiedTrace, setCopiedTrace] = useState(false)
  const [clearing, setClearing] = useState(false)

  // Charger les stats
  const loadStats = useCallback(() => {
    apiFetch<ApiSystemLogStats>('/Admin/logs/system/stats')
      .then((res) => setStats(res))
      .catch(() => setStats(null))
  }, [])

  // Charger les logs paginés
  const loadLogs = useCallback(
    (page = 1) => {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('per_page', '50')

      if (selectedLevel !== 'ALL') {
        params.set('level', selectedLevel)
      }
      if (searchTerm.trim()) {
        params.set('q', searchTerm.trim())
      }

      apiFetch<LaravelPaginator<ApiSystemLog>>(`/Admin/logs/system?${params.toString()}`)
        .then((res) => {
          setLogs(res.data ?? [])
          setCurrentPage(res.current_page ?? 1)
          setTotalPages(res.last_page ?? 1)
          setTotalCount(res.total ?? 0)
        })
        .catch((err) => {
          setError(
            err instanceof Error
              ? err.message
              : 'Impossible de charger les logs système.'
          )
        })
        .finally(() => {
          setLoading(false)
        })
    },
    [selectedLevel, searchTerm]
  )

  useEffect(() => {
    loadStats()
    loadLogs(1)
  }, [loadStats, loadLogs])

  // Vider les logs système
  const handleClear = async () => {
    const result = await Swal.fire({
      title: 'Vider le fichier de logs ?',
      text: 'Le fichier laravel.log sera entièrement vidé. Cette action est irréversible.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'Oui, vider les logs',
      cancelButtonText: 'Annuler',
    })

    if (!result.isConfirmed) return

    try {
      setClearing(true)
      await apiFetch('/Admin/logs/system/clear', { method: 'DELETE' })
      Swal.fire({
        icon: 'success',
        title: 'Fichier vidé',
        text: 'Le fichier laravel.log a été vidé avec succès.',
        timer: 2000,
        showConfirmButton: false,
      })
      loadStats()
      loadLogs(1)
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Erreur',
        text:
          err instanceof Error
            ? err.message
            : 'Impossible de vider le fichier de logs.',
      })
    } finally {
      setClearing(false)
    }
  }

  // Copier la stack trace
  const handleCopyTrace = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedTrace(true)
      setTimeout(() => setCopiedTrace(false), 2000)
    })
  }

  // Badge de niveau
  const renderLevelBadge = (level: string) => {
    const lvl = (level || '').toUpperCase()
    if (['ERROR', 'CRITICAL', 'ALERT', 'EMERGENCY'].includes(lvl)) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800">
          <AlertCircle className="h-3 w-3" />
          {lvl}
        </span>
      )
    }
    if (lvl === 'WARNING') {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
          <AlertTriangle className="h-3 w-3" />
          {lvl}
        </span>
      )
    }
    if (lvl === 'INFO') {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
          <Info className="h-3 w-3" />
          {lvl}
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
        {lvl}
      </span>
    )
  }

  // Colonnes de la table
  const columns: Column<ApiSystemLog>[] = [
    {
      key: 'timestamp',
      label: 'Date / Heure',
      nowrap: true,
      render: (_value, item) => (
        <span className="font-mono text-xs text-gray-600">{item.timestamp}</span>
      ),
    },
    {
      key: 'level',
      label: 'Niveau',
      nowrap: true,
      render: (_value, item) => renderLevelBadge(item.level),
    },
    {
      key: 'message',
      label: 'Message / Événement',
      render: (_value, item) => {
        const isDgi = item.message.toLowerCase().includes('dgi')
        return (
          <div className="max-w-2xl">
            <div className="flex items-center gap-2">
              {isDgi && (
                <span className="shrink-0 rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-200">
                  DGI e-MCF
                </span>
              )}
              <span className="font-mono text-xs text-gray-800 line-clamp-2">
                {item.message}
              </span>
            </div>
            {item.stack_trace && (
              <span className="mt-1 inline-block text-[11px] text-gray-500 font-sans">
                + Trace d'exécution disponible
              </span>
            )}
          </div>
        )
      },
    },
  ]

  const actions: Action<ApiSystemLog>[] = [
    {
      label: 'Inspecter',
      icon: Eye,
      onClick: (item) => setInspectLog(item),
    },
  ]

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={
          <span className="flex items-center gap-3">
            <Terminal className="h-8 w-8 text-blue-600" />
            Logs Système Laravel
          </span>
        }
        description="Visualisation en direct du fichier laravel.log, traçabilité des erreurs serveur, requêtes DGI et stack traces."
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClear}
              disabled={clearing}
              className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50 transition shadow-sm"
            >
              <Trash2 className="h-4 w-4" />
              Vider le fichier
            </button>
            <button
              type="button"
              onClick={() => {
                loadStats()
                loadLogs(currentPage)
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition shadow-sm"
            >
              <RefreshCw className="h-4 w-4" />
              Actualiser
            </button>
          </div>
        }
      />

      {/* Cartes KPI / Statistiques */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">Entrées de log</span>
            <FileText className="h-4 w-4 text-gray-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {stats?.total ?? 0}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">Erreurs</span>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-red-600">
            {stats?.errors ?? 0}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">Avertissements</span>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-600">
            {stats?.warnings ?? 0}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">Informations</span>
            <Info className="h-4 w-4 text-blue-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-blue-600">
            {stats?.info ?? 0}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">Taille fichier</span>
            <Terminal className="h-4 w-4 text-gray-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {stats?.file_size ?? '0 B'}
          </p>
        </div>
      </div>

      {/* Barre de filtres */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="w-56">
          <select
            value={selectedLevel}
            onChange={(e) => {
              setSelectedLevel(e.target.value)
              setCurrentPage(1)
            }}
            className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 text-xs font-medium text-gray-700 focus:border-blue-500 focus:bg-white focus:outline-none"
          >
            {LOG_LEVELS.map((lvl) => (
              <option key={lvl.value} value={lvl.value}>
                {lvl.label}
              </option>
            ))}
          </select>
        </div>

        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setCurrentPage(1)
            }}
            placeholder="Rechercher dans les messages, références DGI, erreurs..."
            className="w-full rounded-xl border border-gray-200 bg-gray-50/50 pl-9 pr-3 py-2 text-xs font-medium text-gray-700 placeholder-gray-400 focus:border-blue-500 focus:bg-white focus:outline-none"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Table des logs */}
      <DataTable
        columns={columns}
        data={logs}
        actions={actions}
        loading={loading}
        serverPagination={{
          currentPage,
          lastPage: totalPages,
          total: totalCount,
          onPageChange: (p) => loadLogs(p),
        }}
        emptyMessage="Aucun log ne correspond aux critères de recherche."
      />

      {/* Modal d'inspection détaillée */}
      {inspectLog && (
        <AdminModal
          open={Boolean(inspectLog)}
          title={`Détail du Log [${inspectLog.level}]`}
          onClose={() => setInspectLog(null)}
          wide={true}
        >
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4 rounded-xl bg-gray-50 p-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-gray-500">Horodatage</p>
                <p className="mt-1 font-mono text-xs font-semibold text-gray-900">
                  {inspectLog.timestamp}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Niveau</p>
                <div className="mt-1">{renderLevelBadge(inspectLog.level)}</div>
              </div>
              <div>
                <p className="text-xs text-gray-500">Environnement</p>
                <p className="mt-1 text-xs font-medium text-gray-700 uppercase">
                  {inspectLog.environment}
                </p>
              </div>
            </div>

            {/* Message complet */}
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-1">Message</p>
              <div className="rounded-xl border border-gray-200 bg-gray-900 p-3.5 text-xs text-green-400 font-mono overflow-x-auto whitespace-pre-wrap">
                {inspectLog.message}
              </div>
            </div>

            {/* Stack trace éventuelle */}
            {inspectLog.stack_trace && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold text-gray-700">
                    Trace d'exécution (Stack Trace)
                  </p>
                  <button
                    type="button"
                    onClick={() => handleCopyTrace(inspectLog.stack_trace || '')}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50 shadow-sm"
                  >
                    {copiedTrace ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="text-emerald-600 font-semibold">Copié !</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 text-gray-500" />
                        <span>Copier</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="max-h-72 overflow-auto rounded-xl border border-gray-200 bg-gray-900 p-3.5 font-mono text-xs text-gray-300 leading-relaxed">
                  {inspectLog.stack_trace}
                </pre>
              </div>
            )}

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
