import { ClinicaLayout } from "../../../layouts/clinica-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card"
import { Badge } from "../../../components/ui/badge"
import { Button } from "../../../components/ui/button"
import { Calendar, Clock, Users, FileText, TrendingUp, AlertCircle, Activity, CalendarDays, Eye, Settings, Stethoscope, Plus, ArrowRight } from "lucide-react"
import { clinicaService } from "../../../services/clinicaService"
import { useApi } from "../../../hooks/useApi"
import { Link } from "react-router-dom"

export default function ClinicaDashboard() {
  const { data: dashboardData, loading, error } = useApi(clinicaService.getDashboard)

  const breadcrumbs = [{ label: "Dashboard", href: "/clinica/dashboard" }]

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-950 dark:via-slate-900 dark:to-gray-950 p-6">
        <div className="max-w-7xl mx-auto space-y-8">
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

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-950 dark:via-slate-900 dark:to-gray-950 p-6">
        <div className="max-w-7xl mx-auto">
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
            <CardContent className="flex items-center justify-center h-32">
              <div className="text-center">
                <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                <p className="text-slate-600">Erro ao carregar dashboard</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const stats = dashboardData || {
    examesHoje: 12,
    examesTotais: 156,
    pacientesAtivos: 89,
    taxaOcupacao: 85,
    proximosExames: [
      { id: 1, paciente: "João Silva", tipo: "Ultrassom", horario: "09:00", status: "confirmado" },
      { id: 2, paciente: "Maria Santos", tipo: "Raio-X", horario: "10:30", status: "pendente" },
      { id: 3, paciente: "Pedro Costa", tipo: "Tomografia", horario: "14:00", status: "confirmado" },
    ],
    examesPendentes: 5,
  }

  const StatCard = ({ title, value, icon: Icon, description, gradient, iconBg, textColor, trend }) => (
    <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
      <CardContent className="p-6">
        <div className={`bg-gradient-to-br ${gradient} rounded-2xl p-6 text-white relative overflow-hidden`}>
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10" />
          <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/5 rounded-full -ml-8 -mb-8" />
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 ${iconBg} rounded-xl`}>
                <Icon className="h-6 w-6 text-white" />
              </div>
              <div className="text-right">
                <div className={`text-3xl font-bold ${textColor}`}>{value}</div>
                <div className="text-white/80 text-sm font-medium">{title}</div>
              </div>
            </div>
            <div className="text-white/90 text-sm">{description}</div>
            {trend && (
              <div className="flex items-center gap-1 mt-2 text-white/80 text-xs">
                <TrendingUp className="h-3 w-3" />
                {trend}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-950 dark:via-slate-900 dark:to-gray-950 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 rounded-2xl p-8 text-white shadow-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">Dashboard da Clínica</h1>
              <p className="text-blue-100 text-lg">Gerencie exames, horários e acompanhe o desempenho da clínica</p>
            </div>
            <div className="flex gap-3">
              <Button className="bg-white/20 hover:bg-white/30 text-white border-white/30" asChild>
                <Link to="/clinica/calendario">
                  <CalendarDays className="h-4 w-4 mr-2" />
                  Calendário
                </Link>
              </Button>
              <Button className="bg-white text-blue-600 hover:bg-blue-50" asChild>
                <Link to="/clinica/exames">
                  <Plus className="h-4 w-4 mr-2" />
                  Agendar Exame
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Exames Hoje"
            value={stats.examesHoje}
            icon={Calendar}
            description="Exames agendados para hoje"
            gradient="from-blue-500 to-blue-600"
            iconBg="bg-blue-400/30"
            textColor="text-white"
            trend="+2 desde ontem"
          />
          <StatCard
            title="Total de Exames"
            value={stats.examesTotais}
            icon={FileText}
            description="Exames realizados este mês"
            gradient="from-green-500 to-green-600"
            iconBg="bg-green-400/30"
            textColor="text-white"
          />
          <StatCard
            title="Pacientes Ativos"
            value={stats.pacientesAtivos}
            icon={Users}
            description="Pacientes cadastrados"
            gradient="from-purple-500 to-purple-600"
            iconBg="bg-purple-400/30"
            textColor="text-white"
            trend="+12% desde o mês passado"
          />
          <StatCard
            title="Taxa de Ocupação"
            value={`${stats.taxaOcupacao}%`}
            icon={Activity}
            description="Capacidade atual dos equipamentos"
            gradient="from-orange-500 to-orange-600"
            iconBg="bg-orange-400/30"
            textColor="text-white"
          />
        </div>

        {/* Layout Principal */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Próximos Exames */}
          <div className="lg:col-span-2">
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-200/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Clock className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-slate-800">Próximos Exames</CardTitle>
                      <CardDescription className="text-slate-600">
                        Exames agendados para hoje
                      </CardDescription>
                    </div>
                  </div>
                  <Button variant="outline" className="bg-white border-slate-200 hover:bg-slate-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700" asChild>
                    <Link to="/clinica/exames">
                      Ver todos
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {stats.proximosExames.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="p-4 bg-slate-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <Clock className="h-8 w-8 text-slate-400" />
                    </div>
                    <p className="text-slate-600 font-medium mb-2">Nenhum exame agendado</p>
                    <p className="text-slate-500 text-sm">Não há exames programados para hoje</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {stats.proximosExames.map((exame) => (
                      <div key={exame.id} className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md transition-all duration-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="flex flex-col items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                              <span className="text-sm font-bold text-blue-700">
                                {exame.horario}
                              </span>
                              <span className="text-xs text-blue-600">
                                Hoje
                              </span>
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">{exame.paciente}</p>
                              <p className="text-sm text-slate-600">{exame.tipo}</p>
                              <Badge 
                                variant={exame.status === "confirmado" ? "default" : "secondary"}
                                className={`mt-1 text-xs ${
                                  exame.status === "confirmado" 
                                    ? "bg-green-100 text-green-800 hover:bg-green-200" 
                                    : "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                                }`}
                              >
                                {exame.status}
                              </Badge>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                            <Stethoscope className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar com Ações Rápidas */}
          <div className="space-y-6">
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-200/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Settings className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <CardTitle className="text-slate-800">Ações Rápidas</CardTitle>
                    <CardDescription className="text-slate-600">
                      Acesso rápido às principais funcionalidades
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <Button className="w-full justify-start bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all duration-300" asChild>
                    <Link to="/clinica/calendario">
                      <Calendar className="mr-2 h-4 w-4" />
                      Ver Calendário
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full justify-start bg-white border-slate-200 hover:bg-slate-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700 shadow-lg hover:shadow-xl transition-all duration-300" asChild>
                    <Link to="/clinica/disponibilidade">
                      <Clock className="mr-2 h-4 w-4" />
                      Gerenciar Horários
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full justify-start bg-white border-slate-200 hover:bg-slate-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700 shadow-lg hover:shadow-xl transition-all duration-300" asChild>
                    <Link to="/clinica/exames">
                      <FileText className="mr-2 h-4 w-4" />
                      Agendar Exame
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full justify-start bg-white border-slate-200 hover:bg-slate-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700 shadow-lg hover:shadow-xl transition-all duration-300" asChild>
                    <Link to="/clinica/pacientes">
                      <Users className="mr-2 h-4 w-4" />
                      Ver Pacientes
                    </Link>
                  </Button>
                </div>

                {stats.examesPendentes > 0 && (
                  <div className="mt-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                      <p className="text-sm font-medium text-yellow-800">
                        {stats.examesPendentes} exames pendentes de confirmação
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
