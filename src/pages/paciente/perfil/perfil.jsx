import { useEffect, useState } from "react"
import { ProfileTabs } from "@/components/profile-tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Calendar, FileText, ClipboardList, User, Phone, MapPin, Droplet, AlertTriangle, Heart, Edit3, ChevronRight, Star, Activity, Shield } from "lucide-react"
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

          setConsultas(apenasAgendadas.slice(0, 3))
        }
      } catch (err) {
        console.error("Erro ao buscar consultas:", err)
      } finally {
        if (mounted) setLoadingConsultas(false)
      }
    })()

    return () => { mounted = false }
  }, [])

  // Preencher formData quando patient for carregado
  useEffect(() => {
    if (patient && profile) {
      setFormData({
        data_nascimento: profile.data_nascimento || "",
        endereco: profile.endereco || "",
        telefone: profile.telefone || "",
        tipo_sanguineo: patient.tipo_sanguineo || "",
        alergias: patient.alergias || "",
        condicoes_cronicas: patient.condicoes_cronicas || "",
      })
    }
  }, [patient, profile])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)

    try {
      // Atualizar perfil do usuário
      await pacienteService.updatePerfil({
        data_nascimento: formData.data_nascimento,
        endereco: formData.endereco,
        telefone: formData.telefone,
      })

      // Atualizar dados do paciente
      await pacienteService.updatePaciente({
        tipo_sanguineo: formData.tipo_sanguineo,
        alergias: formData.alergias,
        condicoes_cronicas: formData.condicoes_cronicas,
      })

      // Recarregar dados
      const [uRes, pRes] = await Promise.allSettled([
        pacienteService.getPerfil(),
        pacienteService.getPacienteDoUsuario(),
      ])
      if (uRes.status === "fulfilled") setProfile(uRes.value)
      if (pRes.status === "fulfilled") setPatient(pRes.value)

      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram salvas com sucesso.",
      })
    } catch (error) {
      console.error("Erro ao salvar perfil:", error)
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível atualizar seu perfil. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const getInitials = (profile) => {
    if (!profile) return "?"
    const name = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || profile.username || "Usuário"
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
  }

  const formatAddress = (address) => {
    if (!address) return "Não informado"
    return address.length > 50 ? address.substring(0, 50) + "..." : address
  }

  const isIncomplete = profile && (!profile.data_nascimento || !profile.endereco || !profile.telefone)

  const pacienteTabs = [
    { label: "Perfil", href: "/paciente/perfil" },
    { label: "Prontuário", href: "/paciente/prontuario" },
    { label: "Consultas", href: "/paciente/consultas" },
    { label: "Exames", href: "/paciente/exames" },
    { label: "Receitas", href: "/paciente/receitas" },
  ]

  const quickActions = [
    {
      title: "Agendar Consulta",
      description: "Marque uma nova consulta",
      href: "/paciente/consultas",
      icon: Calendar,
      color: "blue",
    },
    {
      title: "Ver Prontuário",
      description: "Acesse seu histórico médico",
      href: "/paciente/prontuario",
      icon: FileText,
      color: "green",
    },
    {
      title: "Exames",
      description: "Visualize seus exames",
      href: "/paciente/exames",
      icon: ClipboardList,
      color: "purple",
    },
    {
      title: "Receitas",
      description: "Suas receitas médicas",
      href: "/paciente/receitas",
      icon: Heart,
      color: "red",
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 dark:from-gray-950 dark:via-slate-900 dark:to-gray-950">
      <div className="mx-auto w-full max-w-7xl space-y-8 p-6">
        {/* Header com gradiente e animação - Paleta melhorada */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-8 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/95 via-indigo-600/95 to-purple-600/95"></div>
          <div className="absolute -top-4 -right-4 h-24 w-24 rounded-full bg-white/10 blur-xl"></div>
          <div className="absolute -bottom-4 -left-4 h-32 w-32 rounded-full bg-white/5 blur-2xl"></div>
          
          <div className="relative flex items-start justify-between">
            <div className="flex items-center gap-6">
              <div className="relative">
                <Avatar className="h-24 w-24 ring-4 ring-white/40 shadow-xl">
                  <AvatarFallback className="bg-gradient-to-br from-white to-blue-100 text-blue-700 text-2xl font-bold shadow-inner">
                    {loading ? "..." : getInitials(profile)}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-emerald-400 border-3 border-white shadow-lg"></div>
              </div>
              <div className="text-white">
                <h1 className="text-4xl font-bold mb-2 drop-shadow-sm">
                  {loading ? (
                    <Skeleton className="h-10 w-64 bg-white/20" />
                  ) : (
                    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || profile?.username || "Usuário"
                  )}
                </h1>
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="h-5 w-5 text-blue-100" />
                  <p className="text-blue-50 text-lg font-medium">Paciente Verificado</p>
                </div>
                <div className="flex items-center gap-4">
                  {profile?.cpf && (
                    <Badge className="bg-white/25 text-white border-white/40 hover:bg-white/35 font-medium px-3 py-1 shadow-sm">
                      CPF: {profile.cpf}
                    </Badge>
                  )}
                  {patient?.tipo_sanguineo && (
                    <Badge className="bg-red-500/30 text-red-50 border-red-200/40 hover:bg-red-500/40 font-medium px-3 py-1 shadow-sm">
                      <Droplet className="h-4 w-4 mr-1" />
                      {patient.tipo_sanguineo}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <Button className="bg-white/25 hover:bg-white/35 text-white border-white/40 backdrop-blur-sm shadow-lg font-medium">
              <Edit3 className="h-4 w-4 mr-2" />
              Editar Perfil
            </Button>
          </div>
        </div>

        <ProfileTabs tabs={pacienteTabs} basePath="/paciente" />

        {/* Alert de conclusão do perfil com design melhorado */}
        {!loading && !error && isIncomplete && (
          <Card className="border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 shadow-lg dark:border-amber-600">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-amber-800 dark:text-amber-200">
                <div className="p-2 rounded-full bg-amber-200 dark:bg-amber-700">
                  <AlertTriangle className="h-5 w-5 text-amber-700 dark:text-amber-200" />
                </div>
                Complete seu perfil para uma experiência completa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="data_nascimento" className="text-slate-800 dark:text-slate-200 font-medium">Data de Nascimento</Label>
                    <Input
                      id="data_nascimento"
                      name="data_nascimento"
                      type="date"
                      value={formData.data_nascimento}
                      onChange={handleChange}
                      className="border-amber-300 focus:border-amber-500 focus:ring-amber-500/30 bg-white dark:bg-gray-800 dark:border-amber-600 dark:text-white"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telefone" className="text-slate-800 dark:text-slate-200 font-medium">Telefone</Label>
                    <Input
                      id="telefone"
                      name="telefone"
                      type="tel"
                      placeholder="(11) 99999-9999"
                      value={formData.telefone}
                      onChange={handleChange}
                      className="border-amber-300 focus:border-amber-500 focus:ring-amber-500/30 bg-white dark:bg-gray-800 dark:border-amber-600 dark:text-white"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endereco" className="text-slate-800 dark:text-slate-200 font-medium">Endereço</Label>
                  <Textarea
                    id="endereco"
                    name="endereco"
                    placeholder="Rua, número, bairro, cidade, estado"
                    value={formData.endereco}
                    onChange={handleChange}
                    className="border-amber-300 focus:border-amber-500 focus:ring-amber-500/30 bg-white dark:bg-gray-800 dark:border-amber-600 dark:text-white"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="tipo_sanguineo" className="text-slate-800 dark:text-slate-200 font-medium">Tipo Sanguíneo</Label>
                    <Input
                      id="tipo_sanguineo"
                      name="tipo_sanguineo"
                      placeholder="Ex: O+, A-, B+, AB-"
                      value={formData.tipo_sanguineo}
                      onChange={handleChange}
                      className="border-amber-300 focus:border-amber-500 focus:ring-amber-500/30 bg-white dark:bg-gray-800 dark:border-amber-600 dark:text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="alergias" className="text-slate-800 dark:text-slate-200 font-medium">Alergias</Label>
                    <Input
                      id="alergias"
                      name="alergias"
                      placeholder="Ex: Penicilina, Amendoim"
                      value={formData.alergias}
                      onChange={handleChange}
                      className="border-amber-300 focus:border-amber-500 focus:ring-amber-500/30 bg-white dark:bg-gray-800 dark:border-amber-600 dark:text-white"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="condicoes_cronicas" className="text-slate-800 dark:text-slate-200 font-medium">Condições Crônicas</Label>
                  <Textarea
                    id="condicoes_cronicas"
                    name="condicoes_cronicas"
                    placeholder="Ex: Hipertensão, Diabetes"
                    value={formData.condicoes_cronicas}
                    onChange={handleChange}
                    className="border-amber-300 focus:border-amber-500 focus:ring-amber-500/30 bg-white dark:bg-gray-800 dark:border-amber-600 dark:text-white"
                  />
                </div>

                <Button 
                  type="submit" 
                  disabled={saving}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg font-medium"
                >
                  {saving ? "Salvando..." : "Salvar Informações"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Layout principal com cards modernos - Paleta consistente */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Coluna principal - Informações do perfil */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="shadow-xl border-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm">
              <CardHeader className="pb-6">
                <CardTitle className="flex items-center gap-3 text-2xl text-gray-800 dark:text-gray-100">
                  <div className="p-2 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg">
                    <User className="h-6 w-6" />
                  </div>
                  Informações Pessoais
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-24 bg-gray-200 dark:bg-gray-700" />
                      <Skeleton className="h-16 w-full bg-gray-200 dark:bg-gray-700" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-24 bg-gray-200 dark:bg-gray-700" />
                      <Skeleton className="h-16 w-full bg-gray-200 dark:bg-gray-700" />
                    </div>
                  </div>
                ) : error ? (
                  <div className="text-center py-8">
                    <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <p className="text-red-600 dark:text-red-400 font-medium">{error}</p>
                  </div>
                ) : (
                  <>
                    {/* Seção: Informações Pessoais com paleta consistente */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="group p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-900/40 border border-blue-200 dark:border-blue-700 hover:shadow-lg transition-all duration-300">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 rounded-full bg-blue-500 text-white shadow-md">
                            <Calendar className="h-4 w-4" />
                          </div>
                          <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">Data de Nascimento</p>
                        </div>
                        <p className="text-gray-800 dark:text-gray-100 font-medium text-lg">{profile?.data_nascimento || "Não informado"}</p>
                      </div>
                      
                      <div className="group p-6 rounded-2xl bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-900/40 dark:to-green-900/40 border border-emerald-200 dark:border-emerald-700 hover:shadow-lg transition-all duration-300">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 rounded-full bg-emerald-500 text-white shadow-md">
                            <Phone className="h-4 w-4" />
                          </div>
                          <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">Telefone</p>
                        </div>
                        <p className="text-gray-800 dark:text-gray-100 font-medium text-lg">{profile?.telefone || "Não informado"}</p>
                      </div>
                      
                      <div className="group p-6 rounded-2xl bg-gradient-to-br from-purple-50 to-violet-100 dark:from-purple-900/40 dark:to-violet-900/40 border border-purple-200 dark:border-purple-700 hover:shadow-lg transition-all duration-300 md:col-span-2">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 rounded-full bg-purple-500 text-white shadow-md">
                            <MapPin className="h-4 w-4" />
                          </div>
                          <p className="text-sm font-semibold text-purple-800 dark:text-purple-200">Endereço</p>
                        </div>
                        <p className="text-gray-800 dark:text-gray-100 font-medium text-lg">{formatAddress(profile?.endereco)}</p>
                      </div>
                    </div>

                    <Separator className="my-8 bg-gray-200 dark:bg-gray-700" />

                    {/* Seção: Informações Médicas com paleta consistente */}
                    <div className="space-y-6">
                      <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                        <Activity className="h-5 w-5 text-red-500" />
                        Informações Médicas
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="group p-6 rounded-2xl bg-gradient-to-br from-red-50 to-pink-100 dark:from-red-900/40 dark:to-pink-900/40 border border-red-200 dark:border-red-700 hover:shadow-lg transition-all duration-300">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 rounded-full bg-red-500 text-white shadow-md">
                              <Droplet className="h-4 w-4" />
                            </div>
                            <p className="text-sm font-semibold text-red-800 dark:text-red-200">Tipo Sanguíneo</p>
                          </div>
                          <p className="text-red-900 dark:text-red-100 font-bold text-2xl">
                            {patient?.tipo_sanguineo || "Não informado"}
                          </p>
                        </div>
                        
                        <div className="group p-6 rounded-2xl bg-gradient-to-br from-amber-50 to-yellow-100 dark:from-amber-900/40 dark:to-yellow-900/40 border border-amber-200 dark:border-amber-700 hover:shadow-lg transition-all duration-300">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 rounded-full bg-amber-500 text-white shadow-md">
                              <AlertTriangle className="h-4 w-4" />
                            </div>
                            <p className="text-sm font-semibold text-amber-700 dark:text-amber-200">Alergias</p>
                          </div>
                          <p className="text-amber-800 dark:text-amber-200 font-medium">{patient?.alergias || "Nenhuma alergia conhecida"}</p>
                        </div>
                        
                        <div className="group p-6 rounded-2xl bg-gradient-to-br from-teal-50 to-cyan-100 dark:from-teal-900/40 dark:to-cyan-900/40 border border-teal-200 dark:border-teal-700 hover:shadow-lg transition-all duration-300">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 rounded-full bg-teal-500 text-white shadow-md">
                              <Heart className="h-4 w-4" />
                            </div>
                            <p className="text-sm font-semibold text-teal-800 dark:text-teal-200">Condições Crônicas</p>
                          </div>
                          <p className="text-teal-800 dark:text-teal-200 font-medium">{patient?.condicoes_cronicas || "Nenhuma condição crônica"}</p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Coluna lateral - Ações rápidas e atividades */}
          <div className="space-y-6">
            {/* Ações Rápidas com paleta consistente */}
            <Card className="shadow-xl border-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-xl text-gray-800 dark:text-gray-100">
                  <Star className="h-5 w-5 text-yellow-500" />
                  Ações Rápidas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {quickActions.map((action, index) => {
                  const Icon = action.icon
                  return (
                    <Link key={index} to={action.href}>
                      <div className="group p-4 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-900/30 dark:hover:to-indigo-900/30 border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-300 hover:shadow-lg cursor-pointer">
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-full bg-gradient-to-br ${
                            action.color === 'blue' ? 'from-blue-500 to-blue-600' :
                            action.color === 'green' ? 'from-emerald-500 to-green-600' :
                            action.color === 'purple' ? 'from-purple-500 to-violet-600' :
                            'from-red-500 to-pink-600'
                          } text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-800 dark:text-gray-100 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">{action.title}</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-300">{action.description}</p>
                          </div>
                          <ChevronRight className="h-5 w-5 text-gray-400 dark:text-gray-500 group-hover:text-blue-500 group-hover:translate-x-1 transition-all duration-300" />
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </CardContent>
            </Card>

            {/* Próximas Consultas com paleta consistente */}
            <Card className="shadow-xl border-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-xl text-gray-800 dark:text-gray-100">
                  <div className="p-2 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg">
                    <Calendar className="h-4 w-4" />
                  </div>
                  Próximas Consultas
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingConsultas ? (
                  <div className="space-y-3">
                    <Skeleton className="h-16 w-full rounded-xl bg-gray-200 dark:bg-gray-700" />
                    <Skeleton className="h-16 w-full rounded-xl bg-gray-200 dark:bg-gray-700" />
                  </div>
                ) : consultas.length > 0 ? (
                  <div className="space-y-3">
                    {consultas.map((consulta) => (
                      <div key={consulta.id} className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-900/40 border border-blue-200 dark:border-blue-700 hover:shadow-md transition-all duration-300">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-blue-500 text-white shadow-md">
                            <Calendar className="h-4 w-4" />
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-blue-900 dark:text-blue-100">
                              {new Date(consulta.data).toLocaleDateString('pt-BR')}{' '}
                              {new Date(consulta.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            <p className="text-sm text-blue-700 dark:text-blue-200 font-medium">{consulta.medico.nome}</p>
                            <p className="text-xs text-blue-600 dark:text-blue-300">{consulta.medico.especialidade}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" asChild className="w-full mt-3 border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-600 dark:text-blue-300 dark:hover:bg-blue-900/20">
                      <Link to="/paciente/consultas">
                        Ver Todas as Consultas
                        <ChevronRight className="h-3 w-3 ml-1" />
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <div className="p-4 rounded-full bg-gray-100 dark:bg-gray-700 w-fit mx-auto mb-3">
                      <Calendar className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-3">Nenhuma consulta agendada</p>
                    <Button variant="outline" size="sm" asChild className="border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-600 dark:text-blue-300 dark:hover:bg-blue-900/20">
                      <Link to="/paciente/consultas">
                        Agendar Consulta
                        <ChevronRight className="h-3 w-3 ml-1" />
                      </Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Exames Recentes com paleta consistente */}
            <Card className="shadow-xl border-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-xl text-gray-800 dark:text-gray-100">
                  <div className="p-2 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-lg">
                    <ClipboardList className="h-4 w-4" />
                  </div>
                  Exames Recentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-6">
                  <div className="p-4 rounded-full bg-gray-100 dark:bg-gray-700 w-fit mx-auto mb-3">
                    <ClipboardList className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-3">Nenhum exame recente</p>
                  <Button variant="outline" size="sm" asChild className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-600 dark:text-emerald-300 dark:hover:bg-emerald-900/20">
                    <Link to="/paciente/exames">
                      Ver Todos os Exames
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
  )
}
