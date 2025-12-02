import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, ClipboardList, FileText, Users, Activity, AlertCircle, Clock, Stethoscope, CalendarDays, Eye, Heart, Pill, Droplets, Shield, ChevronRight, Bell, MapPin, TrendingUp, UserPlus, BarChart3, CheckCircle, XCircle } from "lucide-react"
import { useApi } from "@/hooks/useApi"
import { pacienteService } from "@/services/pacienteService"
import { Link } from "react-router-dom"
import { useEffect, useState } from "react"
import { useToast } from "@/hooks/use-toast"
import notificationService from "@/services/notificationService"

export default function DashboardPaciente() {
  const { data, loading, error } = useApi(pacienteService.getDashboard)
  const { toast } = useToast()
  const [notifs, setNotifs] = useState([])
  const [loadingNotifs, setLoadingNotifs] = useState(false)
  const [showUnreadOnly, setShowUnreadOnly] = useState(true)
  const stats = data || {
    consultasMes: 0,
    consultasProximas: 0,
    examesPendentes: 0,
    examesRealizadosMes: 0,
    receitasAtivas: 0,
    medicosVinculados: 0,
    proximasConsultas: [],
    proximosExames: [],
  }

  // Próxima consulta (primeira da lista ou mock)
  const proximaConsulta = stats.proximasConsultas?.[0] || {
    medico_nome: "Dr. João Silva",
    especialidade: "Cardiologista",
    data_hora: "2024-11-22T10:00:00",
    local: "Clínica Bem-Estar - Online",
    status: "Confirmada"
  }

  const fetchNotifs = async (onlyUnread) => {
    try {
      setLoadingNotifs(true)
      const res = await notificationService.buscarNotificacoes({ page: 1, pageSize: 10, lidas: onlyUnread ? false : null })
      const items = Array.isArray(res?.results) ? res.results : Array.isArray(res) ? res : []
      setNotifs(items)
    } catch (e) {
      const msg = e?.response?.data?.detail || e?.message || "Falha ao carregar notificações"
      toast({ title: "Erro", description: msg, variant: "destructive" })
    } finally {
      setLoadingNotifs(false)
    }
  }

  useEffect(() => {
    fetchNotifs(showUnreadOnly)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showUnreadOnly])

  const handleMarkRead = async (id) => {
    try {
      await notificationService.marcarComoLida(id)
      setNotifs((prev) => prev.map((n) => (String(n.id) === String(id) ? { ...n, lida: true, data_leitura: new Date().toISOString() } : n)))
      toast({ title: "Notificação marcada como lida" })
    } catch (e) {
      const msg = e?.response?.data?.detail || e?.message || "Falha ao marcar como lida"
      toast({ title: "Erro", description: msg, variant: "destructive" })
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await notificationService.marcarTodasComoLidas()
      setNotifs((prev) => prev.map((n) => ({ ...n, lida: true, data_leitura: n.data_leitura || new Date().toISOString() })))
      toast({ title: "Todas notificações marcadas como lidas" })
    } catch (e) {
      const msg = e?.response?.data?.detail || e?.message || "Falha ao marcar todas como lidas"
      toast({ title: "Erro", description: msg, variant: "destructive" })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-950 dark:via-slate-900 dark:to-gray-950 p-6">
        <div className="space-y-8">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="border-0 shadow-xl bg-white/80 backdrop-blur-sm animate-pulse">
                <CardContent className="p-6">
                  <div className="h-20 bg-gradient-to-r from-slate-200 to-slate-300 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm animate-pulse">
                <CardContent className="p-6">
                  <div className="h-32 bg-gradient-to-r from-slate-200 to-slate-300 rounded"></div>
                </CardContent>
              </Card>
            </div>
            <div className="space-y-4">
              <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm animate-pulse">
                <CardContent className="p-4">
                  <div className="h-40 bg-gradient-to-r from-slate-200 to-slate-300 rounded"></div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-950 dark:via-slate-900 dark:to-gray-950 p-6">
        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
          <CardContent className="flex items-center justify-center h-32">
            <div className="text-center">
              <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
              <p className="text-slate-600">Erro ao carregar dashboard</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-950 dark:via-slate-900 dark:to-gray-950 p-6 space-y-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 p-8 text-white shadow-2xl">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <Heart className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Minha Saúde</h1>
              <p className="text-blue-100 mt-1">Acompanhe suas consultas, exames e medicamentos</p>
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center gap-2 mb-2">
                <Stethoscope className="h-5 w-5 text-blue-300" />
                <span className="text-sm font-medium text-blue-100">Consultas</span>
              </div>
              <div className="text-2xl font-bold">{stats.consultasMes}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center gap-2 mb-2">
                <ClipboardList className="h-5 w-5 text-green-300" />
                <span className="text-sm font-medium text-blue-100">Exames</span>
              </div>
              <div className="text-2xl font-bold text-green-300">{stats.examesRealizadosMes}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center gap-2 mb-2">
                <Pill className="h-5 w-5 text-purple-300" />
                <span className="text-sm font-medium text-blue-100">Receitas</span>
              </div>
              <div className="text-2xl font-bold text-purple-300">{stats.receitasAtivas}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-5 w-5 text-amber-300" />
                <span className="text-sm font-medium text-blue-100">Médicos</span>
              </div>
              <div className="text-2xl font-bold text-amber-300">{stats.medicosVinculados}</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 mt-6">
            <Button className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm transition-all duration-200 dark:bg-gray-800 dark:hover:bg-gray-700 dark:border-gray-600 dark:text-gray-200" asChild>
              <Link to="/paciente/consultas">
                <CalendarDays className="h-4 w-4 mr-2" />
                Entrar em contato
              </Link>
            </Button>
            <Button className="bg-white text-blue-600 hover:bg-blue-50 transition-all duration-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700" asChild>
              <Link to="/paciente/exames">
                <ClipboardList className="h-4 w-4 mr-2" />
                Ver Exames
              </Link>
            </Button>
            <Button variant="outline" className="bg-white/10 hover:bg-white/20 text-white border-white/30 backdrop-blur-sm dark:bg-gray-800 dark:hover:bg-gray-700 dark:border-gray-600 dark:text-gray-200" asChild>
              <Link to="/paciente/historico-medico">
                <BarChart3 className="h-4 w-4 mr-2" />
                Histórico
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-2xl transition-all duration-300 group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-blue-700 group-hover:text-blue-800 transition-colors">
              Consultas este Mês
            </CardTitle>
            <div className="p-2 bg-blue-500 rounded-lg group-hover:bg-blue-600 transition-colors">
              <Stethoscope className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900 mb-2">{stats.consultasMes}</div>
            <p className="text-sm text-blue-600 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              {stats.consultasProximas} próximas agendadas
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl bg-gradient-to-br from-green-50 to-emerald-100 hover:shadow-2xl transition-all duration-300 group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-green-700 group-hover:text-green-800 transition-colors">
              Exames Realizados
            </CardTitle>
            <div className="p-2 bg-green-500 rounded-lg group-hover:bg-green-600 transition-colors">
              <ClipboardList className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-900 mb-2">{stats.examesRealizadosMes}</div>
            <p className="text-sm text-green-600 flex items-center gap-1">
              <Activity className="h-3 w-3" />
              {stats.examesPendentes} pendentes
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl bg-gradient-to-br from-purple-50 to-purple-100 hover:shadow-2xl transition-all duration-300 group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-purple-700 group-hover:text-purple-800 transition-colors">
              Receitas Ativas
            </CardTitle>
            <div className="p-2 bg-purple-500 rounded-lg group-hover:bg-purple-600 transition-colors">
              <Pill className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-900 mb-2">{stats.receitasAtivas}</div>
            <p className="text-sm text-purple-600">Medicamentos ativos</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl bg-gradient-to-br from-amber-50 to-orange-100 hover:shadow-2xl transition-all duration-300 group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-amber-700 group-hover:text-amber-800 transition-colors">
              Médicos Vinculados
            </CardTitle>
            <div className="p-2 bg-amber-500 rounded-lg group-hover:bg-amber-600 transition-colors">
              <Users className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-900 mb-2">{stats.medicosVinculados}</div>
            <p className="text-sm text-amber-600">Profissionais de confiança</p>
          </CardContent>
        </Card>
      </div>

      {/* Content Grid */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Content - 2/3 */}
        <div className="lg:col-span-2 space-y-8">
          {/* Próxima Consulta em Destaque */}
          <Card className="border-0 shadow-xl bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 text-white overflow-hidden">
            <CardContent className="p-8 relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12"></div>
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold mb-3">Próxima Consulta</h2>
                    <div className="flex items-center gap-2 text-blue-100 mb-2">
                      <Calendar className="h-5 w-5" />
                      <span className="text-lg">
                        {new Date(proximaConsulta.data_hora).toLocaleDateString('pt-BR', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-blue-100 mb-4">
                      <Clock className="h-5 w-5" />
                      <span className="text-lg">
                        {new Date(proximaConsulta.data_hora).toLocaleTimeString('pt-BR', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                    </div>
                  </div>
                  <Badge className="bg-white/20 text-white border-white/30 text-sm px-3 py-1">
                    {proximaConsulta.status}
                  </Badge>
                </div>
                <div className="space-y-3 mb-6">
                  <p className="text-xl font-semibold">{proximaConsulta.medico_nome}</p>
                  <p className="text-blue-100 text-lg">{proximaConsulta.especialidade}</p>
                  <div className="flex items-center gap-2 text-blue-100">
                    <MapPin className="h-5 w-5" />
                    <span>{proximaConsulta.local}</span>
                  </div>
                </div>
                <Button 
                  className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm transition-all duration-200"
                  variant="outline"
                  size="lg"
                >
                  <Heart className="h-4 w-4 mr-2" />
                  Iniciar Consulta Online
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Lembretes de Medicação */}
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-purple-50 border-b border-slate-200/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Pill className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-slate-800">Lembretes de Medicação</CardTitle>
                  <CardDescription className="text-slate-600">Seus medicamentos para hoje</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-4 rounded-xl border border-blue-200/50 bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-md transition-all duration-200">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-blue-500 rounded-lg">
                      <Heart className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-blue-900">Pressão Arterial</p>
                      <p className="text-xs text-blue-600">Última medição</p>
                    </div>
                  </div>
                  <p className="text-xl font-bold text-blue-900 mb-1">120/80 mmHg</p>
                  <p className="text-sm text-blue-600">Normal</p>
                </div>

                <div className="p-4 rounded-xl border border-orange-200/50 bg-gradient-to-br from-orange-50 to-orange-100 hover:shadow-md transition-all duration-200">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-orange-500 rounded-lg">
                      <Bell className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-orange-900">Próximo Medicamento</p>
                      <p className="text-xs text-orange-600">Lembrete</p>
                    </div>
                  </div>
                  <p className="text-xl font-bold text-orange-900 mb-1">Losartana 50mg</p>
                  <p className="text-sm text-orange-600">Tomar às 08:00</p>
                </div>

                <div className="p-4 rounded-xl border border-green-200/50 bg-gradient-to-br from-green-50 to-green-100 hover:shadow-md transition-all duration-200">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-green-500 rounded-lg">
                      <Shield className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-green-900">Medicamento Tomado</p>
                      <p className="text-xs text-green-600">Hoje às 08:00</p>
                    </div>
                  </div>
                  <p className="text-xl font-bold text-green-900 mb-1">Omeprazol 20mg</p>
                  <p className="text-sm text-green-600">Concluído ✓</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Informações Médicas */}
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-pink-50 border-b border-slate-200/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-pink-100 rounded-lg">
                  <Activity className="h-5 w-5 text-pink-600" />
                </div>
                <div>
                  <CardTitle className="text-slate-800">Informações Médicas</CardTitle>
                  <CardDescription className="text-slate-600">Seus dados médicos importantes</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-4 bg-gradient-to-br from-red-50 to-red-100 border border-red-200/50 rounded-xl hover:shadow-md transition-all duration-200">
                  <div className="flex items-center gap-2 mb-3">
                    <Droplets className="h-5 w-5 text-red-600" />
                    <span className="text-sm font-semibold text-red-700">Tipo Sanguíneo</span>
                  </div>
                  <p className="text-2xl font-bold text-red-900">O+</p>
                </div>

                <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200/50 rounded-xl hover:shadow-md transition-all duration-200">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="h-5 w-5 text-orange-600" />
                    <span className="text-sm font-semibold text-orange-700">Alergias</span>
                  </div>
                  <p className="text-lg font-bold text-orange-900">Pólen, Amendoim</p>
                </div>

                <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200/50 rounded-xl hover:shadow-md transition-all duration-200">
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-semibold text-blue-700">Condições</span>
                  </div>
                  <p className="text-lg font-bold text-blue-900">Nenhuma</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - 1/3 */}
        <div className="space-y-6">
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-orange-50 border-b border-slate-200/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Bell className="h-4 w-4 text-orange-600" />
                  </div>
                  <CardTitle className="text-slate-800">Notificações</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="hover:bg-orange-50" onClick={() => fetchNotifs(showUnreadOnly)} disabled={loadingNotifs}>
                    Atualizar
                  </Button>
                  <Button variant="ghost" size="sm" className="hover:bg-orange-50" onClick={handleMarkAllRead} disabled={loadingNotifs || notifs.length === 0}>
                    Marcar todas
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <span>{showUnreadOnly ? "Apenas não lidas" : "Todas"}</span>
                </div>
                <Button variant="outline" size="sm" className="text-xs" onClick={() => setShowUnreadOnly((v) => !v)}>
                  {showUnreadOnly ? "Mostrar todas" : "Mostrar não lidas"}
                </Button>
              </div>
              {loadingNotifs ? (
                <div className="text-center py-8">
                  <div className="p-4 bg-slate-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <Bell className="h-8 w-8 text-slate-400" />
                  </div>
                  <p className="text-slate-600 font-medium">Carregando notificações...</p>
                </div>
              ) : notifs.length === 0 ? (
                <div className="text-center py-8">
                  <div className="p-4 bg-slate-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <Bell className="h-8 w-8 text-slate-400" />
                  </div>
                  <p className="text-slate-600 font-medium mb-2">Sem notificações</p>
                  <p className="text-slate-500 text-sm">Você verá atualizações aqui</p>
                </div>
              ) : (
                notifs.slice(0, 5).map((n) => (
                  <div key={n.id} className="p-4 border border-slate-200/50 rounded-xl hover:shadow-md transition-all duration-200 bg-gradient-to-r from-slate-50 to-orange-50">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-orange-100 to-orange-200 rounded-full flex items-center justify-center">
                        {n.lida ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <Bell className="h-5 w-5 text-orange-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold truncate text-slate-900">{n.titulo || n.title || "Notificação"}</p>
                          {n.tipo && (
                            <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700 border-orange-200">
                              {String(n.tipo).toUpperCase()}
                            </Badge>
                          )}
                          {!n.lida && (
                            <Badge variant="destructive" className="text-xs">Nova</Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 truncate">
                          {n.mensagem || n.message || ""}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1">
                          {(() => { try { return new Date(n.created_at || n.data || n.data_envio).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) } catch { return "" } })()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {!n.lida ? (
                          <Button variant="ghost" size="sm" className="hover:bg-orange-100" onClick={() => handleMarkRead(n.id)}>
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Lida
                          </Button>
                        ) : (
                          <Button variant="ghost" size="sm" className="hover:bg-slate-100" disabled>
                            <XCircle className="h-4 w-4 mr-1" />
                            Lida
                          </Button>
                        )}
                        {(() => {
                          const link = n?.dados?.link || n?.link
                          const rid = n?.dados?.receita_id || n?.receita_id || n?.receita?.id
                          const href = link || (rid ? `/verificar/${rid}` : `/paciente/receitas`)
                          return (
                            <Button asChild variant="ghost" size="sm" className="hover:bg-orange-100">
                              <Link to={href}>
                                <Eye className="h-4 w-4 mr-1" />
                                Abrir
                              </Link>
                            </Button>
                          )
                        })()}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <Button variant="ghost" className="w-full text-sm hover:bg-orange-50" onClick={() => fetchNotifs(showUnreadOnly)} disabled={loadingNotifs}>
                Ver mais
              </Button>
            </CardContent>
          </Card>
          {/* Ações Rápidas */}
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-200/50">
              <CardTitle className="text-lg text-slate-800">Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-3">
              <Link to="/paciente/consultas/nova">
                <div className="flex items-center gap-4 p-4 rounded-xl border border-blue-200/50 bg-gradient-to-r from-blue-50 to-blue-100 hover:shadow-md transition-all duration-200 group cursor-pointer dark:border-gray-600/50 dark:from-gray-800 dark:to-gray-700 dark:hover:from-gray-700 dark:hover:to-gray-600">
                  <div className="p-2 bg-blue-500 rounded-lg group-hover:bg-blue-600 transition-colors dark:bg-blue-600 dark:group-hover:bg-blue-500">
                    <CalendarDays className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-blue-900 dark:text-gray-200">Contato com médico</p>
                    <p className="text-sm text-blue-600 dark:text-gray-400">Solicite um horário</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-blue-600 group-hover:translate-x-1 transition-transform dark:text-gray-400" />
                </div>
              </Link>

              <Link to="/paciente/exames">
                <div className="flex items-center gap-4 p-4 rounded-xl border border-green-200/50 bg-gradient-to-r from-green-50 to-green-100 hover:shadow-md transition-all duration-200 group cursor-pointer">
                  <div className="p-2 bg-green-500 rounded-lg group-hover:bg-green-600 transition-colors">
                    <ClipboardList className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-green-900">Ver Exames</p>
                    <p className="text-sm text-green-600">Resultados e histórico</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-green-600 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>

              <Link to="/paciente/historico-medico">
                <div className="flex items-center gap-4 p-4 rounded-xl border border-purple-200/50 bg-gradient-to-r from-purple-50 to-purple-100 hover:shadow-md transition-all duration-200 group cursor-pointer">
                  <div className="p-2 bg-purple-500 rounded-lg group-hover:bg-purple-600 transition-colors">
                    <Activity className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-purple-900">Histórico Médico</p>
                    <p className="text-sm text-purple-600">Consulte seu histórico</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-purple-600 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            </CardContent>
          </Card>

          {/* Próximas Consultas */}
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-200/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Calendar className="h-4 w-4 text-blue-600" />
                </div>
                <CardTitle className="text-slate-800">Próximas Consultas</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-3">
              {stats.proximasConsultas.length === 0 ? (
                <div className="text-center py-8">
                  <div className="p-4 bg-slate-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <Calendar className="h-8 w-8 text-slate-400" />
                  </div>
                  <p className="text-slate-600 font-medium mb-2">Nenhuma consulta agendada</p>
                  <p className="text-slate-500 text-sm">Entre em contato para marcar</p>
                </div>
              ) : (
                stats.proximasConsultas.slice(0, 3).map((consulta, index) => (
                  <div key={index} className="p-4 border border-slate-200/50 rounded-xl hover:shadow-md transition-all duration-200 bg-gradient-to-r from-slate-50 to-blue-50 group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center group-hover:from-blue-200 group-hover:to-blue-300 transition-colors">
                        <Stethoscope className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate text-slate-900">{consulta.medico_nome}</p>
                        <p className="text-xs text-slate-600">
                          {new Date(consulta.data_hora).toLocaleDateString('pt-BR')} - {new Date(consulta.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" className="hover:bg-blue-100">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
              <Button variant="ghost" className="w-full text-sm hover:bg-blue-50">
                Ver Todas
              </Button>
            </CardContent>
          </Card>

          {/* Exames Recentes */}
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-green-50 border-b border-slate-200/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <ClipboardList className="h-4 w-4 text-green-600" />
                </div>
                <CardTitle className="text-slate-800">Exames Recentes</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-3">
              {stats.proximosExames.length === 0 ? (
                <div className="text-center py-8">
                  <div className="p-4 bg-slate-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <ClipboardList className="h-8 w-8 text-slate-400" />
                  </div>
                  <p className="text-slate-600 font-medium mb-2">Nenhum exame recente</p>
                  <p className="text-slate-500 text-sm">Exames aparecerão aqui</p>
                </div>
              ) : (
                stats.proximosExames.slice(0, 3).map((exame, index) => (
                  <div key={index} className="p-4 border border-slate-200/50 rounded-xl hover:shadow-md transition-all duration-200 bg-gradient-to-r from-slate-50 to-green-50 group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center group-hover:from-green-200 group-hover:to-green-300 transition-colors">
                        <Activity className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate text-slate-900">{exame.tipo}</p>
                        <p className="text-xs text-slate-600">
                          {exame.data_agendamento ? new Date(exame.data_agendamento).toLocaleDateString('pt-BR') : "Data não definida"}
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 border-green-200">
                        {exame.status}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
