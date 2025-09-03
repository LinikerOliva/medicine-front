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
  Download,
  Eye,
  Stethoscope,
  Building2,
  Calendar,
  FileText,
  AlertTriangle,
  Mail,
  Phone,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { adminService } from "@/services/adminService"

export default function SolicitacaoDetalhes() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [isProcessing, setIsProcessing] = useState(false)
  const [observacoes, setObservacoes] = useState("")
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
        navigate("/admin/solicitacoes")
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [id])
  // REMOVIDO: bloco de "Dados simulados" que redeclarava `const solicitacao = { ... }`

  // Guards para loading e ausência de dados
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/admin/solicitacoes")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
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
          <Button variant="ghost" onClick={() => navigate("/admin/solicitacoes")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Solicitação não encontrada</h1>
            <p className="text-muted-foreground">Tente novamente mais tarde.</p>
          </div>
        </div>
      </div>
    )
  }
  const handleAprovar = async () => {
    setIsProcessing(true)
    try {
      await adminService.aprovarSolicitacao(id, observacoes || "")
      toast({
        title: "Solicitação aprovada!",
        description: `${solicitacao?.nome || "Solicitação"} aprovada com sucesso.`,
      })
      navigate("/admin/solicitacoes")
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível aprovar a solicitação.",
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
      toast({
        title: "Solicitação rejeitada",
        description: `A solicitação de ${solicitacao?.nome || ""} foi rejeitada.`,
      })
      navigate("/admin/solicitacoes")
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível rejeitar a solicitação.",
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
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            <AlertTriangle className="mr-1 h-3 w-3" />
            Aguardando Análise
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate("/admin/solicitacoes")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Detalhes da Solicitação</h1>
          <p className="text-muted-foreground">Análise completa da solicitação de cadastro</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Informações Principais */}
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
                      {solicitacao.tipo === "medico"
                        ? "Solicitação de Cadastro Médico"
                        : "Solicitação de Cadastro de Clínica"}
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
                    <span>{solicitacao.email}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Telefone</Label>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{solicitacao.telefone}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">
                    {solicitacao.tipo === "medico" ? "Especialidade" : "CNPJ"}
                  </Label>
                  <span>{solicitacao.especialidade}</span>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">
                    {solicitacao.tipo === "medico" ? "CRM" : "Responsável Técnico"}
                  </Label>
                  <span>{solicitacao.crm}</span>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Data de Envio</Label>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {new Date(solicitacao.dataEnvio || solicitacao.created_at).toLocaleDateString()} às{" "}
                      {new Date(solicitacao.dataEnvio || solicitacao.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </div>

              <Separator />

              {solicitacao.tipo === "medico" && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Formação Acadêmica</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Instituição de Formação</Label>
                      <span>{solicitacao.instituicaoFormacao}</span>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Ano de Formação</Label>
                      <span>{solicitacao.anoFormacao}</span>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Residência</Label>
                      <span>{solicitacao.residencia}</span>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Instituição da Residência</Label>
                      <span>{solicitacao.instituicaoResidencia}</span>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">Ano da Residência</Label>
                      <span>{solicitacao.anoResidencia}</span>
                    </div>
                  </div>
                </div>
              )}

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Experiência Profissional</h3>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm">{solicitacao.experiencia}</p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Motivação</h3>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm">{solicitacao.motivacao}</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Endereço</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">CEP</Label>
                    <span>{solicitacao.endereco.cep}</span>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Logradouro</Label>
                    <span>{solicitacao.endereco.logradouro}</span>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Bairro</Label>
                    <span>{solicitacao.endereco.bairro}</span>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Cidade/Estado</Label>
                    <span>
                      {solicitacao.endereco.cidade}/{solicitacao.endereco.estado}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Documentos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documentos Enviados
              </CardTitle>
              <CardDescription>{(solicitacao.documentos?.length || 0)} documento(s) anexado(s)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(solicitacao.documentos || []).map((doc, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{doc.nome}</p>
                        <p className="text-sm text-muted-foreground">
                          {doc.tamanho} • Enviado em {new Date(doc.dataUpload).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Eye className="mr-2 h-4 w-4" />
                        Visualizar
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="mr-2 h-4 w-4" />
                        Baixar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Ações */}
        <div className="space-y-6">
          {solicitacao.status === "pending" && (
            <Card>
              <CardHeader>
                <CardTitle>Ações</CardTitle>
                <CardDescription>Aprovar ou rejeitar esta solicitação</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="observacoes">Observações (opcional)</Label>
                  <Textarea
                    id="observacoes"
                    placeholder="Adicione observações sobre esta solicitação..."
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                  />
                </div>

                <Button
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={handleAprovar}
                  disabled={isProcessing}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  {isProcessing ? "Aprovando..." : "Aprovar Solicitação"}
                </Button>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="motivoRejeicao">Motivo da Rejeição</Label>
                  <Textarea
                    id="motivoRejeicao"
                    placeholder="Informe o motivo da rejeição..."
                    value={motivoRejeicao}
                    onChange={(e) => setMotivoRejeicao(e.target.value)}
                  />
                </div>

                <Button variant="destructive" className="w-full" onClick={handleRejeitar} disabled={isProcessing}>
                  <XCircle className="mr-2 h-4 w-4" />
                  {isProcessing ? "Rejeitando..." : "Rejeitar Solicitação"}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Informações Adicionais */}
          <Card>
            <CardHeader>
              <CardTitle>Informações do Sistema</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">ID da Solicitação:</span>
                <span className="font-mono">#{solicitacao.id.toString().padStart(6, "0")}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tipo:</span>
                <span className="capitalize">{solicitacao.tipo}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Urgência:</span>
                <Badge variant={solicitacao.urgencia === "alta" ? "destructive" : "secondary"} className="text-xs">
                  {solicitacao.urgencia}
                </Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Status:</span>
                {getStatusBadge(solicitacao.status)}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
