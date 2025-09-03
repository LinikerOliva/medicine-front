import { ClinicaLayout } from "../../../layouts/clinica-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card"
import { Badge } from "../../../components/ui/badge"
import { Button } from "../../../components/ui/button"
import { Calendar, Clock, Users, FileText, TrendingUp, AlertCircle } from "lucide-react"
import { clinicaService } from "../../../services/clinicaService"
import { useApi } from "../../../hooks/useApi"

export default function ClinicaDashboard() {
  const { data: dashboardData, loading, error } = useApi(clinicaService.getDashboard)

  const breadcrumbs = [{ label: "Dashboard", href: "/clinica/dashboard" }]

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 bg-muted rounded w-20"></div>
              <div className="h-4 w-4 bg-muted rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-16 mb-2"></div>
              <div className="h-3 bg-muted rounded w-24"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
            <p className="text-muted-foreground">Erro ao carregar dashboard</p>
          </div>
        </CardContent>
      </Card>
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

  return (
    <div className="space-y-6">
      {/* Estatísticas principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Exames Hoje</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.examesHoje}</div>
            <p className="text-xs text-muted-foreground">+2 desde ontem</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Exames</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.examesTotais}</div>
            <p className="text-xs text-muted-foreground">Este mês</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pacientes Ativos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pacientesAtivos}</div>
            <p className="text-xs text-muted-foreground">+12% desde o mês passado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Ocupação</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.taxaOcupacao}%</div>
            <p className="text-xs text-muted-foreground">Capacidade atual</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Próximos exames */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Próximos Exames
            </CardTitle>
            <CardDescription>Exames agendados para hoje</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.proximosExames.map((exame) => (
                <div key={exame.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <p className="font-medium">{exame.paciente}</p>
                    <p className="text-sm text-muted-foreground">{exame.tipo}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="font-medium">{exame.horario}</p>
                    <Badge variant={exame.status === "confirmado" ? "default" : "secondary"}>{exame.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-4 bg-transparent">
              Ver todos os exames
            </Button>
          </CardContent>
        </Card>

        {/* Ações rápidas */}
        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
            <CardDescription>Acesso rápido às principais funcionalidades</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              <Button className="justify-start" asChild>
                <a href="/clinica/calendario">
                  <Calendar className="mr-2 h-4 w-4" />
                  Ver Calendário
                </a>
              </Button>
              <Button variant="outline" className="justify-start bg-transparent" asChild>
                <a href="/clinica/disponibilidade">
                  <Clock className="mr-2 h-4 w-4" />
                  Gerenciar Horários
                </a>
              </Button>
              <Button variant="outline" className="justify-start bg-transparent" asChild>
                <a href="/clinica/exames">
                  <FileText className="mr-2 h-4 w-4" />
                  Agendar Exame
                </a>
              </Button>
              <Button variant="outline" className="justify-start bg-transparent" asChild>
                <a href="/clinica/pacientes">
                  <Users className="mr-2 h-4 w-4" />
                  Ver Pacientes
                </a>
              </Button>
            </div>

            {stats.examesPendentes > 0 && (
              <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    {stats.examesPendentes} exames pendentes de confirmação
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
  return (
    <>
      {/* conteúdo do dashboard */}
      {/* tudo que estava entre <ClinicaLayout> e </ClinicaLayout> permanece aqui */}
    </>
  )
}
