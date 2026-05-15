import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Building2,
  Eye,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import AdminModal from '../../components/AdminModal'
import TableExportButton from '../../components/TableExportButton'
import type { ExportCell } from '../../lib/tableExport'
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

const ORG_EXPORT_HEADERS = [
  'Nom',
  'Pays',
  'Devise',
  'Active',
  'E-mail créateur',
  'Créé le',
] as const

export default function OrganizationsPage() {
  const [rows, setRows] = useState<ApiOrganization[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')
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

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return rows
    return rows.filter((r) => {
      const owner = r.created_by?.email ?? ''
      return (
        r.name.toLowerCase().includes(s) ||
        owner.toLowerCase().includes(s) ||
        (r.country ?? '').toLowerCase().includes(s)
      )
    })
  }, [rows, q])

  const exportRows = useMemo((): ExportCell[][] => {
    return filtered.map((r) => [
      r.name,
      r.country ?? '—',
      r.currency ?? '—',
      orgIsActive(r) ? 'Oui' : 'Non',
      r.created_by?.email ?? '—',
      formatCreatedAt(r.created_at),
    ])
  }, [filtered])

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

  return (
    <div className="ml-64 min-h-screen flex-1 bg-[#EFF6FF] p-8">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">
            Organisations
          </h1>
          <p className="mt-1 text-gray-600">
            Gérez les organisations enregistrées sur la plateforme.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex w-fit items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-medium text-white hover:bg-[#2563EB]"
        >
          <Plus className="h-4 w-4" />
          Nouvelle organisation
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
              placeholder="Rechercher par nom, pays ou e-mail créateur…"
              className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-[#3B82F6] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
            />
          </div>
          <TableExportButton
            filename="organisations"
            title="Organisations"
            headers={[...ORG_EXPORT_HEADERS]}
            rows={exportRows}
          />
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="px-6 py-12 text-center text-gray-500">Chargement…</div>
          ) : (
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-gray-600">
                  <th className="px-6 py-3 font-semibold">Nom</th>
                  <th className="px-6 py-3 font-semibold">Pays</th>
                  <th className="px-6 py-3 font-semibold">Devise</th>
                  <th className="px-6 py-3 font-semibold">Créateur</th>
                  <th className="px-6 py-3 font-semibold">Créé le</th>
                  <th className="px-6 py-3 font-semibold text-center">Activée</th>
                  <th className="px-6 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-10 text-center text-gray-500"
                    >
                      {rows.length === 0
                        ? 'Aucune organisation.'
                        : 'Aucun résultat pour cette recherche.'}
                    </td>
                  </tr>
                ) : (
                filtered.map((r) => (
                  <tr
                    key={r.id}
                    className={`border-b border-gray-100 last:border-0 ${
                      orgIsActive(r) ? '' : 'bg-gray-50/80'
                    }`}
                  >
                    <td className="px-6 py-4 font-medium text-gray-900">
                      <Link
                        to={`/organizations/${r.id}`}
                        className="text-[#3B82F6] hover:underline"
                      >
                        {r.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-gray-700">{r.country ?? '—'}</td>
                    <td className="px-6 py-4 text-gray-700">
                      {r.currency ?? '—'}
                    </td>
                    <td className="px-6 py-4 break-all text-gray-700">
                      {r.created_by?.email ?? '—'}
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {formatCreatedAt(r.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <OrgActiveSwitch
                          isActive={orgIsActive(r)}
                          disabled={togglingId === r.id}
                          onToggle={() => void handleToggleActive(r)}
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Link
                          to={`/organizations/${r.id}`}
                          aria-label={`Voir la fiche : ${r.name}`}
                          title={`Voir la fiche : ${r.name}`}
                          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#3B82F6]/30 bg-[#3B82F6] text-white shadow-sm transition-colors hover:bg-[#2563EB]"
                        >
                          <Eye className="h-4 w-4" aria-hidden />
                        </Link>
                        <button
                          type="button"
                          onClick={() => openEdit(r)}
                          aria-label="Modifier cette organisation"
                          title="Modifier"
                          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-[#3B82F6] hover:bg-blue-50"
                        >
                          <Pencil className="h-4 w-4" aria-hidden />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(r)}
                          aria-label="Supprimer cette organisation"
                          title="Supprimer"
                          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-red-200 text-red-700 hover:bg-red-50"
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
                      <input
                        id="org-owner-password"
                        type="password"
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
                      <input
                        id="org-owner-password-2"
                        type="password"
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
