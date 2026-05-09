import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export type ExportCell = string | number | boolean | null | undefined

function asText(v: ExportCell): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'boolean') return v ? 'Oui' : 'Non'
  return String(v)
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

export function exportToCsv(args: {
  filename: string
  headers: string[]
  rows: ExportCell[][]
}) {
  const lines = [
    args.headers.map((h) => `"${String(h).replaceAll('"', '""')}"`).join(','),
    ...args.rows.map((r) =>
      r.map((c) => `"${asText(c).replaceAll('"', '""')}"`).join(','),
    ),
  ]
  const blob = new Blob([lines.join('\n')], {
    type: 'text/csv;charset=utf-8',
  })
  downloadBlob(
    blob,
    args.filename.endsWith('.csv') ? args.filename : `${args.filename}.csv`,
  )
}

export function exportToXlsx(args: {
  filename: string
  headers: string[]
  rows: ExportCell[][]
  sheetName?: string
}) {
  const data = [args.headers, ...args.rows.map((r) => r.map(asText))]
  const ws = XLSX.utils.aoa_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, args.sheetName ?? 'Export')
  XLSX.writeFile(
    wb,
    args.filename.endsWith('.xlsx') ? args.filename : `${args.filename}.xlsx`,
  )
}

export function exportToPdf(args: {
  filename: string
  title?: string
  headers: string[]
  rows: ExportCell[][]
}) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
  if (args.title) {
    doc.setFontSize(14)
    doc.text(args.title, 40, 40)
  }
  autoTable(doc, {
    head: [args.headers],
    body: args.rows.map((r) => r.map(asText)),
    startY: args.title ? 60 : 40,
    styles: { fontSize: 9, cellPadding: 6 },
    headStyles: { fillColor: [59, 130, 246] },
  })
  doc.save(
    args.filename.endsWith('.pdf') ? args.filename : `${args.filename}.pdf`,
  )
}
