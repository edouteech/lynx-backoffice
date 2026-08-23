import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Building2,
  Eye,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react'
import AdminModal from '../../components/AdminModal'
import AdminPageHeader from '../../components/AdminPageHeader'
import DataTable, { type Action, type Column } from '../../components/DataTable'
import { PasswordInput } from '../../components/PasswordInput'
import { apiFetch } from '../../lib/api'
import type { ApiOrganization, LaravelPaginator } from '../../types/apiAdmin'
import {
  formatCreatedAt,
  orgIsActive,
  OrgActiveSwitch,
} from './organizationUi'
import { CountrySelect } from '../../components/CountrySelect'
import { PhoneInput } from '../../components/PhoneInput'
import { CURRENCY_OPTIONS } from '../../lib/registerFormOptions'
import { telephoneForApi } from '../../lib/phoneValue'
import Swal from 'sweetalert2'

export default function OrganizationsPage() {
  const [rows, setRows] = useState<ApiOrganization[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ApiOrganization | null>(null)
  const [name, setName] = useState('')
  const [country, setCountry] = useState('')
  const [currency, setCurrency] = useState('')
  const [timezone, setTimezone] = useState('')
  const [ownerEmail, setOwnerEmail] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [ownerPassword, setOwnerPassword] = useState('')
  const [ownerPasswordConfirm, setOwnerPasswordConfirm] = useState('')
  const [legalName, setLegalName] = useState('')
  const [phone, setPhone] = useState('')
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const location = useLocation()
  const navigate = useNavigate()

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiFetch<LaravelPaginator<ApiOrganization>>(
        '/Admin/organizations?per_page=100',
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

  function openCreate() {
    setEditing(null)
    setName('')
    setCountry('')
    setCurrency('XOF')
    setTimezone('')
    setOwnerEmail('')
    setOwnerName('')
    setOwnerPassword('')
    setOwnerPasswordConfirm('')
    setLegalName('')
    setPhone('')
    setModalOpen(true)
  }

  const openEdit = useCallback((row: ApiOrganization) => {
    setEditing(row)
    setName(row.name)
    setCountry(row.country ?? '')
    setCurrency(row.currency ?? '')
    setTimezone(row.timezone ?? '')
    setOwnerEmail('')
    setOwnerName('')
    setOwnerPassword('')
    setOwnerPasswordConfirm('')
    setLegalName(row.legal_name ?? '')
    setPhone(row.phone ?? '')
    setModalOpen(true)
  }, [])

  useEffect(() => {
    const raw = (
      location.state as { editOrganizationId?: number } | null
    )?.editOrganizationId
    if (raw == null || !Number.isFinite(Number(raw)) || rows.length === 0) {
      return
    }
    const targetId = Number(raw)
    const row = rows.find((r) => r.id === targetId)
    const path = `${location.pathname}${location.search}`
    queueMicrotask(() => {
      navigate(path, { replace: true, state: {} })
      if (row) {
        openEdit(row)
      }
    })
  }, [rows, location.state, location.pathname, location.search, navigate, openEdit])

  function closeModal() {
    setModalOpen(false)
    setEditing(null)
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    const n = name.trim()
    const c = country.trim()
    const cur = currency.trim()
    if (!c) {
      setError('Veuillez sélectionner un pays.')
      return
    }
    if (!n || !cur) return

    setError(null)
    const phoneApi = telephoneForApi(phone)
    try {
      if (editing) {
        await apiFetch<ApiOrganization>(
          `/Admin/organizations/${editing.id}`,
          {
            method: 'PATCH',
            json: {
              name: n,
              country: c || null,
              currency: cur || null,
              timezone: timezone.trim() || null,
              legal_name: legalName.trim() || null,
              phone: phoneApi,
            },
          },
        )
      } else {
        const ownerEmailTrimmed = ownerEmail.trim()
        if (!ownerEmailTrimmed) {
          setError('Veuillez renseigner l’e-mail du propriétaire.')
          return
        }
        if (ownerPassword.length < 8) {
          setError(
            'Le mot de passe propriétaire doit contenir au moins 8 caractères.',
          )
          return
        }
        if (ownerPassword !== ownerPasswordConfirm) {
          setError('Les mots de passe du propriétaire ne correspondent pas.')
          return
        }

        const body: Record<string, unknown> = {
          name: n,
          country: c,
          currency: cur,
          timezone: timezone.trim() || null,
          legal_name: legalName.trim() || null,
          phone: phoneApi,
        }
        body.owner_email = ownerEmailTrimmed
        body.owner_password = ownerPassword
        body.owner_name = ownerName.trim() || null
        await apiFetch<ApiOrganization>('/Admin/organizations', {
          method: 'POST',
          json: body,
        })
      }
      await load()
      closeModal()
      await Swal.fire('Succès !', editing ? 'Organisation mise à jour.' : 'Organisation créée avec succès.', 'success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible.')
      await Swal.fire('Erreur', err instanceof Error ? err.message : 'Enregistrement impossible.', 'error')
    }
  }

  async function handleToggleActive(row: ApiOrganization) {
    const next = !orgIsActive(row)
    setTogglingId(row.id)
    setError(null)
    try {
      const updated = await apiFetch<ApiOrganization>(
        `/Admin/organizations/${row.id}`,
        {
          method: 'PATCH',
          json: { is_active: next },
        },
      )
      setRows((prev) =>
        prev.map((r) => (r.id === row.id ? { ...r, ...updated } : r)),
      )
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Mise à jour du statut impossible.',
      )
    } finally {
      setTogglingId(null)
    }
  }

  async function handleDelete(row: ApiOrganization) {
    const result = await Swal.fire({
      title: 'Supprimer l\'organisation ?',
      text: `Souhaitez-vous vraiment supprimer « ${row.name} » ? Cette action est irréversible.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Oui, supprimer',
      cancelButtonText: 'Annuler'
    })

    if (!result.isConfirmed) return

    setError(null)
    try {
      await apiFetch(`/Admin/organizations/${row.id}`, { method: 'DELETE' })
      await load()
      await Swal.fire('Supprimée !', 'L\'organisation a été supprimée.', 'success')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Suppression impossible.')
      await Swal.fire('Erreur', e instanceof Error ? e.message : 'Suppression impossible.', 'error')
    }
  }

  const columns = useMemo<Column<ApiOrganization>[]>(() => [
    {
      key: 'name',
      label: 'Nom',
      sortable: true,
      render: (_v, r) => (
        <Link to={`/organizations/${r.id}`} className="font-medium text-[#3B82F6] hover:underline">
          {r.name}
        </Link>
      ),
    },
    { key: 'country', label: 'Pays', sortable: true, render: (v) => v ? String(v) : '—' },
    { key: 'currency', label: 'Devise', sortable: true, render: (v) => v ? String(v) : '—' },
    {
      key: 'created_by.email',
      label: 'Créateur',
      sortable: true,
      render: (v) => v ? String(v) : '—',
    },
    {
      key: 'created_at',
      label: 'Créé le',
      sortable: true,
      render: (_v, r) => formatCreatedAt(r.created_at),
    },
    {
      key: 'is_active',
      label: 'Activée',
      align: 'center',
      render: (_v, r) => (
        <div className="flex justify-center">
          <OrgActiveSwitch
            isActive={orgIsActive(r)}
            disabled={togglingId === r.id}
            onToggle={() => void handleToggleActive(r)}
          />
        </div>
      ),
    },
  ], [togglingId])

  const actions: Action<ApiOrganization>[] = [
    {
      label: 'Voir',
      icon: Eye,
      variant: 'primary',
      onClick: (r) => navigate(`/organizations/${r.id}`),
    },
    {
      label: 'Modifier',
      icon: Pencil,
      onClick: (r) => openEdit(r),
    },
    {
      label: 'Supprimer',
      icon: Trash2,
      variant: 'danger',
      onClick: (r) => void handleDelete(r),
    },
  ]

  return (
    <div>
      <AdminPageHeader
        title="Organisations"
        description="Gérez les organisations enregistrées sur la plateforme."
        action={
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex w-fit items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-medium text-white hover:bg-[#2563EB]"
          >
            <Plus className="h-4 w-4" />
            Nouvelle organisation
          </button>
        }
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
        searchPlaceholder="Rechercher par nom, pays ou e-mail créateur…"
        exportFilename="organisations"
        emptyMessage="Aucune organisation."
      />

      <AdminModal
        open={modalOpen}
        wide
        title={editing ? 'Modifier l’organisation' : 'Nouvelle organisation'}
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
              form="org-form"
              className="inline-flex items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-medium text-white hover:bg-[#2563EB]"
            >
              {editing ? (
                <Save className="h-4 w-4 shrink-0" aria-hidden />
              ) : (
                <Building2 className="h-4 w-4 shrink-0" aria-hidden />
              )}
              {editing ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        }
      >
        <form id="org-form" onSubmit={(e) => void handleSave(e)} className="space-y-8">
          <p className="text-sm text-gray-600">
            {editing
              ? 'Même présentation que l’inscription entreprise côté application : identité, zone géographique et contact.'
              : 'Aligné sur le formulaire public « Créer mon entreprise » : identité de la société, puis création du compte propriétaire.'}
          </p>
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-0">
            <div className="space-y-6 lg:border-r lg:border-gray-200 lg:pr-8">
              <div>
                <h3 className="text-base font-semibold text-gray-900">
                  Inscription entreprise
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Identité et paramètres régionaux de la société.
                </p>
              </div>
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="org-nom-entreprise"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Nom de l’entreprise{' '}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="org-nom-entreprise"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="organization"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30"
                    placeholder="Ex. Commerce Dupont"
                  />
                </div>
                <div>
                  <label
                    htmlFor="org-legal"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Raison sociale / dénomination légale{' '}
                    <span className="font-normal text-gray-500">(optionnel)</span>
                  </label>
                  <input
                    id="org-legal"
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30"
                  />
                </div>
                <div>
                  <label
                    htmlFor="org-pays"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Pays <span className="text-red-500">*</span>
                  </label>
                  <CountrySelect
                    id="org-pays"
                    value={country}
                    onChange={setCountry}
                    allowClear={false}
                    placeholder="Choisir un pays…"
                    className="rounded-lg [&_button]:rounded-lg"
                  />
                </div>
                <div>
                  <label
                    htmlFor="org-devise"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Devise <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="org-devise"
                    required
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30"
                  >
                    {CURRENCY_OPTIONS.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="org-tz"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Fuseau horaire{' '}
                    <span className="font-normal text-gray-500">(optionnel)</span>
                  </label>
                  <input
                    id="org-tz"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    placeholder="Africa/Porto-Novo"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30"
                  />
                </div>
              </div>
            </div>

            <div
              className={`space-y-6 ${editing ? 'lg:pl-8' : 'border-t border-gray-200 pt-8 lg:border-t-0 lg:pt-0 lg:pl-8'}`}
            >
              <div>
                <h3 className="text-base font-semibold text-gray-900">
                  {editing ? 'Coordonnées' : 'Propriétaire et contact'}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {editing
                    ? 'Numéro de téléphone de l’organisation.'
                    : 'Téléphone de la société et informations du compte propriétaire.'}
                </p>
              </div>
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="org-tel"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Téléphone{' '}
                    <span className="font-normal text-gray-500">(optionnel)</span>
                  </label>
                  <PhoneInput
                    id="org-tel"
                    value={phone}
                    onChange={setPhone}
                    placeholder="01 97 00 00 00"
                    className="rounded-lg"
                  />
                </div>
                {!editing && (
                  <>
                    <div>
                      <label
                        htmlFor="org-owner-email"
                        className="mb-1 block text-sm font-medium text-gray-700"
                      >
                        E-mail du propriétaire{' '}
                        <span className="font-normal text-gray-500">
                          (création du compte)
                        </span>
                      </label>
                      <input
                        id="org-owner-email"
                        type="email"
                        value={ownerEmail}
                        onChange={(e) => setOwnerEmail(e.target.value)}
                        autoComplete="email"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30"
                        placeholder="owner@exemple.com"
                      />
                      <p className="mt-2 text-xs text-gray-500">
                        Si renseigné, un utilisateur sera créé et lié comme
                        propriétaire.
                      </p>
                    </div>
                    <div>
                      <label
                        htmlFor="org-owner-name"
                        className="mb-1 block text-sm font-medium text-gray-700"
                      >
                        Nom affiché du propriétaire{' '}
                        <span className="font-normal text-gray-500">
                          (optionnel)
                        </span>
                      </label>
                      <input
                        id="org-owner-name"
                        value={ownerName}
                        onChange={(e) => setOwnerName(e.target.value)}
                        autoComplete="name"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30"
                        placeholder="Par défaut : nom de l’entreprise"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="org-owner-password"
                        className="mb-1 block text-sm font-medium text-gray-700"
                      >
                        Mot de passe propriétaire{' '}
                        <span className="font-normal text-gray-500">
                          (min. 8 caractères)
                        </span>
                      </label>
                      <PasswordInput
                        id="org-owner-password"
                        value={ownerPassword}
                        onChange={(e) => setOwnerPassword(e.target.value)}
                        autoComplete="new-password"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30"
                        placeholder="8 caractères minimum"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="org-owner-password-2"
                        className="mb-1 block text-sm font-medium text-gray-700"
                      >
                        Confirmer le mot de passe propriétaire
                      </label>
                      <PasswordInput
                        id="org-owner-password-2"
                        value={ownerPasswordConfirm}
                        onChange={(e) =>
                          setOwnerPasswordConfirm(e.target.value)
                        }
                        autoComplete="new-password"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </form>
      </AdminModal>
    </div>
  )
}
