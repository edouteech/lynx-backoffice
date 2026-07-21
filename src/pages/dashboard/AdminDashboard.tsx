import { useEffect, useMemo, useState } from 'react'
import { Building2, ClipboardList, Users } from 'lucide-react'
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
import { apiFetch } from '../../lib/api'
import type {
  ApiOrgRegistrationRequest,
  ApiOrganization,
  ApiOrganizationSubscription,
  ApiAdminUser,
  LaravelPaginator,
} from '../../types/apiAdmin'

const TOOLTIP_STYLE = {
  borderRadius: '12px',
  border: 'none',
  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
}

const SUBSCRIPTION_STATUS_META: Record<string, { label: string; color: string }> = {
  trial: { label: 'Essai', color: '#3B82F6' },
  active: { label: 'Actif', color: '#10B981' },
  suspended: { label: 'Suspendu', color: '#F59E0B' },
  cancelled: { label: 'Annulé', color: '#9CA3AF' },
  expired: { label: 'Expiré', color: '#F43F5E' },
}

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
  const [range, setRange] = useState(defaultYearRange)
  const fromDate = useMemo(() => new Date(range.from), [range.from])
  const toDate = useMemo(() => new Date(range.to), [range.to])

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

  const subscriptionStatusData = useMemo(() => {
    const counts = subscriptionsInRange.reduce<Record<string, number>>((acc, s) => {
      acc[s.status] = (acc[s.status] ?? 0) + 1
      return acc
    }, {})
    return Object.entries(counts).map(([status, count]) => ({
      status,
      label: SUBSCRIPTION_STATUS_META[status]?.label ?? status,
      color: SUBSCRIPTION_STATUS_META[status]?.color ?? '#9CA3AF',
      count,
    }))
  }, [subscriptionsInRange])
  const hasSubscriptionData = subscriptionStatusData.length > 0

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
              Abonnements par statut
            </h2>
            <p className="text-sm text-gray-500">Créés sur la période</p>
          </header>
          <div className="h-[280px] w-full">
            {loading ? (
              <ChartSkeleton />
            ) : !hasSubscriptionData ? (
              <ChartEmpty />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={subscriptionStatusData}
                    dataKey="count"
                    nameKey="label"
                    innerRadius={58}
                    outerRadius={88}
                    paddingAngle={2}
                    stroke="#fff"
                    strokeWidth={2}
                  >
                    {subscriptionStatusData.map((entry) => (
                      <Cell key={entry.status} fill={entry.color} />
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
