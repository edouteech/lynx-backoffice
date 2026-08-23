import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react'
import { Eye, Pencil, Plus, Save, UserPlus, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import AdminModal from '../../components/AdminModal'
import AdminPageHeader from '../../components/AdminPageHeader'
import DataTable, { type Action, type Column } from '../../components/DataTable'
import { PasswordInput } from '../../components/PasswordInput'
import { apiFetch } from '../../lib/api'
import type { ApiAdminUser, LaravelPaginator } from '../../types/apiAdmin'

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
  const [qDebounced, setQDebounced] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ApiAdminUser | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')

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

  const columns = useMemo<Column<ApiAdminUser>[]>(() => [
    { key: 'name', label: 'Nom', sortable: true },
    { key: 'email', label: 'E-mail', sortable: true },
    {
      key: 'organization_memberships',
      label: 'Organisation',
      render: (_v, r) => membershipSummary(r).org,
    },
    {
      key: 'organization_memberships',
      label: 'Rôle',
      render: (_v, r) => membershipSummary(r).role,
    },
  ], [])

  const actions: Action<ApiAdminUser>[] = [
    {
      label: 'Voir',
      icon: Eye,
      onClick: (r) => navigate(`/users/${r.id}`),
    },
    {
      label: 'Modifier',
      icon: Pencil,
      onClick: (r) => openEdit(r),
    },
  ]

  return (
    <div>
      <AdminPageHeader
        title="Utilisateurs"
        description="Consultez et modifiez les comptes utilisateurs."
        action={
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex w-fit items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-medium text-white hover:bg-[#2563EB]"
          >
            <Plus className="h-4 w-4" />
            Nouvel utilisateur
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
        searchPlaceholder="Rechercher par nom ou e-mail…"
        onSearch={setQDebounced}
        exportFilename="utilisateurs"
        emptyMessage="Aucun utilisateur."
      />

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
            <PasswordInput
              id="user-password"
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
