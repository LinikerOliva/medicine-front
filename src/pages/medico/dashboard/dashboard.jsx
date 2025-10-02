import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card"
import { Badge } from "../../../components/ui/badge"
import { Button } from "../../../components/ui/button"
import { Calendar, Users, FileText, Activity, Clock, TrendingUp, Stethoscope, CalendarDays, UserPlus, Eye, BarChart3, Heart } from "lucide-react"
import { useApi } from "../../../hooks/useApi"
import { medicoService } from "../../../services/medicoService"
import { Link } from "react-router-dom"

export default function MedicoDashboard() {
  const { data: dashboardData, loading } = useApi(() => medicoService.getDashboard())

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-950 dark:via-slate-900 dark:to-gray-950 p-6">
        <div className="space-y-8">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="border-0 shadow-xl bg-white/80 backdrop-blur-sm animate-pulse">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="h-4 w-20 bg-gradient-to-r from-slate-200 to-slate-300 rounded" />
                  <div className="h-4 w-4 bg-gradient-to-r from-slate-200 to-slate-300 rounded" />
                </CardHeader>
                <CardContent>
                  <div className="h-8 w-16 bg-gradient-to-r from-slate-200 to-slate-300 rounded mb-2" />
                  <div className="h-3 w-24 bg-gradient-to-r from-slate-200 to-slate-300 rounded" />
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-950 dark:via-slate-900 dark:to-gray-950 p-6 space-y-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 p-8 text-white shadow-2xl">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <Stethoscope className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Dashboard Médico</h1>
              <p className="text-blue-100 mt-1">Bem-vindo de volta! Gerencie suas consultas e pacientes.</p>
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-5 w-5 text-blue-300" />
                <span className="text-sm font-medium text-blue-100">Hoje</span>
              </div>
              <div className="text-2xl font-bold">{stats.consultas_hoje}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-5 w-5 text-green-300" />
                <span className="text-sm font-medium text-blue-100">Pacientes</span>
              </div>
              <div className="text-2xl font-bold text-green-300">{stats.pacientes_ativos}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-5 w-5 text-purple-300" />
                <span className="text-sm font-medium text-blue-100">Prontuários</span>
              </div>
              <div className="text-2xl font-bold text-purple-300">{stats.prontuarios}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-5 w-5 text-amber-300" />
                <span className="text-sm font-medium text-blue-100">Pendentes</span>
              </div>
              <div className="text-2xl font-bold text-amber-300">{stats.exames_pendentes}</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 mt-6">
            <Button className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm transition-all duration-200 dark:bg-gray-800/80 dark:hover:bg-gray-700/80 dark:border-gray-600/50">
              <CalendarDays className="h-4 w-4 mr-2" />
              Ver Agenda
            </Button>
            <Button className="bg-white text-blue-600 hover:bg-blue-50 transition-all duration-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700">
              <Calendar className="h-4 w-4 mr-2" />
              Nova Consulta
            </Button>
            <Button variant="outline" className="bg-white/10 hover:bg-white/20 text-white border-white/30 backdrop-blur-sm dark:bg-gray-800/80 dark:hover:bg-gray-700/80 dark:border-gray-600/50">
              <BarChart3 className="h-4 w-4 mr-2" />
              Relatórios
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-2xl transition-all duration-300 group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-blue-700 group-hover:text-blue-800 transition-colors">
              Consultas Hoje
            </CardTitle>
            <div className="p-2 bg-blue-500 rounded-lg group-hover:bg-blue-600 transition-colors">
              <Calendar className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900 mb-2">{stats.consultas_hoje}</div>
            <p className="text-sm text-blue-600 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              +{stats.variacao_consultas} desde ontem
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl bg-gradient-to-br from-green-50 to-emerald-100 hover:shadow-2xl transition-all duration-300 group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-green-700 group-hover:text-green-800 transition-colors">
              Pacientes Ativos
            </CardTitle>
            <div className="p-2 bg-green-500 rounded-lg group-hover:bg-green-600 transition-colors">
              <Users className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-900 mb-2">{stats.pacientes_ativos}</div>
            <p className="text-sm text-green-600 flex items-center gap-1">
              <UserPlus className="h-3 w-3" />
              +{stats.novos_pacientes_semana} esta semana
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl bg-gradient-to-br from-purple-50 to-purple-100 hover:shadow-2xl transition-all duration-300 group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-purple-700 group-hover:text-purple-800 transition-colors">
              Prontuários
            </CardTitle>
            <div className="p-2 bg-purple-500 rounded-lg group-hover:bg-purple-600 transition-colors">
              <FileText className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-900 mb-2">{stats.prontuarios}</div>
            <p className="text-sm text-purple-600">Registros médicos</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl bg-gradient-to-br from-amber-50 to-orange-100 hover:shadow-2xl transition-all duration-300 group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-amber-700 group-hover:text-amber-800 transition-colors">
              Exames Pendentes
            </CardTitle>
            <div className="p-2 bg-amber-500 rounded-lg group-hover:bg-amber-600 transition-colors">
              <Activity className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-900 mb-2">{stats.exames_pendentes}</div>
            <p className="text-sm text-amber-600">Aguardando análise</p>
          </CardContent>
        </Card>
      </div>

      {/* Content Grid */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Próximas Consultas */}
        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-200/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-slate-800">Próximas Consultas</CardTitle>
                  <CardDescription className="text-slate-600">Agenda do dia</CardDescription>
                </div>
              </div>
              <Button variant="outline" size="sm" className="bg-white border-slate-200 hover:bg-slate-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700">
                <Eye className="h-4 w-4 mr-2" />
                Ver Todas
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {agenda.length > 0 ? (
                agenda.slice(0, 5).map((consulta, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl border border-slate-200/50 hover:shadow-md transition-all duration-200 group">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                        <Heart className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-semibold text-slate-900">{consulta.paciente_nome}</p>
                        <div className="flex items-center gap-4 text-sm text-slate-600">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatHora(consulta.data_hora)}
                          </span>
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            {consulta.tipo || "Consulta"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="bg-white border-slate-200 hover:bg-slate-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700">
                      Ver Detalhes
                    </Button>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <div className="p-4 bg-slate-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <Calendar className="h-8 w-8 text-slate-400" />
                  </div>
                  <p className="text-slate-600 font-medium mb-2">Nenhuma consulta agendada</p>
                  <p className="text-slate-500 text-sm">Sua agenda está livre para hoje</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pacientes Recentes */}
        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-green-50 border-b border-slate-200/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Users className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-slate-800">Pacientes Recentes</CardTitle>
                  <CardDescription className="text-slate-600">Últimas interações</CardDescription>
                </div>
              </div>
              <Link to="/medico/meus-pacientes">
                <Button variant="outline" size="sm" className="bg-white border-slate-200 hover:bg-slate-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700">
                  <Eye className="h-4 w-4 mr-2" />
                  Ver Todos
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {stats.pacientes_recentes && stats.pacientes_recentes.length > 0 ? (
                stats.pacientes_recentes.slice(0, 5).map((paciente, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-green-50 rounded-xl border border-slate-200/50 hover:shadow-md transition-all duration-200 group">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                        <Users className="h-4 w-4 text-green-600" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-semibold text-slate-900">{paciente.nome}</p>
                        <p className="text-sm text-slate-600">
                          Última consulta: há {paciente.dias_ultima_consulta} dias
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="bg-white border-slate-200 hover:bg-slate-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700">
                      Ver Perfil
                    </Button>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <div className="p-4 bg-slate-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <Users className="h-8 w-8 text-slate-400" />
                  </div>
                  <p className="text-slate-600 font-medium mb-2">Nenhum paciente recente</p>
                  <p className="text-slate-500 text-sm">Pacientes aparecerão aqui após as consultas</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
