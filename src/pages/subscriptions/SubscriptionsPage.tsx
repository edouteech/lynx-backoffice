import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Eye, X, Save, Trash2, CalendarX2 } from 'lucide-react'
import AdminModal from '../../components/AdminModal'
import TableExportButton from '../../components/TableExportButton'
import { apiFetch } from '../../lib/api'
import type { ApiOrganizationSubscription, ApiOrganization, ApiPlan, LaravelPaginator } from '../../types/apiAdmin'
import { SubscriptionStatusBadge, formatDate } from './subscriptionUi'

export default function SubscriptionsPage() {
  const [rows, setRows] = useState<ApiOrganizationSubscription[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [organizations, setOrganizations] = useState<ApiOrganization[]>([])
  const [plans, setPlans] = useState<ApiPlan[]>([])
  const [depsLoaded, setDepsLoaded] = useState(false)

  const [q, setQ] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  
  const [orgId, setOrgId] = useState('')
  const [planId, setPlanId] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch<LaravelPaginator<ApiOrganizationSubscription>>(
        '/Admin/subscriptions?per_page=100'
      )
      setRows(res.data ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chargement impossible.')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const t = requestAnimationFrame(() => {
      void load()
    })
    return () => cancelAnimationFrame(t)
  }, [load])

  const loadDependencies = useCallback(async () => {
    try {
      const [orgsRes, plansRes] = await Promise.all([
        apiFetch<LaravelPaginator<ApiOrganization>>('/Admin/organizations?per_page=100'),
        apiFetch<any>('/plans?per_page=100')
      ])
      setOrganizations(orgsRes.data ?? [])
      setPlans(Array.isArray(plansRes) ? plansRes : (plansRes.data ?? []))
      setDepsLoaded(true)
    } catch (e) {
      console.error(e)
    }
  }, [])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return rows
    return rows.filter((r) => {
      const orgName = r.organization?.name ?? ''
      const planName = r.plan?.name ?? ''
      return (
        orgName.toLowerCase().includes(s) ||
        planName.toLowerCase().includes(s) ||
        r.id.toString().includes(s)
      )
    })
  }, [rows, q])

  const exportRows = useMemo(() => {
    return filtered.map((r) => [
      r.id.toString(),
      r.organization?.name ?? `ID: ${r.organization_id}`,
      r.plan?.name ?? `ID: ${r.plan_id}`,
      r.amount?.toString() ?? '',
      r.currency ?? '',
      r.starts_at ? formatDate(r.starts_at) : '',
      r.ends_at ? formatDate(r.ends_at) : '',
      r.status,
    ])
  }, [filtered])

  function openCreate() {
    if (!depsLoaded) {
      void loadDependencies()
    }
    setOrgId('')
    setPlanId('')
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    if (!orgId || !planId) {
      setError('Veuillez sélectionner une organisation et un plan.')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      await apiFetch<ApiOrganizationSubscription>('/Admin/subscriptions', {
        method: 'POST',
        json: {
          organization_id: Number(orgId),
          plan_id: Number(planId),
        },
      })
      await load()
      closeModal()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleForceExpire(id: number) {
    if (!window.confirm("Êtes-vous sûr de vouloir forcer l'expiration de cet abonnement immédiatement ?")) return
    
    try {
      await apiFetch(`/Admin/subscriptions/${id}/expire`, { method: 'POST' })
      await load()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur lors de l'expiration")
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm("Ceci va supprimer définitivement l'historique de cet abonnement. Confirmer ?")) return
    
    try {
      await apiFetch(`/Admin/subscriptions/${id}`, { method: 'DELETE' })
      await load()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur lors de la suppression")
    }
  }

  return (
    <div className="ml-64 min-h-screen flex-1 bg-[#EFF6FF] p-8">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900 flex items-center gap-2">
            Abonnements
          </h1>
          <p className="mt-1 text-gray-600">
            Gérez les licences et abonnements des organisations.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex w-fit items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-medium text-white hover:bg-[#2563EB]"
        >
          <Plus className="h-4 w-4" />
          Nouvel abonnement
        </button>
      </header>

      {error && (
        <div
          className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="relative min-w-0 max-w-md flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher par organisation, plan ou ID..."
              className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-[#3B82F6] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
            />
          </div>
          <TableExportButton
            filename="abonnements"
            title="Abonnements"
            headers={['ID', 'Organisation', 'Plan', 'Montant', 'Devise', 'Début', 'Fin', 'Statut']}
            rows={exportRows}
          />
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="px-6 py-12 text-center text-gray-500">Chargement...</div>
          ) : (
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-gray-600">
                  <th className="px-6 py-3 font-semibold">Organisation</th>
                  <th className="px-6 py-3 font-semibold">Plan</th>
                  <th className="px-6 py-3 font-semibold">Montant</th>
                  <th className="px-6 py-3 font-semibold">Période</th>
                  <th className="px-6 py-3 font-semibold">Statut</th>
                  <th className="px-6 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-10 text-center text-gray-500"
                    >
                      {rows.length === 0
                        ? 'Aucun abonnement trouvé.'
                        : 'Aucun résultat pour cette recherche.'}
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => (
                    <tr
                      key={r.id}
                      className={`border-b border-gray-100 last:border-0 ${
                        r.status !== 'active' ? 'bg-gray-50/80' : ''
                      }`}
                    >
                      <td className="px-6 py-4 font-medium text-gray-900">
                        <Link
                          to={`/organizations/${r.organization_id}`}
                          className="text-[#3B82F6] hover:underline"
                        >
                          {r.organization?.name ?? `Org #${r.organization_id}`}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-gray-700">
                        {r.plan?.name ?? `Plan #${r.plan_id}`}
                      </td>
                      <td className="px-6 py-4 text-gray-700">
                        {r.amount} {r.currency}
                      </td>
                      <td className="px-6 py-4 text-gray-700">
                        <div className="text-xs">Du {formatDate(r.starts_at)}</div>
                        <div className="text-xs">Au {formatDate(r.ends_at)}</div>
                      </td>
                      <td className="px-6 py-4">
                        <SubscriptionStatusBadge status={r.status} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap justify-end gap-2">
                          {r.status === 'active' && (
                            <button
                              onClick={() => void handleForceExpire(r.id)}
                              aria-label={`Forcer l'expiration`}
                              title={`Forcer l'expiration`}
                              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-100 text-amber-700 shadow-sm transition-colors hover:bg-amber-200"
                            >
                              <CalendarX2 className="h-4 w-4" aria-hidden />
                            </button>
                          )}
                          <Link
                            to={`/subscriptions/${r.id}`}
                            aria-label={`Voir la fiche`}
                            title={`Voir la fiche`}
                            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#3B82F6]/30 bg-[#3B82F6] text-white shadow-sm transition-colors hover:bg-[#2563EB]"
                          >
                            <Eye className="h-4 w-4" aria-hidden />
                          </Link>
                          <button
                            onClick={() => void handleDelete(r.id)}
                            aria-label={`Supprimer`}
                            title={`Supprimer`}
                            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-red-500/30 bg-red-100 text-red-700 shadow-sm transition-colors hover:bg-red-200"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <AdminModal
        open={modalOpen}
        title="Nouvel abonnement"
        onClose={closeModal}
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeModal}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <X className="h-4 w-4 shrink-0" aria-hidden />
              Annuler
            </button>
            <button
              type="submit"
              form="sub-form"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-medium text-white hover:bg-[#2563EB] disabled:opacity-50"
            >
              <Save className="h-4 w-4 shrink-0" aria-hidden />
              {submitting ? 'Enregistrement...' : 'Créer l\'abonnement'}
            </button>
          </div>
        }
      >
        <form id="sub-form" onSubmit={(e) => void handleSave(e)} className="space-y-6">
          <p className="text-sm text-gray-600">
            Ajouter un abonnement pour une organisation. Si un abonnement est déjà en cours, le nouveau s'ajoutera à la suite sans couper l'abonnement actuel.
          </p>
          
          <div>
            <label
              htmlFor="sub-org"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Organisation <span className="text-red-500">*</span>
            </label>
            <select
              id="sub-org"
              required
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30"
            >
              <option value="">Sélectionnez une organisation...</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="sub-plan"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Plan <span className="text-red-500">*</span>
            </label>
            <select
              id="sub-plan"
              required
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30"
            >
              <option value="">Sélectionnez un plan...</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} - {p.price} {p.currency}
                </option>
              ))}
            </select>
          </div>
        </form>
      </AdminModal>
    </div>
  )
}
