import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card"
import { Badge } from "../../../components/ui/badge"
import { Button } from "../../../components/ui/button"
import { Calendar, Users, FileText, Activity } from "lucide-react"
import { useApi } from "../../../hooks/useApi"
import { medicoService } from "../../../services/medicoService"
import { Link } from "react-router-dom"

export default function MedicoDashboard() {
  const { data: dashboardData, loading } = useApi(() => medicoService.getDashboard())

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                <div className="h-4 w-4 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-muted animate-pulse rounded mb-2" />
                <div className="h-3 w-24 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Bem-vindo de volta! Aqui está um resumo das suas atividades.</p>
        </div>
        <Button>
          <Calendar className="mr-2 h-4 w-4" />
          Nova Consulta
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Consultas Hoje</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.consultas_hoje}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+{stats.variacao_consultas}</span> desde ontem
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pacientes Ativos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pacientes_ativos}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+{stats.novos_pacientes_semana}</span> esta semana
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prontuários</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.prontuarios}</div>
            <p className="text-xs text-muted-foreground">Total de registros</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Exames Pendentes</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.exames_pendentes}</div>
            <p className="text-xs text-muted-foreground">Aguardando análise</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Próximas Consultas */}
        <Card>
          <CardHeader>
            <CardTitle>Próximas Consultas</CardTitle>
            <CardDescription>Suas consultas agendadas para hoje</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.proximas_consultas?.length > 0 ? (
                stats.proximas_consultas.map((consulta, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="space-y-1">
                      <p className="font-medium">{consulta.paciente_nome}</p>
                      <p className="text-sm text-muted-foreground">
                        {consulta.data_hora} - {consulta.tipo}
                      </p>
                    </div>
                    <Badge variant={consulta.status === "Confirmada" ? "default" : "secondary"}>
                      {consulta.status}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <Calendar className="mx-auto h-12 w-12 mb-2 opacity-50" />
                  <p>Nenhuma consulta agendada para hoje</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pacientes Recentes */}
        <Card>
          <CardHeader>
            <CardTitle>Pacientes Recentes</CardTitle>
            <CardDescription>Últimos pacientes atendidos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.pacientes_recentes?.length > 0 ? (
                stats.pacientes_recentes.map((paciente, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="space-y-1">
                      <p className="font-medium">{paciente.nome}</p>
                      <p className="text-sm text-muted-foreground">
                        Última consulta: há {paciente.dias_ultima_consulta} dias
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      Ver Perfil
                    </Button>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <Users className="mx-auto h-12 w-12 mb-2 opacity-50" />
                  <p>Nenhum paciente recente</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
