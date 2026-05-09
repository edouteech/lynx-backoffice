import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Download } from 'lucide-react'
import {
  exportToCsv,
  exportToPdf,
  exportToXlsx,
  type ExportCell,
} from '../lib/tableExport'

export default function TableExportButton({
  filename,
  title,
  headers,
  rows,
}: {
  /** Nom de fichier sans extension */
  filename: string
  /** Titre affiché en en-tête du PDF */
  title?: string
  headers: string[]
  rows: ExportCell[][]
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  return (
    <div className="relative shrink-0" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        aria-haspopup="menu"
      >
        <Download className="h-4 w-4 shrink-0" aria-hidden />
        Exporter
        <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
      </button>
      {open ? (
        <div
          className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg"
          role="menu"
        >
          {(
            [
              {
                key: 'csv',
                label: 'CSV',
                onClick: () => {
                  exportToCsv({ filename, headers, rows })
                },
              },
              {
                key: 'xlsx',
                label: 'Excel (XLSX)',
                onClick: () => {
                  exportToXlsx({
                    filename,
                    headers,
                    rows,
                    sheetName: filename.slice(0, 31),
                  })
                },
              },
              {
                key: 'pdf',
                label: 'PDF',
                onClick: () => {
                  exportToPdf({ filename, title, headers, rows })
                },
              },
            ] as const
          ).map((it) => (
            <button
              key={it.key}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                it.onClick()
              }}
              className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
            >
              {it.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
