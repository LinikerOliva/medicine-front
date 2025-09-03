import { useEffect, useState } from "react"
import { ProfileTabs } from "@/components/profile-tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Calendar, FileText, ClipboardList, User, Phone, MapPin, Droplet, AlertTriangle, Heart, Edit3, ChevronRight } from "lucide-react"
import { Link } from "react-router-dom"
import { pacienteService } from "@/services/pacienteService"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Separator } from "@/components/ui/separator"


export default function PacientePerfil() {
  const [profile, setProfile] = useState(null)
  const [patient, setPatient] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [consultas, setConsultas] = useState([])
  const [loadingConsultas, setLoadingConsultas] = useState(true)

  const [formData, setFormData] = useState({
    data_nascimento: "",
    endereco: "",
    telefone: "",
    tipo_sanguineo: "",
    alergias: "",
    condicoes_cronicas: "",
  })
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    let mounted = true

    ;(async () => {
      try {
        const [uRes, pRes] = await Promise.allSettled([
          pacienteService.getPerfil(),
          pacienteService.getPacienteDoUsuario(),
        ])
        if (!mounted) return
        if (uRes.status === "fulfilled") setProfile(uRes.value)
        if (pRes.status === "fulfilled") setPatient(pRes.value)
        if (uRes.status === "rejected" && pRes.status === "rejected") {
          const st = uRes.reason?.response?.status || pRes.reason?.response?.status
          if (st === 401) setError("Sua sessão não é válida. Verifique o login e o tipo de autenticação (Bearer/JWT/Token).")
          else setError("Não foi possível carregar seu perfil.")
        }
      } finally {
        if (mounted) setLoading(false)
      }
    })()

    return () => { mounted = false }
  }, [])

  // Novo useEffect para buscar consultas
  useEffect(() => {
    let mounted = true
    
    ;(async () => {
      try {
        setLoadingConsultas(true)
        // Removido o status=Agendada para evitar 400
        const data = await pacienteService.getConsultas()
        
        if (mounted) {
          const consultasData = Array.isArray(data) ? data : data?.results || []
          
          const consultasMapeadas = consultasData.map(c => {
            const first = c.medico?.user?.first_name || c.medico?.first_name || c.medico?.nome || ""
            const last = c.medico?.user?.last_name || c.medico?.last_name || ""
            const nomeMed = [first, last].filter(Boolean).join(" ").trim() || c.medico?.nome || "—"
            return ({
              id: c.id,
              data: c.data || c.data_hora,
              medico: { 
                nome: nomeMed,
                especialidade: c.medico?.especialidades?.[0]?.nome || c.especialidade || 'Não especificada'
              },
              status: c.status,
              local: c.local || c.localizacao || c.observacoes || 'Local não especificado',
              tipo: c.tipo || c.motivo || "Consulta",
            })
          })

          // Filtrar agendadas no cliente: data futura OU status contendo "agend"
          const agora = new Date()
          const apenasAgendadas = consultasMapeadas.filter(c => {
            const st = (c.status || "").toLowerCase()
            const isAgendada = st.includes("agend")
            const isFutura = c.data ? new Date(c.data) > agora : false
            return isAgendada || isFutura
          })

          const consultasOrdenadas = apenasAgendadas
            .filter(c => c.data)
            .sort((a, b) => new Date(a.data) - new Date(b.data))
          
          setConsultas(consultasOrdenadas.slice(0, 3))
        }
      } catch (e) {
        console.error("Erro ao carregar consultas:", e)
      } finally {
        if (mounted) setLoadingConsultas(false)
      }
    })()
    
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    if (profile || patient) {
      setFormData((prev) => ({
        ...prev,
        data_nascimento: profile?.data_nascimento || "",
        endereco: profile?.endereco || "",
        telefone: profile?.telefone || "",
        tipo_sanguineo: patient?.tipo_sanguineo || "",
        alergias: Array.isArray(patient?.alergias) ? patient.alergias.join(", ") : (patient?.alergias || ""),
        condicoes_cronicas: Array.isArray(patient?.condicoes_cronicas) ? patient.condicoes_cronicas.join(", ") : (patient?.condicoes_cronicas || ""),
      }))
    }
  }, [profile, patient])

  const isIncomplete =
    (!!profile || !!patient) &&
    (!profile?.data_nascimento || !profile?.endereco || !profile?.telefone || !patient?.tipo_sanguineo || !patient?.alergias)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      // UserSerializer
      const userPayload = {
        data_nascimento: formData.data_nascimento || "",
        endereco: formData.endereco || "",
        telefone: formData.telefone || "",
      }

      // Detecta dinamicamente se devemos enviar string ou array
      const toArray = (val) =>
        String(val || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)

      const alergiasValue = Array.isArray(patient?.alergias) ? toArray(formData.alergias) : (formData.alergias || "")
      const condicoesValue = Array.isArray(patient?.condicoes_cronicas)
        ? toArray(formData.condicoes_cronicas)
        : (formData.condicoes_cronicas || "")

      const pacientePayload = {
        tipo_sanguineo: formData.tipo_sanguineo || "",
        alergias: alergiasValue,
        condicoes_cronicas: condicoesValue,
      }

      const [u, p] = await Promise.all([
        pacienteService.atualizarPerfil(userPayload),
        pacienteService.atualizarPaciente(pacientePayload),
      ])
      setProfile(u)
      setPatient(p)

      toast({
        title: "Perfil atualizado",
        description: "Suas informações pessoais e médicas foram salvas com sucesso.",
      })
    } catch (e) {
      const apiMsg = e?.response?.data ? JSON.stringify(e.response.data) : "Tente novamente mais tarde."
      toast({
        title: "Erro ao salvar",
        description: apiMsg,
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

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

  const quickActions = [
    {
      title: "Agendar Consulta",
      description: "Marque uma consulta com seus médicos",
      icon: Calendar,
      href: "/paciente/consultas/nova",
      color: "bg-primary",
    },
    {
      title: "Ver Exames",
      description: "Acesse seus resultados de exames",
      icon: FileText,
      href: "/paciente/exames",
      color: "bg-success",
    },
    {
      title: "Histórico Médico",
      description: "Consulte seu histórico completo",
      icon: ClipboardList,
      href: "/paciente/historico-medico",
      color: "bg-info",
    },
  ]

  // Mapeia as cores antigas para variantes dos novos estilos
  const colorToVariant = {
    "bg-primary": "primary",
    "bg-success": "success",
    "bg-info": "info",
  }
  const getInitials = (profile) => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name.charAt(0)}${profile.last_name.charAt(0)}`
    }
    if (profile?.username) {
      return profile.username.substring(0, 2).toUpperCase()
    }
    return "P"
  }

  const formatAddress = (endereco) => {
    if (typeof endereco === "string") return endereco
    if (endereco) {
      return `${endereco.logradouro || ""} ${endereco.numero || ""} ${endereco.bairro || ""} ${endereco.cidade || ""} ${endereco.estado || ""}`.trim() || "—"
    }
    return "—"
  }

  return (
    <div className="bg-app-soft dark:bg-background">
      <div className="mx-auto w-full max-w-7xl space-y-10">
        <div className="bg-card rounded-2xl shadow-sm border p-8">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-6">
              <Avatar className="h-20 w-20 ring-4 ring-primary/10">
                <AvatarFallback className="bg-primary text-primary-foreground text-xl font-semibold">
                  {loading ? "..." : getInitials(profile)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-3xl font-bold text-foreground">
                  {loading ? (
                    <Skeleton className="h-8 w-48" />
                  ) : (
                    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || profile?.username || "Usuário"
                  )}
                </h1>
                <p className="text-muted-foreground mt-1">Paciente</p>
                <div className="flex items-center gap-4 mt-3">
                  {profile?.cpf && (
                    <Badge variant="secondary" className="font-medium">
                      CPF: {profile.cpf}
                    </Badge>
                  )}
                  {patient?.tipo_sanguineo && (
                    <Badge variant="outline" className="border-red-500/30 text-red-600">
                      <Droplet className="h-3 w-3 mr-1 text-red-500" />
                      {patient.tipo_sanguineo}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <Button className="bg-primary hover:bg-primary/90">
              <Edit3 className="h-4 w-4 mr-2" />
              Editar Perfil
            </Button>
          </div>
        </div>

        <ProfileTabs tabs={pacienteTabs} basePath="/paciente" />

        {/* Alert de conclusão do perfil */}
        {!loading && !error && isIncomplete && (
          <Card className="border-warning/30 bg-warning/10">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-warning">
                <AlertTriangle className="h-5 w-5" />
                Complete seu perfil
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="data_nascimento" className="text-foreground font-medium">Data de Nascimento</Label>
                    <Input
                      id="data_nascimento"
                      name="data_nascimento"
                      type="date"
                      value={formData.data_nascimento}
                      onChange={handleChange}
                      className="border-input focus-visible:ring-2 focus-visible:ring-ring"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telefone" className="text-foreground font-medium">Telefone</Label>
                    <Input
                      id="telefone"
                      name="telefone"
                      type="tel"
                      placeholder="(11) 99999-9999"
                      value={formData.telefone}
                      onChange={handleChange}
                      className="border-input focus-visible:ring-2 focus-visible:ring-ring"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endereco" className="text-foreground font-medium">Endereço</Label>
                  <Textarea
                    id="endereco"
                    name="endereco"
                    placeholder="Rua, número, bairro, cidade, estado"
                    value={formData.endereco}
                    onChange={handleChange}
                    className="border-input focus-visible:ring-2 focus-visible:ring-ring"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="tipo_sanguineo" className="text-slate-700 font-medium">Tipo Sanguíneo</Label>
                    <Input
                      id="tipo_sanguineo"
                      name="tipo_sanguineo"
                      placeholder="Ex.: O+, A-, B+, AB+"
                      value={formData.tipo_sanguineo}
                      onChange={handleChange}
                      className="border-slate-300 focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="alergias" className="text-slate-700 font-medium">Alergias</Label>
                    <Textarea
                      id="alergias"
                      name="alergias"
                      placeholder="Separe por vírgulas (ex.: Dipirona, Amoxicilina)"
                      value={formData.alergias}
                      onChange={handleChange}
                      className="border-slate-300 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                    {saving ? "Salvando..." : "Salvar Informações"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Coluna esquerda unificada */}
          <div className="lg:col-span-2">
            <Card className="shadow-sm border">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <User className="h-5 w-5 text-blue-600" />
                  Informações do Paciente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {loading ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-16 w-full" />
                    </div>
                  </div>
                ) : error ? (
                  <div className="text-center py-8">
                    <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <p className="text-red-600 font-medium">{error}</p>
                  </div>
                ) : (
                  <>
                    {/* Seção: Informações Pessoais */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-muted rounded-lg p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <p className="text-sm font-medium text-muted-foreground">Data de Nascimento</p>
                        </div>
                        <p className="text-foreground font-medium">{profile?.data_nascimento || "Não informado"}</p>
                      </div>
                      <div className="bg-muted rounded-lg p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <p className="text-sm font-medium text-muted-foreground">Telefone</p>
                        </div>
                        <p className="text-foreground font-medium">{profile?.telefone || "Não informado"}</p>
                      </div>
                      <div className="bg-muted rounded-lg p-4 md:col-span-2">
                        <div className="flex items-center gap-3 mb-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <p className="text-sm font-medium text-muted-foreground">Endereço</p>
                        </div>
                        <p className="text-foreground font-medium">{formatAddress(profile?.endereco)}</p>
                      </div>
                    </div>

                    <Separator />

                    {/* Seção: Informações Médicas */}
                    <div className="space-y-6">
                      <div className="bg-red-50 rounded-lg p-4 border border-red-200 dark:bg-destructive/15 dark:border-destructive/30">
                        <div className="flex items-center gap-3 mb-2">
                          <Droplet className="h-4 w-4 text-red-500" />
                          <p className="text-sm font-medium text-red-600 dark:text-destructive">Tipo Sanguíneo</p>
                        </div>
                        <p className="text-red-700 dark:text-destructive font-semibold text-lg">
                          {patient?.tipo_sanguineo || "Não informado"}
                        </p>
                      </div>
                      <div className="bg-warning/10 rounded-lg p-4 border border-warning/20">
                        <div className="flex items-center gap-3 mb-2">
                          <AlertTriangle className="h-4 w-4 text-warning" />
                          <p className="text-sm font-medium text-warning">Alergias</p>
                        </div>
                        <p className="text-warning font-medium">{patient?.alergias || "Nenhuma alergia conhecida"}</p>
                      </div>
                      <div className="bg-info/10 rounded-lg p-4 border border-info/20">
                        <div className="flex items-center gap-3 mb-2">
                          <Heart className="h-4 w-4 text-info" />
                          <p className="text-sm font-medium text-info">Condições Crônicas</p>
                        </div>
                        <p className="text-info font-medium">{patient?.condicoes_cronicas || "Nenhuma condição crônica"}</p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Coluna direita mantida */}
          <div className="space-y-6">
            <Card className="shadow-sm border">
              <CardHeader className="pb-4">
                <CardTitle className="text-foreground">Ações Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {quickActions.map((action, index) => {
                  const Icon = action.icon
                  const variant = colorToVariant[action.color] || "primary"
                  return (
                    <Link key={index} to={action.href}>
                      <div className="app-quick-action group">
                        <div className={`app-quick-icon ${variant}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <h4 className="app-quick-title">{action.title}</h4>
                          <p className="app-quick-desc">{action.description}</p>
                        </div>
                        <span className="app-quick-chevron">
                          <ChevronRight className="h-4 w-4" />
                        </span>
                      </div>
                    </Link>
                  )
                })}
              </CardContent>
            </Card>

            {/* Recent Activity Cards */}
            <div className="space-y-4">
              <Card className="shadow-sm border-slate-200">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    Próximas Consultas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingConsultas ? (
                    <div className="space-y-2">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ) : consultas.length > 0 ? (
                    <div className="space-y-3">
                      {consultas.map((consulta) => (
                        <div key={consulta.id} className="flex items-center gap-3 border-b pb-2 last:border-0">
                          <div className="p-2 rounded-full bg-blue-100 text-blue-700">
                            <Calendar className="h-4 w-4" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-sm">
                              {new Date(consulta.data).toLocaleDateString('pt-BR')}{' '}
                              {new Date(consulta.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            <p className="text-xs text-muted-foreground">{consulta.medico.nome}</p>
                            <p className="text-xs text-muted-foreground">{consulta.medico.especialidade}</p>
                          </div>
                        </div>
                      ))}
                      <Button variant="outline" size="sm" asChild className="w-full mt-2 border-blue-200 text-blue-700 hover:bg-blue-50">
                        <Link to="/paciente/consultas">
                          Ver Todas
                          <ChevronRight className="h-3 w-3 ml-1" />
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-slate-500 text-sm mb-3">Nenhuma consulta agendada</p>
                      <Button variant="outline" size="sm" asChild className="border-blue-200 text-blue-700 hover:bg-blue-50">
                        <Link to="/paciente/consultas">
                          Ver Todas
                          <ChevronRight className="h-3 w-3 ml-1" />
                        </Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="shadow-sm border-slate-200">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <ClipboardList className="h-4 w-4 text-green-600" />
                    Exames Recentes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-4">
                    <p className="text-slate-500 text-sm mb-3">Nenhum exame recente</p>
                    <Button variant="outline" size="sm" asChild className="border-green-200 text-green-700 hover:bg-green-50">
                      <Link to="/paciente/exames">
                        Ver Todos
                        <ChevronRight className="h-3 w-3 ml-1" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
