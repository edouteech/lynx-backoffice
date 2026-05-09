type SubscriptionStatus = 'pending' | 'active' | 'expired' | 'cancelled'

export function SubscriptionStatusBadge({ status }: { status?: string | null }) {
  if (!status) return null

  let bg = 'bg-gray-100 text-gray-700'
  let label = status

  switch (status as SubscriptionStatus) {
    case 'active':
      bg = 'bg-emerald-100 text-emerald-700'
      label = 'Actif'
      break
    case 'pending':
      bg = 'bg-amber-100 text-amber-700'
      label = 'En attente'
      break
    case 'expired':
      bg = 'bg-rose-100 text-rose-700'
      label = 'Expiré'
      break
    case 'cancelled':
      bg = 'bg-gray-200 text-gray-600'
      label = 'Annulé'
      break
  }

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${bg}`}
    >
      {label}
    </span>
  )
}

export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '-'
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(new Date(dateStr))
  } catch {
    return dateStr
  }
}
