"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Search,
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  Stethoscope,
  Building2,
  Eye,
  Calendar,
  AlertTriangle,
} from "lucide-react"
import { Link } from "react-router-dom"
import { adminService } from "@/services/adminService"
import { useToast } from "@/hooks/use-toast"
import { useDebounce } from "@/hooks/useDebounce"
import { sanitizeString } from "@/utils/inputValidation"

export default function SecretariaSolicitacoes() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [tipoFilter, setTipoFilter] = useState("all")
  const [urgenciaFilter, setUrgenciaFilter] = useState("all")
  const [isLoading, setIsLoading] = useState(false)
  const [solicitacoes, setSolicitacoes] = useState([])
  const abortRef = useRef(null)
  const { toast } = useToast()

  const debouncedSearchTerm = useDebounce(searchTerm, 500)

  const queryKey = useMemo(() => ({
    search: sanitizeString(debouncedSearchTerm.trim()),
    status: statusFilter,
    tipo: tipoFilter,
    urgencia: urgenciaFilter,
  }), [debouncedSearchTerm, statusFilter, tipoFilter, urgenciaFilter])

  const fetchSolicitacoes = useCallback(async (params, signal) => {
    try {
      const data = await adminService.getSolicitacoes(params, { signal })
      const items = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : []
      return items
    } catch (error) {
      if (error?.name !== "AbortError") {
        console.error('Erro ao buscar solicitações:', error)
      }
      throw error
    }
  }, [])

  useEffect(() => {
    setIsLoading(true)
    const t = setTimeout(async () => {
      if (abortRef.current) {
        try { abortRef.current.abort() } catch {}
      }
      const controller = new AbortController()
      abortRef.current = controller
      try {
        const params = {}
        if (queryKey.status !== "all") params.status = queryKey.status
        if (queryKey.tipo !== "all") params.tipo = queryKey.tipo
        if (queryKey.urgencia !== "all") params.urgencia = queryKey.urgencia
        if (queryKey.search) params.search = queryKey.search

        const items = await fetchSolicitacoes(params, controller.signal)
        setSolicitacoes(items)
      } catch (e) {
        if (e?.name !== "AbortError") {
          setSolicitacoes([])
        }
      } finally {
        setIsLoading(false)
      }
    }, 200)
    return () => clearTimeout(t)
  }, [queryKey, fetchSolicitacoes])

  const handleAprovar = useCallback(async (id) => {
    setIsLoading(true)
    try {
      const updated = await adminService.aprovarSolicitacao(id)
      setSolicitacoes((prev) => prev.map((s) => (s.id === id ? {
        ...s,
        status: "approved",
        aprovadoPor: updated?.approved_by || s.aprovadoPor || "",
        dataAprovacao: updated?.approved_at || s.dataAprovacao || new Date().toISOString(),
        rejeitadoPor: "",
        dataRejeicao: null,
        motivoRejeicao: "",
      } : s)))
      toast({ title: "Solicitação aprovada", description: "A solicitação foi aprovada com sucesso." })
    } catch (error) {
      const st = error?.response?.status
      toast({
        title: st === 403 ? "Sem permissão" : "Erro ao aprovar",
        description: st === 403 ? "Seu perfil não possui permissão para aprovar." : "Não foi possível aprovar a solicitação.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  const handleRejeitar = useCallback(async (id) => {
    setIsLoading(true)
    try {
      const updated = await adminService.rejeitarSolicitacao(id, "Rejeitada pela Secretaria")
      setSolicitacoes((prev) => prev.map((s) => (s.id === id ? {
        ...s,
        status: "rejected",
        rejeitadoPor: updated?.rejected_by || s.rejeitadoPor || "",
        dataRejeicao: updated?.rejected_at || s.dataRejeicao || new Date().toISOString(),
        motivoRejeicao: updated?.reason || s.motivoRejeicao || "Rejeitada pela Secretaria",
      } : s)))
      toast({ title: "Solicitação rejeitada", description: "A solicitação foi rejeitada." })
    } catch (error) {
      const st = error?.response?.status
      toast({
        title: st === 403 ? "Sem permissão" : "Erro ao rejeitar",
        description: st === 403 ? "Seu perfil não possui permissão para rejeitar." : "Não foi possível rejeitar a solicitação.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  const SolicitationBadge = ({ status }) => {
    const s = String(status || "pending").toLowerCase()
    if (s === "approved") return <Badge variant="success">Aprovada</Badge>
    if (s === "rejected") return <Badge variant="destructive">Rejeitada</Badge>
    return <Badge variant="warning">Pendente</Badge>
  }

  const SolicitacaoCard = ({ solicitacao }) => {
    return (
      <div className="p-4 rounded-xl border bg-white shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {solicitacao.tipo === "medico" ? (
              <Stethoscope className="h-5 w-5 text-medical-primary" />
            ) : (
              <Building2 className="h-5 w-5 text-medical-primary" />
            )}
            <div>
              <div className="font-semibold text-medical-primary">{solicitacao.nome || "—"}</div>
              <div className="text-xs text-muted-foreground">Enviada em {new Date(solicitacao.dataEnvio).toLocaleDateString()}</div>
            </div>
          </div>
          <SolicitationBadge status={solicitacao.status} />
        </div>

        {/* Informações secundárias */}
        <div className="mt-3 text-sm text-muted-foreground flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          {solicitacao.especialidade ? (
            <span>Especialidade: {solicitacao.especialidade}</span>
          ) : (
            <span>Tipo: {solicitacao.tipo}</span>
          )}
        </div>

        {/* Razão de rejeição (se houver) */}
        {solicitacao.status === "rejected" && solicitacao.motivoRejeicao && (
          <div className="bg-gradient-to-br from-red-50 to-rose-50 border border-red-200 p-3 rounded-lg mt-3">
            <p className="text-red-800 text-xs font-medium">
              <strong>Rejeitado:</strong> {solicitacao.motivoRejeicao}
              {solicitacao.rejeitadoPor && (<> por {solicitacao.rejeitadoPor}</>)}
            </p>
          </div>
        )}

        <div className="flex gap-3 pt-3">
          <Button 
            variant="outline" 
            size="sm" 
            asChild
            className="bg-white hover:bg-blue-50 border-blue-200 text-blue-600 hover:text-blue-700 hover:border-blue-300 transition-all duration-200"
          >
            <Link to={`/secretaria/solicitacoes/${solicitacao.id}`}>
              <Eye className="mr-2 h-4 w-4" /> Ver detalhes
            </Link>
          </Button>
          {solicitacao.status === "pending" && (
            <>
              <Button 
                size="sm" 
                onClick={() => handleAprovar(solicitacao.id)}
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-md hover:shadow-lg transition-all duration-200"
                disabled={isLoading}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Aprovar
              </Button>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={() => handleRejeitar(solicitacao.id)}
                className="bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 shadow-md hover:shadow-lg transition-all duration-200"
                disabled={isLoading}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Rejeitar
              </Button>
            </>
          )}
        </div>
      </div>
    )
  }

  const filteredSolicitacoes = useMemo(() => {
    return solicitacoes.filter((s) => {
      const matchesStatus = statusFilter === "all" || s.status === statusFilter
      const matchesTipo = tipoFilter === "all" || s.tipo === tipoFilter
      const matchesUrgencia = urgenciaFilter === "all" || (String(s.urgencia || "normal").toLowerCase() === urgenciaFilter)
      const matchesSearch = !queryKey.search || (s.nome?.toLowerCase().includes(queryKey.search.toLowerCase()) || s.email?.toLowerCase().includes(queryKey.search.toLowerCase()))
      return matchesStatus && matchesTipo && matchesUrgencia && matchesSearch
    })
  }, [solicitacoes, statusFilter, tipoFilter, urgenciaFilter, queryKey.search])

  const categorizedSolicitacoes = useMemo(() => {
    return {
      pending: filteredSolicitacoes.filter((s) => s.status === "pending"),
      approved: filteredSolicitacoes.filter((s) => s.status === "approved"),
      rejected: filteredSolicitacoes.filter((s) => s.status === "rejected"),
    }
  }, [filteredSolicitacoes])

  return (
    <div className="px-6 py-6">
      <div className="flex items-center gap-3 mb-6">
        <AlertTriangle className="h-6 w-6 text-medical-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Solicitações</h1>
          <p className="text-muted-foreground">Gerencie solicitações recebidas (médicos e clínicas)</p>
        </div>
      </div>

      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" /> Filtros
          </CardTitle>
          <CardDescription>Refine a busca por status, tipo e urgência</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou email"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="approved">Aprovadas</SelectItem>
                <SelectItem value="rejected">Rejeitadas</SelectItem>
              </SelectContent>
            </Select>
            <Select value={tipoFilter} onValueChange={setTipoFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="medico">Médico</SelectItem>
                <SelectItem value="clinica">Clínica</SelectItem>
              </SelectContent>
            </Select>
            <Select value={urgenciaFilter} onValueChange={setUrgenciaFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Urgência" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="critica">Crítica</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6">
        <Tabs defaultValue="todas" className="space-y-6">
          <TabsList>
            <TabsTrigger value="todas">Todas</TabsTrigger>
            <TabsTrigger value="pendentes">Pendentes</TabsTrigger>
            <TabsTrigger value="aprovadas">Aprovadas</TabsTrigger>
            <TabsTrigger value="rejeitadas">Rejeitadas</TabsTrigger>
          </TabsList>
          <div className="space-y-6">
            <TabsContent value="todas">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Carregando solicitações...</p>
                  </div>
                </div>
              ) : filteredSolicitacoes.length === 0 ? (
                <div className="text-center py-12">
                  <div className="bg-gray-100 rounded-full p-4 w-16 h-16 mx-auto mb-4">
                    <Search className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-muted-foreground">Nenhuma solicitação encontrada.</p>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2">
                  {filteredSolicitacoes.map((sol) => (
                    <SolicitacaoCard key={sol.id} solicitacao={sol} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="pendentes">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Carregando solicitações...</p>
                  </div>
                </div>
              ) : categorizedSolicitacoes.pending.length === 0 ? (
                <div className="text-center py-12">
                  <div className="bg-amber-100 rounded-full p-4 w-16 h-16 mx-auto mb-4">
                    <Clock className="h-8 w-8 text-amber-600" />
                  </div>
                  <p className="text-muted-foreground">Nenhuma solicitação pendente.</p>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2">
                  {categorizedSolicitacoes.pending.map((sol) => (
                    <SolicitacaoCard key={sol.id} solicitacao={sol} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="aprovadas">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Carregando solicitações...</p>
                  </div>
                </div>
              ) : categorizedSolicitacoes.approved.length === 0 ? (
                <div className="text-center py-12">
                  <div className="bg-green-100 rounded-full p-4 w-16 h-16 mx-auto mb-4">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <p className="text-muted-foreground">Nenhuma solicitação aprovada.</p>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2">
                  {categorizedSolicitacoes.approved.map((sol) => (
                    <SolicitacaoCard key={sol.id} solicitacao={sol} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="rejeitadas">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Carregando solicitações...</p>
                  </div>
                </div>
              ) : categorizedSolicitacoes.rejected.length === 0 ? (
                <div className="text-center py-12">
                  <div className="bg-red-100 rounded-full p-4 w-16 h-16 mx-auto mb-4">
                    <XCircle className="h-8 w-8 text-red-600" />
                  </div>
                  <p className="text-muted-foreground">Nenhuma solicitação rejeitada.</p>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2">
                  {categorizedSolicitacoes.rejected.map((sol) => (
                    <SolicitacaoCard key={sol.id} solicitacao={sol} />
                  ))}
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  )
}