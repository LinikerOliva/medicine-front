import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardStatus, CardPriority } from "../../../components/ui/card"
import { Badge, PatientStatusBadge, ConsultationPriorityBadge } from "../../../components/ui/badge"
import { Button } from "../../../components/ui/button"
import { Calendar, Users, FileText, Activity, Clock, TrendingUp, Stethoscope, CalendarDays, UserPlus, Eye, BarChart3, Heart, AlertTriangle, CheckCircle, XCircle, Plus, ArrowRight } from "lucide-react"
import { useApi } from "../../../hooks/useApi"
import { medicoService } from "../../../services/medicoService"
import { Link } from "react-router-dom"

export default function MedicoDashboard() {
  const { data: dashboardData, loading } = useApi(() => medicoService.getDashboard())

  if (loading) {
    return (
      <div className="min-h-screen bg-medical-gradient p-6">
        <div className="space-y-8 animate-fade-in">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} variant="medical" className="animate-pulse">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="h-4 w-20 bg-medical-primary/20 rounded" />
                  <div className="h-4 w-4 bg-medical-primary/20 rounded" />
                </CardHeader>
                <CardContent>
                  <div className="h-8 w-16 bg-medical-primary/20 rounded mb-2" />
                  <div className="h-3 w-24 bg-medical-primary/20 rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const stats = dashboardData || {
    consultas_hoje: 5,
    pacientes_ativos: 127,
    prontuarios: 89,
    exames_pendentes: 9,
    variacao_consultas: 2,
    novos_pacientes_semana: 5,
    proximas_consultas: [],
    pacientes_recentes: [],
  }

  const formatHora = (dh) => {
    try {
      const d = new Date(dh)
      if (!isNaN(d.getTime())) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      if (typeof dh === "string" && /^\d{2}:\d{2}/.test(dh)) return dh.slice(0, 5)
    } catch {}
    return "-"
  }

  const agenda = Array.isArray(stats.proximas_consultas) ? stats.proximas_consultas : []

  return (
    <div className="min-h-screen bg-medical-gradient p-6 space-y-8 animate-fade-in">
      {/* Header Médico Profissional */}
      <Card variant="medical" className="overflow-hidden">
        <div className="bg-gradient-to-r from-medical-primary via-medical-secondary to-medical-accent p-8 text-white relative">
          <div className="absolute inset-0 bg-black/5"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-4 bg-white/15 rounded-2xl backdrop-blur-sm border border-white/20">
                <Stethoscope className="h-10 w-10" />
              </div>
              <div>
                <h1 className="text-4xl font-bold mb-2">Dashboard Médico</h1>
                <p className="text-white/90 text-lg">Gestão clínica profissional e cuidado centrado no paciente</p>
              </div>
            </div>
            
            {/* Estatísticas Rápidas */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 hover:bg-white/15 transition-all duration-200">
                <div className="flex items-center gap-3 mb-2">
                  <Calendar className="h-5 w-5 text-blue-200" />
                  <span className="text-sm font-medium text-white/90">Consultas Hoje</span>
                </div>
                <div className="text-3xl font-bold">{stats.consultas_hoje}</div>
                <div className="text-xs text-white/70 mt-1">Agendamentos confirmados</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 hover:bg-white/15 transition-all duration-200">
                <div className="flex items-center gap-3 mb-2">
                  <Users className="h-5 w-5 text-green-200" />
                  <span className="text-sm font-medium text-white/90">Pacientes Ativos</span>
                </div>
                <div className="text-3xl font-bold text-green-200">{stats.pacientes_ativos}</div>
                <div className="text-xs text-white/70 mt-1">Em acompanhamento</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 hover:bg-white/15 transition-all duration-200">
                <div className="flex items-center gap-3 mb-2">
                  <FileText className="h-5 w-5 text-purple-200" />
                  <span className="text-sm font-medium text-white/90">Prontuários</span>
                </div>
                <div className="text-3xl font-bold text-purple-200">{stats.prontuarios}</div>
                <div className="text-xs text-white/70 mt-1">Registros médicos</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 hover:bg-white/15 transition-all duration-200">
                <div className="flex items-center gap-3 mb-2">
                  <Activity className="h-5 w-5 text-amber-200" />
                  <span className="text-sm font-medium text-white/90">Exames Pendentes</span>
                </div>
                <div className="text-3xl font-bold text-amber-200">{stats.exames_pendentes}</div>
                <div className="text-xs text-white/70 mt-1">Aguardando análise</div>
              </div>
            </div>

            {/* Ações Rápidas */}
            <div className="flex flex-wrap gap-3">
              <Button variant="btn-medical-secondary" size="lg" className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm">
                <Plus className="h-5 w-5 mr-2" />
                Nova Consulta
              </Button>
              <Button variant="outline" size="lg" className="bg-white text-medical-primary hover:bg-gray-50" asChild>
                <Link to="/medico/minhas-consultas">
                  <CalendarDays className="h-5 w-5 mr-2" />
                  Ver Agenda Completa
                </Link>
              </Button>
              <Button variant="btn-medical-ghost" size="lg" className="bg-white/10 hover:bg-white/20 text-white border-white/30 backdrop-blur-sm">
                <BarChart3 className="h-5 w-5 mr-2" />
                Relatórios Clínicos
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Cards de Estatísticas Médicas */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card variant="medical" className="card-medical hover:shadow-2xl transition-all duration-300 group border-l-4 border-l-medical-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-medical-primary group-hover:text-medical-secondary transition-colors">
              Consultas Hoje
            </CardTitle>
            <div className="p-3 bg-medical-primary/10 rounded-xl group-hover:bg-medical-primary/20 transition-colors">
              <Calendar className="h-5 w-5 text-medical-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-medical-primary mb-2">{stats.consultas_hoje}</div>
            <div className="flex items-center gap-2">
              <Badge variant="success" size="sm">
                <TrendingUp className="h-3 w-3 mr-1" />
                +{stats.variacao_consultas}
              </Badge>
              <span className="text-sm text-muted-foreground">desde ontem</span>
            </div>
          </CardContent>
        </Card>

        <Card variant="medical" className="card-medical hover:shadow-2xl transition-all duration-300 group border-l-4 border-l-medical-secondary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-medical-secondary group-hover:text-medical-primary transition-colors">
              Pacientes Ativos
            </CardTitle>
            <div className="p-3 bg-medical-secondary/10 rounded-xl group-hover:bg-medical-secondary/20 transition-colors">
              <Users className="h-5 w-5 text-medical-secondary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-medical-secondary mb-2">{stats.pacientes_ativos}</div>
            <div className="flex items-center gap-2">
              <Badge variant="info" size="sm">
                <UserPlus className="h-3 w-3 mr-1" />
                +{stats.novos_pacientes_semana}
              </Badge>
              <span className="text-sm text-muted-foreground">esta semana</span>
            </div>
          </CardContent>
        </Card>

        <Card variant="medical" className="card-medical hover:shadow-2xl transition-all duration-300 group border-l-4 border-l-medical-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-medical-primary group-hover:text-medical-secondary transition-colors">
              Prontuários Digitais
            </CardTitle>
            <div className="p-3 bg-medical-primary/10 rounded-xl group-hover:bg-medical-primary/20 transition-colors">
              <FileText className="h-5 w-5 text-medical-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-medical-primary mb-2">{stats.prontuarios}</div>
            <div className="flex items-center gap-2">
              <Badge variant="medical-secondary" size="sm">
                <CheckCircle className="h-3 w-3 mr-1" />
                Atualizados
              </Badge>
              <span className="text-sm text-muted-foreground">registros médicos</span>
            </div>
          </CardContent>
        </Card>

        <Card variant="medical" className="card-medical hover:shadow-2xl transition-all duration-300 group border-l-4 border-l-status-attention">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-status-attention group-hover:text-status-attention/80 transition-colors">
              Exames Pendentes
            </CardTitle>
            <div className="p-3 bg-status-attention/10 rounded-xl group-hover:bg-status-attention/20 transition-colors">
              <Activity className="h-5 w-5 text-status-attention" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-status-attention mb-2">{stats.exames_pendentes}</div>
            <div className="flex items-center gap-2">
              <Badge variant="warning" size="sm">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Urgente
              </Badge>
              <span className="text-sm text-muted-foreground">aguardando análise</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Seção Principal - Consultas e Pacientes */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Agenda de Consultas */}
        <Card variant="medical" className="card-medical">
          <CardHeader className="bg-gradient-to-r from-medical-primary/5 to-medical-secondary/5 border-b border-medical-primary/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-medical-primary/10 rounded-xl">
                  <Clock className="h-6 w-6 text-medical-primary" />
                </div>
                <div>
                  <CardTitle className="text-medical-primary text-lg font-semibold">Agenda de Consultas</CardTitle>
                  <CardDescription className="text-muted-foreground">Próximos atendimentos programados</CardDescription>
                </div>
              </div>
              <Button variant="btn-medical-ghost" size="sm" asChild>
                <Link to="/medico/minhas-consultas">
                  <Eye className="h-4 w-4 mr-2" />
                  Ver Agenda Completa
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {agenda.length > 0 ? (
                agenda.slice(0, 5).map((consulta, index) => (
                  <div key={index} className="group p-4 rounded-xl border border-medical-primary/10 bg-gradient-to-r from-white to-medical-primary/5 hover:shadow-md hover:border-medical-primary/20 transition-all duration-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-medical-primary/10 rounded-xl group-hover:bg-medical-primary/20 transition-colors">
                          <Heart className="h-5 w-5 text-medical-primary" />
                        </div>
                        <div className="space-y-2">
                          <p className="font-semibold text-gray-900">{consulta.paciente_nome}</p>
                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1 text-medical-primary">
                              <Clock className="h-4 w-4" />
                              <span className="font-medium">{formatHora(consulta.data_hora)}</span>
                            </div>
                            <ConsultationPriorityBadge priority={consulta.prioridade || "normal"} />
                            <Badge variant="outline" className="bg-medical-primary/5 text-medical-primary border-medical-primary/20">
                              {consulta.tipo || "Consulta Geral"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <Button variant="btn-medical-secondary" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        Atender
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <div className="p-4 bg-medical-primary/5 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                    <Calendar className="h-10 w-10 text-medical-primary/60" />
                  </div>
                  <p className="text-gray-700 font-medium mb-2">Agenda livre hoje</p>
                  <p className="text-muted-foreground text-sm mb-4">Nenhuma consulta agendada para hoje</p>
                  <Button variant="btn-medical-primary" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Agendar Nova Consulta
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pacientes Recentes */}
        <Card variant="medical" className="card-medical">
          <CardHeader className="bg-gradient-to-r from-medical-secondary/5 to-medical-secondary/10 border-b border-medical-secondary/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-medical-secondary/10 rounded-xl">
                  <Users className="h-6 w-6 text-medical-secondary" />
                </div>
                <div>
                  <CardTitle className="text-medical-secondary text-lg font-semibold">Pacientes Recentes</CardTitle>
                  <CardDescription className="text-medical-secondary/70">Últimas interações e acompanhamentos</CardDescription>
                </div>
              </div>
              <Button variant="btn-medical-ghost" size="sm" asChild>
                <Link to="/medico/meus-pacientes">
                  <Users className="h-4 w-4 mr-2" />
                  Ver Todos Pacientes
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {stats.pacientes_recentes && stats.pacientes_recentes.length > 0 ? (
                stats.pacientes_recentes.slice(0, 5).map((paciente, index) => (
                  <div key={index} className="group p-4 rounded-xl border border-medical-secondary/10 bg-gradient-to-r from-white to-medical-secondary/5 hover:shadow-md hover:border-medical-secondary/20 transition-all duration-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-medical-secondary/10 rounded-xl group-hover:bg-medical-secondary/20 transition-colors">
                          <Users className="h-5 w-5 text-medical-secondary" />
                        </div>
                        <div className="space-y-2">
                          <p className="font-semibold text-gray-900">{paciente.nome}</p>
                          <div className="flex items-center gap-3 text-sm">
                            <span className="text-muted-foreground">
                              Última consulta: há {paciente.dias_ultima_consulta} dias
                            </span>
                            <PatientStatusBadge status={paciente.status || "ativo"} />
                          </div>
                        </div>
                      </div>
                      <Button variant="btn-medical-secondary" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        Ver Prontuário
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <div className="p-4 bg-medical-secondary/5 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                    <Users className="h-10 w-10 text-medical-secondary/60" />
                  </div>
                  <p className="text-gray-700 font-medium mb-2">Nenhum paciente recente</p>
                  <p className="text-muted-foreground text-sm mb-4">Pacientes aparecerão aqui após as consultas</p>
                  <Button variant="btn-medical-secondary" size="sm">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Cadastrar Novo Paciente
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
