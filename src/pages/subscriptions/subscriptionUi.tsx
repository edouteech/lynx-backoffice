type SubscriptionStatus = 'trial' | 'active' | 'suspended' | 'cancelled'
type CycleStatus = 'pending' | 'paid' | 'overdue' | 'cancelled'

export function SubscriptionStatusBadge({ status }: { status?: string | null }) {
  if (!status) return null

  let bg = 'bg-gray-100 text-gray-700'
  let label = status

  switch (status as SubscriptionStatus) {
    case 'trial':
      bg = 'bg-blue-100 text-blue-700'
      label = 'Essai'
      break
    case 'active':
      bg = 'bg-emerald-100 text-emerald-700'
      label = 'Actif'
      break
    case 'suspended':
      bg = 'bg-amber-100 text-amber-700'
      label = 'Suspendu'
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

export function CycleStatusBadge({ status }: { status?: string | null }) {
    if (!status) return null
  
    let bg = 'bg-gray-100 text-gray-700'
    let label = status
  
    switch (status as CycleStatus) {
      case 'paid':
        bg = 'bg-emerald-100 text-emerald-700'
        label = 'Payé'
        break
      case 'pending':
        bg = 'bg-blue-100 text-blue-700'
        label = 'En attente'
        break
      case 'overdue':
        bg = 'bg-rose-100 text-rose-700'
        label = 'Impayé'
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

export function formatDate(dateStr?: string | null, includeTime = true): string {
  if (!dateStr) return '-'
  try {
    const options: Intl.DateTimeFormatOptions = {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    }
    if (includeTime) {
        options.hour = '2-digit'
        options.minute = '2-digit'
    }
    return new Intl.DateTimeFormat('fr-FR', options).format(new Date(dateStr))
  } catch {
    return dateStr
  }
}
