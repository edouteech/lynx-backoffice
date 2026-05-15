import { useCallback, useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Trash2, CalendarX2, CheckCircle2, CreditCard,
  X, Save, Rocket, Edit,
} from 'lucide-react'
import { apiFetch } from '../../lib/api'
import type {
  ApiOrganizationSubscription,
  ApiSubscriptionCycle,
  ApiPlan,
} from '../../types/apiAdmin'
import { SubscriptionStatusBadge, CycleStatusBadge, formatDate } from './subscriptionUi'
import AdminModal from '../../components/AdminModal'
import Swal from 'sweetalert2'

export default function SubscriptionDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [sub, setSub] = useState<ApiOrganizationSubscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Payment Modal
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [selectedCycle, setSelectedCycle] = useState<ApiSubscriptionCycle | null>(null)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [paymentRef, setPaymentRef] = useState('')

  // Activate Modal (trial → active)
  const [activateModalOpen, setActivateModalOpen] = useState(false)
  const [plans, setPlans] = useState<ApiPlan[]>([])
  const [plansLoading, setPlansLoading] = useState(false)
  const [actPlanId, setActPlanId] = useState('')
  const [actCustomPrice, setActCustomPrice] = useState('')
  const [actFrequency, setActFrequency] = useState<'monthly' | 'quarterly' | 'semiannual' | 'yearly'>('monthly')
  const [activating, setActivating] = useState(false)
  const [activateError, setActivateError] = useState<string | null>(null)
  
  // Grace Date Modal
  const [graceModalOpen, setGraceModalOpen] = useState(false)
  const [newGraceDate, setNewGraceDate] = useState('')

  // End Date Modal
  const [endDateModalOpen, setEndDateModalOpen] = useState(false)
  const [newEndDate, setNewEndDate] = useState('')

  const loadData = useCallback(async () => {
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
  }, [id])

  useEffect(() => { void loadData() }, [loadData])

  async function loadPlans() {
    if (plans.length > 0) return
    setPlansLoading(true)
    try {
      const data = await apiFetch<ApiPlan[]>('/Admin/plans')
      setPlans(data)
    } catch {
      setPlans([])
    } finally {
      setPlansLoading(false)
    }
  }

  function openActivateModal() {
    // Pre-fill from current trial subscription
    if (sub) {
      setActPlanId(String(sub.plan_id))
      setActCustomPrice(String(sub.custom_price))
    }
    setActFrequency('monthly')
    setActivateError(null)
    setActivateModalOpen(true)
    void loadPlans()
  }

  async function handleActivate(e: React.FormEvent) {
    e.preventDefault()
    if (!sub || !actPlanId) return
    setActivating(true)
    setActivateError(null)
    try {
      await apiFetch<ApiOrganizationSubscription>('/Admin/subscriptions', {
        method: 'POST',
        json: {
          client_id: sub.client_id,
          plan_id: Number(actPlanId),
          payment_frequency: actFrequency,
          ...(actCustomPrice !== '' ? { custom_price: Number(actCustomPrice) } : {}),
        },
      })
      setActivateModalOpen(false)
      navigate('/subscriptions')
    } catch (err) {
      setActivateError(err instanceof Error ? err.message : 'Erreur lors de la création de l\'abonnement.')
    } finally {
      setActivating(false)
    }
  }

  async function handleForceExpire() {
    const result = await Swal.fire({
      title: "Confirmer l'expiration",
      text: "Êtes-vous sûr de vouloir forcer l'expiration de cet abonnement immédiatement ?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Oui, expirer',
      cancelButtonText: 'Annuler'
    })

    if (!result.isConfirmed) return
    
    setActionLoading(true)
    try {
      await apiFetch(`/Admin/subscriptions/${id}/expire`, { method: 'POST' })
      await loadData()
      await Swal.fire('Expiré !', 'L\'abonnement a été expiré.', 'success')
    } catch (err) {
      await Swal.fire('Erreur', err instanceof Error ? err.message : "Erreur lors de l'expiration", 'error')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleDelete() {
    const result = await Swal.fire({
      title: 'Suppression définitive',
      text: "Ceci va supprimer définitivement l'historique de cet abonnement. Confirmer ?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Oui, supprimer',
      cancelButtonText: 'Annuler'
    })

    if (!result.isConfirmed) return

    setActionLoading(true)
    try {
      await apiFetch(`/Admin/subscriptions/${id}`, { method: 'DELETE' })
      await Swal.fire('Supprimé !', 'L\'abonnement a été supprimé.', 'success')
      navigate('/subscriptions')
    } catch (err) {
      await Swal.fire('Erreur', err instanceof Error ? err.message : "Erreur lors de la suppression", 'error')
    } finally {
      setActionLoading(false)
    }
  }

  function openPaymentModal(cycle: ApiSubscriptionCycle) {
    setSelectedCycle(cycle)
    setPaymentRef('')
    setPaymentMethod('cash')
    setPaymentModalOpen(true)
  }

  async function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedCycle) return
    setActionLoading(true)
    try {
      await apiFetch(`/Admin/cycles/${selectedCycle.id}/pay`, {
        method: 'POST',
        json: { payment_method: paymentMethod, transaction_reference: paymentRef },
      })
      setPaymentModalOpen(false)
      await loadData()
      await Swal.fire('Payé !', 'Le paiement a été enregistré avec succès.', 'success')
    } catch (err) {
      await Swal.fire('Erreur', err instanceof Error ? err.message : "Erreur lors du paiement", 'error')
    } finally {
      setActionLoading(false)
    }
  }
  function openGraceModal(cycle: ApiSubscriptionCycle) {
    setSelectedCycle(cycle)
    setNewGraceDate(cycle.grace_end_date)
    setGraceModalOpen(true)
  }

  async function handleUpdateGrace(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedCycle || !newGraceDate) return
    setActionLoading(true)
    try {
      await apiFetch(`/Admin/cycles/${selectedCycle.id}`, {
        method: 'PATCH',
        json: { grace_end_date: newGraceDate },
      })
      setGraceModalOpen(false)
      await loadData()
      await Swal.fire('Mis à jour !', 'La date de grâce a été modifiée.', 'success')
    } catch (err) {
      await Swal.fire('Erreur', err instanceof Error ? err.message : "Erreur lors de la mise à jour", 'error')
    } finally {
      setActionLoading(false)
    }
  }

  function openEndDateModal() {
    if (!sub) return
    setNewEndDate(sub.end_date)
    setEndDateModalOpen(true)
  }

  async function handleUpdateEndDate(e: React.FormEvent) {
    e.preventDefault()
    if (!sub || !newEndDate) return
    setActionLoading(true)
    try {
      await apiFetch(`/Admin/subscriptions/${sub.id}`, {
        method: 'PATCH',
        json: { end_date: newEndDate },
      })
      setEndDateModalOpen(false)
      await loadData()
      await Swal.fire('Mis à jour !', 'La date de fin a été modifiée.', 'success')
    } catch (err) {
      await Swal.fire('Erreur', err instanceof Error ? err.message : "Erreur lors de la mise à jour", 'error')
    } finally {
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
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">{error}</div>
      </div>
    )
  }

  if (!sub) return null

  const isTrial = sub.status === 'trial'

  // Get the next month's 1st for display
  const nextMonthFirst = (() => {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() + 1)
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  })()

  return (
    <>
      {/* ── Activate Modal ────────────────────────────────────── */}
      <AdminModal
        open={activateModalOpen}
        title="Créer l'abonnement annuel"
        onClose={() => setActivateModalOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setActivateModalOpen(false)}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              <X className="h-4 w-4 shrink-0" /> Annuler
            </button>
            <button type="submit" form="activate-form" disabled={activating}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
              <Rocket className="h-4 w-4 shrink-0" />
              {activating ? 'Création…' : 'Activer l\'abonnement'}
            </button>
          </div>
        }
      >
        <form id="activate-form" onSubmit={(e) => void handleActivate(e)} className="space-y-5">
          {/* Info banner */}
          <div className="rounded-lg border border-[#3B82F6]/20 bg-[#EFF6FF] px-4 py-3">
            <p className="text-sm font-medium text-[#1E3A5F]">
              📋 Contrat annuel — démarrage le <strong>{nextMonthFirst}</strong>
            </p>
            <p className="mt-1 text-xs text-gray-500">
              La période d'essai en cours restera visible dans l'historique. Le nouvel abonnement actif démarrera le 1er du mois prochain avec ses cycles générés automatiquement.
            </p>
          </div>

          {activateError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {activateError}
            </div>
          )}

          {/* Plan */}
          <div>
            <label htmlFor="act-plan" className="mb-1.5 block text-sm font-medium text-gray-700">
              Offre (plan) <span className="text-red-500">*</span>
            </label>
            {plansLoading ? (
              <div className="h-10 animate-pulse rounded-lg bg-gray-100" />
            ) : (
              <select id="act-plan" required value={actPlanId}
                onChange={(e) => {
                  const pid = e.target.value
                  setActPlanId(pid)
                  const plan = plans.find((p) => String(p.id) === pid)
                  if (plan) setActCustomPrice(plan.annual_price)
                }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30">
                <option value="">— Sélectionner un plan —</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {Number(p.annual_price).toLocaleString()} XOF/an
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Custom price */}
          <div>
            <label htmlFor="act-price" className="mb-1.5 block text-sm font-medium text-gray-700">
              Montant annuel (XOF)
              <span className="ml-2 text-xs font-normal text-gray-400">personnalisable</span>
            </label>
            <input id="act-price" type="number" min={0} step={1000}
              placeholder="Ex : 120 000"
              value={actCustomPrice}
              onChange={(e) => setActCustomPrice(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30" />
            <p className="mt-1 text-xs text-gray-500">
              Laissez le tarif du plan si aucune négociation. Ce montant sera réparti selon la fréquence choisie.
            </p>
          </div>

          {/* Frequency */}
          <div>
            <label htmlFor="act-freq" className="mb-1.5 block text-sm font-medium text-gray-700">
              Fréquence de paiement <span className="text-red-500">*</span>
            </label>
            <select id="act-freq" required value={actFrequency}
              onChange={(e) => setActFrequency(e.target.value as 'monthly' | 'quarterly' | 'semiannual' | 'yearly')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30">
              <option value="monthly">Mensuel (12 cycles)</option>
              <option value="quarterly">Trimestriel (4 cycles)</option>
              <option value="semiannual">Semestriel (2 cycles)</option>
              <option value="yearly">Annuel (1 cycle)</option>
            </select>
          </div>
        </form>
      </AdminModal>

      {/* ── Page ────────────────────────────────────────────────── */}
      <div className="ml-64 min-h-screen flex-1 bg-[#EFF6FF] p-8">
        <Link to="/subscriptions"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-[#3B82F6] hover:underline">
          <ArrowLeft className="h-4 w-4" /> Retour aux abonnements
        </Link>

        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900 flex items-center gap-3">
              Abonnement
              <SubscriptionStatusBadge status={sub.status} />
            </h1>
          </div>

          <div className="flex flex-wrap gap-2">
            {isTrial && (
              <button onClick={openActivateModal} disabled={actionLoading}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50">
                <Rocket className="h-4 w-4" /> Créer l'abonnement annuel
              </button>
            )}
            {sub.status === 'active' && (
              <button onClick={() => void handleForceExpire()} disabled={actionLoading}
                className="inline-flex items-center gap-2 rounded-lg bg-amber-100 px-4 py-2 text-sm font-medium text-amber-700 transition hover:bg-amber-200 disabled:opacity-50">
                <CalendarX2 className="h-4 w-4" /> Forcer l'expiration
              </button>
            )}
            <button onClick={() => void handleDelete()} disabled={actionLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-red-100 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-200 disabled:opacity-50">
              <Trash2 className="h-4 w-4" /> Supprimer
            </button>
          </div>
        </header>

        {/* Trial banner */}
        {isTrial && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 flex items-start gap-3">
            <span className="text-2xl">⏳</span>
            <div>
              <p className="font-semibold text-amber-900">Période d'essai en cours</p>
              <p className="mt-0.5 text-sm text-amber-700">
                L'essai se termine le <strong>{formatDate(sub.end_date, false)}</strong>
                . Pour créer l'abonnement annuel qui démarrera le <strong>{nextMonthFirst}</strong>, cliquez sur
                &nbsp;<strong>Créer l'abonnement annuel</strong>.
              </p>
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Contract details */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 border-b border-gray-100 pb-2">
              {isTrial ? 'Période d\'essai' : 'Détails du contrat annuel'}
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
              <dl className="space-y-4 text-sm">
                <div className="flex flex-col">
                  <dt className="font-medium text-gray-500">Organisation</dt>
                  <dd className="text-gray-900 font-semibold text-base">
                    <Link to={`/organizations/${sub.client_id}`} className="text-[#3B82F6] hover:underline">
                      {sub.organization?.name || `ID: ${sub.client_id}`}
                    </Link>
                  </dd>
                </div>
                <div className="flex flex-col">
                  <dt className="font-medium text-gray-500">Offre</dt>
                  <dd className="text-gray-900 text-base font-semibold">
                    {sub.plan?.name || `ID: ${sub.plan_id}`}
                  </dd>
                </div>
                <div className="flex flex-col">
                  <dt className="font-medium text-gray-500">Prix annuel (négocié)</dt>
                  <dd className="text-gray-900 text-lg font-bold text-emerald-600">
                    {Number(sub.custom_price).toLocaleString()} XOF
                  </dd>
                </div>
              </dl>
              <dl className="space-y-4 text-sm">
                <div className="flex flex-col">
                  <dt className="font-medium text-gray-500">Fréquence de paiement</dt>
                  <dd className="text-gray-900 uppercase font-bold tracking-wider">
                    {sub.payment_frequency}
                  </dd>
                </div>
                <div className="flex flex-col">
                  <dt className="font-medium text-gray-500">Période</dt>
                  <dd className="text-gray-900">
                    Du <span className="font-semibold">{formatDate(sub.start_date, false)}</span>
                    {' '}au <span className="font-semibold">{formatDate(sub.end_date, false)}</span>
                    <button
                      onClick={openEndDateModal}
                      className="ml-2 inline-flex items-center justify-center h-6 w-6 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-[#3B82F6] transition-colors"
                      title="Modifier la date de fin"
                    >
                      <Edit className="h-3 w-3" />
                    </button>
                  </dd>
                </div>
                <div className="flex flex-col">
                  <dt className="font-medium text-gray-500">Créé le</dt>
                  <dd className="text-gray-900">{formatDate(sub.created_at)}</dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Status card */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" /> Statut Actuel
            </h2>
            <div className="flex flex-col items-center justify-center py-4">
              <SubscriptionStatusBadge status={sub.status} />
              <p className="mt-4 text-center text-sm text-gray-500">
                {sub.status === 'trial' && "Période d'essai jusqu'à la fin du mois. Aucun cycle généré."}
                {sub.status === 'active' && "L'abonnement est actif et les paiements sont à jour."}
                {sub.status === 'suspended' && "L'accès est suspendu en raison d'un impayé après la période de grâce."}
                {sub.status === 'cancelled' && "Le contrat a été annulé."}
              </p>
            </div>
          </div>

          {/* Cycles table */}
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm lg:col-span-3 overflow-hidden">
            <div className="border-b border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-[#3B82F6]" /> Échéancier de paiement (Cycles)
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Période</th>
                    <th className="px-6 py-3 font-semibold">Date d'échéance</th>
                    <th className="px-6 py-3 font-semibold">Grâce jusqu'au</th>
                    <th className="px-6 py-3 font-semibold">Montant</th>
                    <th className="px-6 py-3 font-semibold">Statut</th>
                    <th className="px-6 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sub.cycles?.map((cycle) => (
                    <tr key={cycle.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">Du {formatDate(cycle.period_start, false)}</div>
                        <div className="text-xs text-gray-500">Au {formatDate(cycle.period_end, false)}</div>
                      </td>
                      <td className="px-6 py-4 text-gray-700">{formatDate(cycle.due_date, false)}</td>
                      <td className="px-6 py-4 text-gray-700 italic">
                        <div className="flex items-center gap-2">
                          {formatDate(cycle.grace_end_date, false)}
                          <button
                            onClick={() => openGraceModal(cycle)}
                            aria-label="Modifier la date de grâce"
                            title="Modifier la date de grâce"
                            className="inline-flex items-center justify-center h-7 w-7 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-[#3B82F6] transition-colors"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-bold text-gray-900">{Number(cycle.amount).toLocaleString()} XOF</td>
                      <td className="px-6 py-4"><CycleStatusBadge status={cycle.status} /></td>
                      <td className="px-6 py-4 text-right">
                        {cycle.status !== 'paid' && cycle.status !== 'cancelled' && (
                          <button onClick={() => openPaymentModal(cycle)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#3B82F6] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#2563EB]">
                            Encaisser
                          </button>
                        )}
                        {cycle.status === 'paid' && (
                          <span className="text-emerald-600 font-medium text-xs flex items-center justify-end gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Réglé le {cycle.payments?.[0] ? formatDate(cycle.payments[0].paid_at, false) : '-'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!sub.cycles?.length && (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                        {isTrial
                          ? '⏳ Aucun cycle généré — l\'abonnement est encore en période d\'essai.'
                          : 'Aucun cycle de paiement pour cet abonnement.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Payment Modal */}
        <AdminModal open={paymentModalOpen} title="Enregistrer un paiement"
          onClose={() => setPaymentModalOpen(false)}
          footer={
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setPaymentModalOpen(false)}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                <X className="h-4 w-4 shrink-0" /> Annuler
              </button>
              <button type="submit" form="payment-form" disabled={actionLoading}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                <Save className="h-4 w-4 shrink-0" />
                {actionLoading ? 'Traitement...' : 'Confirmer le règlement'}
              </button>
            </div>
          }
        >
          <form id="payment-form" onSubmit={(e) => void handleRecordPayment(e)} className="space-y-4">
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 mb-4">
              <p className="text-sm text-blue-800">
                Enregistrement d'un paiement de <span className="font-bold">{Number(selectedCycle?.amount).toLocaleString()} XOF</span> pour la période du{' '}
                {selectedCycle && formatDate(selectedCycle.period_start, false)} au{' '}
                {selectedCycle && formatDate(selectedCycle.period_end, false)}.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Moyen de paiement</label>
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:ring-2 focus:ring-[#3B82F6]/30 focus:outline-none">
                <option value="cash">Espèces</option>
                <option value="bank_transfer">Virement bancaire</option>
                <option value="check">Chèque</option>
                <option value="mobile_money">Mobile Money</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Référence de transaction</label>
              <input type="text" value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)}
                placeholder="N° chèque, virement… (optionnel)"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:ring-2 focus:ring-[#3B82F6]/30 focus:outline-none" />
            </div>
          </form>
        </AdminModal>

        {/* Grace Date Modal */}
        <AdminModal
          open={graceModalOpen}
          title="Modifier la date de grâce"
          onClose={() => setGraceModalOpen(false)}
          footer={
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setGraceModalOpen(false)}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <X className="h-4 w-4 shrink-0" /> Annuler
              </button>
              <button
                type="submit"
                form="grace-form"
                disabled={actionLoading}
                className="inline-flex items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-medium text-white hover:bg-[#2563EB] disabled:opacity-50"
              >
                <Save className="h-4 w-4 shrink-0" />
                {actionLoading ? 'Mise à jour...' : 'Enregistrer'}
              </button>
            </div>
          }
        >
          <form id="grace-form" onSubmit={(e) => void handleUpdateGrace(e)} className="space-y-4">
            <div className="rounded-lg border border-[#3B82F6]/20 bg-[#EFF6FF] px-4 py-3 text-sm text-[#1E3A5F]">
              La <strong>date de grâce</strong> est la date limite avant laquelle l'organisation doit payer avant que l'accès ne soit automatiquement suspendu.
            </div>
            <div>
              <label htmlFor="grace-date" className="mb-1 block text-sm font-medium text-gray-700">
                Nouvelle date de grâce
              </label>
              <input
                id="grace-date"
                type="date"
                required
                value={newGraceDate}
                onChange={(e) => setNewGraceDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30"
              />
            </div>
          </form>
        </AdminModal>

        {/* End Date Modal */}
        <AdminModal
          open={endDateModalOpen}
          title="Modifier la date de fin"
          onClose={() => setEndDateModalOpen(false)}
          footer={
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEndDateModalOpen(false)}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <X className="h-4 w-4 shrink-0" /> Annuler
              </button>
              <button
                type="submit"
                form="end-date-form"
                disabled={actionLoading}
                className="inline-flex items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-medium text-white hover:bg-[#2563EB] disabled:opacity-50"
              >
                <Save className="h-4 w-4 shrink-0" />
                {actionLoading ? 'Mise à jour...' : 'Enregistrer'}
              </button>
            </div>
          }
        >
          <form id="end-date-form" onSubmit={(e) => void handleUpdateEndDate(e)} className="space-y-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              ⚠️ Attention : Modifier la date de fin d'un abonnement peut impacter l'accès de l'organisation.
            </div>
            <div>
              <label htmlFor="end-date" className="mb-1 block text-sm font-medium text-gray-700">
                Nouvelle date de fin
              </label>
              <input
                id="end-date"
                type="date"
                required
                value={newEndDate}
                onChange={(e) => setNewEndDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30"
              />
            </div>
          </form>
        </AdminModal>
      </div>
    </>
  )
}
