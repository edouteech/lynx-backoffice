import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronsLeft,
  ChevronsRight,
  Download,
  Edit,
  Eye,
  Search,
  Trash2,
} from 'lucide-react'
import {
  exportToCsv,
  exportToPdf,
  exportToXlsx,
  type ExportCell,
} from '../lib/tableExport'

export interface Column<T> {
  key: keyof T | string
  label: string
  sortable?: boolean
  render?: (value: unknown, item: T) => ReactNode
  align?: 'left' | 'center' | 'right'
  /** Si true, cellule en une ligne (sinon retour à la ligne possible). */
  nowrap?: boolean
}

export interface Action<T> {
  label: string
  icon?: React.ComponentType<{ className?: string }>
  onClick: (item: T) => void
  variant?: 'default' | 'danger' | 'primary'
  show?: (item: T) => boolean
}

export interface ServerPagination {
  currentPage: number
  lastPage: number
  total: number
  onPageChange: (page: number) => void
  disabled?: boolean
  /** Taille de page courante (mode serveur). Fournir avec `onPageSizeChange` pour afficher le sélecteur. */
  pageSize?: number
  onPageSizeChange?: (size: number) => void
}

export interface DataTableProps<T extends object> {
  data: T[]
  columns: Column<T>[]
  actions?: Action<T>[]
  loading?: boolean
  searchable?: boolean
  searchPlaceholder?: string
  /** Si fourni, la recherche est déléguée au serveur (debounce ~300ms) au lieu de filtrer `data` localement. */
  onSearch?: (query: string) => void
  customFilters?: ReactNode
  title?: string
  description?: string
  exportFilename?: string
  emptyMessage?: ReactNode
  /** Pagination côté client (tranche `data` déjà chargée). */
  pagination?: boolean
  itemsPerPage?: number
  showPageSizeSelector?: boolean
  pageSizeOptions?: number[]
  /** Si défini, les lignes affichées = `data` (une page API), le pied gère Précédent/Suivant serveur. */
  serverPagination?: ServerPagination
  getRowId?: (item: T) => string | number
  /** Fixe l'en-tête en haut lors du défilement vertical. */
  stickyHeader?: boolean
  /** Fixe la première colonne à gauche lors du défilement horizontal. */
  stickyFirstColumn?: boolean
  /** Hauteur maximale du conteneur (pour scroll vertical). */
  maxHeight?: string
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => {
    if (current != null && typeof current === 'object' && key in current) {
      return (current as Record<string, unknown>)[key]
    }
    return undefined
  }, obj)
}

function defaultActionIcon<T>(action: Action<T>) {
  if (action.icon) return action.icon
  const l = action.label.toLowerCase()
  if (l.includes('voir') || l.includes('détail')) return Eye
  if (l.includes('modif') || l.includes('édit')) return Edit
  if (l.includes('supprim')) return Trash2
  return Eye
}

function actionClass(variant: Action<never>['variant']) {
  switch (variant) {
    case 'danger':
      return 'text-red-600 hover:bg-red-50'
    case 'primary':
      return 'text-[#3B82F6] hover:bg-blue-50'
    default:
      return 'text-gray-600 hover:bg-gray-50'
  }
}

