"use client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, Clock, Building2, Stethoscope, TrendingUp, AlertCircle, CheckCircle, XCircle, ChevronRight } from "lucide-react"
import { Link } from "react-router-dom"
import { useEffect, useState } from "react"
import { adminService } from "@/services/adminService"

export default function AdminDashboard() {
  // Estados com dados reais
  const [stats, setStats] = useState({
    totalUsuarios: 0,
    medicosAtivos: 0,
    clinicasAtivas: 0,
    solicitacoesPendentes: 0,
    solicitacoesHoje: 0,
    // Semana
    aprovacoesSemana: 0,
    rejeicoesSemana: 0,
    aprovadosMedicosSemana: 0,
    aprovadasClinicasSemana: 0,
    rejeitadosMedicosSemana: 0,
    rejeitadasClinicasSemana: 0,
  })
  const [recentSolicitations, setRecentSolicitations] = useState([])
  const [loading, setLoading] = useState(true)

  const getWeekStart = () => {
    const now = new Date()
    const day = now.getDay() // 0 Dom, 1 Seg, ...
    const diff = now.getDate() - day + (day === 0 ? -6 : 1) // Segunda-feira
    const start = new Date(now)
    start.setDate(diff)
    start.setHours(0, 0, 0, 0)
    return start
  }
  useEffect(() => {
    let mounted = true

    const fetchData = async () => {
      const weekStart = getWeekStart()

      try {
        // Dashboard (tenta preencher direto se a API já entrega)
        const dash = await adminService.getDashboard()
        if (mounted && dash) {
          setStats((prev) => ({
            ...prev,
            totalUsuarios: dash.total_usuarios ?? dash.totalUsuarios ?? prev.totalUsuarios,
            medicosAtivos: dash.medicos_ativos ?? dash.medicosAtivos ?? prev.medicosAtivos,
            clinicasAtivas: dash.clinicas_ativas ?? dash.clinicasAtivas ?? prev.clinicasAtivas,
            solicitacoesPendentes:
              dash.solicitacoes_pendentes ?? dash.solicitacoesPendentes ?? prev.solicitacoesPendentes,
            // Semana (se o backend já enviar, usamos)
            aprovacoesSemana: dash.aprovacoes_semana ?? dash.aprovacoesSemana ?? prev.aprovacoesSemana,
            rejeicoesSemana: dash.rejeicoes_semana ?? dash.rejeicoesSemana ?? prev.rejeicoesSemana,
            aprovadosMedicosSemana:
              dash.aprovados_medicos_semana ?? dash.aprovadosMedicosSemana ?? prev.aprovadosMedicosSemana,
            aprovadasClinicasSemana:
              dash.aprovadas_clinicas_semana ?? dash.aprovadasClinicasSemana ?? prev.aprovadasClinicasSemana,
            rejeitadosMedicosSemana:
              dash.rejeitados_medicos_semana ?? dash.rejeitadosMedicosSemana ?? prev.rejeitadosMedicosSemana,
            rejeitadasClinicasSemana:
              dash.rejeitadas_clinicas_semana ?? dash.rejeitadasClinicasSemana ?? prev.rejeitadasClinicasSemana,
          }))
        }
      } catch (e) {
        console.warn("[AdminDashboard] getDashboard falhou:", e?.response?.status)
      }

      try {
        // Últimas solicitações pendentes (já existia)
        const list = await adminService.getSolicitacoes({ status: "pending", ordering: "-created_at", limit: 5 })
        const items = Array.isArray(list?.results) ? list.results : Array.isArray(list) ? list : []
        const normalized = items.map((it) => ({
          ...it,
          nome: it.nome ?? it.name ?? it.title ?? "",
          tipo: (it.tipo ?? it.type ?? "").toString().toLowerCase(),
          dataEnvio: it.dataEnvio ?? it.created_at ?? it.data_envio ?? null,
        }))

        if (mounted) {
          setRecentSolicitations(normalized)
          const todayStr = new Date().toDateString()
          const todayCount = normalized.filter((it) => {
            const d = new Date(it.dataEnvio)
            return !isNaN(d) && d.toDateString() === todayStr
          }).length
          setStats((prev) => ({ ...prev, solicitacoesHoje: todayCount }))
        }
      } catch (e) {
        console.warn("[AdminDashboard] getSolicitacoes falhou (pendentes recentes):", e?.response?.status)
      }

      try {
        // Fallback: calcular números da semana a partir das solicitações da semana (approved/rejected)
        const weekStartIso = getWeekStart().toISOString()

        const fetchByStatus = async (status) => {
          const resp = await adminService.getSolicitacoes({
            status,
            ordering: "-created_at",
            limit: 100,
            created_at__gte: weekStartIso, // se o backend não suportar, filtramos no client
          })
          const arr = Array.isArray(resp?.results) ? resp.results : Array.isArray(resp) ? resp : []
          return arr
            .map((it) => ({
              tipo: (it.tipo ?? it.type ?? "").toString().toLowerCase(),
              createdAt: it.created_at ?? it.data_envio ?? it.dataEnvio ?? null,
            }))
            .filter((it) => {
              const d = new Date(it.createdAt)
              return it.createdAt && !isNaN(d) && d >= weekStart
            })
        }

        const [aprovadas, rejeitadas] = await Promise.all([fetchByStatus("approved"), fetchByStatus("rejected")])

        const aprovMed = aprovadas.filter((i) => i.tipo === "medico").length
        const aprovCli = aprovadas.filter((i) => i.tipo === "clinica").length
        const rejMed = rejeitadas.filter((i) => i.tipo === "medico").length
        const rejCli = rejeitadas.filter((i) => i.tipo === "clinica").length

        if (mounted) {
          setStats((prev) => ({
            ...prev,
            aprovacoesSemana: (prev.aprovacoesSemana || 0) || aprovadas.length,
            rejeicoesSemana: (prev.rejeicoesSemana || 0) || rejeitadas.length,
            aprovadosMedicosSemana: (prev.aprovadosMedicosSemana || 0) || aprovMed,
            aprovadasClinicasSemana: (prev.aprovadasClinicasSemana || 0) || aprovCli,
            rejeitadosMedicosSemana: (prev.rejeitadosMedicosSemana || 0) || rejMed,
            rejeitadasClinicasSemana: (prev.rejeitadasClinicasSemana || 0) || rejCli,
          }))
        }
      } catch (e) {
        console.warn("[AdminDashboard] cálculo semanal (fallback) falhou:", e?.response?.status)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    fetchData()
    return () => {
      mounted = false
    }
  }, [])
  const getStatusBadge = (status) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            <Clock className="mr-1 h-3 w-3" />
            Pendente
          </Badge>
        )
      case "approved":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle className="mr-1 h-3 w-3" />
            Aprovado
          </Badge>
        )
      case "rejected":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <XCircle className="mr-1 h-3 w-3" />
            Rejeitado
          </Badge>
        )
      default:
        return null
    }
  }

  const getUrgenciaBadge = (urgencia) => {
    switch (urgencia) {
      case "alta":
        return (
          <Badge variant="destructive" className="text-xs">
            Alta
          </Badge>
        )
      case "normal":
        return (
          <Badge variant="secondary" className="text-xs">
            Normal
          </Badge>
        )
      case "baixa":
        return (
          <Badge variant="outline" className="text-xs">
            Baixa
          </Badge>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Administrativo</h1>
        <p className="text-muted-foreground">Gerencie usuários e solicitações do sistema</p>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsuarios}</div>
            <p className="text-xs text-muted-foreground">+12% em relação ao mês passado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Médicos Ativos</CardTitle>
            <Stethoscope className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.medicosAtivos}</div>
            <p className="text-xs text-muted-foreground">+5 novos esta semana</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clínicas Ativas</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.clinicasAtivas}</div>
            <p className="text-xs text-muted-foreground">+2 novas este mês</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Solicitações Pendentes</CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.solicitacoesPendentes}</div>
            <p className="text-xs text-muted-foreground">{stats.solicitacoesHoje} novas hoje</p>
          </CardContent>
        </Card>
      </div>

      {/* Ações Rápidas */}
      <Card className="shadow-sm border">
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
          <CardDescription>Acesso rápido às principais funcionalidades</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Link to="/admin/solicitacoes?status=pending">
            <div className="app-quick-action group">
              <div className="app-quick-icon warning">
                <Clock className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <h4 className="app-quick-title">Solicitações Pendentes</h4>
                <p className="app-quick-desc">{stats.solicitacoesPendentes} solicitações aguardando análise</p>
              </div>
              <span className="app-quick-chevron">
                <ChevronRight className="h-4 w-4" />
              </span>
            </div>
          </Link>

          <Link to="/admin/usuarios">
            <div className="app-quick-action group">
              <div className="app-quick-icon info">
                <Users className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <h4 className="app-quick-title">Gerenciar Usuários</h4>
                <p className="app-quick-desc">Visualizar e gerenciar todos os usuários do sistema</p>
              </div>
              <span className="app-quick-chevron">
                <ChevronRight className="h-4 w-4" />
              </span>
            </div>
          </Link>

          <Link to="/admin/relatorios">
            <div className="app-quick-action group">
              <div className="app-quick-icon success">
                <TrendingUp className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <h4 className="app-quick-title">Relatórios</h4>
                <p className="app-quick-desc">Visualizar estatísticas e relatórios do sistema</p>
              </div>
              <span className="app-quick-chevron">
                <ChevronRight className="h-4 w-4" />
              </span>
            </div>
          </Link>
        </CardContent>
      </Card>

      {/* Solicitações Recentes */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Solicitações Recentes</CardTitle>
              <CardDescription>Últimas solicitações de cadastro no sistema</CardDescription>
            </div>
            <Button variant="outline" asChild>
              <Link to="/admin/solicitacoes">Ver Todas</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentSolicitations.map((solicitacao) => (
              <div key={solicitacao.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    {solicitacao.tipo === "medico" ? (
                      <Stethoscope className="h-5 w-5" />
                    ) : (
                      <Building2 className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{solicitacao.nome}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>
                        {solicitacao.tipo === "medico"
                          ? `${solicitacao.especialidade} - ${solicitacao.crm}`
                          : `${solicitacao.cnpj} - ${solicitacao.responsavel}`}
                      </span>
                      <span>•</span>
                      <span>{new Date(solicitacao.dataEnvio).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getUrgenciaBadge(solicitacao.urgencia)}
                  {getStatusBadge(solicitacao.status)}
                  {solicitacao.status === "pending" && (
                    <Button size="sm" asChild>
                      <Link to={`/admin/solicitacoes/${solicitacao.id}`}>Revisar</Link>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas da Semana */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Aprovações desta Semana
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.aprovacoesSemana}</div>
            <p className="text-sm text-muted-foreground">
              {stats.aprovadosMedicosSemana} médicos e {stats.aprovadasClinicasSemana} clínicas aprovados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              Rejeições desta Semana
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{stats.rejeicoesSemana}</div>
            <p className="text-sm text-muted-foreground">
              {stats.rejeitadosMedicosSemana} médicos e {stats.rejeitadasClinicasSemana} clínicas rejeitados
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
