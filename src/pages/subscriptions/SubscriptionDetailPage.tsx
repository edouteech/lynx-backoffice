import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Trash2, CalendarX2 } from 'lucide-react'
import { apiFetch } from '../../lib/api'
import type { ApiOrganizationSubscription } from '../../types/apiAdmin'
import { SubscriptionStatusBadge, formatDate } from './subscriptionUi'

export default function SubscriptionDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [sub, setSub] = useState<ApiOrganizationSubscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch<ApiOrganizationSubscription>(`/Admin/subscriptions/${id}`)
      setSub(res)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des détails.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [id])

  async function handleForceExpire() {
    if (!window.confirm("Êtes-vous sûr de vouloir forcer l'expiration de cet abonnement immédiatement ?")) return
    
    setActionLoading(true)
    setError(null)
    try {
      await apiFetch(`/Admin/subscriptions/${id}/expire`, { method: 'POST' })
      await loadData()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur lors de l'expiration")
    } finally {
      setActionLoading(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm("Ceci va supprimer définitivement l'historique de cet abonnement. Confirmer ?")) return
    
    setActionLoading(true)
    setError(null)
    try {
      await apiFetch(`/Admin/subscriptions/${id}`, { method: 'DELETE' })
      navigate('/subscriptions', { replace: true })
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur lors de la suppression")
      setActionLoading(false)
    }
  }

  if (loading && !sub) {
    return (
      <div className="ml-64 min-h-screen flex-1 bg-[#EFF6FF] p-8">
        <div className="text-center text-gray-500 mt-12">Chargement…</div>
      </div>
    )
  }

  if (error && !sub) {
    return (
      <div className="ml-64 min-h-screen flex-1 bg-[#EFF6FF] p-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          {error}
        </div>
      </div>
    )
  }

  if (!sub) return null

  return (
    <div className="ml-64 min-h-screen flex-1 bg-[#EFF6FF] p-8">
      <Link
        to="/subscriptions"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-[#3B82F6] hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux abonnements
      </Link>

      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900 flex items-center gap-3">
            Abonnement #{sub.id}
            <SubscriptionStatusBadge status={sub.status} />
          </h1>
        </div>
        
        <div className="flex gap-2">
          {sub.status === 'active' && (
            <button
              onClick={() => void handleForceExpire()}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-100 px-4 py-2 text-sm font-medium text-amber-700 transition hover:bg-amber-200 disabled:opacity-50"
            >
              <CalendarX2 className="h-4 w-4" />
              Forcer l'expiration
            </button>
          )}
          <button
            onClick={() => void handleDelete()}
            disabled={actionLoading}
            className="inline-flex items-center gap-2 rounded-lg bg-red-100 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-200 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            Supprimer
          </button>
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 border-b border-gray-100 pb-2">
            Détails de la souscription
          </h2>
          <dl className="space-y-4 text-sm">
            <div className="grid grid-cols-1 gap-1 sm:grid-cols-3 sm:gap-4">
              <dt className="font-medium text-gray-500">Organisation</dt>
              <dd className="text-gray-900 sm:col-span-2">
                <Link to={`/organizations/${sub.organization_id}`} className="text-[#3B82F6] hover:underline">
                  {sub.organization?.name || `ID: ${sub.organization_id}`}
                </Link>
              </dd>
            </div>
            <div className="grid grid-cols-1 gap-1 sm:grid-cols-3 sm:gap-4">
              <dt className="font-medium text-gray-500">Plan</dt>
              <dd className="text-gray-900 sm:col-span-2">
                {sub.plan?.name || `ID: ${sub.plan_id}`}
              </dd>
            </div>
            <div className="grid grid-cols-1 gap-1 sm:grid-cols-3 sm:gap-4">
              <dt className="font-medium text-gray-500">Montant</dt>
              <dd className="text-gray-900 sm:col-span-2">
                {sub.amount} {sub.currency}
              </dd>
            </div>
            <div className="grid grid-cols-1 gap-1 sm:grid-cols-3 sm:gap-4">
              <dt className="font-medium text-gray-500">Paiement</dt>
              <dd className="text-gray-900 sm:col-span-2">
                {sub.payment_reference || '—'}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 border-b border-gray-100 pb-2">
            Cycle de vie
          </h2>
          <div className="relative border-l-2 border-gray-100 pl-4 space-y-6 py-2 ml-2">
            
            <div className="relative">
              <div className="absolute -left-[25px] top-1 h-3 w-3 rounded-full border-2 border-white bg-blue-500"></div>
              <p className="text-xs font-semibold uppercase text-gray-500">Créé le</p>
              <p className="text-sm font-medium text-gray-900">{formatDate(sub.created_at)}</p>
            </div>

            <div className="relative">
              <div className="absolute -left-[25px] top-1 h-3 w-3 rounded-full border-2 border-white bg-emerald-500"></div>
              <p className="text-xs font-semibold uppercase text-gray-500">Débute le</p>
              <p className="text-sm font-medium text-gray-900">{formatDate(sub.starts_at)}</p>
            </div>

            <div className="relative">
              <div className={`absolute -left-[25px] top-1 h-3 w-3 rounded-full border-2 border-white ${sub.status === 'expired' ? 'bg-red-500' : 'bg-gray-300'}`}></div>
              <p className="text-xs font-semibold uppercase text-gray-500">Fin prévue</p>
              <p className="text-sm font-medium text-gray-900">{formatDate(sub.ends_at)}</p>
            </div>

            {sub.cancelled_at && (
              <div className="relative">
                <div className="absolute -left-[25px] top-1 h-3 w-3 rounded-full border-2 border-white bg-gray-500"></div>
                <p className="text-xs font-semibold uppercase text-gray-500">Annulé le</p>
                <p className="text-sm font-medium text-gray-900">{formatDate(sub.cancelled_at)}</p>
              </div>
            )}
            
          </div>
        </div>
      </div>
    </div>
  )
}
