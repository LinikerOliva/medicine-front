import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, ClipboardList, FileText, Users, Activity, AlertCircle, Clock } from "lucide-react"
import { useApi } from "@/hooks/useApi"
import { pacienteService } from "@/services/pacienteService"

export default function DashboardPaciente() {
  const { data, loading, error } = useApi(pacienteService.getDashboard)
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

  if (loading) {
    return <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Consultas neste mês</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.consultasMes}</div>
            <p className="text-xs text-muted-foreground">Resumo do mês atual</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Próximas Consultas</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.consultasProximas}</div>
            <p className="text-xs text-muted-foreground">Confirmadas/Agendadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Exames Pendentes</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.examesPendentes}</div>
            <p className="text-xs text-muted-foreground">Solicitados/Agendados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receitas Ativas</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.receitasAtivas}</div>
            <p className="text-xs text-muted-foreground">Dentro da validade</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" /> Próximas Consultas
            </CardTitle>
            <CardDescription>Suas próximas consultas</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.proximasConsultas.length === 0 && <p className="text-muted-foreground">Nenhuma consulta agendada.</p>}
            <div className="space-y-3">
              {stats.proximasConsultas.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <p className="font-medium">{c.medico_nome}</p>
                    <p className="text-sm text-muted-foreground">
                      {c.especialidade ? `${c.especialidade} • ` : ""}{new Date(c.data_hora).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant="secondary">{c.status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" /> Próximos Exames
            </CardTitle>
            <CardDescription>Exames agendados</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.proximosExames.length === 0 && <p className="text-muted-foreground">Nenhum exame agendado.</p>}
            <div className="space-y-3">
              {stats.proximosExames.map((e) => (
                <div key={e.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <p className="font-medium">{e.tipo}</p>
                    <p className="text-sm text-muted-foreground">
                      {e.medico_solicitante ? `${e.medico_solicitante} • ` : ""}{e.data_agendamento ? new Date(e.data_agendamento).toLocaleString() : "—"}
                    </p>
                  </div>
                  <Badge variant="secondary">{e.status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}