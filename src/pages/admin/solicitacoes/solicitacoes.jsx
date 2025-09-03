"use client"

import { useState, useEffect } from "react"
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
  const { toast } = useToast()

  useEffect(() => {
    setIsLoading(true)
    const t = setTimeout(async () => {
      try {
        const params = {}
        if (statusFilter !== "all") params.status = statusFilter
        if (tipoFilter !== "all") params.tipo = tipoFilter
        if (urgenciaFilter !== "all") params.urgencia = urgenciaFilter
        if (searchTerm?.trim()) params.search = searchTerm.trim()

        const data = await adminService.getSolicitacoes(params)
        const items = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : []
        setSolicitacoes(items)
      } catch (e) {
        console.warn("[AdminSolicitacoes] getSolicitacoes falhou:", e?.response?.status)
        setSolicitacoes([])
      } finally {
        setIsLoading(false)
      }
    }, 300)
    return () => clearTimeout(t)
  }, [searchTerm, statusFilter, tipoFilter, urgenciaFilter])

  // Ações rápidas na lista
  const handleAprovar = async (id) => {
    setIsLoading(true)
    try {
      await adminService.aprovarSolicitacao(id)
      setSolicitacoes((prev) => prev.map((s) => (s.id === id ? { ...s, status: "approved" } : s)))
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
      await adminService.rejeitarSolicitacao(id, (motivo || "").trim())
      setSolicitacoes((prev) => prev.map((s) => (s.id === id ? { ...s, status: "rejected" } : s)))
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
      solicitacao.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      solicitacao.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (solicitacao.crm && solicitacao.crm.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (solicitacao.cnpj && solicitacao.cnpj.includes(searchTerm))

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
              <p>{solicitacao.documentos.length} arquivo(s)</p>
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
                <strong>Aprovado em:</strong> {new Date(solicitacao.dataAprovacao).toLocaleDateString()} por{" "}
                {solicitacao.aprovadoPor}
              </p>
            </div>
          )}

          {solicitacao.status === "rejected" && (
            <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
              <p className="text-sm text-red-800 dark:text-red-200">
                <strong>Rejeitado em:</strong> {new Date(solicitacao.dataRejeicao).toLocaleDateString()} por{" "}
                {solicitacao.rejeitadoPor}
                <br />
                <strong>Motivo:</strong> {solicitacao.motivoRejeicao}
              </p>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" asChild>
              <Link to={`/admin/solicitacoes/${solicitacao.id}`}>
                <Eye className="mr-2 h-4 w-4" />
                Ver Detalhes
              </Link>
            </Button>
            {solicitacao.status === "pending" && (
              <>
                <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleAprovar(solicitacao.id)} disabled={isLoading}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Aprovar
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleRejeitar(solicitacao.id)} disabled={isLoading}>
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Solicitações de Cadastro</h1>
        <p className="text-muted-foreground">Gerencie as solicitações de médicos e clínicas</p>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email, CRM ou CNPJ..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="approved">Aprovado</SelectItem>
                <SelectItem value="rejected">Rejeitado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={tipoFilter} onValueChange={setTipoFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Tipos</SelectItem>
                <SelectItem value="medico">Médico</SelectItem>
                <SelectItem value="clinica">Clínica</SelectItem>
              </SelectContent>
            </Select>
            <Select value={urgenciaFilter} onValueChange={setUrgenciaFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Urgência" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Urgências</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="baixa">Baixa</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabs com Solicitações */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Pendentes ({pendingSolicitacoes.length})
          </TabsTrigger>
          <TabsTrigger value="approved" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Aprovadas ({approvedSolicitacoes.length})
          </TabsTrigger>
          <TabsTrigger value="rejected" className="flex items-center gap-2">
            <XCircle className="h-4 w-4" />
            Rejeitadas ({rejectedSolicitacoes.length})
          </TabsTrigger>
          <TabsTrigger value="all" className="flex items-center gap-2">
            Todas ({filteredSolicitacoes.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <div className="grid gap-4">
            {pendingSolicitacoes.length > 0 ? (
              pendingSolicitacoes.map((solicitacao) => (
                <SolicitacaoCard key={solicitacao.id} solicitacao={solicitacao} />
              ))
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-lg font-medium">Nenhuma solicitação pendente</p>
                    <p className="text-muted-foreground">Todas as solicitações foram processadas</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="approved">
          <div className="grid gap-4">
            {approvedSolicitacoes.map((solicitacao) => (
              <SolicitacaoCard key={solicitacao.id} solicitacao={solicitacao} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="rejected">
          <div className="grid gap-4">
            {rejectedSolicitacoes.map((solicitacao) => (
              <SolicitacaoCard key={solicitacao.id} solicitacao={solicitacao} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="all">
          <div className="grid gap-4">
            {filteredSolicitacoes.map((solicitacao) => (
              <SolicitacaoCard key={solicitacao.id} solicitacao={solicitacao} />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
