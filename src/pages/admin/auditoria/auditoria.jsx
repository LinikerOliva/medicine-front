"use client"

import { useEffect, useMemo, useState } from "react"
import { adminService } from "@/services/adminService"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, RefreshCw, Search, Shield, Activity, Calendar, User, Filter, Eye } from "lucide-react"
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
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 via-red-700 to-red-800 rounded-2xl p-8 text-white shadow-2xl">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
            <Shield className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-4xl font-bold">Auditoria</h1>
            <p className="text-red-100 text-lg">Acompanhe registros de ações do sistema</p>
          </div>
        </div>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
            <div className="flex items-center gap-3">
              <Activity className="h-6 w-6 text-red-200" />
              <div>
                <p className="text-red-100 text-sm">Total de Registros</p>
                <p className="text-2xl font-bold">{items.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
            <div className="flex items-center gap-3">
              <User className="h-6 w-6 text-red-200" />
              <div>
                <p className="text-red-100 text-sm">Usuários Únicos</p>
                <p className="text-2xl font-bold">{new Set(items.map(i => i.user?.id)).size}</p>
              </div>
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
            <div className="flex items-center gap-3">
              <Calendar className="h-6 w-6 text-red-200" />
              <div>
                <p className="text-red-100 text-sm">Hoje</p>
                <p className="text-2xl font-bold">
                  {items.filter(i => new Date(i.created_at).toDateString() === new Date().toDateString()).length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
            <div className="flex items-center gap-3">
              <Eye className="h-6 w-6 text-red-200" />
              <div>
                <p className="text-red-100 text-sm">Sucessos</p>
                <p className="text-2xl font-bold">
                  {items.filter(i => i.status === "success").length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Card */}
      <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="pb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
              <Filter className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl font-semibold text-gray-900">Filtros Avançados</CardTitle>
              <CardDescription className="text-gray-600">Refine a busca por período, usuário e tipo de ação</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Data de Início</label>
              <Input 
                type="date" 
                value={start} 
                onChange={(e) => setStart(e.target.value)} 
                className="h-11 bg-white/70 border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Data de Fim</label>
              <Input 
                type="date" 
                value={end} 
                onChange={(e) => setEnd(e.target.value)} 
                className="h-11 bg-white/70 border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Status</label>
              <Select value={status} onValueChange={(v) => setStatus(v === "all" ? "" : v)}>
                <SelectTrigger className="h-11 bg-white/70 border-gray-200 focus:border-blue-500 focus:ring-blue-500/20">
                  <SelectValue placeholder="Selecionar status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="success">Sucesso</SelectItem>
                  <SelectItem value="fail">Falha</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Usuário (UUID)</label>
              <Input 
                value={user} 
                onChange={(e) => setUser(e.target.value)} 
                placeholder="ID do usuário"
                className="h-11 bg-white/70 border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Ação</label>
              <Input 
                value={action} 
                onChange={(e) => setAction(e.target.value)} 
                placeholder="ex: login, create, update"
                className="h-11 bg-white/70 border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Entidade</label>
              <Input 
                value={entity} 
                onChange={(e) => setEntity(e.target.value)} 
                placeholder="ex: Consulta, Paciente"
                className="h-11 bg-white/70 border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Busca Geral</label>
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input 
                  value={q} 
                  onChange={(e) => setQ(e.target.value)} 
                  placeholder="Buscar por ação, entidade, IP ou usuário..."
                  className="pl-10 h-11 bg-white/70 border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
                />
              </div>
              <Button 
                onClick={() => fetchPage(params)}
                className="h-11 px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Search className="mr-2 h-4 w-4" /> 
                Buscar
              </Button>
              <Button 
                variant="outline" 
                onClick={() => { setAction(""); setEntity(""); setStatus(""); setUser(""); setStart(""); setEnd(""); setQ(""); }}
                className="h-11 px-6 bg-white/70 hover:bg-white border-gray-200 hover:border-gray-300 transition-all duration-200"
              >
                <RefreshCw className="mr-2 h-4 w-4" /> 
                Limpar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Card */}
      <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl font-semibold text-gray-900">Registros de Auditoria</CardTitle>
              <CardDescription className="text-gray-600">Resultados paginados (20 por página)</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              disabled={!prevUrl || loading} 
              onClick={() => fetchPage(prevUrl)}
              className="bg-white/70 hover:bg-white border-gray-200 hover:border-gray-300 transition-all duration-200"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              disabled={!nextUrl || loading} 
              onClick={() => fetchPage(nextUrl)}
              className="bg-white/70 hover:bg-white border-gray-200 hover:border-gray-300 transition-all duration-200"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
              <p className="text-red-700 font-medium">{error}</p>
            </div>
          )}
          
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="min-w-full bg-white">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="py-4 px-6 text-left text-sm font-semibold text-gray-700 border-b border-gray-200">Data</th>
                  <th className="py-4 px-6 text-left text-sm font-semibold text-gray-700 border-b border-gray-200">Usuário</th>
                  <th className="py-4 px-6 text-left text-sm font-semibold text-gray-700 border-b border-gray-200">Ação</th>
                  <th className="py-4 px-6 text-left text-sm font-semibold text-gray-700 border-b border-gray-200">Entidade</th>
                  <th className="py-4 px-6 text-left text-sm font-semibold text-gray-700 border-b border-gray-200">ID</th>
                  <th className="py-4 px-6 text-left text-sm font-semibold text-gray-700 border-b border-gray-200">IP</th>
                  <th className="py-4 px-6 text-left text-sm font-semibold text-gray-700 border-b border-gray-200">Status</th>
                </tr>
              </thead>
              <tbody>
                {!loading && items.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="p-3 bg-gray-100 rounded-full">
                          <Activity className="h-6 w-6 text-gray-400" />
                        </div>
                        <p className="text-gray-500 font-medium">Nenhum registro encontrado</p>
                        <p className="text-gray-400 text-sm">Tente ajustar os filtros de busca</p>
                      </div>
                    </td>
                  </tr>
                )}
                {items.map((it, index) => (
                  <tr key={it.id} className={`border-b border-gray-100 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-purple-50/50 transition-all duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                    <td className="py-4 px-6 text-sm text-gray-900 font-medium whitespace-nowrap">
                      {new Date(it.created_at).toLocaleString('pt-BR')}
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-700">
                      {it.user?.username || it.user?.email || "-"}
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {it.action}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-700">{it.entity || "-"}</td>
                    <td className="py-4 px-6 text-sm text-gray-700 font-mono">{it.entity_id || "-"}</td>
                    <td className="py-4 px-6 text-sm text-gray-700 font-mono">{it.ip_address || "-"}</td>
                    <td className="py-4 px-6">
                      {it.status === "success" ? (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200" variant="outline">
                          Sucesso
                        </Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-200" variant="outline">
                          Falha
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}