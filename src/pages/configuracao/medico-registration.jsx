"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Stethoscope, Upload, CheckCircle, Clock, XCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { authService } from "@/services/authService" // <- NOVO
import { useNavigate } from "react-router-dom" // <- NOVO
import { useUser } from "@/contexts/user-context" // <- NOVO

export function MedicoRegistration() {
  const [isLoading, setIsLoading] = useState(false)
  const [applicationStatus, setApplicationStatus] = useState("none") // none, pending, approved, rejected
  const { toast } = useToast()
  const navigate = useNavigate() // <- NOVO
  const { setActiveRole, setUserPermissions } = useUser() // <- NOVO

  // NOVO: chave do localStorage por usuário logado
  const currentUser = authService.getCurrentUser?.() || null
  const userKey =
    (currentUser && (currentUser.id || currentUser.pk || currentUser.email || currentUser.username)) || "anon"
  const storageKey = `medicoApplicationStatus:${userKey}`

  // OPCIONAL: modo teste
  const DISABLE_API = import.meta.env.VITE_DISABLE_SOLICITACAO_API === "true"

  // Ler status salvo ao montar (com migração da chave antiga global)
  useEffect(() => {
    try {
      // migração da chave antiga (global)
      const legacy = localStorage.getItem("medicoApplicationStatus")
      if (legacy && !localStorage.getItem(storageKey)) {
        localStorage.setItem(storageKey, legacy)
        localStorage.removeItem("medicoApplicationStatus")
      }

      const saved = JSON.parse(localStorage.getItem(storageKey) || "{}")
      if (saved?.status) setApplicationStatus(saved.status)
    } catch {
      // ignore parse errors
    }
  }, [storageKey])
  const [formData, setFormData] = useState({
    crm: "",
    especialidade: "",
    instituicaoFormacao: "",
    anoFormacao: "",
    residencia: "",
    instituicaoResidencia: "",
    anoResidencia: "",
    experiencia: "",
    motivacao: "",
    documentos: {
      diplomaMedicina: null,
      certificadoResidencia: null,
      comprovanteExperiencia: null,
    },
  })

  // NOVO: máscara/limite de CRM (somente números, até 7 dígitos)
  const formatCRM = (v) => String(v || "").replace(/\D/g, "").slice(0, 7)

  const handleInputChange = (e) => {
    const { name, value } = e.target
    const next = name === "crm" ? formatCRM(value) : value
    setFormData({
      ...formData,
      [name]: next,
    })
  }

  const handleSelectChange = (name, value) => {
    setFormData({
      ...formData,
      [name]: value,
    })
  }

  const handleFileUpload = (documentType, file) => {
    setFormData({
      ...formData,
      documentos: {
        ...formData.documentos,
        [documentType]: file,
      },
    })
  }

  // NOVO: ref para o input de arquivo do Diploma
  const diplomaInputRef = useRef(null)
  const residenciaInputRef = useRef(null)
  const experienciaInputRef = useRef(null)

  const handleRemoveFile = (documentType, inputRef) => {
    setFormData((prev) => ({
      ...prev,
      documentos: {
        ...prev.documentos,
        [documentType]: null,
      },
    }))
    if (inputRef?.current) {
      inputRef.current.value = ""
    }
  }
  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)

    // NOVO: validações mínimas antes de enviar
    if (!formData.documentos?.diplomaMedicina) {
      toast({
        title: "Arquivo obrigatório",
        description: "Anexe o Diploma de Medicina antes de enviar.",
        variant: "destructive",
      })
      setIsLoading(false)
      return
    }

    try {
      const { solicitacaoService } = await import("@/services/solicitacaoService")
      await solicitacaoService.criarSolicitacaoMedico(formData)

      setApplicationStatus("pending")
      localStorage.setItem(storageKey, JSON.stringify({ status: "pending", at: new Date().toISOString() }))
      setUserPermissions((prev) => ({ ...prev, medicoStatus: "pending" })) // <- NOVO
      toast({ title: "Solicitação enviada!", description: "Sua solicitação para se tornar médico foi enviada para análise." })
    } catch (error) {
      const status = error?.response?.status
      // se estiver em modo teste OU o backend ainda não tem o endpoint (404), seguimos com a UI
      if (DISABLE_API || status === 404) {
        setApplicationStatus("pending")
        localStorage.setItem(
          storageKey,
          JSON.stringify({ status: "pending", at: new Date().toISOString(), simulated: true })
        )
        setUserPermissions((prev) => ({ ...prev, medicoStatus: "pending" })) // <- NOVO
        toast({
          title: "Solicitação registrada (modo teste)",
          description: "Sem endpoint de backend disponível. Status salvo localmente.",
        })
      } else if (status === 405) {
        const triedUrl = error?.config?.url || "(desconhecido)"
        console.warn("Endpoint não aceita POST (405). URL usada:", triedUrl)
        toast({
          title: "Método não permitido (405)",
          description:
            `O backend não aceita POST neste endpoint: ${triedUrl}. ` +
            "Verifique a variável de ambiente do endpoint de solicitações do médico ou me informe a rota correta de criação.",
          variant: "destructive",
        })
      } else {
        // NOVO: logar detalhes do backend (ajuda a identificar o motivo do 400)
        const details = error?.response?.data
        console.error("[MedicoRegistration] criarSolicitacaoMedico falhou:", error, details)

        toast({
          title: "Erro ao enviar",
          description:
            typeof details === "string"
              ? details
              : "Não foi possível enviar a solicitação. Verifique os campos e tente novamente.",
          variant: "destructive",
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = () => {
    switch (applicationStatus) {
      case "pending":
        return (
          <Badge variant="outline" className="badge-medical-warning">
            <Clock className="mr-1 h-3 w-3" />
            Aguardando Aprovação
          </Badge>
        )
      case "approved":
        return (
          <Badge variant="outline" className="badge-medical-success">
            <CheckCircle className="mr-1 h-3 w-3" />
            Aprovado
          </Badge>
        )
      case "rejected":
        return (
          <Badge variant="outline" className="badge-medical-error">
            <XCircle className="mr-1 h-3 w-3" />
            Rejeitado
          </Badge>
        )
      default:
        return null
    }
  }

  if (applicationStatus === "approved") {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-green-600" />
            <CardTitle className="text-green-700">Parabéns! Você é um médico aprovado</CardTitle>
          </div>
          <CardDescription>
            Sua solicitação foi aprovada. Agora você pode acessar todas as funcionalidades médicas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <p className="text-sm text-green-800 dark:text-green-200">
                Você agora pode alternar entre os perfis de paciente e médico usando o botão no menu lateral.
              </p>
            </div>
            <Button className="w-full">Acessar Área Médica</Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (applicationStatus === "pending") {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5" />
              <CardTitle>Solicitação de Cadastro Médico</CardTitle>
            </div>
            {getStatusBadge()}
          </div>
          <CardDescription>Sua solicitação está sendo analisada pela equipe administrativa.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>Status:</strong> Aguardando aprovação
                <br />
                <strong>Enviado em:</strong> {new Date().toLocaleDateString()}
                <br />
                <strong>Tempo estimado:</strong> 2-5 dias úteis
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              Você receberá um email quando sua solicitação for processada. Enquanto isso, você pode continuar usando o
              sistema como paciente.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (applicationStatus === "rejected") {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5" />
              <CardTitle>Solicitação de Cadastro Médico</CardTitle>
            </div>
            {getStatusBadge()}
          </div>
          <CardDescription>Sua solicitação foi rejeitada. Veja os motivos abaixo.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
              <p className="text-sm text-red-800 dark:text-red-200">
                <strong>Motivos da rejeição:</strong>
                <br />• Documentação incompleta
                <br />• CRM não encontrado no sistema do CFM
                <br />• Informações inconsistentes
              </p>
            </div>
            <Button variant="outline" className="w-full bg-transparent" onClick={() => setApplicationStatus("none")}>
              Enviar Nova Solicitação
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Stethoscope className="h-5 w-5" />
          <CardTitle>Cadastro como Médico</CardTitle>
        </div>
        <CardDescription>Preencha os dados abaixo para solicitar acesso às funcionalidades médicas</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Dados Profissionais</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="crm">CRM *</Label>
                <Input
                  id="crm"
                  name="crm"
                  placeholder="Ex: CRM/SP 123456"
                  value={formData.crm}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="especialidade">Especialidade *</Label>
                <Select onValueChange={(value) => handleSelectChange("especialidade", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione sua especialidade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="clinica-geral">Clínica Geral</SelectItem>
                    <SelectItem value="cardiologia">Cardiologia</SelectItem>
                    <SelectItem value="dermatologia">Dermatologia</SelectItem>
                    <SelectItem value="endocrinologia">Endocrinologia</SelectItem>
                    <SelectItem value="ginecologia">Ginecologia</SelectItem>
                    <SelectItem value="neurologia">Neurologia</SelectItem>
                    <SelectItem value="ortopedia">Ortopedia</SelectItem>
                    <SelectItem value="pediatria">Pediatria</SelectItem>
                    <SelectItem value="psiquiatria">Psiquiatria</SelectItem>
                    <SelectItem value="urologia">Urologia</SelectItem>
                    <SelectItem value="outras">Outras</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Formação Acadêmica</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="instituicaoFormacao">Instituição de Formação *</Label>
                <Input
                  id="instituicaoFormacao"
                  name="instituicaoFormacao"
                  placeholder="Ex: USP, UNIFESP, etc."
                  value={formData.instituicaoFormacao}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="anoFormacao">Ano de Formação *</Label>
                <Input
                  id="anoFormacao"
                  name="anoFormacao"
                  type="number"
                  placeholder="Ex: 2015"
                  min="1950"
                  max={new Date().getFullYear()}
                  value={formData.anoFormacao}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="residencia">Residência Médica</Label>
                <Input
                  id="residencia"
                  name="residencia"
                  placeholder="Ex: Cardiologia"
                  value={formData.residencia}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="instituicaoResidencia">Instituição da Residência</Label>
                <Input
                  id="instituicaoResidencia"
                  name="instituicaoResidencia"
                  placeholder="Ex: Hospital das Clínicas"
                  value={formData.instituicaoResidencia}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="anoResidencia">Ano de Conclusão da Residência</Label>
                <Input
                  id="anoResidencia"
                  name="anoResidencia"
                  type="number"
                  placeholder="Ex: 2018"
                  min="1950"
                  max={new Date().getFullYear()}
                  value={formData.anoResidencia}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Experiência Profissional</h3>
            <div className="space-y-2">
              <Label htmlFor="experiencia">Descreva sua experiência profissional *</Label>
              <Textarea
                id="experiencia"
                name="experiencia"
                placeholder="Descreva onde trabalhou, por quanto tempo, principais atividades..."
                className="min-h-[100px]"
                value={formData.experiencia}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="motivacao">Por que deseja usar nossa plataforma? *</Label>
              <Textarea
                id="motivacao"
                name="motivacao"
                placeholder="Conte-nos sobre suas motivações e como pretende usar a plataforma..."
                className="min-h-[100px]"
                value={formData.motivacao}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Documentos Obrigatórios</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Diploma de Medicina *</Label>
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:bg-muted/30"
                  onClick={() => diplomaInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault()
                    const file = e.dataTransfer.files?.[0]
                    if (file) handleFileUpload("diplomaMedicina", file)
                  }}
                >
                  <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600">
                    {formData.documentos?.diplomaMedicina ? "Arquivo selecionado:" : "Clique para fazer upload ou arraste o arquivo aqui"}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.documentos?.diplomaMedicina
                      ? formData.documentos.diplomaMedicina.name
                      : "PDF, JPG ou PNG até 5MB"}
                  </p>
                  <Input
                    ref={diplomaInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={(e) => handleFileUpload("diplomaMedicina", e.target.files[0])}
                  />
                  {formData.documentos?.diplomaMedicina && (
                    <div className="mt-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveFile("diplomaMedicina", diplomaInputRef)}
                      >
                        Remover arquivo
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Certificado de Residência (se aplicável)</Label>
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:bg-muted/30"
                  onClick={() => residenciaInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault()
                    const file = e.dataTransfer.files?.[0]
                    if (file) handleFileUpload("certificadoResidencia", file)
                  }}
                >
                  <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600">
                    {formData.documentos?.certificadoResidencia ? "Arquivo selecionado:" : "Clique para fazer upload ou arraste o arquivo aqui"}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.documentos?.certificadoResidencia
                      ? formData.documentos.certificadoResidencia.name
                      : "PDF, JPG ou PNG até 5MB"}
                  </p>
                  <Input
                    ref={residenciaInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={(e) => handleFileUpload("certificadoResidencia", e.target.files[0])}
                  />
                  {formData.documentos?.certificadoResidencia && (
                    <div className="mt-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveFile("certificadoResidencia", residenciaInputRef)}
                      >
                        Remover arquivo
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Comprovante de Experiência</Label>
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:bg-muted/30"
                  onClick={() => experienciaInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault()
                    const file = e.dataTransfer.files?.[0]
                    if (file) handleFileUpload("comprovanteExperiencia", file)
                  }}
                >
                  <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600">
                    {formData.documentos?.comprovanteExperiencia ? "Arquivo selecionado:" : "Clique para fazer upload ou arraste o arquivo aqui"}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.documentos?.comprovanteExperiencia
                      ? formData.documentos.comprovanteExperiencia.name
                      : "PDF, JPG ou PNG até 5MB"}
                  </p>
                  <Input
                    ref={experienciaInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={(e) => handleFileUpload("comprovanteExperiencia", e.target.files[0])}
                  />
                  {formData.documentos?.comprovanteExperiencia && (
                    <div className="mt-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveFile("comprovanteExperiencia", experienciaInputRef)}
                      >
                        Remover arquivo
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Importante:</strong> Sua solicitação será analisada por nossa equipe administrativa. O processo
              pode levar de 2 a 5 dias úteis. Você receberá um email com o resultado da análise.
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Enviando solicitação..." : "Enviar Solicitação"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
  // NOVO: ao montar, sincroniza status real do servidor (se houver login e API ativa)
  useEffect(() => {
    let cancelled = false
    const syncFromServer = async () => {
      if (DISABLE_API) return
      try {
        const { solicitacaoService } = await import("@/services/solicitacaoService")
        const list = await solicitacaoService.listarMinhasSolicitacoes({ limit: 1 })
        if (cancelled) return
        if (Array.isArray(list) && list.length > 0) {
          const item = list[0]
          const status = (item.status || "pending").toLowerCase()
          setApplicationStatus(status)
          localStorage.setItem(
            storageKey,
            JSON.stringify({ status, at: item.dataEnvio || new Date().toISOString(), id: item.id, source: "server" })
          )
        }
      } catch (err) {
        // Mantém silencioso para não poluir a UI caso o endpoint não exista ainda
        console.debug("[MedicoRegistration] syncFromServer falhou:", err?.response?.status || err?.message)
      }
    }
    syncFromServer()
    return () => {
      cancelled = true
    }
  }, [storageKey, DISABLE_API])
}
