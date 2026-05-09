import { X } from 'lucide-react'
import { type ReactNode } from 'react'

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
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div
        className={`flex max-h-[90vh] w-full flex-col rounded-2xl bg-white shadow-2xl ${wide ? 'max-w-4xl' : 'max-w-lg'}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-modal-title"
      >
        <div className="shrink-0 border-b border-gray-200 px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <h2
              id="admin-modal-title"
              className="text-lg font-semibold text-gray-900"
            >
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-gray-500 hover:bg-gray-100"
              aria-label="Fermer la fenêtre"
            >
              <X className="h-4 w-4 shrink-0" aria-hidden />
              Fermer
            </button>
          </div>
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
