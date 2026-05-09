import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react'
import { Eye, Pencil, Plus, Save, Search, UserPlus, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import AdminModal from '../../components/AdminModal'
import TableExportButton from '../../components/TableExportButton'
import type { ExportCell } from '../../lib/tableExport'
import { apiFetch } from '../../lib/api'
import type { ApiAdminUser, LaravelPaginator } from '../../types/apiAdmin'

const USER_EXPORT_HEADERS = ['Nom', 'E-mail', 'Organisation', 'Rôle'] as const

function membershipSummary(u: ApiAdminUser): { org: string; role: string } {
  const ms = u.organization_memberships ?? []
  if (ms.length === 0) return { org: '—', role: '—' }

  const names = ms.map((m) => m.organization?.name).filter(Boolean) as string[]
  const roles = ms.map((m) => m.role?.name).filter(Boolean) as string[]

  const org =
    names.length === 0
      ? `(${ms.length})`
      : names.length <= 2
        ? names.join(', ')
        : `${names[0]}, ${names[1]} +${names.length - 2}`

  const role =
    roles.length === 0
      ? '—'
      : roles.length <= 2
        ? roles.join(', ')
        : `${roles[0]}, ${roles[1]} +${roles.length - 2}`

  return { org, role }
}

export default function UsersPage() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<ApiAdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [qDebounced, setQDebounced] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ApiAdminUser | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    const t = window.setTimeout(() => setQDebounced(q.trim()), 350)
    return () => window.clearTimeout(t)
  }, [q])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const qs = new URLSearchParams({ per_page: '100' })
      if (qDebounced) qs.set('q', qDebounced)
      const res = await apiFetch<LaravelPaginator<ApiAdminUser>>(
        `/Admin/users?${qs.toString()}`,
      )
      setRows(res.data ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chargement impossible.')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [qDebounced])

  useEffect(() => {
    const t = requestAnimationFrame(() => {
      void load()
    })
    return () => cancelAnimationFrame(t)
  }, [load])

  const exportRows = useMemo((): ExportCell[][] => {
    return rows.map((r) => {
      const { org, role } = membershipSummary(r)
      return [r.name, r.email, org, role]
    })
  }, [rows])

  function openCreate() {
    setEditing(null)
    setName('')
    setEmail('')
    setPhone('')
    setPassword('')
    setModalOpen(true)
  }

  function openEdit(row: ApiAdminUser) {
    setEditing(row)
    setName(row.name)
    setEmail(row.email)
    setPhone(row.phone ?? '')
    setPassword('')
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditing(null)
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    const n = name.trim()
    const em = email.trim()
    if (!n || !em) return
    if (!editing && !password.trim()) {
      setError('Le mot de passe est obligatoire pour un nouvel utilisateur.')
      return
    }

    setError(null)
    try {
      if (editing) {
        const body: Record<string, unknown> = {
          name: n,
          email: em,
          phone: phone.trim() || null,
        }
        if (password.trim()) body.password = password
        await apiFetch(`/Admin/users/${editing.id}`, {
          method: 'PATCH',
          json: body,
        })
      } else {
        await apiFetch<ApiAdminUser>('/Admin/users', {
          method: 'POST',
          json: {
            name: n,
            email: em,
            password: password,
            phone: phone.trim() || null,
          },
        })
      }
      await load()
      closeModal()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible.')
    }
  }

  return (
    <div className="ml-64 min-h-screen flex-1 bg-[#EFF6FF] p-8">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">
            Utilisateurs
          </h1>
          <p className="mt-1 text-gray-600">
            Consultez et modifiez les comptes utilisateurs.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex w-fit items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-medium text-white hover:bg-[#2563EB]"
        >
          <Plus className="h-4 w-4" />
          Nouvel utilisateur
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
              placeholder="Rechercher par nom ou e-mail…"
              className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-[#3B82F6] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
            />
          </div>
          <TableExportButton
            filename="utilisateurs"
            title="Utilisateurs"
            headers={[...USER_EXPORT_HEADERS]}
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
                  <th className="px-6 py-3 font-semibold">E-mail</th>
                  <th className="px-6 py-3 font-semibold">Organisation</th>
                  <th className="px-6 py-3 font-semibold">Rôle</th>
                  <th className="px-6 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-10 text-center text-gray-500"
                    >
                      Aucun utilisateur.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => {
                    const { org, role } = membershipSummary(r)
                    return (
                      <tr
                        key={r.id}
                        className="border-b border-gray-100 last:border-0"
                      >
                        <td className="px-6 py-4 font-medium text-gray-900">
                          {r.name}
                        </td>
                        <td className="px-6 py-4 break-all text-gray-700">
                          {r.email}
                        </td>
                        <td className="px-6 py-4 text-gray-700">{org}</td>
                        <td className="px-6 py-4 text-gray-700">{role}</td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => navigate(`/users/${r.id}`)}
                              aria-label={`Voir la fiche : ${r.name}`}
                              title="Voir la fiche"
                              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-[#3B82F6] hover:bg-blue-50"
                            >
                              <Eye className="h-4 w-4" aria-hidden />
                            </button>
                            <button
                              type="button"
                              onClick={() => openEdit(r)}
                              aria-label="Modifier cet utilisateur"
                              title="Modifier"
                              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-800 hover:bg-gray-50"
                            >
                              <Pencil className="h-4 w-4" aria-hidden />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <AdminModal
        open={modalOpen}
        title={editing ? 'Modifier l’utilisateur' : 'Nouvel utilisateur'}
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
              form="user-form"
              className="inline-flex items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-medium text-white hover:bg-[#2563EB]"
            >
              {editing ? (
                <Save className="h-4 w-4 shrink-0" aria-hidden />
              ) : (
                <UserPlus className="h-4 w-4 shrink-0" aria-hidden />
              )}
              {editing ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        }
      >
        <form
          id="user-form"
          onSubmit={(e) => void handleSave(e)}
          className="space-y-4"
        >
          <div>
            <label
              htmlFor="user-name"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Nom complet
            </label>
            <input
              id="user-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/25"
              required
            />
          </div>
          <div>
            <label
              htmlFor="user-email"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              E-mail
            </label>
            <input
              id="user-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/25"
              required
            />
          </div>
          <div>
            <label
              htmlFor="user-phone"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Téléphone
            </label>
            <input
              id="user-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/25"
            />
          </div>
          <div>
            <label
              htmlFor="user-password"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              {editing
                ? 'Nouveau mot de passe (laisser vide pour ne pas changer)'
                : 'Mot de passe'}
            </label>
            <input
              id="user-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/25"
              required={!editing}
            />
          </div>
        </form>
      </AdminModal>
    </div>
  )
}
