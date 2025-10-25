"use client"

import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Eye,
  Stethoscope,
  Building2,
  Calendar,
  AlertTriangle,
  Mail,
  Phone,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { adminService } from "@/services/adminService"

export default function SecretariaSolicitacaoDetalhes() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [isProcessing, setIsProcessing] = useState(false)
  const [motivoRejeicao, setMotivoRejeicao] = useState("")
  const [loading, setLoading] = useState(true)
  const [solicitacao, setSolicitacao] = useState(null)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const data = await adminService.getSolicitacao(id)
        if (mounted) setSolicitacao(data)
      } catch (e) {
        toast({
          title: "Erro ao carregar",
          description: "Não foi possível carregar a solicitação.",
          variant: "destructive",
        })
        navigate("/secretaria/solicitacoes")
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [id])

  const handleAprovar = async () => {
    setIsProcessing(true)
    try {
      await adminService.aprovarSolicitacao(id, "Aprovada pela Secretaria")
      toast({ title: "Solicitação aprovada!", description: "Solicitação aprovada com sucesso." })
      navigate("/secretaria/solicitacoes")
    } catch (error) {
      const st = error?.response?.status
      toast({
        title: st === 403 ? "Sem permissão" : "Erro",
        description: st === 403 ? "Seu perfil não possui permissão para aprovar." : "Não foi possível aprovar a solicitação.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRejeitar = async () => {
    if (!motivoRejeicao.trim()) {
      toast({
        title: "Motivo obrigatório",
        description: "Por favor, informe o motivo da rejeição.",
        variant: "destructive",
      })
      return
    }
    setIsProcessing(true)
    try {
      await adminService.rejeitarSolicitacao(id, motivoRejeicao.trim())
      toast({ title: "Solicitação rejeitada", description: "A solicitação foi rejeitada." })
      navigate("/secretaria/solicitacoes")
    } catch (error) {
      const st = error?.response?.status
      toast({
        title: st === 403 ? "Sem permissão" : "Erro",
        description: st === 403 ? "Seu perfil não possui permissão para rejeitar." : "Não foi possível rejeitar a solicitação.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="warning" className="">
            <AlertTriangle className="mr-1 h-3 w-3" /> Aguardando Análise
          </Badge>
        )
      case "approved":
        return (
          <Badge variant="success" className="">
            <CheckCircle className="mr-1 h-3 w-3" /> Aprovado
          </Badge>
        )
      case "rejected":
        return (
          <Badge variant="destructive" className="">
            <XCircle className="mr-1 h-3 w-3" /> Rejeitado
          </Badge>
        )
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/secretaria/solicitacoes")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Carregando...</h1>
            <p className="text-muted-foreground">Buscando detalhes da solicitação</p>
          </div>
        </div>
      </div>
    )
  }

  if (!solicitacao) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/secretaria/solicitacoes")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Solicitação não encontrada</h1>
            <p className="text-muted-foreground">Tente novamente mais tarde.</p>
          </div>
        </div>
      </div>
    )
  }

  const endereco = solicitacao?.endereco || {}

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate("/secretaria/solicitacoes")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Detalhes da Solicitação</h1>
          <p className="text-muted-foreground">Análise da solicitação recebida</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`app-quick-icon ${solicitacao.tipo === "medico" ? "info" : "primary"} h-12 w-12`}>
                    {solicitacao.tipo === "medico" ? (
                      <Stethoscope className="h-6 w-6" />
                    ) : (
                      <Building2 className="h-6 w-6" />
                    )}
                  </div>
                  <div>
                    <CardTitle className="text-xl">{solicitacao.nome}</CardTitle>
                    <CardDescription>
                      {solicitacao.tipo === "medico" ? "Solicitação de Cadastro Médico" : "Solicitação de Cadastro de Clínica"}
                    </CardDescription>
                  </div>
                </div>
                {getStatusBadge(solicitacao.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{solicitacao.email || "—"}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Telefone</Label>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{solicitacao.telefone || solicitacao.celular || "—"}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Especialidade / Tipo</Label>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{solicitacao.especialidade || solicitacao.tipo}</span>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Endereço</Label>
                  <div className="text-sm text-muted-foreground">
                    <div>{endereco?.logradouro} {endereco?.numero}</div>
                    <div>{endereco?.bairro}</div>
                    <div>{endereco?.cidade} - {endereco?.estado}</div>
                    <div>{endereco?.cep}</div>
                  </div>
                </div>
              </div>

            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Ações</CardTitle>
              <CardDescription>Tomar decisão sobre a solicitação</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {solicitacao.status === "pending" ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <Button onClick={handleAprovar} disabled={isProcessing} className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
                      <CheckCircle className="mr-2 h-4 w-4" /> Aprovar
                    </Button>
                    <Button variant="destructive" onClick={handleRejeitar} disabled={isProcessing}>
                      <XCircle className="mr-2 h-4 w-4" /> Rejeitar
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Label>Motivo da Rejeição</Label>
                    <Textarea placeholder="Informe o motivo da rejeição" value={motivoRejeicao} onChange={(e) => setMotivoRejeicao(e.target.value)} />
                  </div>
                </div>
              ) : solicitacao.status === "approved" ? (
                <Badge variant="success" className="">Aprovado</Badge>
              ) : (
                <div className="space-y-2">
                  <Badge variant="destructive">Rejeitado</Badge>
                  {solicitacao.motivoRejeicao && (
                    <p className="text-sm text-muted-foreground">Motivo: {solicitacao.motivoRejeicao}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}