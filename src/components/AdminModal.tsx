import { X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'

export default function AdminModal({
  open,
  title,
  children,
  onClose,
  footer,
  wide = false,
}: {
  open: boolean
  title: string
  children: ReactNode
  onClose: () => void
  footer?: ReactNode
  /** Formulaire large (ex. organisation sur deux colonnes). */
  wide?: boolean
}) {
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[1px]">
      <div
        className={`flex max-h-[90vh] w-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl ${wide ? 'max-w-4xl' : 'max-w-lg'}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-modal-title"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-gray-100 bg-gradient-to-r from-[#0F2E4A] to-[#1e4a6e] px-6 py-4 text-white">
          <h2
            id="admin-modal-title"
            className="text-lg font-semibold"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/90 hover:bg-white/10"
            aria-label="Fermer la fenêtre"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer ? (
          <div className="shrink-0 border-t border-gray-200 bg-gray-50 px-6 py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  )
}
