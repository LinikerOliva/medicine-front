"use client"

import { useEffect, useMemo, useState } from "react"
import { adminService } from "@/services/adminService"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, RefreshCw, Search } from "lucide-react"
import api from "@/services/api"

export default function AuditoriaAdmin() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [nextUrl, setNextUrl] = useState(null)
  const [prevUrl, setPrevUrl] = useState(null)

  // Filtros
  const [action, setAction] = useState("")
  const [entity, setEntity] = useState("")
  const [status, setStatus] = useState("")
  const [user, setUser] = useState("")
  const [start, setStart] = useState("")
  const [end, setEnd] = useState("")
  const [q, setQ] = useState("")

  const params = useMemo(() => {
    const p = { ordering: "-created_at", limit: 20 }
    if (action) p.action = action
    if (entity) p.entity = entity
    if (status) p.status = status
    if (user) p.user = user
    if (start) p["created_at__gte"] = new Date(start).toISOString()
    if (end) p["created_at__lte"] = new Date(end).toISOString()
    if (q) p.search = q
    return p
  }, [action, entity, status, user, start, end, q])

  const fetchPage = async (urlOrParams) => {
    setLoading(true)
    setError(null)
    try {
      const res = typeof urlOrParams === "string"
        ? await api.get(urlOrParams)
        : await adminService.getAuditoria(urlOrParams)
      const data = res?.data ?? res
      const list = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : []
      setItems(list)
      setNextUrl(data?.next || null)
      setPrevUrl(data?.previous || null)
    } catch (e) {
      const status = e?.response?.status
      const detail = typeof e?.response?.data === "string" ? null : e?.response?.data?.detail
      const msg = detail || e?.message || "Falha ao carregar auditoria"
      setError(status ? `Erro ${status}: ${msg}` : msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPage(params)
  }, [params])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Auditoria</h1>
        <p className="text-muted-foreground">Acompanhe registros de ações do sistema</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Refine a busca por período, usuário e tipo de ação</CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-6 gap-3">
          <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} placeholder="Início" />
          <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} placeholder="Fim" />
          <Input value={user} onChange={(e) => setUser(e.target.value)} placeholder="Usuário (UUID)" />
          <Select value={status} onValueChange={(v) => setStatus(v === "all" ? "" : v)}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="success">Sucesso</SelectItem>
              <SelectItem value="fail">Falha</SelectItem>
            </SelectContent>
          </Select>
          <Input value={action} onChange={(e) => setAction(e.target.value)} placeholder="Ação (ex: login)" />
          <Input value={entity} onChange={(e) => setEntity(e.target.value)} placeholder="Entidade (ex: Consulta)" />
          <div className="md:col-span-6 flex gap-2">
            <div className="flex-1">
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar (ação, entidade, IP, usuário)"/>
            </div>
            <Button variant="outline" onClick={() => fetchPage(params)}>
              <Search className="mr-2 h-4 w-4" /> Buscar
            </Button>
            <Button variant="ghost" onClick={() => { setAction(""); setEntity(""); setStatus(""); setUser(""); setStart(""); setEnd(""); setQ(""); }}>
              <RefreshCw className="mr-2 h-4 w-4" /> Limpar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Registros</CardTitle>
            <CardDescription>Resultados paginados (20 por página)</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={!prevUrl || loading} onClick={() => fetchPage(prevUrl)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={!nextUrl || loading} onClick={() => fetchPage(nextUrl)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 px-3">Data</th>
                <th className="py-2 px-3">Usuário</th>
                <th className="py-2 px-3">Ação</th>
                <th className="py-2 px-3">Entidade</th>
                <th className="py-2 px-3">ID</th>
                <th className="py-2 px-3">IP</th>
                <th className="py-2 px-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {!loading && items.length === 0 && (
                <tr><td colSpan={7} className="py-6 text-center text-muted-foreground">Nenhum registro encontrado.</td></tr>
              )}
              {items.map((it) => (
                <tr key={it.id} className="border-b hover:bg-muted/30">
                  <td className="py-2 px-3 whitespace-nowrap">{new Date(it.created_at).toLocaleString()}</td>
                  <td className="py-2 px-3">{it.user?.username || it.user?.email || "-"}</td>
                  <td className="py-2 px-3">{it.action}</td>
                  <td className="py-2 px-3">{it.entity || "-"}</td>
                  <td className="py-2 px-3">{it.entity_id || "-"}</td>
                  <td className="py-2 px-3">{it.ip_address || "-"}</td>
                  <td className="py-2 px-3">
                    {it.status === "success" ? (
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200" variant="outline">Sucesso</Badge>
                    ) : (
                      <Badge className="bg-red-50 text-red-700 border-red-200" variant="outline">Falha</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}