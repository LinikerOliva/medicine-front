"use client"

import { useUser } from "../../contexts/user-context"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { MedicoRegistration } from "./medico-registration"
import { User, Lock, Bell, Stethoscope, Shield } from "lucide-react"
import { useLocation } from "react-router-dom"
import { ProfileTabs } from "@/components/profile-tabs"
import { useEffect, useState } from "react"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { pacienteService } from "@/services/pacienteService"
import api from "@/services/api"
import { adminService } from "@/services/adminService"
import { medicoService } from "@/services/medicoService"

export default function Configuracao() {
  const { activeRole } = useUser()
  const location = useLocation()
  const isPaciente = location.pathname.startsWith("/paciente/")
  const isMedico = location.pathname.startsWith("/medico/")
  const { toast } = useToast()

  // Estados para perfil/usuário
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [profile, setProfile] = useState(null)
  const [patient, setPatient] = useState(null)

  // Formulário de dados pessoais (apenas campos suportados pelo backend atual)
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    cpf: "",
    telefone: "",
    data_nascimento: "",
    endereco: "",
  })

  // Segurança
  const [pwd, setPwd] = useState({
    atual: "",
    nova: "",
    confirmar: "",
  })
  const [changingPwd, setChangingPwd] = useState(false)

  // Notificações (persistência local)
  const [notifs, setNotifs] = useState({
    email: true,
    lembretes: true,
    exames: true,
    push: false,
  })
  const [savingNotifs, setSavingNotifs] = useState(false)

  // NOVO: estado para informações adicionais do paciente
  const [patientForm, setPatientForm] = useState({
    tipo_sanguineo: "",
    alergias: "",
    condicoes_cronicas: "",
    contato_emergencia_nome: "",
    contato_emergencia_telefone: "",
    plano_saude: "",
    numero_carteirinha: "",
    peso: "",
    altura: "",
  })
  const [savingPatient, setSavingPatient] = useState(false)
  const pacienteTabs = [
    { label: "Resumo", href: "/paciente/perfil" },
    { label: "Prontuário", href: "/paciente/prontuario" },
    { label: "Consultas", href: "/paciente/consultas" },
    { label: "Exames", href: "/paciente/exames" },
    { label: "Receitas", href: "/paciente/receitas" },
    { label: "Histórico Médico", href: "/paciente/historico-medico" },
    { label: "Médicos Vinculados", href: "/paciente/medicos" },
    { label: "Configurações", href: "/paciente/configuracoes" },
  ]

  // Estado para criação de perfil de paciente pela secretária
  const [creatingPatient, setCreatingPatient] = useState(false)

  // NOVO: Certificado Digital (Médico)
  const [certInfo, setCertInfo] = useState(null)
  const [loadingCert, setLoadingCert] = useState(false)
  const [uploadingCert, setUploadingCert] = useState(false)
  const [selectedCertFile, setSelectedCertFile] = useState(null)
  const [certPassword, setCertPassword] = useState("")
  const [signFile, setSignFile] = useState(null)
  const [signReason, setSignReason] = useState('Assinatura de documento médico')
  const [signLocation, setSignLocation] = useState('Hospital')
  const [signLoading, setSignLoading] = useState(false)

  const handleSignDocument = async () => {
    if (!signFile) {
      toast.error('Selecione um PDF para assinar.')
      return
    }
    const fd = new FormData()
    fd.append('file', signFile)
    if (signReason) fd.append('reason', signReason)
    if (signLocation) fd.append('location', signLocation)

    try {
      setSignLoading(true)
      const { filename, blob } = await medicoService.signDocumento(fd, { reason: signReason, location: signLocation })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename || 'documento_assinado.pdf'
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      toast.success('Documento assinado com sucesso.')
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Falha ao assinar o documento.'
      toast.error(msg)
    } finally {
      setSignLoading(false)
    }
  }

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        setLoading(true)
        const [uRes, pRes] = await Promise.allSettled([
          pacienteService.getPerfil(),
          pacienteService.getPacienteDoUsuario(),
        ])
        if (!mounted) return

        const u = uRes.status === "fulfilled" ? uRes.value : null
        const p = pRes.status === "fulfilled" ? pRes.value : null
        setProfile(u)
        setPatient(p)

        setForm((prev) => ({
          ...prev,
          first_name: u?.first_name || "",
          last_name: u?.last_name || "",
          email: u?.email || "",
          cpf: u?.cpf || "",
          telefone: u?.telefone || "",
          data_nascimento: u?.data_nascimento || "",
          // Backend aceita string para endereço (conforme perfil.jsx)
          endereco:
            typeof u?.endereco === "string"
              ? u.endereco
              : u?.endereco
              ? `${u.endereco.logradouro || ""} ${u.endereco.numero || ""} ${u.endereco.bairro || ""} ${u.endereco.cidade || ""} ${u.endereco.estado || ""}`.trim()
              : "",
        }))

        // Inicializa “Mais Informações do Paciente”
        setPatientForm({
          tipo_sanguineo: p?.tipo_sanguineo || "",
          alergias: p?.alergias || "",
          condicoes_cronicas: p?.condicoes_cronicas || "",
          contato_emergencia_nome: p?.contato_emergencia_nome || "",
          contato_emergencia_telefone: p?.contato_emergencia_telefone || "",
          plano_saude: p?.plano_saude || "",
          numero_carteirinha: p?.numero_carteirinha || "",
          peso: p?.peso ?? "",
          altura: p?.altura ?? "",
        })

        // Notificações do localStorage
        try {
          const saved = localStorage.getItem("notification_prefs")
          if (saved) {
            const parsed = JSON.parse(saved)
            setNotifs((cur) => ({ ...cur, ...parsed }))
          }
        } catch {}
      } catch (e) {
        const st = e?.response?.status
        setError(st === 401 ? "Sessão inválida. Faça login novamente." : "Não foi possível carregar os dados.")
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  // Carregar informações do certificado quando na tela do médico
  useEffect(() => {
    if (!isMedico) return
    handleFetchCertInfo()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMedico])

  const handleFormChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  // Novo: mudança do formulário do paciente
  const handlePatientFormChange = (e) => {
    const { name, value } = e.target
    setPatientForm((f) => ({ ...f, [name]: value }))
  }

  // NOVO: salvar perfil (nome, sobrenome, telefone, data_nascimento, endereco)
  async function handleSavePerfil() {
    setSaving(true)
    try {
      const payload = {
        first_name: form.first_name || "",
        last_name: form.last_name || "",
        telefone: form.telefone || "",
        data_nascimento: form.data_nascimento || "",
        endereco: form.endereco || "",
      }
      const updated = await pacienteService.atualizarPerfil(payload)
      setProfile(updated)
      toast({ title: "Perfil atualizado", description: "Suas informações pessoais foram salvas." })
    } catch (e) {
      const msg = e?.response?.data ? JSON.stringify(e.response.data) : "Não foi possível salvar o perfil."
      toast({ title: "Erro ao salvar", description: msg, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  // NOVO: salvar informações do paciente
  async function handleSavePaciente() {
    setSavingPatient(true)
    try {
      const updated = await pacienteService.atualizarPaciente(patientForm)
      setPatient((p) => ({ ...(p || {}), ...(updated || {}) }))
      toast({ title: "Informações do paciente salvas", description: "Dados atualizados com sucesso." })
    } catch (e) {
      const msg =
        e?.response?.data ? JSON.stringify(e.response.data) : "Não foi possível salvar os dados do paciente."
      toast({ title: "Erro ao salvar", description: msg, variant: "destructive" })
    } finally {
      setSavingPatient(false)
    }
  }
  const handlePasswordChange = async () => {
    if (!pwd.nova || pwd.nova.length < 6) {
      toast({ title: "Senha inválida", description: "A nova senha deve ter pelo menos 6 caracteres.", variant: "destructive" })
      return
    }
    if (pwd.nova !== pwd.confirmar) {
      toast({ title: "Confirmação incorreta", description: "A confirmação da nova senha não confere.", variant: "destructive" })
      return
    }
    setChangingPwd(true)
    try {
      const endpoint = import.meta.env.VITE_CHANGE_PASSWORD_ENDPOINT || "/auth/change-password/"
      await api.post(endpoint, {
        old_password: pwd.atual,
        new_password: pwd.nova,
      })
      setPwd({ atual: "", nova: "", confirmar: "" })
      toast({ title: "Senha alterada", description: "Sua senha foi atualizada com sucesso." })
    } catch (e) {
      const st = e?.response?.status
      const msg =
        st === 404
          ? "Endpoint de alteração de senha não encontrado. Verifique o backend."
          : e?.response?.data
          ? JSON.stringify(e.response.data)
          : "Não foi possível alterar a senha."
      toast({ title: "Erro ao alterar senha", description: msg, variant: "destructive" })
    } finally {
      setChangingPwd(false)
    }
  }

  const handleToggleNotif = (key) => {
    setNotifs((n) => ({ ...n, [key]: !n[key] }))
  }

  const handleSaveNotifs = () => {
    setSavingNotifs(true)
    try {
      localStorage.setItem("notification_prefs", JSON.stringify(notifs))
      toast({ title: "Preferências salvas", description: "Suas preferências de notificação foram atualizadas." })
    } finally {
      setSavingNotifs(false)
    }
  }

  // NOVO: buscar informações do certificado
  async function handleFetchCertInfo() {
    setLoadingCert(true)
    try {
      const info = await medicoService.getCertificadoInfo()
      setCertInfo(info || null)
    } catch (e) {
      // Não mostra erro agressivo aqui; ação manual tem toast
      setCertInfo(null)
    } finally {
      setLoadingCert(false)
    }
  }

  // NOVO: upload de certificado
  async function handleUploadCert() {
    if (!selectedCertFile) {
      toast({ title: "Selecione um arquivo", description: "Escolha um arquivo .pfx, .p12, .crt, .cer ou .pem.", variant: "destructive" })
      return
    }
    const maxSize = 15 * 1024 * 1024 // 15MB
    if (selectedCertFile.size > maxSize) {
      toast({ title: "Arquivo muito grande", description: "O limite é de 15MB.", variant: "destructive" })
      return
    }
    const formData = new FormData()
    // Anexa com múltiplos aliases para maior compatibilidade no backend
    formData.append("file", selectedCertFile)
    formData.append("certificado", selectedCertFile)
    formData.append("arquivo", selectedCertFile)
    formData.append("pfx", selectedCertFile)
    // Senha opcional do PFX/PKCS#12
    if (certPassword) {
      formData.append("password", certPassword)
      formData.append("senha", certPassword)
      formData.append("passphrase", certPassword)
      formData.append("pfx_password", certPassword)
    }
    // NOVO: flags para solicitar não persistir dados privados
    formData.append("no_persist", "true")
    formData.append("ephemeral", "true")
    formData.append("save_public_only", "true")

    setUploadingCert(true)
    try {
      const saved = await medicoService.uploadCertificado(formData)
      setCertInfo(saved || null)
      const desc = saved?.public_cert_saved
        ? "Certificado público extraído e salvo para validações. O PFX não foi armazenado."
        : "Certificado processado. O PFX não foi armazenado."
      toast({ title: "Processamento concluído", description: desc })
      setSelectedCertFile(null)
    } catch (e) {
      const status = e?.response?.status
      const details = e?.response?.data
      const msg =
        status === 404
          ? "Endpoint de upload não encontrado no backend. Configure a variável VITE_MEDICO_CERTIFICADO_ENDPOINT."
          : typeof details === "string"
          ? details
          : "Não foi possível processar o certificado."
      toast({ title: "Falha no processamento", description: msg, variant: "destructive" })
    } finally {
      setUploadingCert(false)
      setCertPassword("")
    }
  }

  // Utilitário de status
  const daysToExpire = (() => {
    const dt = certInfo?.valid_to || certInfo?.validade_fim || certInfo?.validade || certInfo?.valid_to_date
    if (!dt) return null
    const exp = new Date(dt)
    const now = new Date()
    return Math.ceil((exp - now) / (1000 * 60 * 60 * 24))
  })()

  // Máscara simples de data para exibição
  const formatDate = (v) => {
    if (!v) return "?"
    try { return new Date(v).toLocaleDateString() } catch { return String(v) }
  }

  const exists = Boolean(certInfo && (certInfo.exists ?? certInfo.id ?? certInfo.valid_to ?? certInfo.subject))

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground">Gerencie suas informações pessoais e preferências da conta</p>
        </div>

        {isPaciente && <ProfileTabs tabs={pacienteTabs} basePath="/paciente" />}

        {/* Bloco: Secretária criando perfil de paciente */}
        {!isPaciente && activeRole === "secretaria" && !patient?.id && (
          <Card>
            <CardHeader>
              <CardTitle>Criar perfil de paciente</CardTitle>
              <CardDescription>
                Para acessar as funcionalidades de paciente com esta conta, crie seu perfil de paciente.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-4">
              <div className="text-sm text-muted-foreground">
                Nenhum perfil de paciente encontrado para esta conta.
              </div>
              <Button
                onClick={async () => {
                  setCreatingPatient(true)
                  try {
                    const created = await pacienteService.garantirPacienteDoUsuario({
                      // opcionalmente podemos enviar alguns campos iniciais
                      // nome será derivado do usuário; campos adicionais podem ser preenchidos abaixo
                    })
                    setPatient(created)
                    toast({ title: "Perfil de paciente criado", description: "Você já pode acessar a área do paciente." })
                  } catch (e) {
                    const msg = e?.response?.data ? JSON.stringify(e.response.data) : "Não foi possível criar o perfil."
                    toast({ title: "Erro", description: msg, variant: "destructive" })
                  } finally {
                    setCreatingPatient(false)
                  }
                }}
                disabled={creatingPatient}
              >
                {creatingPatient ? "Criando..." : "Criar meu perfil de paciente"}
              </Button>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="perfil" className="space-y-6">
          <TabsList className={`grid w-full ${isMedico ? "grid-cols-4" : "grid-cols-3"}`}>
            <TabsTrigger value="perfil" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Perfil
            </TabsTrigger>
            <TabsTrigger value="seguranca" className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Segurança
            </TabsTrigger>
            <TabsTrigger value="notificacoes" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notificações
            </TabsTrigger>
            {isMedico && (
              <TabsTrigger value="certificado" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Certificado Digital
              </TabsTrigger>
            )}
          </TabsList>

          {/* Perfil */}
          <TabsContent value="perfil">
            <Card>
              <CardHeader>
                <CardTitle>Informações Pessoais</CardTitle>
                <CardDescription>Atualize suas informações pessoais e de contato</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {loading ? (
                  <p className="text-muted-foreground">Carregando...</p>
                ) : error ? (
                  <p className="text-destructive">{error}</p>
                ) : (
                  <>
                    {/* Nome e Sobrenome */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="first_name">Nome</Label>
                        <Input id="first_name" name="first_name" value={form.first_name} onChange={handleFormChange} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="last_name">Sobrenome</Label>
                        <Input id="last_name" name="last_name" value={form.last_name} onChange={handleFormChange} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" name="email" value={form.email} disabled />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cpf">CPF</Label>
                        <Input id="cpf" name="cpf" value={form.cpf} disabled />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="telefone">Telefone</Label>
                        <Input id="telefone" name="telefone" value={form.telefone} onChange={handleFormChange} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="data_nascimento">Data de Nascimento</Label>
                        <Input
                          id="data_nascimento"
                          name="data_nascimento"
                          type="date"
                          value={form.data_nascimento || ""}
                          onChange={handleFormChange}
                        />
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label htmlFor="endereco">Endereço</Label>
                      <Textarea
                        id="endereco"
                        name="endereco"
                        placeholder="Rua, número, bairro, cidade, estado"
                        value={form.endereco}
                        onChange={handleFormChange}
                      />
                    </div>

                    <div className="flex justify-end">
                      <Button onClick={handleSavePerfil} disabled={saving}>
                        {saving ? "Salvando..." : "Salvar Alterações"}
                      </Button>
                    </div>

                    <Separator />

                    {/* Mais Informações do Paciente */}
                    <div className="space-y-4">
                      <div>
                        <p className="font-semibold">Mais Informações do Paciente</p>
                        <p className="text-sm text-muted-foreground">
                          Esses dados ajudam médicos a entender melhor seu histórico.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="tipo_sanguineo">Tipo Sanguíneo</Label>
                          <Input id="tipo_sanguineo" name="tipo_sanguineo" value={patientForm.tipo_sanguineo} onChange={handlePatientFormChange} placeholder="Ex.: O+, A-, B+, AB+" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="plano_saude">Plano de Saúde</Label>
                          <Input id="plano_saude" name="plano_saude" value={patientForm.plano_saude} onChange={handlePatientFormChange} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="numero_carteirinha">Número da Carteirinha</Label>
                          <Input id="numero_carteirinha" name="numero_carteirinha" value={patientForm.numero_carteirinha} onChange={handlePatientFormChange} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="contato_emergencia_nome">Contato de Emergência (Nome)</Label>
                          <Input id="contato_emergencia_nome" name="contato_emergencia_nome" value={patientForm.contato_emergencia_nome} onChange={handlePatientFormChange} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="contato_emergencia_telefone">Contato de Emergência (Telefone)</Label>
                          <Input id="contato_emergencia_telefone" name="contato_emergencia_telefone" value={patientForm.contato_emergencia_telefone} onChange={handlePatientFormChange} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="peso">Peso (kg)</Label>
                          <Input id="peso" name="peso" type="number" step="0.1" value={patientForm.peso} onChange={handlePatientFormChange} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="altura">Altura (cm)</Label>
                          <Input id="altura" name="altura" type="number" step="0.1" value={patientForm.altura} onChange={handlePatientFormChange} />
                        </div>
                        <div className="md:col-span-2 space-y-2">
                          <Label htmlFor="alergias">Alergias</Label>
                          <Textarea id="alergias" name="alergias" rows={3} value={patientForm.alergias} onChange={handlePatientFormChange} placeholder="Ex.: Dipirona, poeira, frutos do mar" />
                        </div>
                        <div className="md:col-span-2 space-y-2">
                          <Label htmlFor="condicoes_cronicas">Condições Crônicas</Label>
                          <Textarea id="condicoes_cronicas" name="condicoes_cronicas" rows={3} value={patientForm.condicoes_cronicas} onChange={handlePatientFormChange} placeholder="Ex.: Hipertensão, Diabetes, Asma" />
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <Button onClick={handleSavePaciente} disabled={savingPatient} variant="outline">
                          {savingPatient ? "Salvando..." : "Salvar Informações do Paciente"}
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Segurança */}
          <TabsContent value="seguranca">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Alterar Senha</CardTitle>
                  <CardDescription>Mantenha sua conta segura com uma senha forte</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="senha-atual">Senha Atual</Label>
                    <Input
                      id="senha-atual"
                      type="password"
                      value={pwd.atual}
                      onChange={(e) => setPwd((s) => ({ ...s, atual: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nova-senha">Nova Senha</Label>
                    <Input
                      id="nova-senha"
                      type="password"
                      value={pwd.nova}
                      onChange={(e) => setPwd((s) => ({ ...s, nova: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmar-senha">Confirmar Nova Senha</Label>
                    <Input
                      id="confirmar-senha"
                      type="password"
                      value={pwd.confirmar}
                      onChange={(e) => setPwd((s) => ({ ...s, confirmar: e.target.value }))}
                    />
                  </div>
                  <Button onClick={handlePasswordChange} disabled={changingPwd}>
                    {changingPwd ? "Alterando..." : "Alterar Senha"}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Autenticação de Dois Fatores</CardTitle>
                <CardDescription>Adicione uma camada extra de segurança à sua conta</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Autenticação de Dois Fatores</p>
                      <p className="text-sm text-muted-foreground">Não configurada</p>
                    </div>
                    <Button variant="outline" disabled>
                      Em breve
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Notificações */}
          <TabsContent value="notificacoes">
            <Card>
              <CardHeader>
                <CardTitle>Preferências de Notificação</CardTitle>
                <CardDescription>Configure como você deseja receber notificações</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Notificações por Email</p>
                      <p className="text-sm text-muted-foreground">Receba atualizações importantes por email</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleToggleNotif("email")}>
                      {notifs.email ? "Ativado" : "Desativado"}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Lembretes de Consulta</p>
                      <p className="text-sm text-muted-foreground">Receba lembretes antes das consultas</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleToggleNotif("lembretes")}>
                      {notifs.lembretes ? "Ativado" : "Desativado"}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Resultados de Exames</p>
                      <p className="text-sm text-muted-foreground">Seja notificado quando exames ficarem prontos</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleToggleNotif("exames")}>
                      {notifs.exames ? "Ativado" : "Desativado"}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Notificações Push</p>
                      <p className="text-sm text-muted-foreground">Receba notificações no navegador</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleToggleNotif("push")}>
                      {notifs.push ? "Ativado" : "Desativado"}
                    </Button>
                  </div>
                </div>

                <Button onClick={handleSaveNotifs} disabled={savingNotifs}>
                  {savingNotifs ? "Salvando..." : "Salvar Preferências"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* NOVO: Certificado Digital (somente na área do médico) */}
          {isMedico && (
            <TabsContent value="certificado">
              <Card>
                <CardHeader>
                  <CardTitle>Configuração de Certificado Digital</CardTitle>
                  <CardDescription>
                    Envie seu certificado (.pfx/.p12 ou .crt/.cer/.pem). O arquivo é enviado com segurança ao servidor.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Status atual */}
                  <div className="rounded-lg border p-4 bg-muted/30">
                    {loadingCert ? (
                      <p className="text-muted-foreground">Carregando informações do certificado...</p>
                    ) : exists ? (
                      <div className="space-y-1">
                        <p className="font-medium">Certificado cadastrado</p>
                        <p className="text-sm text-muted-foreground">
                          Titular: {certInfo?.subject_name || certInfo?.subject || certInfo?.nome || "—"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Emitente: {certInfo?.issuer || certInfo?.issuer_name || certInfo?.emitente || "—"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Validade: {certInfo?.valid_from || certInfo?.validade_inicio || "?"} — {certInfo?.valid_to || certInfo?.validade_fim || "?"}
                        </p>
                        {daysToExpire != null && (
                          <p className={`text-sm ${daysToExpire <= 0 ? "text-destructive" : daysToExpire < 30 ? "text-amber-600" : "text-emerald-600"}`}>
                            {daysToExpire <= 0 ? "Expirado" : `Expira em ${daysToExpire} dia(s)`}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Nenhum certificado cadastrado para este médico.</p>
                    )}
                    <div className="mt-3">
                      <Button variant="outline" size="sm" onClick={handleFetchCertInfo} disabled={loadingCert}>
                        {loadingCert ? "Validando..." : "Validar agora"}
                      </Button>
                    </div>
                  </div>

                  {/* Upload */}
                  <div className="space-y-2">
                    <Label>Arquivo do certificado</Label>
                    <Input
                      type="file"
                      accept=".pfx,.p12,.crt,.cer,.pem"
                      onChange={(e) => setSelectedCertFile(e.target.files?.[0] || null)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Aceita: .pfx, .p12, .crt, .cer, .pem. Tamanho máximo: 15MB.
                    </p>
                    {selectedCertFile && (
                      <p className="text-xs">Selecionado: {selectedCertFile.name} ({Math.ceil(selectedCertFile.size / 1024)} KB)</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Senha do certificado (se aplicável)</Label>
                    <Input
                      type="password"
                      value={certPassword}
                      onChange={(e) => setCertPassword(e.target.value)}
                      placeholder="Senha do .pfx (opcional)"
                    />
                    <p className="text-xs text-muted-foreground">A senha não é armazenada no navegador; é usada apenas durante o processamento.</p>
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button onClick={handleUploadCert} disabled={uploadingCert}>
                      {uploadingCert ? "Enviando..." : "Enviar Certificado"}
                    </Button>
                  </div>

                  <Separator />

                  {/* Assinatura de Documento */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Arquivo PDF para assinar</Label>
                      <Input type="file" accept=".pdf" onChange={(e) => setSignFile(e.target.files?.[0] || null)} />
                      {signFile && (
                        <p className="text-xs">Selecionado: {signFile.name} ({Math.ceil(signFile.size / 1024)} KB)</p>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Motivo (opcional)</Label>
                        <Input value={signReason} onChange={(e) => setSignReason(e.target.value)} placeholder="Ex.: Assinatura de prescrição" />
                      </div>
                      <div className="space-y-2">
                        <Label>Local (opcional)</Label>
                        <Input value={signLocation} onChange={(e) => setSignLocation(e.target.value)} placeholder="Ex.: São Paulo - SP" />
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button onClick={handleSignDocument} disabled={signLoading || !signFile}>
                        {signLoading ? "Assinando..." : "Assinar e Baixar"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Médico - renderiza apenas para paciente */}
          {isPaciente && (
            <TabsContent value="medico">
              <MedicoRegistration />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  )
}
