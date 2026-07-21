/** Tokens Tailwind partagés par les pages de détail du back-office (fiches organisation/utilisateur). */

export function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(' ')
}

export const cardUi = {
  container: 'w-full max-w-none space-y-6',
  card: 'rounded-xl border border-gray-200 bg-white shadow-sm',
  cardPad: 'p-6',
  subtle: 'text-sm text-gray-600',
  title: 'truncate text-2xl font-semibold text-gray-900',
  sectionLabel: 'text-sm font-semibold uppercase tracking-wide text-gray-500',
}
