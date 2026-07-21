import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Eye, X } from 'lucide-react'
import AdminPageHeader from '../../components/AdminPageHeader'
import DataTable, { type Action, type Column } from '../../components/DataTable'
import { apiFetch } from '../../lib/api'
import Swal from 'sweetalert2'
import type {
  ApiOrgRegistrationRequest,
  LaravelPaginator,
} from '../../types/apiAdmin'
import { formatDate, statusBadge } from './organizationRequestUi'

export default function OrganizationRequestsPage() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<ApiOrgRegistrationRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch<LaravelPaginator<ApiOrgRegistrationRequest>>(
        '/Admin/organization-registration-requests?per_page=100',
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

  async function handleApprove(id: number) {
    if (busyId) return
    const result = await Swal.fire({
      title: 'Approuver la demande ?',
      text: 'Un essai gratuit sera automatiquement activé.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10B981',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Oui, approuver',
      cancelButtonText: 'Annuler'
    })

    if (!result.isConfirmed) return

    setBusyId(id)
    setError(null)
    try {
      await apiFetch(`/Admin/organization-registration-requests/${id}/approve`, {
        method: 'POST',
      })
      await load()
      await Swal.fire('Approuvée !', 'L\'organisation a été créée.', 'success')
    } catch (e) {
      await Swal.fire('Erreur', e instanceof Error ? e.message : 'Approbation impossible.', 'error')
    } finally {
      setBusyId(null)
    }
  }

  async function handleReject(id: number) {
    if (busyId) return
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

    setBusyId(id)
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
      setBusyId(null)
    }
  }

  const columns = useMemo<Column<ApiOrgRegistrationRequest>[]>(() => [
    {
      key: 'name',
      label: 'Organisation',
      sortable: true,
      render: (_v, r) => (
        <button
          type="button"
          onClick={() => navigate(`/organization-requests/${r.id}`)}
          className="font-medium text-[#3B82F6] hover:underline"
        >
          {r.name}
        </button>
      ),
    },
    {
      key: 'owner_name',
      label: 'Contact',
      sortable: true,
      render: (_v, r) => (
        <>
          <div>{r.owner_name ?? '—'}</div>
          <div className="text-xs text-gray-500">{r.email}</div>
        </>
      ),
    },
    {
      key: 'created_at',
      label: 'Soumis le',
      sortable: true,
      render: (_v, r) => formatDate(r.created_at),
    },
    {
      key: 'status',
      label: 'Statut',
      sortable: true,
      render: (_v, r) => statusBadge(r.status),
    },
  ], [navigate])

  const actions: Action<ApiOrgRegistrationRequest>[] = [
    {
      label: 'Voir',
      icon: Eye,
      variant: 'primary',
      onClick: (r) => navigate(`/organization-requests/${r.id}`),
    },
    {
      label: 'Approuver',
      icon: Check,
      show: (r) => r.status === 'pending',
      onClick: (r) => void handleApprove(r.id),
    },
    {
      label: 'Refuser',
      icon: X,
      variant: 'danger',
      show: (r) => r.status === 'pending',
      onClick: (r) => void handleReject(r.id),
    },
  ]

  return (
    <div>
      <AdminPageHeader
        title="Demandes de création d’organisation"
        description="Les entreprises qui demandent l’ouverture d’un compte apparaissent ici jusqu’à validation ou refus."
      />

      {error && (
        <div
          className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {error}
        </div>
      )}

      <DataTable
        data={rows}
        columns={columns}
        actions={actions}
        loading={loading}
        searchable
        searchPlaceholder="Rechercher une demande…"
        exportFilename="demandes-organisations"
        emptyMessage="Aucune demande."
      />
    </div>
  )
}
