/** Réponses Laravel (snake_case) utilisées par le back-office admin. */

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
  price: string
  currency: string
  duration_days: number
  is_active: boolean
  features?: unknown
  created_at: string
}

export type ApiOrganizationSubscription = {
  id: number
  organization_id: number
  plan_id: number
  amount?: string | null
  currency: string
  starts_at: string
  ends_at?: string | null
  cancelled_at?: string | null
  status: 'pending' | 'active' | 'expired' | 'cancelled'
  payment_reference?: string | null
  created_at: string
  updated_at?: string
  organization?: ApiOrganization
  plan?: ApiPlan
}
