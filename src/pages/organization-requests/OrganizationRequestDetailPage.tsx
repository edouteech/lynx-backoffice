import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Check, X } from 'lucide-react'
import { apiFetch } from '../../lib/api'
import Swal from 'sweetalert2'
import type { ApiOrgRegistrationRequestDetail } from '../../types/apiAdmin'
import { formatDate, statusBadge } from './organizationRequestUi'

function dash(v: string | null | undefined) {
  const t = v?.trim()
  return t ? t : '—'
}

export default function OrganizationRequestDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [row, setRow] = useState<ApiOrgRegistrationRequestDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!id) {
      setRow(null)
      setError('Identifiant de demande manquant.')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch<ApiOrgRegistrationRequestDetail>(
        `/Admin/organization-registration-requests/${id}`,
      )
      setRow(data)
    } catch (e) {
      setRow(null)
      setError(e instanceof Error ? e.message : 'Chargement impossible.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    const t = requestAnimationFrame(() => { void load() })
    return () => cancelAnimationFrame(t)
  }, [load])

  async function handleApprove() {
    if (!id || !row) return
    
    const result = await Swal.fire({
      title: 'Approuver la demande ?',
      text: 'Un essai gratuit de 30 jours sera automatiquement activé pour cette organisation.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10B981',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Oui, approuver',
      cancelButtonText: 'Annuler'
    })

    if (!result.isConfirmed) return
    
    setBusy(true)
    setError(null)
    try {
      await apiFetch(`/Admin/organization-registration-requests/${id}/approve`, { method: 'POST' })
      await load()
      await Swal.fire('Approuvée !', 'L\'organisation a été créée avec succès.', 'success')
    } catch (e) {
      await Swal.fire('Erreur', e instanceof Error ? e.message : 'Approbation impossible.', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function handleReject() {
    if (!id || !row) return
    
    const { value: reason, isConfirmed } = await Swal.fire({
      title: 'Refuser la demande',
      input: 'textarea',
      inputLabel: 'Motif du refus (optionnel)',
      inputPlaceholder: 'Indiquez la raison du refus ici...',
      showCancelButton: true,
      confirmButtonText: 'Refuser',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#EF4444',
    })

    if (!isConfirmed) return
    
    setBusy(true)
    setError(null)
    try {
      await apiFetch(`/Admin/organization-registration-requests/${id}/reject`, {
        method: 'POST',
        json: { rejection_reason: reason?.trim() || null },
      })
      await load()
      await Swal.fire('Refusée', 'La demande a été rejetée.', 'info')
    } catch (e) {
      await Swal.fire('Erreur', e instanceof Error ? e.message : 'Refus impossible.', 'error')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="ml-64 min-h-screen flex-1 bg-[#EFF6FF] px-6 py-10 lg:px-10">
        <p className="text-gray-600">Chargement…</p>
      </div>
    )
  }

  if (error || !row) {
    return (
      <div className="ml-64 min-h-screen flex-1 bg-[#EFF6FF] px-6 py-10 lg:px-10">
        <Link to="/organization-requests" className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-[#3B82F6] hover:text-[#2563EB]">
          <ArrowLeft className="h-4 w-4" /> Retour à la liste
        </Link>
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="status">
          {error ?? 'Demande introuvable.'}
        </div>
      </div>
    )
  }

  const pending = row.status === 'pending'

  return (
    <div className="ml-64 min-h-screen flex-1 bg-[#EFF6FF] px-6 py-10 lg:px-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <Link to="/organization-requests" className="inline-flex items-center gap-2 text-sm font-medium text-[#3B82F6] hover:text-[#2563EB]">
          <ArrowLeft className="h-4 w-4" /> Demandes d'inscription
        </Link>
        {pending && (
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={busy} onClick={() => void handleApprove()}
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-white px-4 py-2 text-sm font-medium text-emerald-800 shadow-sm hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40">
              <Check className="h-4 w-4 shrink-0" aria-hidden /> Approuver
            </button>
            <button type="button" disabled={busy} onClick={() => void handleReject()}
              className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-800 shadow-sm hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40">
              <X className="h-4 w-4 shrink-0" aria-hidden /> Refuser
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error}
        </div>
      )}

      <div className="mx-auto max-w-3xl">
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
            <h1 className="text-xl font-semibold text-gray-900">{row.name}</h1>
            <div>{statusBadge(row.status)}</div>
          </div>

          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">Détails</h2>
          <dl className="grid gap-5 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Nom de l'entreprise</dt>
              <dd className="mt-1 text-sm text-gray-900">{dash(row.name)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Raison sociale</dt>
              <dd className="mt-1 text-sm text-gray-900">{dash(row.legal_name)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">E-mail</dt>
              <dd className="mt-1 text-sm text-gray-900">{row.email}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Téléphone</dt>
              <dd className="mt-1 text-sm text-gray-900">{dash(row.phone)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Propriétaire</dt>
              <dd className="mt-1 text-sm text-gray-900">{dash(row.owner_name)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Pays</dt>
              <dd className="mt-1 text-sm text-gray-900">{row.country}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Devise</dt>
              <dd className="mt-1 text-sm text-gray-900">{row.currency}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Fuseau horaire</dt>
              <dd className="mt-1 text-sm text-gray-900">{dash(row.timezone)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Soumis le</dt>
              <dd className="mt-1 text-sm text-gray-900">{formatDate(row.created_at)}</dd>
            </div>
            {row.updated_at && (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Dernière mise à jour</dt>
                <dd className="mt-1 text-sm text-gray-900">{formatDate(row.updated_at)}</dd>
              </div>
            )}
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Organisation créée</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {row.organization ? (
                  <span>{row.organization.name} <span className="text-gray-500">(#{row.organization.id})</span></span>
                ) : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Traité par</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {row.processed_by ? (
                  <span>{row.processed_by.name} <span className="text-gray-500">({row.processed_by.email})</span></span>
                ) : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Traité le</dt>
              <dd className="mt-1 text-sm text-gray-900">{row.processed_at ? formatDate(row.processed_at) : '—'}</dd>
            </div>
            {row.status === 'rejected' && (
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Motif du refus</dt>
                <dd className="mt-1 text-sm text-gray-900">{dash(row.rejection_reason)}</dd>
              </div>
            )}
          </dl>
        </section>
      </div>
    </div>
  )
}
