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
    <Card key={solicitacao.id} className="hover:shadow-md transition-shadow rounded-xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`app-quick-icon ${solicitacao.tipo === "medico" ? "info" : "primary"} h-10 w-10`}>
              {solicitacao.tipo === "medico" ? <Stethoscope className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
            </div>
            <div>
              <CardTitle className="text-lg">{solicitacao.nome}</CardTitle>
              <CardDescription>{solicitacao.email}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getUrgenciaBadge(solicitacao.urgencia)}
            {getStatusBadge(solicitacao.status)}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium text-muted-foreground">
                {solicitacao.tipo === "medico" ? "Especialidade" : "CNPJ"}
              </p>
              <p>{solicitacao.tipo === "medico" ? solicitacao.especialidade : solicitacao.cnpj}</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">
                {solicitacao.tipo === "medico" ? "CRM" : "Responsável"}
              </p>
              <p>{solicitacao.tipo === "medico" ? solicitacao.crm : solicitacao.responsavel}</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Data de Envio</p>
              <p className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(solicitacao.dataEnvio).toLocaleDateString()} às{" "}
                {new Date(solicitacao.dataEnvio).toLocaleTimeString()}
              </p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Documentos</p>
              <p>{Array.isArray(solicitacao.documentos) ? solicitacao.documentos.length : 0} arquivo(s)</p>
            </div>
          </div>

          {solicitacao.observacoes && (
            <div className="bg-muted/50 p-3 rounded-lg">
              <p className="text-sm">{solicitacao.observacoes}</p>
            </div>
          )}

          {solicitacao.status === "approved" && (
            <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
              <p className="text-sm text-green-800 dark:text-green-200">
                <strong>Aprovado em:</strong> {solicitacao.dataAprovacao ? new Date(solicitacao.dataAprovacao).toLocaleDateString() : "—"}
                {solicitacao.aprovadoPor ? (<> por {solicitacao.aprovadoPor}</>) : null}
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to={`/admin/solicitacoes/${solicitacao.id}`}>
                <Eye className="mr-2 h-4 w-4" /> Ver detalhes
              </Link>
            </Button>
            {solicitacao.status === "pending" && (
              <>
                <Button variant="success" size="sm" onClick={() => handleAprovar(solicitacao.id)}>
                  Aprovar
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleRejeitar(solicitacao.id)}>
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
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Solicitações</h1>
          <p className="text-muted-foreground">Gerencie solicitações de médicos e clínicas.</p>
        </div>
      </div>

      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Use os filtros para refinar sua busca.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por nome, e-mail, CRM ou CNPJ" className="pl-9"
                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
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
                <SelectTrigger>
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
                <SelectTrigger>
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

      <Tabs defaultValue="todas" className="space-y-4">
        <TabsList>
          <TabsTrigger value="todas" className="gap-2">
            <Filter className="h-4 w-4" /> Todas
          </TabsTrigger>
          <TabsTrigger value="pendentes" className="gap-2">
            <Clock className="h-4 w-4" /> Pendentes
          </TabsTrigger>
          <TabsTrigger value="aprovadas" className="gap-2">
            <CheckCircle className="h-4 w-4" /> Aprovadas
          </TabsTrigger>
          <TabsTrigger value="rejeitadas" className="gap-2">
            <XCircle className="h-4 w-4" /> Rejeitadas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="todas">
          {isLoading ? (
            <p className="text-muted-foreground">Carregando solicitações...</p>
          ) : filteredSolicitacoes.length === 0 ? (
            <p className="text-muted-foreground">Nenhuma solicitação encontrada.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredSolicitacoes.map((sol) => (
                <SolicitacaoCard key={sol.id} solicitacao={sol} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="pendentes">
          {isLoading ? (
            <p className="text-muted-foreground">Carregando solicitações...</p>
          ) : pendingSolicitacoes.length === 0 ? (
            <p className="text-muted-foreground">Nenhuma solicitação pendente.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {pendingSolicitacoes.map((sol) => (
                <SolicitacaoCard key={sol.id} solicitacao={sol} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="aprovadas">
          {isLoading ? (
            <p className="text-muted-foreground">Carregando solicitações...</p>
          ) : approvedSolicitacoes.length === 0 ? (
            <p className="text-muted-foreground">Nenhuma solicitação aprovada.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {approvedSolicitacoes.map((sol) => (
                <SolicitacaoCard key={sol.id} solicitacao={sol} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="rejeitadas">
          {isLoading ? (
            <p className="text-muted-foreground">Carregando solicitações...</p>
          ) : rejectedSolicitacoes.length === 0 ? (
            <p className="text-muted-foreground">Nenhuma solicitação rejeitada.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {rejectedSolicitacoes.map((sol) => (
                <SolicitacaoCard key={sol.id} solicitacao={sol} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
