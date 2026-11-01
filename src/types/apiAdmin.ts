/** Réponses Laravel (snake_case) utilisées par le back-office admin. */

export type ApiGeneralSettings = {
  whatsapp_notifications: boolean
}

export type ApiPlatformRole = {
  id: number
  slug: string
  name: string
}

export type ApiAdminUser = {
  id: number
  name: string
  email: string
  phone?: string | null
  platform_role?: ApiPlatformRole | null
  organization_memberships?: Array<{
    id?: number
    organization?: { id: number; name: string }
    role?: { id: number; name: string }
  }>
  created_at?: string
}

export type ApiOrganization = {
  id: number
  name: string
  legal_name?: string | null
  country?: string | null
  currency?: string | null
  timezone?: string | null
  phone?: string | null
  /** Absent côté API avant migration : traiter comme `true`. */
  is_active?: boolean
  created_at: string
  created_by?: { id: number; name: string; email: string } | null
}

/** Réponse `show` — champs additionnels renvoyés par le modèle. */
export type ApiOrganizationDetail = ApiOrganization & {
  created_by_user_id?: number | null
  tax_id?: string | null
  company_registration_number?: string | null
  address?: string | null
  logo?: string | null
  updated_at?: string
  general_settings?: ApiGeneralSettings | null
  subscription?: ApiOrganizationSubscription | null
}

export type ApiOrgRegistrationRequest = {
  id: number
  status: string
  name: string
  email: string
  owner_name?: string | null
  phone?: string | null
  country: string
  currency: string
  created_at: string
  rejection_reason?: string | null
}

/** Réponse `show` (relations chargées côté API). */
export type ApiOrgRegistrationRequestDetail = ApiOrgRegistrationRequest & {
  legal_name?: string | null
  timezone?: string | null
  organization_id?: number | null
  processed_by_user_id?: number | null
  processed_at?: string | null
  updated_at?: string
  organization?: { id: number; name: string } | null
  processed_by?: { id: number; name: string; email: string } | null
}

export type LaravelPaginator<T> = {
  data: T[]
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export type ApiPlan = {
  id: number
  name: string
  code: string
  annual_price: string
  status: string
  created_at: string
}

export type ApiSubscriptionPayment = {
  id: number
  subscription_cycle_id: number
  amount: string
  payment_method: string | null
  payment_status: 'success' | 'failed' | 'pending'
  paid_at: string | null
  transaction_reference: string | null
  created_at: string
}

export type ApiSubscriptionCycle = {
  id: number
  subscription_id: number
  period_start: string
  period_end: string
  due_date: string
  grace_end_date: string
  amount: string
  status: 'pending' | 'paid' | 'overdue' | 'cancelled'
  payments?: ApiSubscriptionPayment[]
  created_at: string
}

export type ApiOrganizationSubscription = {
  id: number
  client_id: number
  plan_id: number
  custom_price: string
  payment_frequency: 'monthly' | 'quarterly' | 'semiannual' | 'yearly'
  start_date: string
  end_date: string
  status: 'trial' | 'active' | 'suspended' | 'cancelled' | 'expired'
  total_paid?: string | number
  created_at: string
  updated_at?: string
  organization?: ApiOrganization
  plan?: ApiPlan
  cycles?: ApiSubscriptionCycle[]
}

/** Réponse de `GET /Admin/stats` — agrégats calculés côté API pour la plage [from, to]. */
export type ApiDashboardStats = {
  range: { from: string; to: string }
  summary: {
    pending_requests: number
    new_organizations: number
    new_users: number
  }
  organization_trend: Array<{ month: string; count: number }>
  request_trend: Array<{
    month: string
    approved: number
    pending: number
    rejected: number
  }>
  plan_distribution: Array<{ plan: string; count: number }>
  /** Abonnements non annulés arrivant à échéance dans les 30 jours (état « à ce jour »). */
  expiring_soon: ApiOrganizationSubscription[]
  /** Abonnements non annulés déjà arrivés à échéance (état « à ce jour »). */
  already_expired: ApiOrganizationSubscription[]
}


export type ApiPosLog = {
  id: number
  local_id?: number | null
  timestamp: string
  level: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL' | string
  category: string
  action: string
  user_id?: number | null
  user_name?: string | null
  register_id?: number | null
  store_id?: number | null
  organization_id?: number | null
  period_code?: string | null
  device_id?: string | null
  platform?: string | null
  app_version?: string | null
  is_online: boolean
  details?: Record<string, unknown> | null
  error_message?: string | null
  stack_trace?: string | null
  created_at: string
  updated_at: string
  organization?: { id: number; name: string } | null
  store?: { id: number; name: string } | null
  cash_register?: { id: number; name: string; reference?: string | null } | null
  user?: { id: number; name: string; email: string } | null
}

export type ApiPosLogStats = {
  total_logs: number
  logs_last_24h: number
  errors_last_24h: number
  warnings_last_24h: number
}
