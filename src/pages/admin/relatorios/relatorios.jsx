"use client"

import { useEffect, useMemo, useState } from "react"
import { adminService } from "@/services/adminService"
import api from "@/services/api"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, Clock, Filter, RefreshCw, BarChart3, TrendingUp } from "lucide-react"

const PERIODS = [
  { value: "7", label: "Últimos 7 dias" },
  { value: "30", label: "Últimos 30 dias" },
  { value: "90", label: "Últimos 90 dias" },
]

function startOfDay(d) {
  const dt = new Date(d)
  dt.setHours(0, 0, 0, 0)
  return dt
}
function endOfDay(d) {
  const dt = new Date(d)
  dt.setHours(23, 59, 59, 999)
  return dt
}
function formatYmd(d) {
  const dt = new Date(d)
  const y = dt.getFullYear()
  const m = String(dt.getMonth() + 1).padStart(2, "0")
  const day = String(dt.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export default function RelatoriosAdmin() {
  const [period, setPeriod] = useState("30")
  const [type, setType] = useState("all")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [data, setData] = useState([])

  const metrics = useMemo(() => {
    if (!data.length) {
      return {
        total: 0,
        aprovadas: 0,
        rejeitadas: 0,
        pendentes: 0,
        aprovMed: 0,
        aprovCli: 0,
        rejMed: 0,
        rejCli: 0,
        byDay: [],
        maxDay: 0,
      }
    }

    const total = data.length
    const aprovadas = data.filter((s) => s.status === "aprovada").length
    const rejeitadas = data.filter((s) => s.status === "rejeitada").length
    const pendentes = data.filter((s) => s.status === "pendente").length

    const aprovMed = data.filter((s) => s.status === "aprovada" && s.tipo === "medico").length
    const aprovCli = data.filter((s) => s.status === "aprovada" && s.tipo === "clinica").length
    const rejMed = data.filter((s) => s.status === "rejeitada" && s.tipo === "medico").length
    const rejCli = data.filter((s) => s.status === "rejeitada" && s.tipo === "clinica").length

    const dayMap = {}
    data.forEach((s) => {
      const ymd = formatYmd(s.createdAt)
      if (!dayMap[ymd]) {
        dayMap[ymd] = { ymd, aprov: 0, rej: 0 }
      }
      if (s.status === "aprovada") dayMap[ymd].aprov++
      if (s.status === "rejeitada") dayMap[ymd].rej++
    })

    const byDay = Object.values(dayMap).sort((a, b) => a.ymd.localeCompare(b.ymd))
    const maxDay = Math.max(...byDay.map((d) => Math.max(d.aprov, d.rej)), 1)

    return {
      total,
      aprovadas,
      rejeitadas,
      pendentes,
      aprovMed,
      aprovCli,
      rejMed,
      rejCli,
      byDay,
      maxDay,
    }
  }, [data])

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const now = new Date()
        const daysAgo = parseInt(period, 10)
        const startDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000)

        const params = {
          startDate: startOfDay(startDate).toISOString(),
          endDate: endOfDay(now).toISOString(),
        }
        if (type !== "all") {
          params.tipo = type
        }

        const response = await api.get("/admin/solicitacoes", { params })
        setData(response.data || [])
      } catch (err) {
        console.error("Erro ao buscar dados:", err)
        setError(err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [period, type])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-950 dark:via-slate-900 dark:to-gray-950 p-6 space-y-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 p-8 text-white shadow-2xl">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <BarChart3 className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Relatórios Administrativos</h1>
              <p className="text-blue-100 mt-1">Análise detalhada de solicitações e métricas do sistema</p>
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-5 w-5 text-green-300" />
                <span className="text-sm font-medium text-blue-100">Total</span>
              </div>
              <div className="text-2xl font-bold">{metrics.total}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5 text-green-300" />
                <span className="text-sm font-medium text-blue-100">Aprovadas</span>
              </div>
              <div className="text-2xl font-bold text-green-300">{metrics.aprovadas}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="h-5 w-5 text-red-300" />
                <span className="text-sm font-medium text-blue-100">Rejeitadas</span>
              </div>
              <div className="text-2xl font-bold text-red-300">{metrics.rejeitadas}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-5 w-5 text-amber-300" />
                <span className="text-sm font-medium text-blue-100">Pendentes</span>
              </div>
              <div className="text-2xl font-bold text-amber-300">{metrics.pendentes}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Card */}
      <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-200/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Filter className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-slate-800">Filtros Avançados</CardTitle>
              <CardDescription className="text-slate-600">Configure o período e tipo de análise</CardDescription>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-4 mt-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700">Período</label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-48 bg-white border-slate-200 focus:border-blue-500 focus:ring-blue-500/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIODS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700">Tipo</label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="w-48 bg-white border-slate-200 focus:border-blue-500 focus:ring-blue-500/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="medico">Médico</SelectItem>
                  <SelectItem value="clinica">Clínica</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700">Ações</label>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={loading} 
                onClick={() => setPeriod(period)}
                className="bg-white border-slate-200 hover:bg-slate-50 hover:border-blue-300 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700 dark:hover:border-blue-400 transition-all duration-200"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Metrics Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-slate-50 hover:shadow-2xl transition-all duration-300 group">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600 group-hover:text-slate-800 transition-colors">
              Total no Período
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-800 mb-2">{metrics.total}</div>
            <p className="text-sm text-slate-500">
              {PERIODS.find((p) => p.value === period)?.label}
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl bg-gradient-to-br from-green-50 to-emerald-50 hover:shadow-2xl transition-all duration-300 group">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-green-700 group-hover:text-green-800 transition-colors">
              <CheckCircle className="h-4 w-4" />
              Aprovadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600 mb-2">{metrics.aprovadas}</div>
            <p className="text-sm text-green-600/70">
              {metrics.aprovMed} médicos • {metrics.aprovCli} clínicas
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl bg-gradient-to-br from-red-50 to-rose-50 hover:shadow-2xl transition-all duration-300 group">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-red-700 group-hover:text-red-800 transition-colors">
              <XCircle className="h-4 w-4" />
              Rejeitadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600 mb-2">{metrics.rejeitadas}</div>
            <p className="text-sm text-red-600/70">
              {metrics.rejMed} médicos • {metrics.rejCli} clínicas
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl bg-gradient-to-br from-amber-50 to-yellow-50 hover:shadow-2xl transition-all duration-300 group">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-amber-700 group-hover:text-amber-800 transition-colors">
              <Clock className="h-4 w-4" />
              Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600 mb-2">{metrics.pendentes}</div>
            <p className="text-sm text-amber-600/70">Aguardando revisão</p>
          </CardContent>
        </Card>
      </div>

      {/* Daily Series Chart */}
      <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-200/50">
          <CardTitle className="text-slate-800">Série diária (Aprovadas x Rejeitadas)</CardTitle>
          <CardDescription className="text-slate-600">
            Distribuição por dia no período filtrado
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          {metrics.byDay.map((d) => {
            const aprovPct = Math.round((d.aprov / metrics.maxDay) * 100)
            const rejPct = Math.round((d.rej / metrics.maxDay) * 100)
            return (
              <div key={d.ymd} className="group">
                <div className="flex items-center justify-between text-sm text-slate-600 mb-2">
                  <span className="font-medium">{d.ymd}</span>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      Aprovadas: {d.aprov}
                    </Badge>
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                      Rejeitadas: {d.rej}
                    </Badge>
                  </div>
                </div>
                <div className="h-4 w-full rounded-lg bg-slate-100 overflow-hidden shadow-inner">
                  <div
                    className="h-4 bg-gradient-to-r from-green-400 to-green-500 inline-block transition-all duration-500 group-hover:from-green-500 group-hover:to-green-600"
                    style={{ width: `${aprovPct}%` }}
                    title={`Aprovadas: ${d.aprov}`}
                  />
                  <div
                    className="h-4 bg-gradient-to-r from-red-400 to-red-500 inline-block transition-all duration-500 group-hover:from-red-500 group-hover:to-red-600"
                    style={{ width: `${rejPct}%` }}
                    title={`Rejeitadas: ${d.rej}`}
                  />
                </div>
              </div>
            )
          })}
          {!metrics.byDay.length && (
            <div className="text-center py-8">
              <div className="text-slate-400 text-lg mb-2">📊</div>
              <div className="text-sm text-slate-500">Sem dados no período escolhido.</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Loading State */}
      {loading && (
        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
          <CardContent className="p-8">
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-gradient-to-r from-slate-200 to-slate-300 rounded-lg w-1/3" />
              <div className="h-32 bg-gradient-to-r from-slate-200 to-slate-300 rounded-lg" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Card className="border-0 shadow-xl bg-gradient-to-br from-red-50 to-rose-50">
          <CardContent className="p-8 text-center">
            <div className="text-red-400 text-4xl mb-4">⚠️</div>
            <p className="text-red-600 font-medium">Erro ao carregar dados</p>
            <p className="text-red-500 text-sm mt-2">{String(error)}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}