import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertTriangle, Building2, ClipboardList, Clock, Eye, Users } from 'lucide-react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts'
import AdminPageHeader from '../../components/AdminPageHeader'
import { DateRangePicker } from '../../components/DateRangePicker'
import DataTable, { type Action, type Column } from '../../components/DataTable'
import { apiFetch } from '../../lib/api'
import type {
  ApiOrgRegistrationRequest,
  ApiOrganization,
  ApiOrganizationSubscription,
  ApiAdminUser,
  LaravelPaginator,
} from '../../types/apiAdmin'
import { SubscriptionStatusBadge, formatDate } from '../subscriptions/subscriptionUi'

const TOOLTIP_STYLE = {
  borderRadius: '12px',
  border: 'none',
  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
}

/** Fenêtre « bientôt expirée » : abonnements arrivant à échéance dans les N prochains jours. */
const EXPIRY_WINDOW_DAYS = 30

/** Palette catégorielle (identité), ordre fixe — jamais réassignée par rang/valeur. */
const PLAN_CATEGORICAL_COLORS = ['#2a78d6', '#008300', '#e87ba4', '#eda100']
const PLAN_OTHER_COLOR = '#9CA3AF'
const PLAN_OTHER_LABEL = 'Autres'

function pad(n: number) {
  return String(n).padStart(2, '0')
}

/** Même format que DateRangePicker.formatInputDateTime (heure locale, sans fuseau). */
function formatInputDateTime(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function defaultYearRange(): { from: string; to: string } {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0)
  const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999)
  return { from: formatInputDateTime(start), to: formatInputDateTime(end) }
}

function inRange(iso: string | undefined | null, from: Date, to: Date): boolean {
  if (!iso) return false
  const t = new Date(iso).getTime()
  return t >= from.getTime() && t <= to.getTime()
}

/** Un point par mois couvert par [from, to] (borné à 10 ans pour rester lisible). */
function monthsInRange(from: Date, to: Date): { key: string; label: string }[] {
  const out: { key: string; label: string }[] = []
  const spansMultipleYears = from.getFullYear() !== to.getFullYear()
  const cursor = new Date(from.getFullYear(), from.getMonth(), 1)
  const end = new Date(to.getFullYear(), to.getMonth(), 1)
  let guard = 0
  while (cursor <= end && guard < 120) {
    const raw = cursor.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')
    const monthLabel = raw.charAt(0).toUpperCase() + raw.slice(1)
    out.push({
      key: `${cursor.getFullYear()}-${pad(cursor.getMonth() + 1)}`,
      label: spansMultipleYears ? `${monthLabel} ${String(cursor.getFullYear()).slice(2)}` : monthLabel,
    })
    cursor.setMonth(cursor.getMonth() + 1)
    guard++
  }
  return out
}

