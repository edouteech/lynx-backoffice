import { Check, X } from 'lucide-react'
import type { ApiOrganization } from '../../types/apiAdmin'

export function orgIsActive(r: ApiOrganization): boolean {
  return r.is_active !== false
}

export function OrgActiveSwitch({
  isActive,
  disabled,
  onToggle,
}: {
  isActive: boolean
  disabled: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={isActive ? 'true' : 'false'}
      aria-label={
        isActive
          ? 'Organisation active — cliquer pour désactiver'
          : 'Organisation désactivée — cliquer pour activer'
      }
      disabled={disabled}
      onClick={onToggle}
      className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
        isActive ? 'bg-emerald-500' : 'bg-gray-400'
      }`}
    >
      <span
        className={`pointer-events-none absolute top-1 left-1 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-md transition-transform duration-200 ease-out ${
          isActive ? 'translate-x-6' : 'translate-x-0'
        }`}
      >
        {isActive ? (
          <Check className="h-3.5 w-3.5 text-emerald-600" strokeWidth={2.5} />
        ) : (
          <X className="h-3.5 w-3.5 text-gray-500" strokeWidth={2.5} />
        )}
      </span>
    </button>
  )
}

export function formatCreatedAt(iso: string) {
  try {
    return new Date(iso).toLocaleString('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}
