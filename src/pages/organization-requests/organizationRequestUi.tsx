export function statusLabel(status: string): string {
  if (status === 'pending') return 'En attente'
  if (status === 'approved') return 'Approuvée'
  if (status === 'rejected') return 'Refusée'
  return status
}

export function statusBadge(status: string) {
  if (status === 'pending') {
    return (
      <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
        En attente
      </span>
    )
  }
  if (status === 'approved') {
    return (
      <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
        Approuvée
      </span>
    )
  }
  return (
    <span className="inline-flex rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
      Refusée
    </span>
  )
}

export function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('fr-FR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}
