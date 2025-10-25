"use client"

import { useEffect, useMemo, useState } from "react"
import { adminService } from "@/services/adminService"
import api from "@/services/api"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, Clock, Filter, RefreshCw, BarChart3, TrendingUp, FileText } from "lucide-react"

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Header Corporativo */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-slate-100 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 shadow-sm">
              <FileText className="h-8 w-8 text-slate-600 dark:text-slate-200" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Relatórios Administrativos</h1>
              <p className="text-lg text-slate-600 dark:text-slate-300 mt-2 font-medium">Análise completa de solicitações e métricas operacionais</p>
            </div>
          </div>
          
          {/* Quick Stats Cards Corporativos */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="border border-slate-200 dark:border-slate-600 shadow-lg bg-white dark:bg-slate-800 hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-base font-bold text-slate-600 dark:text-slate-200 mb-2">Total</p>
                    <p className="text-3xl font-bold text-slate-900 dark:text-white">{metrics.total}</p>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">no período</p>
                  </div>
                  <div className="p-3 bg-slate-100 dark:bg-slate-700 rounded-xl">
                    <FileText className="h-6 w-6 text-slate-600 dark:text-slate-200" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-green-200 dark:border-green-700 shadow-lg bg-green-50 dark:bg-green-900/20 hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-base font-bold text-green-700 dark:text-green-300 mb-2">Aprovadas</p>
                    <p className="text-3xl font-bold text-green-800 dark:text-green-200">{metrics.aprovadas}</p>
                    <p className="text-sm font-medium text-green-600 dark:text-green-400 mt-1">{Math.round((metrics.aprovadas / metrics.total) * 100) || 0}% do total</p>
                  </div>
                  <div className="p-3 bg-green-100 dark:bg-green-800 rounded-xl">
                    <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-300" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-red-200 dark:border-red-700 shadow-lg bg-red-50 dark:bg-red-900/20 hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-base font-bold text-red-700 dark:text-red-300 mb-2">Rejeitadas</p>
                    <p className="text-3xl font-bold text-red-800 dark:text-red-200">{metrics.rejeitadas}</p>
                    <p className="text-sm font-medium text-red-600 dark:text-red-400 mt-1">{Math.round((metrics.rejeitadas / metrics.total) * 100) || 0}% do total</p>
                  </div>
                  <div className="p-3 bg-red-100 dark:bg-red-800 rounded-xl">
                    <XCircle className="h-6 w-6 text-red-600 dark:text-red-300" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-amber-200 dark:border-amber-700 shadow-lg bg-amber-50 dark:bg-amber-900/20 hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-base font-bold text-amber-700 dark:text-amber-300 mb-2">Pendentes</p>
                    <p className="text-3xl font-bold text-amber-800 dark:text-amber-200">{metrics.pendentes}</p>
                    <p className="text-sm font-medium text-amber-600 dark:text-amber-400 mt-1">{Math.round((metrics.pendentes / metrics.total) * 100) || 0}% do total</p>
                  </div>
                  <div className="p-3 bg-amber-100 dark:bg-amber-800 rounded-xl">
                    <Clock className="h-6 w-6 text-amber-600 dark:text-amber-300" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

      {/* Filters Card Corporativo */}
      <Card className="border border-slate-200 dark:border-slate-600 shadow-lg bg-white dark:bg-slate-800">
        <CardHeader className="bg-slate-50 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-slate-100 dark:bg-slate-600 rounded-lg border border-slate-200 dark:border-slate-500 shadow-sm">
              <Filter className="h-5 w-5 text-slate-600 dark:text-slate-300" />
            </div>
            <div>
              <CardTitle className="text-slate-900 dark:text-white text-xl font-bold">Filtros de Análise</CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-300 text-base font-medium mt-1">Configure o período e tipo de relatório</CardDescription>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-6 mt-6">
            <div className="flex flex-col gap-3">
              <label className="text-base font-bold text-slate-700 dark:text-slate-200">Período de Análise</label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-52 h-12 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-500 focus:border-slate-400 dark:focus:border-slate-400 focus:ring-slate-400/20 shadow-sm text-base text-slate-900 dark:text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIODS.map((p) => (
                    <SelectItem key={p.value} value={p.value} className="text-base">
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-3">
              <label className="text-base font-bold text-slate-700 dark:text-slate-200">Tipo de Solicitação</label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="w-52 h-12 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-500 focus:border-slate-400 dark:focus:border-slate-400 focus:ring-slate-400/20 shadow-sm text-base text-slate-900 dark:text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-base">Todos os Tipos</SelectItem>
                  <SelectItem value="medico" className="text-base">Médicos</SelectItem>
                  <SelectItem value="clinica" className="text-base">Clínicas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-3">
              <label className="text-base font-bold text-slate-700 dark:text-slate-200">Ações</label>
              <Button 
                variant="outline" 
                size="lg" 
                disabled={loading} 
                onClick={() => setPeriod(period)}
                className="h-12 px-6 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-600 hover:border-slate-400 dark:hover:border-slate-400 text-slate-700 dark:text-slate-200 font-semibold shadow-sm transition-all duration-200 text-base"
              >
                <RefreshCw className={`h-5 w-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Atualizar Dados
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Metrics Cards Corporativos */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-slate-200 dark:border-slate-600 shadow-lg bg-white dark:bg-slate-800 hover:shadow-xl transition-all duration-300 group">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-bold text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
              Total no Período
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-slate-900 dark:text-white mb-3">{metrics.total}</div>
            <p className="text-base font-medium text-slate-600 dark:text-slate-300">
              {PERIODS.find((p) => p.value === period)?.label}
            </p>
          </CardContent>
        </Card>

        <Card className="border border-green-200 dark:border-green-700 shadow-lg bg-gradient-to-br from-white to-green-50 dark:from-slate-800 dark:to-green-900/50 hover:shadow-xl transition-all duration-300 group">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-green-700 dark:text-green-200 group-hover:text-green-800 dark:group-hover:text-green-100 transition-colors">
              <div className="p-1 bg-green-100 dark:bg-green-800 rounded">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-300" />
              </div>
              Solicitações Aprovadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-green-800 dark:text-green-100 mb-3">{metrics.aprovadas}</div>
            <p className="text-base font-medium text-green-600 dark:text-green-300">
              {metrics.aprovMed} médicos • {metrics.aprovCli} clínicas
            </p>
          </CardContent>
        </Card>

        <Card className="border border-red-200 dark:border-red-700 shadow-lg bg-gradient-to-br from-white to-red-50 dark:from-slate-800 dark:to-red-900/50 hover:shadow-xl transition-all duration-300 group">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-red-700 dark:text-red-200 group-hover:text-red-800 dark:group-hover:text-red-100 transition-colors">
              <div className="p-1 bg-red-100 dark:bg-red-800 rounded">
                <XCircle className="h-5 w-5 text-red-600 dark:text-red-300" />
              </div>
              Solicitações Rejeitadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-red-800 dark:text-red-100 mb-3">{metrics.rejeitadas}</div>
            <p className="text-base font-medium text-red-600 dark:text-red-300">
              {metrics.rejMed} médicos • {metrics.rejCli} clínicas
            </p>
          </CardContent>
        </Card>

        <Card className="border border-amber-200 dark:border-amber-700 shadow-lg bg-gradient-to-br from-white to-amber-50 dark:from-slate-800 dark:to-amber-900/50 hover:shadow-xl transition-all duration-300 group">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-amber-700 dark:text-amber-200 group-hover:text-amber-800 dark:group-hover:text-amber-100 transition-colors">
              <div className="p-1 bg-amber-100 dark:bg-amber-800 rounded">
                <Clock className="h-5 w-5 text-amber-600 dark:text-amber-300" />
              </div>
              Aguardando Análise
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-amber-800 dark:text-amber-100 mb-3">{metrics.pendentes}</div>
            <p className="text-base font-medium text-amber-600 dark:text-amber-300">Requer atenção administrativa</p>
          </CardContent>
        </Card>
      </div>

      {/* Daily Series Chart Corporativo */}
      <Card className="border border-slate-200 dark:border-slate-600 shadow-lg bg-white dark:bg-slate-800">
        <CardHeader className="bg-slate-50 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-slate-100 dark:bg-slate-600 rounded-lg border border-slate-200 dark:border-slate-500 shadow-sm">
              <BarChart3 className="h-5 w-5 text-slate-600 dark:text-slate-300" />
            </div>
            <div>
              <CardTitle className="text-slate-900 dark:text-white text-xl font-bold">Análise Temporal</CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-300 text-base font-medium mt-1">
                Distribuição diária de aprovações e rejeições no período selecionado
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-8 p-8">
          {metrics.byDay.map((d) => {
            const aprovPct = Math.round((d.aprov / metrics.maxDay) * 100)
            const rejPct = Math.round((d.rej / metrics.maxDay) * 100)
            return (
              <div key={d.ymd} className="group">
                <div className="flex items-center justify-between text-base mb-4">
                  <span className="font-bold text-slate-900 dark:text-white text-lg">{d.ymd}</span>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-green-400 rounded-full"></div>
                      <span className="text-green-600 dark:text-green-300 font-bold text-base">Aprovadas: {d.aprov}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-red-400 rounded-full"></div>
                      <span className="text-red-600 dark:text-red-300 font-bold text-base">Rejeitadas: {d.rej}</span>
                    </div>
                  </div>
                </div>
                <div className="h-8 w-full rounded-lg bg-slate-200 dark:bg-slate-700 overflow-hidden border border-slate-300 dark:border-slate-600 shadow-inner">
                  <div
                    className="h-8 bg-green-500 inline-block transition-all duration-500 group-hover:bg-green-400"
                    style={{ width: `${aprovPct}%` }}
                    title={`Aprovadas: ${d.aprov}`}
                  />
                  <div
                    className="h-8 bg-red-500 inline-block transition-all duration-500 group-hover:bg-red-400"
                    style={{ width: `${rejPct}%` }}
                    title={`Rejeitadas: ${d.rej}`}
                  />
                </div>
              </div>
            )
          })}
          {!metrics.byDay.length && (
            <div className="text-center py-16">
              <div className="text-slate-400 text-6xl mb-6">📊</div>
              <div className="text-xl font-bold text-slate-600 dark:text-slate-300 mb-3">Nenhum dado encontrado</div>
              <div className="text-base font-medium text-slate-500 dark:text-slate-400">Não há registros para o período selecionado.</div>
            </div>
          )}
        </CardContent>
      </Card>

        {/* Loading State */}
         {loading && (
           <Card className="border border-slate-200 dark:border-slate-600 shadow-lg bg-white dark:bg-slate-800">
             <CardContent className="p-12">
               <div className="animate-pulse space-y-8">
                 <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-lg w-1/3" />
                 <div className="h-40 bg-slate-200 dark:bg-slate-700 rounded-lg" />
               </div>
             </CardContent>
           </Card>
         )}

         {/* Error State */}
         {error && (
           <Card className="border border-red-200 dark:border-red-700 shadow-lg bg-red-50 dark:bg-red-900/20">
             <CardContent className="p-12 text-center">
               <div className="text-red-400 text-6xl mb-6">⚠️</div>
               <p className="text-red-700 dark:text-red-300 font-bold text-xl mb-3">Erro ao carregar dados</p>
               <p className="text-red-600 dark:text-red-400 text-base font-medium">{String(error)}</p>
             </CardContent>
           </Card>
         )}
      </div>
    </div>
  )
}