export default function DataTable<T extends object>({
  data,
  columns,
  actions = [],
  loading = false,
  searchable = true,
  searchPlaceholder = 'Rechercher…',
  onSearch,
  customFilters,
  title,
  description,
  exportFilename,
  emptyMessage = 'Aucun élément',
  pagination = true,
  itemsPerPage = 10,
  showPageSizeSelector = true,
  pageSizeOptions = [10, 25, 50, 100],
  serverPagination,
  getRowId,
  stickyHeader = false,
  stickyFirstColumn = false,
  maxHeight,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(itemsPerPage)
  const [exportOpen, setExportOpen] = useState(false)
  const [jumpPageInput, setJumpPageInput] = useState('')

  useEffect(() => {
    if (!onSearch) return
    const timeout = setTimeout(() => onSearch(searchTerm), 300)
    return () => clearTimeout(timeout)
  }, [searchTerm, onSearch])

  const processed = useMemo(() => {
    let result = [...data]

    if (searchTerm && !onSearch) {
      const q = searchTerm.toLowerCase()
      result = result.filter((item) =>
        columns.some((col) => {
          const v = getNestedValue(
            item as Record<string, unknown>,
            String(col.key)
          )
          return v?.toString().toLowerCase().includes(q)
        })
      )
    }

    if (sortColumn) {
      result.sort((a, b) => {
        const aValue = getNestedValue(a as Record<string, unknown>, sortColumn)
        const bValue = getNestedValue(b as Record<string, unknown>, sortColumn)
        if (aValue == null && bValue == null) return 0
        if (aValue == null) return 1
        if (bValue == null) return -1
        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
        return 0
      })
    }

    return result
  }, [data, searchTerm, onSearch, sortColumn, sortDirection, columns])

  const isServer = !!serverPagination
  const totalItems = processed.length
  const totalPages = isServer
    ? Math.max(1, serverPagination.lastPage)
    : Math.max(1, Math.ceil(totalItems / pageSize))

  /** Évite page hors bornes sans effet (ex. données filtrées plus courtes). */
  const effectivePage = useMemo(
    () => Math.max(1, Math.min(currentPage, totalPages)),
    [currentPage, totalPages]
  )

  const startIndex = (effectivePage - 1) * pageSize
  const endIndex = startIndex + pageSize

  const rows = useMemo(() => {
    if (isServer) return processed
    if (!pagination) return processed
    return processed.slice(startIndex, endIndex)
  }, [endIndex, isServer, pagination, processed, startIndex])

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumn(columnKey)
      setSortDirection('asc')
    }
  }

  const goToPage = (p: number) => {
    if (isServer) {
      serverPagination.onPageChange(p)
      return
    }
    setCurrentPage(Math.max(1, Math.min(p, totalPages)))
  }

  const handleJumpToPage = () => {
    const n = parseInt(jumpPageInput, 10)
    if (!isNaN(n)) goToPage(n)
    setJumpPageInput('')
  }

  const showToolbar =
    title ||
    description ||
    searchable ||
    customFilters ||
    exportFilename

  const colCount = columns.length + (actions.length > 0 ? 1 : 0)

  const rowKey = (item: T, index: number) => {
    if (getRowId) return String(getRowId(item))
    const rec = item as Record<string, unknown>
    if (rec.id != null) return String(rec.id)
    return String(index)
  }

  const exportHeaders = useMemo(() => columns.map((c) => c.label), [columns])
  const exportRows = useMemo((): ExportCell[][] => {
    return processed.map((item) =>
      columns.map((c) => {
        const v = getNestedValue(
          item as Record<string, unknown>,
          String(c.key)
        )
        if (v == null) return null
        if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean')
          return v
        // Fallback: stringify objects/arrays for exports.
        try {
          return JSON.stringify(v)
        } catch {
          return String(v)
        }
      })
    )
  }, [processed, columns])

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      {showToolbar && (
        <div className="border-b border-gray-200 p-4 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              {title && (
                <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
              )}
              {description && (
                <p className="mt-1 text-sm text-gray-600">{description}</p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {customFilters}
              {searchable && (
                <div className="relative min-w-[200px] flex-1 lg:max-w-xs lg:flex-initial">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="search"
                    placeholder={searchPlaceholder}
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value)
                      if (!isServer) setCurrentPage(1)
                    }}
                    className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/25"
                  />
                </div>
              )}
              {exportFilename && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setExportOpen((v) => !v)}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <Download className="h-4 w-4" />
                    Exporter
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  </button>
                  {exportOpen && (
                    <div className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
                      {[
                        {
                          key: 'csv',
                          label: 'CSV',
                          onClick: () => {
                            exportToCsv({
                              filename: exportFilename,
                              headers: exportHeaders,
                              rows: exportRows,
                            })
                          },
                        },
                        {
                          key: 'xlsx',
                          label: 'Excel (XLSX)',
                          onClick: () => {
                            exportToXlsx({
                              filename: exportFilename,
                              headers: exportHeaders,
                              rows: exportRows,
                              sheetName: exportFilename,
                            })
                          },
                        },
                        {
                          key: 'pdf',
                          label: 'PDF',
                          onClick: () => {
                            exportToPdf({
                              filename: exportFilename,
                              title,
                              headers: exportHeaders,
                              rows: exportRows,
                            })
                          },
                        },
                      ].map((it) => (
                        <button
                          key={it.key}
                          type="button"
                          onClick={() => {
                            setExportOpen(false)
                            it.onClick()
                          }}
                          className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                        >
                          {it.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div
        className="overflow-x-auto overflow-y-auto"
        style={{ maxHeight: maxHeight }}
      >
        <table className="min-w-full text-left text-sm border-separate border-spacing-0">
          <thead className={`border-b border-gray-200 bg-gray-50 ${stickyHeader ? 'sticky top-0 z-10' : ''}`}>
            <tr>
              {columns.map((column, index) => (
                <th
                  key={index}
                  className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-600 border-b border-gray-200 ${
                    column.align === 'center'
                      ? 'text-center'
                      : column.align === 'right'
                        ? 'text-right'
                        : 'text-left'
                  } ${column.sortable ? 'cursor-pointer select-none hover:bg-gray-100' : ''} ${
                    stickyFirstColumn && index === 0 ? 'sticky left-0 z-20 bg-gray-50' : ''
                  }`}
                  onClick={() =>
                    column.sortable && handleSort(String(column.key))
                  }
                >
                  <span className="inline-flex items-center gap-1">
                    {column.label}
                    {column.sortable && (
                      <span className="flex flex-col leading-none">
                        <ChevronUp
                          className={`h-3 w-3 ${
                            sortColumn === column.key &&
                            sortDirection === 'asc'
                              ? 'text-[#3B82F6]'
                              : 'text-gray-300'
                          }`}
                        />
                        <ChevronDown
                          className={`-mt-1 h-3 w-3 ${
                            sortColumn === column.key &&
                            sortDirection === 'desc'
                              ? 'text-[#3B82F6]'
                              : 'text-gray-300'
                          }`}
                        />
                      </span>
                    )}
                  </span>
                </th>
              ))}
              {actions.length > 0 && (
                <th className="w-36 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={colCount} className="px-4 py-12 text-center">
                  <div className="flex items-center justify-center gap-3 text-gray-500">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#3B82F6] border-t-transparent" />
                    Chargement…
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={colCount}
                  className="px-4 py-10 text-center text-gray-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((item, rowIndex) => (
                <tr
                  key={rowKey(item, rowIndex)}
                  className="border-b border-gray-100 transition-colors hover:bg-gray-50/80"
                >
                  {columns.map((column, colIndex) => (
                    <td
                      key={colIndex}
                      className={`px-4 py-3 text-gray-900 border-b border-gray-100 ${
                        column.align === 'center'
                          ? 'text-center'
                          : column.align === 'right'
                            ? 'text-right'
                            : 'text-left'
                      } ${column.nowrap ? 'whitespace-nowrap' : ''} ${
                        stickyFirstColumn && colIndex === 0 ? 'sticky left-0 z-10 bg-white group-hover:bg-gray-50' : ''
                      }`}
                    >
                      {column.render
                        ? column.render(
                            getNestedValue(
                              item as Record<string, unknown>,
                              String(column.key)
                            ),
                            item
                          )
                        : String(
                            getNestedValue(
                              item as Record<string, unknown>,
                              String(column.key)
                            ) ?? ''
                          )}
                    </td>
                  ))}
                  {actions.length > 0 && (
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-center gap-1">
                        {actions.map((action, ai) => {
                          if (action.show && !action.show(item)) return null
                          const Icon = defaultActionIcon(action)
                          return (
                            <button
                              key={ai}
                              type="button"
                              title={action.label}
                              onClick={() => action.onClick(item)}
                              className={`rounded-lg p-2 transition-colors ${actionClass(action.variant)}`}
                            >
                              <Icon className="h-4 w-4" />
                            </button>
                          )
                        })}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!loading && rows.length > 0 && (isServer ? serverPagination.lastPage > 1 : pagination && totalPages > 1) && (
        <div className="flex flex-col gap-3 border-t border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <span>
              {isServer ? (
                <>
                  {serverPagination.total} élément
                  {serverPagination.total > 1 ? 's' : ''} — page{' '}
                  {serverPagination.currentPage} / {serverPagination.lastPage}
                </>
              ) : (
                <>
                  {totalItems} élément{totalItems > 1 ? 's' : ''}
                  {pagination && (
                    <>
                      {' '}
                      · affichés {startIndex + 1}–
                      {Math.min(endIndex, totalItems)}
                    </>
                  )}
                </>
              )}
            </span>
            {showPageSizeSelector && (isServer ? !!serverPagination.onPageSizeChange : pagination) && (
              <label className="flex items-center gap-2 text-sm">
                <span className="text-gray-500">Par page</span>
                <select
                  value={isServer ? (serverPagination.pageSize ?? pageSize) : pageSize}
                  onChange={(e) => {
                    const n = Number(e.target.value)
                    if (isServer) {
                      serverPagination.onPageSizeChange?.(n)
                    } else {
                      setPageSize(n)
                      setCurrentPage(1)
                    }
                  }}
                  disabled={isServer && serverPagination.disabled}
                  className="rounded border border-gray-300 px-2 py-1 text-sm focus:border-[#3B82F6] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
                >
                  {pageSizeOptions.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          <div className="flex items-center gap-1">
            {isServer ? (
              <>
                <button
                  type="button"
                  disabled={
                    serverPagination.currentPage <= 1 ||
                    serverPagination.disabled
                  }
                  onClick={() => goToPage(serverPagination.currentPage - 1)}
                  className="rounded-lg border border-gray-300 p-2 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                  title="Page précédente"
                  aria-label="Page précédente"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden />
                </button>
                <div className="flex items-center gap-1 px-1">
                  <input
                    type="number"
                    min={1}
                    max={serverPagination.lastPage}
                    value={jumpPageInput}
                    onChange={(e) => setJumpPageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); handleJumpToPage() }
                    }}
                    placeholder={String(serverPagination.currentPage)}
                    disabled={serverPagination.disabled}
                    className="w-14 rounded border border-gray-300 px-1.5 py-1 text-center text-sm focus:border-[#3B82F6] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
                    title="Aller à la page"
                    aria-label="Aller à la page"
                  />
                  <span className="text-gray-500">/ {serverPagination.lastPage}</span>
                  <button
                    type="button"
                    onClick={handleJumpToPage}
                    disabled={serverPagination.disabled || !jumpPageInput}
                    className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs font-medium hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Aller
                  </button>
                </div>
                <button
                  type="button"
                  disabled={
                    serverPagination.currentPage >= serverPagination.lastPage ||
                    serverPagination.disabled
                  }
                  onClick={() => goToPage(serverPagination.currentPage + 1)}
                  className="rounded-lg border border-gray-300 p-2 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                  title="Page suivante"
                  aria-label="Page suivante"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  disabled={effectivePage <= 1}
                  onClick={() => goToPage(1)}
                  className="rounded-lg border border-gray-300 p-2 hover:bg-white disabled:opacity-40"
                  title="Première page"
                  aria-label="Première page"
                >
                  <ChevronsLeft className="h-4 w-4" aria-hidden />
                </button>
                <button
                  type="button"
                  disabled={effectivePage <= 1}
                  onClick={() => goToPage(effectivePage - 1)}
                  className="rounded-lg border border-gray-300 p-2 hover:bg-white disabled:opacity-40"
                  title="Page précédente"
                  aria-label="Page précédente"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden />
                </button>
                <span className="px-2 font-medium">
                  {effectivePage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={effectivePage >= totalPages}
                  onClick={() => goToPage(effectivePage + 1)}
                  className="rounded-lg border border-gray-300 p-2 hover:bg-white disabled:opacity-40"
                  title="Page suivante"
                  aria-label="Page suivante"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </button>
                <button
                  type="button"
                  disabled={effectivePage >= totalPages}
                  onClick={() => goToPage(totalPages)}
                  className="rounded-lg border border-gray-300 p-2 hover:bg-white disabled:opacity-40"
                  title="Dernière page"
                  aria-label="Dernière page"
                >
                  <ChevronsRight className="h-4 w-4" aria-hidden />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
