"use client"

import { useEffect, useMemo, useState } from "react"
import { adminService } from "@/services/adminService"
import api from "@/services/api"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, Clock, Filter, RefreshCw } from "lucide-react"

const PERIODS = [
  { value: "7", label: "Últimos 7 dias" },
  { value: "30", label: "Últimos 30 dias" },
  { value: "90", label: "Últimos 90 dias" },
]

function startOfDay(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}
function endOfDay(d) {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}
function formatYmd(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export default function RelatoriosAdmin() {
  const [period, setPeriod] = useState("7")
  const [tipo, setTipo] = useState("all") // all | medico | clinica
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [items, setItems] = useState([])

  const { startISO, endISO, daysList, startDate, endDate } = useMemo(() => {
    const now = new Date()
    const endD = endOfDay(now)
    const startD = startOfDay(new Date(now.getTime() - (parseInt(period) - 1) * 24 * 60 * 60 * 1000))
    const days = []
    let cur = new Date(startD)
    while (cur <= endD) {
      days.push(formatYmd(cur))
      cur.setDate(cur.getDate() + 1)
    }
    return {
      startISO: startD.toISOString(),
      endISO: endD.toISOString(),
      startDate: startD,
      endDate: endD,
      daysList: days,
    }
  }, [period])

  useEffect(() => {
    let mounted = true
    async function fetchAll() {
      setLoading(true)
      setError(null)
      try {
        const baseParams = {
          ordering: "-created_at",
          limit: 100,
          created_at__gte: startISO,
          created_at__lte: endISO,
        }
        // 1) primeira página
        const first = await adminService.getSolicitacoes(baseParams)
        const data = Array.isArray(first?.results) ? first.results : Array.isArray(first) ? first : []
        let all = [...data]

        // 2) seguir paginação se houver "next"
        let next = first?.next
        // protege contra loops infinitos
        let safety = 0
        while (next && safety < 20) {
          const res = await api.get(next)
          const arr = Array.isArray(res.data?.results) ? res.data.results : Array.isArray(res.data) ? res.data : []
          all = all.concat(arr)
          next = res.data?.next
          safety++
        }

        // 3) normalização mínima + filtro por tipo no client (caso API não filtre)
        const normalized = all
          .map((it) => ({
            id: it.id,
            status: String(it.status || "").toLowerCase(), // pending | approved | rejected
            tipo: String(it.tipo || it.type || "").toLowerCase(), // medico | clinica
            createdAt: it.created_at || it.data_envio || it.dataEnvio || null,
          }))
          .filter((it) => {
            if (tipo === "all") return true
            return it.tipo === tipo
          })
          .filter((it) => {
            // segurança extra para range no cliente
            const d = new Date(it.createdAt)
            return it.createdAt && !isNaN(d) && d >= startDate && d <= endDate
          })

        if (mounted) {
          setItems(normalized)
        }
      } catch (e) {
        // Sanitiza o erro para não exibir HTML bruto
        if (mounted) {
          const status = e?.response?.status
          const detail = typeof e?.response?.data === "string" ? null : e?.response?.data?.detail
          const msg = detail || e?.message || "Falha ao carregar relatórios"
          setError(status ? `Erro ${status}: ${msg}` : msg)
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetchAll()
    return () => {
      mounted = false
    }
  }, [startISO, endISO, tipo, startDate, endDate])

  const metrics = useMemo(() => {
    const total = items.length
    const aprovadas = items.filter((i) => i.status === "approved").length
    const rejeitadas = items.filter((i) => i.status === "rejected").length
    const pendentes = items.filter((i) => i.status === "pending").length

    const aprovMed = items.filter((i) => i.status === "approved" && i.tipo === "medico").length
    const aprovCli = items.filter((i) => i.status === "approved" && i.tipo === "clinica").length
    const rejMed = items.filter((i) => i.status === "rejected" && i.tipo === "medico").length
    const rejCli = items.filter((i) => i.status === "rejected" && i.tipo === "clinica").length

    // série diária
    const byDay = daysList.map((ymd) => {
      const aprov = items.filter((i) => i.status === "approved" && formatYmd(new Date(i.createdAt)) === ymd).length
      const rej = items.filter((i) => i.status === "rejected" && formatYmd(new Date(i.createdAt)) === ymd).length
      const totalDay = aprov + rej
      return { ymd, aprov, rej, total: totalDay }
    })
    const maxDay = Math.max(1, ...byDay.map((d) => d.total))

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
  }, [items, daysList])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>
        <p className="text-muted-foreground">Acompanhe métricas de solicitações por período</p>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Filtros</CardTitle>
            <CardDescription>Selecione o período e o tipo de solicitação</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Período" />
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

            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="medico">Médico</SelectItem>
                <SelectItem value="clinica">Clínica</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" disabled={loading} onClick={() => setPeriod(period)}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total no Período</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.total}</div>
            <p className="text-xs text-muted-foreground">
              {PERIODS.find((p) => p.value === period)?.label}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Aprovadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{metrics.aprovadas}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.aprovMed} médicos • {metrics.aprovCli} clínicas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              Rejeitadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{metrics.rejeitadas}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.rejMed} médicos • {metrics.rejCli} clínicas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{metrics.pendentes}</div>
            <p className="text-xs text-muted-foreground">Aguardando revisão</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Série diária (Aprovadas x Rejeitadas)</CardTitle>
          <CardDescription>
            Distribuição por dia no período filtrado
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {metrics.byDay.map((d) => {
            const aprovPct = Math.round((d.aprov / metrics.maxDay) * 100)
            const rejPct = Math.round((d.rej / metrics.maxDay) * 100)
            return (
              <div key={d.ymd}>
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>{d.ymd}</span>
                  <span>
                    <Badge variant="outline" className="mr-1">Aprovadas: {d.aprov}</Badge>
                    <Badge variant="outline">Rejeitadas: {d.rej}</Badge>
                  </span>
                </div>
                <div className="h-3 w-full rounded bg-muted overflow-hidden">
                  <div
                    className="h-3 bg-green-500/80 inline-block"
                    style={{ width: `${aprovPct}%` }}
                    title={`Aprovadas: ${d.aprov}`}
                  />
                  <div
                    className="h-3 bg-red-500/80 inline-block"
                    style={{ width: `${rejPct}%` }}
                    title={`Rejeitadas: ${d.rej}`}
                  />
                </div>
              </div>
            )
          })}
          {!metrics.byDay.length && (
            <div className="text-sm text-muted-foreground">Sem dados no período escolhido.</div>
          )}
        </CardContent>
      </Card>

      {loading && (
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-6 bg-muted rounded w-1/3" />
              <div className="h-24 bg-muted rounded" />
            </div>
          </CardContent>
        </Card>
      )}
      {error && (
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-red-600">Erro ao carregar: {String(error)}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}