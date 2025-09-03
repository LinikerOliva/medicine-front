import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select"
import { clinicaService } from "../../../services/clinicaService"
import { AlertCircle, FileText, Users } from "lucide-react"

export default function RelatoriosClinica() {
  const breadcrumbs = [{ label: "Dashboard", href: "/clinica/dashboard" }, { label: "Relatórios" }]
  const [periodo, setPeriodo] = useState("30d")
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  const fetchRelatorios = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await clinicaService.getRelatorios(periodo)
      setData(data || {})
    } catch (e) {
      setError("Não foi possível carregar os relatórios.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchRelatorios() }, [periodo])

  const stats = data || {
    examesTotais: 120,
    pacientesAtendidos: 80,
    taxaCancelamento: 5,
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Relatórios</CardTitle>
            <CardDescription>Métricas da clínica</CardDescription>
          </div>
          <div className="w-40">
            <Select value={periodo} onValueChange={setPeriodo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Últimos 7 dias</SelectItem>
                <SelectItem value="30d">Últimos 30 dias</SelectItem>
                <SelectItem value="90d">Últimos 90 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Carregando...</p>
          ) : error ? (
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2"><FileText className="h-4 w-4" /> Exames</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.examesTotais}</div>
                  <p className="text-xs text-muted-foreground">no período</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2"><Users className="h-4 w-4" /> Pacientes Atendidos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.pacientesAtendidos}</div>
                  <p className="text-xs text-muted-foreground">no período</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Taxa de Cancelamento</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.taxaCancelamento}%</div>
                  <p className="text-xs text-muted-foreground">no período</p>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}