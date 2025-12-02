import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { adminService } from "@/services/adminService"
import { Pencil, Trash2, UserPlus } from "lucide-react"
import api from "@/services/api"

export default function UsuariosAdmin() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [users, setUsers] = useState([])
  const [count, setCount] = useState(0)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)

  useEffect(() => {
    let active = true
    const timer = setTimeout(async () => {
      setLoading(true)
      setError("")
      try {
        const params = { search: search || undefined, page, limit: pageSize }
        const data = await adminService.getUsuarios(params)
        const list = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : []
        const total = typeof data?.count === "number" ? data.count : list.length
        if (!active) return
        setUsers(list)
        setCount(total)
      } catch (e) {
        if (!active) return
        setError("Não foi possível carregar os usuários.")
      } finally {
        if (active) setLoading(false)
      }
    }, 300)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [search, page, pageSize])

  const totalPages = useMemo(() => Math.max(1, Math.ceil(count / pageSize)), [count, pageSize])

  // NOVO: seleção e edição
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [deleting, setDeleting] = useState(false)
  const [deletingOne, setDeletingOne] = useState(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState("")
  const [editUser, setEditUser] = useState(null)

  // NOVO: criação de usuário
  const [createOpen, setCreateOpen] = useState(false)
  const [createSaving, setCreateSaving] = useState(false)
  const [createError, setCreateError] = useState("")
  const [createUser, setCreateUser] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    role: "",
  })

  // NOVO: Handlers de seleção
  const toggleSelectAll = () => {
    if (users.length === 0) return
    const allIds = users.map((u) => u?.id).filter(Boolean)
    const allSelected = allIds.every((id) => selectedIds.has(id))
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(allIds))
    }
  }

  const toggleSelectOne = (id) => {
    if (!id) return
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) {
      window.alert("Selecione ao menos um usuário com ID válido.")
      return
    }
    if (!window.confirm(`Confirma excluir ${ids.length} usuário(s)?`)) return
    try {
      setDeleting(true)
      await adminService.removerUsuariosEmMassa(ids)
      setSelectedIds(new Set())
      // refetch
      setLoading(true)
      setError("")
      const params = { search: search || undefined, page, limit: pageSize }
      const data = await adminService.getUsuarios(params)
      const list = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : []
      const total = typeof data?.count === "number" ? data.count : list.length
      setUsers(list)
      setCount(total)
    } catch (e) {
      window.alert("Falha ao excluir usuários selecionados.")
    } finally {
      setDeleting(false)
      setLoading(false)
    }
  }

  const handleDeleteOne = async (id) => {
    if (!id) {
      window.alert("ID inválido para exclusão.")
      return
    }
    if (!window.confirm("Confirma excluir este usuário?")) return
    try {
      setDeletingOne(id)
      await api.delete(`/users/${id}/`)
      setUsers((prev) => prev.filter((u) => u?.id !== id))
      setCount((c) => Math.max(0, c - 1))
      setSelectedIds((prev) => { const next = new Set(prev); next.delete(id); return next })
    } catch (e) {
      window.alert("Falha ao excluir o usuário.")
    } finally {
      setDeletingOne(null)
    }
  }

  const openEdit = (u) => {
    if (!u) return
    // inicializa dados do formulário
    const firstName = u.first_name || u.firstName || ""
    const lastName = u.last_name || u.lastName || ""
    const email = u.email || ""
    const role = (u.role || u.tipo || "").toString().toLowerCase()
    const is_active = u.is_active ?? u.ativo ?? true
    setEditUser({
      id: u.id,
      first_name: firstName,
      last_name: lastName,
      email,
      role,
      is_active,
    })
    setEditError("")
    setEditOpen(true)
  }

  const submitEdit = async () => {
    if (!editUser?.id) {
      setEditError("ID do usuário indisponível.")
      return
    }
    try {
      setEditSaving(true)
      setEditError("")
      const payload = {
        first_name: editUser.first_name,
        last_name: editUser.last_name,
        email: editUser.email,
        role: editUser.role,
        is_active: !!editUser.is_active,
      }
      await adminService.updateUsuario(editUser.id, payload)
      setEditOpen(false)
      // refetch lista
      setLoading(true)
      setError("")
      const params = { search: search || undefined, page, limit: pageSize }
      const data = await adminService.getUsuarios(params)
      const list = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : []
      const total = typeof data?.count === "number" ? data.count : list.length
      setUsers(list)
      setCount(total)
    } catch (e) {
      setEditError("Não foi possível salvar as alterações.")
    } finally {
      setEditSaving(false)
      setLoading(false)
    }
  }

  // NOVO: criar usuário
  const submitCreate = async () => {
    if (!createUser.email || !createUser.password || !createUser.role) {
      setCreateError("Preencha e-mail, senha e tipo.")
      return
    }
    try {
      setCreateSaving(true)
      setCreateError("")
      const payload = {
        first_name: createUser.first_name,
        last_name: createUser.last_name,
        email: createUser.email,
        password: createUser.password,
        role: createUser.role,
      }
      await adminService.createUsuario(payload)
      setCreateOpen(false)
      setCreateUser({ first_name: "", last_name: "", email: "", password: "", role: "" })
      // refetch lista
      setLoading(true)
      setError("")
      const params = { search: search || undefined, page, limit: pageSize }
      const data = await adminService.getUsuarios(params)
      const list = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : []
      const total = typeof data?.count === "number" ? data.count : list.length
      setUsers(list)
      setCount(total)
    } catch (e) {
      const msg = e?.response?.data ? JSON.stringify(e.response.data) : "Não foi possível criar o usuário."
      setCreateError(msg)
    } finally {
      setCreateSaving(false)
      setLoading(false)
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Usuários</h1>
        <p className="text-muted-foreground">Gerencie todos os usuários do sistema</p>
      </div>
      {/* Barra de busca e ações */}
      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
        {/* busca */}
        <input
          type="text"
          placeholder="Buscar por nome, email..."
          value={search}
          onChange={(e) => {
            setPage(1)
            setSearch(e.target.value)
          }}
          className="w-full md:w-64 px-3 py-2 border rounded-md bg-background"
        />
        <div className="text-sm text-muted-foreground">
          {loading ? "Carregando..." : `${count} usuário(s)`}
        </div>

        {/* NOVO: ação em massa */}
        <div className="ml-auto flex gap-2">
          {/* Novo usuário */}
          <button
            className="px-3 py-2 border rounded-md text-sm bg-primary text-primary-foreground disabled:opacity-50 inline-flex items-center gap-2"
            onClick={() => {
              setCreateError("")
              setCreateUser({ first_name: "", last_name: "", email: "", password: "", role: "" })
              setCreateOpen(true)
            }}
            disabled={loading}
          >
            <UserPlus className="w-4 h-4" />
            Novo usuário
          </button>
          <button
            className="px-3 py-2 border rounded-md text-sm bg-red-600 text-white disabled:opacity-50 inline-flex items-center gap-2"
            onClick={handleBulkDelete}
            disabled={deleting || selectedIds.size === 0 || loading}
            title={selectedIds.size === 0 ? "Selecione usuários" : "Excluir selecionados"}
          >
            <Trash2 className="w-4 h-4" />
            {deleting ? "Excluindo..." : `Excluir selecionados (${selectedIds.size})`}
          </button>
        </div>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="overflow-auto rounded-md border">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {/* NOVO: checkbox master */}
              <th className="text-left p-3">
                <input
                  type="checkbox"
                  checked={
                    users.length > 0 &&
                    users.map((u) => u?.id).filter(Boolean).every((id) => selectedIds.has(id))
                  }
                  onChange={toggleSelectAll}
                />
              </th>
              <th className="text-left p-3">Nome</th>
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3">Tipo</th>
              <th className="text-left p-3">Status</th>
              {/* NOVO: ações */}
              <th className="text-left p-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="p-4 text-center text-muted-foreground">
                  Nenhum usuário encontrado
                </td>
              </tr>
            )}
            {users.map((u) => {
              const nome =
                u?.nome ||
                [u?.first_name, u?.last_name].filter(Boolean).join(" ") ||
                u?.name ||
                u?.username ||
                "-"
              const email = u?.email || "-"
              const tipo = u?.tipo || u?.role || u?.perfil || "-"
              const ativo = u?.is_active ?? u?.ativo ?? u?.status ?? null
              const statusLabel =
                ativo === true ? "Ativo" : ativo === false ? "Inativo" : String(ativo ?? "-")
              return (
                <tr key={u?.id || `${email}-${nome}`} className="border-t">
                  {/* NOVO: checkbox por linha */}
                  <td className="p-3">
                    <input
                      type="checkbox"
                      disabled={!u?.id}
                      checked={u?.id ? selectedIds.has(u.id) : false}
                      onChange={() => toggleSelectOne(u?.id)}
                    />
                  </td>
                  <td className="p-3">{nome}</td>
                  <td className="p-3">{email}</td>
                  <td className="p-3 capitalize">{String(tipo).toLowerCase()}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        ativo === true
                          ? "bg-emerald-100 text-emerald-700"
                          : ativo === false
                          ? "bg-zinc-100 text-zinc-700"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {statusLabel}
                    </span>
                  </td>
                  {/* NOVO: ação editar */}
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button
                        className="px-3 py-1 border rounded-md text-xs inline-flex items-center gap-1.5"
                        onClick={() => u?.id && navigate(`/admin/usuarios/editar/${u.id}`)}
                        disabled={!u?.id}
                        title={!u?.id ? "ID indisponível" : "Editar usuário"}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Editar
                      </button>
                      <button
                        className="px-3 py-1 border rounded-md text-xs bg-red-600 text-white disabled:opacity-50 inline-flex items-center gap-1.5"
                        onClick={() => handleDeleteOne(u?.id)}
                        disabled={!u?.id || deletingOne === u?.id}
                        title={!u?.id ? "ID indisponível" : "Excluir usuário"}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {deletingOne === u?.id ? "Excluindo..." : "Excluir"}
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* paginação */}
      <div className="flex items-center justify-end gap-2">
        <button
          className="px-3 py-1 border rounded-md text-sm disabled:opacity-50"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1 || loading}
        >
          Anterior
        </button>
        <span className="text-sm text-muted-foreground">
          Página {page} de {totalPages}
        </span>
        <button
          className="px-3 py-1 border rounded-md text-sm disabled:opacity-50"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages || loading}
        >
          Próxima
        </button>
      </div>

      {/* NOVO: Modal de edição simples */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-md bg-background p-4">
            <h2 className="text-lg font-semibold mb-2">Editar usuário</h2>

            {editError && <div className="text-sm text-red-600 mb-2">{editError}</div>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm">Nome</label>
                <input
                  className="w-full px-3 py-2 border rounded-md bg-background"
                  value={editUser?.first_name || ""}
                  onChange={(e) =>
                    setEditUser((p) => ({ ...p, first_name: e.target.value }))
                  }
                  disabled={editSaving}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm">Sobrenome</label>
                <input
                  className="w-full px-3 py-2 border rounded-md bg-background"
                  value={editUser?.last_name || ""}
                  onChange={(e) =>
                    setEditUser((p) => ({ ...p, last_name: e.target.value }))
                  }
                  disabled={editSaving}
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-sm">E-mail</label>
                <input
                  className="w-full px-3 py-2 border rounded-md bg-background"
                  value={editUser?.email || ""}
                  onChange={(e) => setEditUser((p) => ({ ...p, email: e.target.value }))}
                  disabled={editSaving}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm">Tipo</label>
                <select
                  className="w-full px-3 py-2 border rounded-md bg-background"
                  value={editUser?.role || ""}
                  onChange={(e) => setEditUser((p) => ({ ...p, role: e.target.value }))}
                  disabled={editSaving}
                >
                  <option value="">Selecione</option>
                  <option value="admin">Admin</option>
                  <option value="paciente">Paciente</option>
                  <option value="medico">Médico</option>
                  <option value="clinica">Clínica</option>
                  <option value="secretaria">Secretaria</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm">Ativo</label>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!editUser?.is_active}
                    onChange={(e) =>
                      setEditUser((p) => ({ ...p, is_active: e.target.checked }))
                    }
                    disabled={editSaving}
                  />
                  <span className="text-sm">{editUser?.is_active ? "Ativo" : "Inativo"}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4">
              <button
                className="px-3 py-2 border rounded-md text-sm"
                onClick={() => setEditOpen(false)}
                disabled={editSaving}
              >
                Cancelar
              </button>
              <button
                className="px-3 py-2 border rounded-md text-sm bg-primary text-primary-foreground disabled:opacity-50"
                onClick={submitEdit}
                disabled={editSaving}
              >
                {editSaving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NOVO: Modal de criação */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-md bg-background p-4">
            <h2 className="text-lg font-semibold mb-2">Novo usuário</h2>
            {createError && <div className="text-sm text-red-600 mb-2">{createError}</div>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm">Nome</label>
                <input
                  className="w-full px-3 py-2 border rounded-md bg-background"
                  value={createUser.first_name}
                  onChange={(e) => setCreateUser((p) => ({ ...p, first_name: e.target.value }))}
                  disabled={createSaving}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm">Sobrenome</label>
                <input
                  className="w-full px-3 py-2 border rounded-md bg-background"
                  value={createUser.last_name}
                  onChange={(e) => setCreateUser((p) => ({ ...p, last_name: e.target.value }))}
                  disabled={createSaving}
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-sm">E-mail</label>
                <input
                  className="w-full px-3 py-2 border rounded-md bg-background"
                  value={createUser.email}
                  onChange={(e) => setCreateUser((p) => ({ ...p, email: e.target.value }))}
                  disabled={createSaving}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm">Senha</label>
                <input
                  type="password"
                  className="w-full px-3 py-2 border rounded-md bg-background"
                  value={createUser.password}
                  onChange={(e) => setCreateUser((p) => ({ ...p, password: e.target.value }))}
                  disabled={createSaving}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm">Tipo</label>
                <select
                  className="w-full px-3 py-2 border rounded-md bg-background"
                  value={createUser.role}
                  onChange={(e) => setCreateUser((p) => ({ ...p, role: e.target.value }))}
                  disabled={createSaving}
                >
                  <option value="">Selecione</option>
                  <option value="admin">Admin</option>
                  <option value="paciente">Paciente</option>
                  <option value="medico">Médico</option>
                  <option value="clinica">Clínica</option>
                  <option value="secretaria">Secretaria</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-4">
              <button
                className="px-3 py-2 border rounded-md text-sm"
                onClick={() => setCreateOpen(false)}
                disabled={createSaving}
              >
                Cancelar
              </button>
              <button
                className="px-3 py-2 border rounded-md text-sm bg-primary text-primary-foreground disabled:opacity-50"
                onClick={submitCreate}
                disabled={createSaving}
              >
                {createSaving ? "Criando..." : "Criar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