function monthKey(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [range, setRange] = useState(defaultYearRange)
  const fromDate = useMemo(() => new Date(range.from), [range.from])
  const toDate = useMemo(() => new Date(range.to), [range.to])
  const [expiryFilter, setExpiryFilter] = useState<'soon' | 'expired'>('soon')

  const [organizations, setOrganizations] = useState<ApiOrganization[]>([])
  const [requests, setRequests] = useState<ApiOrgRegistrationRequest[]>([])
  const [subscriptions, setSubscriptions] = useState<ApiOrganizationSubscription[]>([])
  const [users, setUsers] = useState<ApiAdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const [orgRes, reqRes, subRes, userRes] = await Promise.all([
          apiFetch<LaravelPaginator<ApiOrganization>>(
            '/Admin/organizations?per_page=500',
          ),
          apiFetch<LaravelPaginator<ApiOrgRegistrationRequest>>(
            '/Admin/organization-registration-requests?per_page=300',
          ),
          apiFetch<LaravelPaginator<ApiOrganizationSubscription>>(
            '/Admin/subscriptions?per_page=500',
          ),
          apiFetch<LaravelPaginator<ApiAdminUser>>('/Admin/users?per_page=500'),
        ])
        if (!cancelled) {
          setOrganizations(orgRes.data ?? [])
          setRequests(reqRes.data ?? [])
          setSubscriptions(subRes.data ?? [])
          setUsers(userRes.data ?? [])
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Chargement impossible.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const orgsInRange = useMemo(
    () => organizations.filter((o) => inRange(o.created_at, fromDate, toDate)),
    [organizations, fromDate, toDate],
  )
  const requestsInRange = useMemo(
    () => requests.filter((r) => inRange(r.created_at, fromDate, toDate)),
    [requests, fromDate, toDate],
  )
  const subscriptionsInRange = useMemo(
    () => subscriptions.filter((s) => inRange(s.created_at, fromDate, toDate)),
    [subscriptions, fromDate, toDate],
  )
  const usersInRange = useMemo(
    () => users.filter((u) => inRange(u.created_at, fromDate, toDate)),
    [users, fromDate, toDate],
  )
  const pendingInRange = useMemo(
    () => requestsInRange.filter((r) => r.status === 'pending').length,
    [requestsInRange],
  )

  const months = useMemo(() => monthsInRange(fromDate, toDate), [fromDate, toDate])

  const orgTrend = useMemo(
    () =>
      months.map(({ key, label }) => ({
        month: label,
        count: orgsInRange.filter((o) => monthKey(o.created_at) === key).length,
      })),
    [months, orgsInRange],
  )
  const hasOrgTrend = orgTrend.some((d) => d.count > 0)

  const requestTrend = useMemo(
    () =>
      months.map(({ key, label }) => {
        const inMonth = requestsInRange.filter((r) => monthKey(r.created_at) === key)
        return {
          month: label,
          approved: inMonth.filter((r) => r.status === 'approved').length,
          pending: inMonth.filter((r) => r.status === 'pending').length,
          rejected: inMonth.filter((r) => r.status === 'rejected').length,
        }
      }),
    [months, requestsInRange],
  )
  const hasRequestTrend = requestTrend.some(
    (d) => d.approved + d.pending + d.rejected > 0,
  )

  const planData = useMemo(() => {
    const counts = subscriptionsInRange.reduce<Record<string, number>>((acc, s) => {
      const name = s.plan?.name?.trim() || 'Sans plan'
      acc[name] = (acc[name] ?? 0) + 1
      return acc
    }, {})
    // Ordre alphabétique fixe : l'identité (nom du plan) porte la couleur, jamais son rang.
    const names = Object.keys(counts).sort((a, b) => a.localeCompare(b, 'fr'))
    const main = names.slice(0, PLAN_CATEGORICAL_COLORS.length)
    const rest = names.slice(PLAN_CATEGORICAL_COLORS.length)

    const rows = main.map((name, i) => ({
      plan: name,
      color: PLAN_CATEGORICAL_COLORS[i],
      count: counts[name],
    }))
    const otherCount = rest.reduce((sum, name) => sum + counts[name], 0)
    if (otherCount > 0) {
      rows.push({ plan: PLAN_OTHER_LABEL, color: PLAN_OTHER_COLOR, count: otherCount })
    }
    return rows
  }, [subscriptionsInRange])
  const hasPlanData = planData.length > 0

  // Indépendant de la plage de dates du haut : l'échéance est un état "à ce jour", pas historique.
  const now = useMemo(() => new Date(), [])
  const daysUntil = useMemo(
    () => (dateStr: string) =>
      Math.ceil((new Date(dateStr).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
    [now],
  )

  const expiringSoon = useMemo(
    () =>
      subscriptions
        .filter((s) => {
          if (s.status === 'cancelled') return false
          const d = daysUntil(s.end_date)
          return d >= 0 && d <= EXPIRY_WINDOW_DAYS
        })
        .sort((a, b) => daysUntil(a.end_date) - daysUntil(b.end_date)),
    [subscriptions, daysUntil],
  )
  const alreadyExpired = useMemo(
    () =>
      subscriptions
        .filter((s) => s.status !== 'cancelled' && daysUntil(s.end_date) < 0)
        .sort((a, b) => daysUntil(a.end_date) - daysUntil(b.end_date)),
    [subscriptions, daysUntil],
  )
  const expiryRows = expiryFilter === 'soon' ? expiringSoon : alreadyExpired

  const expiryColumns = useMemo<Column<ApiOrganizationSubscription>[]>(() => [
    {
      key: 'organization.name',
      label: 'Organisation',
      sortable: true,
      render: (_v, s) => (
        <Link to={`/organizations/${s.client_id}`} className="font-medium text-[#3B82F6] hover:underline">
          {s.organization?.name ?? `Org #${s.client_id}`}
        </Link>
      ),
    },
    {
      key: 'plan.name',
      label: 'Plan',
      sortable: true,
      render: (_v, s) => s.plan?.name ?? `Plan #${s.plan_id}`,
    },
    {
      key: 'end_date',
      label: 'Date de fin',
      sortable: true,
      render: (_v, s) => formatDate(s.end_date, false),
    },
    {
      key: 'end_date',
      label: expiryFilter === 'soon' ? 'Jours restants' : 'Jours de retard',
      align: 'center',
      render: (_v, s) => `${Math.abs(daysUntil(s.end_date))} j`,
    },
    {
      key: 'status',
      label: 'Statut',
      render: (_v, s) => <SubscriptionStatusBadge status={s.status} />,
    },
  ], [expiryFilter, daysUntil])

  const expiryActions = useMemo<Action<ApiOrganizationSubscription>[]>(() => [
    {
      label: 'Voir',
      icon: Eye,
      variant: 'primary',
      onClick: (s) => navigate(`/subscriptions/${s.id}`),
    },
  ], [navigate])

  function n(v: number) {
    return String(v)
  }

  return (
    <div>
      <AdminPageHeader
        title="Tableau de bord"
        description="Vue d’ensemble des demandes, organisations et utilisateurs sur la période sélectionnée."
        action={
          <DateRangePicker
            from={range.from}
            to={range.to}
            onRangeChange={(from, to) => setRange({ from, to })}
          />
        }
      />

      {error && (
        <div
          className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          role="status"
        >
          {error}
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-[#3B82F6]/15 p-3 text-[#3B82F6]">
              <ClipboardList className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">
                Demandes en attente
              </p>
              <p className="text-2xl font-semibold text-gray-900">
                {loading ? '—' : n(pendingInRange)}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-500/15 p-3 text-emerald-700">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">
                Nouvelles organisations
              </p>
              <p className="text-2xl font-semibold text-gray-900">
                {loading ? '—' : n(orgsInRange.length)}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-violet-500/15 p-3 text-violet-700">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Nouveaux utilisateurs</p>
              <p className="text-2xl font-semibold text-gray-900">
                {loading ? '—' : n(usersInRange.length)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm lg:col-span-2">
          <header className="mb-6">
            <h2 className="text-lg font-bold text-gray-900">
              Nouvelles organisations
            </h2>
            <p className="text-sm text-gray-500">Sur la période sélectionnée</p>
          </header>
          <div className="h-[280px] w-full">
            {loading ? (
              <ChartSkeleton />
            ) : !hasOrgTrend ? (
              <ChartEmpty />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={orgTrend}>
                  <defs>
                    <linearGradient id="colorOrgs" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="month"
                    stroke="#94A3B8"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#94A3B8"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(val) => [String(val), 'Organisations']}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    name="Organisations"
                    stroke="#3B82F6"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorOrgs)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <header className="mb-6">
            <h2 className="text-lg font-bold text-gray-900">
              Abonnements par plan
            </h2>
            <p className="text-sm text-gray-500">Créés sur la période</p>
          </header>
          <div className="h-[280px] w-full">
            {loading ? (
              <ChartSkeleton />
            ) : !hasPlanData ? (
              <ChartEmpty />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={planData}
                    dataKey="count"
                    nameKey="plan"
                    innerRadius={58}
                    outerRadius={88}
                    paddingAngle={2}
                    stroke="#fff"
                    strokeWidth={2}
                  >
                    {planData.map((entry) => (
                      <Cell key={entry.plan} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(val, name) => [String(val), String(name)]}
                  />
                  <Legend
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    iconType="circle"
                    wrapperStyle={{ fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm lg:col-span-3">
          <header className="mb-6">
            <h2 className="text-lg font-bold text-gray-900">
              Demandes d’inscription
            </h2>
            <p className="text-sm text-gray-500">Par statut, sur la période sélectionnée</p>
          </header>
          <div className="h-[280px] w-full">
            {loading ? (
              <ChartSkeleton />
            ) : !hasRequestTrend ? (
              <ChartEmpty />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={requestTrend} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="month"
                    stroke="#94A3B8"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#94A3B8"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
                  <Bar
                    dataKey="approved"
                    name="Approuvées"
                    stackId="req"
                    fill="#10B981"
                    stroke="#fff"
                    strokeWidth={2}
                    maxBarSize={24}
                  />
                  <Bar
                    dataKey="pending"
                    name="En attente"
                    stackId="req"
                    fill="#F59E0B"
                    stroke="#fff"
                    strokeWidth={2}
                    maxBarSize={24}
                  />
                  <Bar
                    dataKey="rejected"
                    name="Refusées"
                    stackId="req"
                    fill="#EF4444"
                    stroke="#fff"
                    strokeWidth={2}
                    maxBarSize={24}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Abonnements à surveiller
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Organisations dont l’abonnement arrive à échéance ou a expiré.
            </p>
          </div>
          <div className="flex w-fit gap-2">
            <button
              type="button"
              onClick={() => setExpiryFilter('soon')}
              className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-all ${
                expiryFilter === 'soon'
                  ? 'border-amber-500 bg-amber-500 text-white shadow-md shadow-amber-500/30'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-amber-300 hover:text-amber-700'
              }`}
            >
              <Clock className="h-4 w-4" />
              Bientôt expirées
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                  expiryFilter === 'soon' ? 'bg-white/20' : 'bg-amber-50 text-amber-700'
                }`}
              >
                {expiringSoon.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setExpiryFilter('expired')}
              className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-all ${
                expiryFilter === 'expired'
                  ? 'border-red-500 bg-red-500 text-white shadow-md shadow-red-500/30'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-red-300 hover:text-red-700'
              }`}
            >
              <AlertTriangle className="h-4 w-4" />
              Déjà expirées
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                  expiryFilter === 'expired' ? 'bg-white/20' : 'bg-red-50 text-red-700'
                }`}
              >
                {alreadyExpired.length}
              </span>
            </button>
          </div>
        </div>

        <DataTable
          data={expiryRows}
          columns={expiryColumns}
          actions={expiryActions}
          loading={loading}
          searchable
          searchPlaceholder="Rechercher une organisation…"
          exportFilename={expiryFilter === 'soon' ? 'abonnements-bientot-expires' : 'abonnements-expires'}
          emptyMessage={
            expiryFilter === 'soon'
              ? "Aucun abonnement n’expire dans les 30 prochains jours."
              : 'Aucun abonnement expiré.'
          }
        />
      </div>
    </div>
  )
}

function ChartSkeleton() {
  return (
    <div className="flex h-full w-full items-end gap-3 px-2">
      {[40, 65, 50, 80, 60, 90].map((h, i) => (
        <div
          key={i}
          className="flex-1 animate-pulse rounded-t-md bg-gray-100"
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  )
}

function ChartEmpty() {
  return (
    <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">
      Aucune donnée sur cette période.
    </div>
  )
}
