import type { ApiAdminUser } from '../types/apiAdmin'

/** Display helpers based on API model (`name` + `email`). */
export function userDisplayName(user: Pick<ApiAdminUser, 'name' | 'email'> | null): string {
  if (!user) return 'Admin'
  const n = user.name?.trim()
  if (n) return n
  return user.email
}

export function userInitials(user: Pick<ApiAdminUser, 'name' | 'email'> | null): string {
  if (!user) return 'A'
  const n = user.name?.trim()
  if (n) {
    const parts = n.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) {
      return `${parts[0]!.charAt(0)}${parts[1]!.charAt(0)}`.toUpperCase()
    }
    return n.slice(0, 2).toUpperCase()
  }
  return user.email?.charAt(0).toUpperCase() ?? 'A'
}
