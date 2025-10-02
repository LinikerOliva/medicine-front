"use client"

import { useState, useEffect, useRef, useMemo } from "react"
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

export default function AdminSolicitacoes() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [tipoFilter, setTipoFilter] = useState("all")
  const [urgenciaFilter, setUrgenciaFilter] = useState("all")
  const [isLoading, setIsLoading] = useState(false)
  const [solicitacoes, setSolicitacoes] = useState([])
  const abortRef = useRef(null)
  const { toast } = useToast()

  const queryKey = useMemo(() => ({
    search: searchTerm.trim(),
    status: statusFilter,
    tipo: tipoFilter,
    urgencia: urgenciaFilter,
  }), [searchTerm, statusFilter, tipoFilter, urgenciaFilter])

  useEffect(() => {
    setIsLoading(true)
    const t = setTimeout(async () => {
      // cancela requisição anterior se ainda estiver pendente
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

        const data = await adminService.getSolicitacoes(params, { signal: controller.signal })
        const items = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : []
        setSolicitacoes(items)
      } catch (e) {
        if (e?.name !== "AbortError") {
          // evita log ruidoso em DEV
          setSolicitacoes([])
        }
      } finally {
        setIsLoading(false)
      }
    }, 400)
    return () => clearTimeout(t)
  }, [queryKey])

  // Ações rápidas na lista
  const handleAprovar = async (id) => {
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
    } catch (e) {
      toast({ title: "Erro ao aprovar", description: "Não foi possível aprovar a solicitação.", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRejeitar = async (id) => {
    const motivo = window.prompt("Informe o motivo da rejeição:") // simples prompt
    if (motivo === null) return // cancelado
    setIsLoading(true)
    try {
      const updated = await adminService.rejeitarSolicitacao(id, (motivo || "").trim())
      setSolicitacoes((prev) => prev.map((s) => (s.id === id ? {
        ...s,
        status: "rejected",
        rejeitadoPor: updated?.rejected_by || s.rejeitadoPor || "",
        dataRejeicao: updated?.rejected_at || s.dataRejeicao || new Date().toISOString(),
        motivoRejeicao: updated?.rejection_reason || motivo || s.motivoRejeicao || "",
        aprovadoPor: "",
        dataAprovacao: null,
      } : s)))
      toast({ title: "Solicitação rejeitada", description: "A solicitação foi rejeitada." })
    } catch (e) {
      toast({ title: "Erro ao rejeitar", description: "Não foi possível rejeitar a solicitação.", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }
  const getStatusBadge = (status) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            <Clock className="mr-1 h-3 w-3" />
            Pendente
          </Badge>
        )
      case "approved":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle className="mr-1 h-3 w-3" />
            Aprovado
          </Badge>
        )
      case "rejected":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <XCircle className="mr-1 h-3 w-3" />
            Rejeitado
          </Badge>
        )
      default:
        return null
    }
  }

  const getUrgenciaBadge = (urgencia) => {
    switch (urgencia) {
      case "alta":
        return (
          <Badge variant="destructive" className="text-xs">
            <AlertTriangle className="mr-1 h-2 w-2" />
            Alta
          </Badge>
        )
      case "normal":
        return (
          <Badge variant="secondary" className="text-xs">
            Normal
          </Badge>
        )
      case "baixa":
        return (
          <Badge variant="outline" className="text-xs">
            Baixa
          </Badge>
        )
      default:
        return null
    }
  }

  const filteredSolicitacoes = solicitacoes.filter((solicitacao) => {
    const matchesSearch =
      (solicitacao.nome || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (solicitacao.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (solicitacao.crm && String(solicitacao.crm).toLowerCase().includes(searchTerm.toLowerCase())) ||
      (solicitacao.cnpj && String(solicitacao.cnpj).includes(searchTerm))

    const matchesStatus = statusFilter === "all" || solicitacao.status === statusFilter
    const matchesTipo = tipoFilter === "all" || solicitacao.tipo === tipoFilter
    const matchesUrgencia = urgenciaFilter === "all" || solicitacao.urgencia === urgenciaFilter

    return matchesSearch && matchesStatus && matchesTipo && matchesUrgencia
  })

  const pendingSolicitacoes = filteredSolicitacoes.filter((s) => s.status === "pending")
  const approvedSolicitacoes = filteredSolicitacoes.filter((s) => s.status === "approved")
  const rejectedSolicitacoes = filteredSolicitacoes.filter((s) => s.status === "rejected")

  const SolicitacaoCard = ({ solicitacao }) => (
    <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl group">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl transition-all duration-300 group-hover:scale-110 ${
              solicitacao.tipo === "medico" 
                ? "bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-600" 
                : "bg-gradient-to-br from-purple-100 to-pink-100 text-purple-600"
            }`}>
              {solicitacao.tipo === "medico" ? <Stethoscope className="h-6 w-6" /> : <Building2 className="h-6 w-6" />}
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-gray-800 group-hover:text-blue-600 transition-colors">
                {solicitacao.nome}
              </CardTitle>
              <CardDescription className="text-gray-600 font-medium">{solicitacao.email}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getUrgenciaBadge(solicitacao.urgencia)}
            {getStatusBadge(solicitacao.status)}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-gray-50 to-slate-50 p-4 rounded-xl border border-gray-100">
              <p className="font-semibold text-gray-600 text-sm mb-1">
                {solicitacao.tipo === "medico" ? "Especialidade" : "CNPJ"}
              </p>
              <p className="text-gray-800 font-medium">{solicitacao.tipo === "medico" ? solicitacao.especialidade : solicitacao.cnpj}</p>
            </div>
            <div className="bg-gradient-to-br from-gray-50 to-slate-50 p-4 rounded-xl border border-gray-100">
              <p className="font-semibold text-gray-600 text-sm mb-1">
                {solicitacao.tipo === "medico" ? "CRM" : "Responsável"}
              </p>
              <p className="text-gray-800 font-medium">{solicitacao.tipo === "medico" ? solicitacao.crm : solicitacao.responsavel}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100">
              <p className="font-semibold text-blue-600 text-sm mb-1">Data de Envio</p>
              <p className="flex items-center gap-2 text-blue-800 font-medium">
                <Calendar className="h-4 w-4" />
                <span>
                  {new Date(solicitacao.dataEnvio).toLocaleDateString()} às{" "}
                  {new Date(solicitacao.dataEnvio).toLocaleTimeString()}
                </span>
              </p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border border-green-100">
              <p className="font-semibold text-green-600 text-sm mb-1">Documentos</p>
              <p className="text-green-800 font-medium">{Array.isArray(solicitacao.documentos) ? solicitacao.documentos.length : 0} arquivo(s)</p>
            </div>
          </div>

          {solicitacao.observacoes && (
            <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 p-4 rounded-xl">
              <p className="text-amber-800 text-sm font-medium">{solicitacao.observacoes}</p>
            </div>
          )}

          {solicitacao.status === "approved" && (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 p-4 rounded-xl">
              <p className="text-green-800 text-sm font-medium">
                <strong>Aprovado em:</strong> {solicitacao.dataAprovacao ? new Date(solicitacao.dataAprovacao).toLocaleDateString() : "—"}
                {solicitacao.aprovadoPor ? (<> por {solicitacao.aprovadoPor}</>) : null}
              </p>
            </div>
          )}

          {solicitacao.status === "rejected" && solicitacao.motivoRejeicao && (
            <div className="bg-gradient-to-br from-red-50 to-rose-50 border border-red-200 p-4 rounded-xl">
              <p className="text-red-800 text-sm font-medium">
                <strong>Rejeitado:</strong> {solicitacao.motivoRejeicao}
                {solicitacao.rejeitadoPor && (<> por {solicitacao.rejeitadoPor}</>)}
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button 
              variant="outline" 
              size="sm" 
              asChild
              className="bg-white hover:bg-blue-50 border-blue-200 text-blue-600 hover:text-blue-700 hover:border-blue-300 transition-all duration-200"
            >
              <Link to={`/admin/solicitacoes/${solicitacao.id}`}>
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
      </CardContent>
    </Card>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Header com gradiente */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Solicitações</h1>
              <p className="text-blue-100">Gerencie solicitações de médicos e clínicas</p>
            </div>
            <div className="hidden md:flex items-center gap-4">
              <div className="text-right">
                <p className="text-2xl font-bold">{filteredSolicitacoes.length}</p>
                <p className="text-blue-100 text-sm">Total</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Cards de estatísticas rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-600 text-sm font-medium">Pendentes</p>
                  <p className="text-2xl font-bold text-amber-700">{pendingSolicitacoes.length}</p>
                </div>
                <div className="bg-amber-100 p-3 rounded-full">
                  <Clock className="h-6 w-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-600 text-sm font-medium">Aprovadas</p>
                  <p className="text-2xl font-bold text-green-700">{approvedSolicitacoes.length}</p>
                </div>
                <div className="bg-green-100 p-3 rounded-full">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-rose-50 border-red-200 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-600 text-sm font-medium">Rejeitadas</p>
                  <p className="text-2xl font-bold text-red-700">{rejectedSolicitacoes.length}</p>
                </div>
                <div className="bg-red-100 p-3 rounded-full">
                  <XCircle className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-600 text-sm font-medium">Total</p>
                  <p className="text-2xl font-bold text-blue-700">{filteredSolicitacoes.length}</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-full">
                  <Filter className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Card de filtros */}
        <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-xl rounded-2xl">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-t-2xl border-b">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <Filter className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-xl">Filtros Avançados</CardTitle>
                <CardDescription>Use os filtros para refinar sua busca</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar por nome, e-mail, CRM ou CNPJ" 
                  className="pl-9 bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                />
              </div>
              <div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-lg">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="approved">Aprovado</SelectItem>
                    <SelectItem value="rejected">Rejeitado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Select value={tipoFilter} onValueChange={setTipoFilter}>
                  <SelectTrigger className="bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-lg">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="medico">Médicos</SelectItem>
                    <SelectItem value="clinica">Clínicas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Select value={urgenciaFilter} onValueChange={setUrgenciaFilter}>
                  <SelectTrigger className="bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-lg">
                    <SelectValue placeholder="Urgência" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="baixa">Baixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs com estilo moderno */}
        <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-xl rounded-2xl">
          <Tabs defaultValue="todas" className="space-y-6">
            <div className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-t-2xl p-6 border-b">
              <TabsList className="bg-white/80 backdrop-blur-sm border shadow-sm rounded-xl p-1">
                <TabsTrigger 
                  value="todas" 
                  className="gap-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg transition-all duration-200"
                >
                  <Filter className="h-4 w-4" /> Todas
                </TabsTrigger>
                <TabsTrigger 
                  value="pendentes" 
                  className="gap-2 data-[state=active]:bg-amber-500 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg transition-all duration-200"
                >
                  <Clock className="h-4 w-4" /> Pendentes
                </TabsTrigger>
                <TabsTrigger 
                  value="aprovadas" 
                  className="gap-2 data-[state=active]:bg-green-500 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg transition-all duration-200"
                >
                  <CheckCircle className="h-4 w-4" /> Aprovadas
                </TabsTrigger>
                <TabsTrigger 
                  value="rejeitadas" 
                  className="gap-2 data-[state=active]:bg-red-500 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg transition-all duration-200"
                >
                  <XCircle className="h-4 w-4" /> Rejeitadas
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-6">
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
                ) : pendingSolicitacoes.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="bg-amber-100 rounded-full p-4 w-16 h-16 mx-auto mb-4">
                      <Clock className="h-8 w-8 text-amber-600" />
                    </div>
                    <p className="text-muted-foreground">Nenhuma solicitação pendente.</p>
                  </div>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2">
                    {pendingSolicitacoes.map((sol) => (
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
                ) : approvedSolicitacoes.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="bg-green-100 rounded-full p-4 w-16 h-16 mx-auto mb-4">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                    <p className="text-muted-foreground">Nenhuma solicitação aprovada.</p>
                  </div>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2">
                    {approvedSolicitacoes.map((sol) => (
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
                ) : rejectedSolicitacoes.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="bg-red-100 rounded-full p-4 w-16 h-16 mx-auto mb-4">
                      <XCircle className="h-8 w-8 text-red-600" />
                    </div>
                    <p className="text-muted-foreground">Nenhuma solicitação rejeitada.</p>
                  </div>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2">
                    {rejectedSolicitacoes.map((sol) => (
                      <SolicitacaoCard key={sol.id} solicitacao={sol} />
                    ))}
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </Card>
      </div>
    </div>
  )
}
