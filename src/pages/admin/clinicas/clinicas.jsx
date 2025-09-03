import { useEffect, useMemo, useState } from "react"
import { adminService } from "@/services/adminService"

export default function ClinicasAdmin() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [clinicas, setClinicas] = useState([])
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
        const data = await adminService.getClinicas(params)
        const list = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : []
        const total = typeof data?.count === "number" ? data.count : list.length
        if (!active) return
        setClinicas(list)
        setCount(total)
      } catch (e) {
        if (!active) return
        setError("Não foi possível carregar as clínicas.")
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

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Clínicas</h1>
        <p className="text-muted-foreground">Gerencie os cadastros de clínicas</p>
      </div>

      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
        <input
          type="text"
          placeholder="Buscar por nome, CNPJ..."
          value={search}
          onChange={(e) => {
            setPage(1)
            setSearch(e.target.value)
          }}
          className="w-full md:w-64 px-3 py-2 border rounded-md bg-background"
        />
        <div className="text-sm text-muted-foreground">
          {loading ? "Carregando..." : `${count} clínica(s)`}
        </div>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="overflow-auto rounded-md border">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3">Nome</th>
              <th className="text-left p-3">CNPJ</th>
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {clinicas.length === 0 && !loading && (
              <tr>
                <td colSpan={4} className="p-4 text-center text-muted-foreground">
                  Nenhuma clínica encontrada
                </td>
              </tr>
            )}
            {clinicas.map((c) => {
              const nome = c?.razao_social || c?.nome || c?.name || "-"
              const cnpj = c?.cnpj || "-"
              const email = c?.email || c?.contato_email || "-"
              const ativo = c?.is_active ?? c?.ativo ?? c?.status ?? null
              const statusLabel =
                ativo === true ? "Ativa" : ativo === false ? "Inativa" : String(ativo ?? "-")
              return (
                <tr key={c?.id || `${nome}-${cnpj}`} className="border-t">
                  <td className="p-3">{nome}</td>
                  <td className="p-3">{cnpj}</td>
                  <td className="p-3">{email}</td>
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
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

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
    </div>
  )
}