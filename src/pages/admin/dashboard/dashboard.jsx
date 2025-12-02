"use client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, Clock, Building2, Stethoscope, TrendingUp, AlertCircle, CheckCircle, XCircle, ChevronRight, Shield, Activity, BarChart3, Settings } from "lucide-react"
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
        const list = await adminService.getSolicitacoes({ status: "pending", limit: 5 })
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
            limit: 100,
            created_at__gte: weekStartIso,
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
          <Badge variant="outline" className="badge-medical-warning">
            <Clock className="mr-1 h-3 w-3" />
            Pendente
          </Badge>
        )
      case "approved":
        return (
          <Badge variant="outline" className="badge-medical-success">
            <CheckCircle className="mr-1 h-3 w-3" />
            Aprovado
          </Badge>
        )
      case "rejected":
        return (
          <Badge variant="outline" className="badge-medical-error">
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
    <div className="space-y-8">
      {/* Header Moderno */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Dashboard Administrativo
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Gerencie usuários e solicitações do sistema
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2" asChild>
            <Link to="/admin/usuarios">
              <Users className="h-4 w-4" />
              Usuários
            </Link>
          </Button>
          <Button variant="outline" className="gap-2" asChild>
            <Link to="/admin/relatorios">
              <BarChart3 className="h-4 w-4" />
              Relatórios
            </Link>
          </Button>
          <Button className="gap-2 btn-medical-primary" asChild>
            <Link to="/admin/solicitacoes">
              <Shield className="h-4 w-4" />
              Solicitações
            </Link>
          </Button>
        </div>
      </div>

      {/* Cards de Estatísticas Modernos */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-blue-700 dark:text-blue-300">Total de Usuários</CardTitle>
            <div className="p-2 bg-blue-500 rounded-lg">
              <Users className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">{stats.totalUsuarios}</div>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              +12% em relação ao mês passado
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-green-700 dark:text-green-300">Médicos Ativos</CardTitle>
            <div className="p-2 bg-green-500 rounded-lg">
              <Stethoscope className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-900 dark:text-green-100">{stats.medicosAtivos}</div>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              +5 novos esta semana
            </p>
          </CardContent>
        </Card>

        

        <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/50 dark:to-amber-900/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-amber-700 dark:text-amber-300">Solicitações Pendentes</CardTitle>
            <div className="p-2 bg-amber-500 rounded-lg">
              <AlertCircle className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-900 dark:text-amber-100">{stats.solicitacoesPendentes}</div>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
              {stats.solicitacoesHoje} novas hoje
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Layout Principal com Grid */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Coluna Principal - 2/3 */}
        <div className="lg:col-span-2 space-y-8">
          {/* Ações Rápidas */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-t-lg">
              <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                <Activity className="h-5 w-5 text-purple-600" />
                Ações Rápidas
              </CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400">
                Acesso rápido às principais funcionalidades
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <Link to={{ pathname: "/admin/solicitacoes", search: "?status=pending" }}>
                <div className="flex items-center gap-4 p-4 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-900/20 dark:hover:bg-amber-900/30 transition-colors group cursor-pointer">
                  <div className="p-3 bg-amber-500 rounded-lg">
                    <Clock className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-amber-900 dark:text-amber-100">Solicitações Pendentes</h4>
                    <p className="text-sm text-amber-700 dark:text-amber-300">{stats.solicitacoesPendentes} solicitações aguardando análise</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-amber-600 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>

              <Link to="/admin/usuarios">
                <div className="flex items-center gap-4 p-4 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 transition-colors group cursor-pointer">
                  <div className="p-3 bg-blue-500 rounded-lg">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-blue-900 dark:text-blue-100">Gerenciar Usuários</h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300">Visualizar e gerenciar todos os usuários do sistema</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-blue-600 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>

              <Link to="/admin/relatorios">
                <div className="flex items-center gap-4 p-4 rounded-lg border border-green-200 bg-green-50 hover:bg-green-100 dark:border-green-800 dark:bg-green-900/20 dark:hover:bg-green-900/30 transition-colors group cursor-pointer">
                  <div className="p-3 bg-green-500 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-green-900 dark:text-green-100">Relatórios</h4>
                    <p className="text-sm text-green-700 dark:text-green-300">Visualizar estatísticas e relatórios do sistema</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-green-600 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            </CardContent>
          </Card>

          {/* Solicitações Recentes */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-t-lg">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                    <Clock className="h-5 w-5 text-purple-600" />
                    Solicitações Recentes
                  </CardTitle>
                  <CardDescription className="text-slate-600 dark:text-slate-400">
                    Últimas solicitações de cadastro no sistema
                  </CardDescription>
                </div>
                <Button variant="outline" asChild>
                  <Link to="/admin/solicitacoes">Ver Todas</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {recentSolicitations.map((solicitacao) => (
                  <div key={solicitacao.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/50 dark:to-blue-900/50 flex items-center justify-center">
                        {solicitacao.tipo === "medico" ? (
                          <Stethoscope className="h-6 w-6 text-purple-600" />
                        ) : (
                          <Building2 className="h-6 w-6 text-blue-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-slate-100">{solicitacao.nome}</p>
                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
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
                    <div className="flex items-center gap-3">
                      {getUrgenciaBadge(solicitacao.urgencia)}
                      {getStatusBadge(solicitacao.status)}
                      {solicitacao.status === "pending" && (
                        <Button size="sm" className="btn-medical-primary" asChild>
                          <Link to={`/admin/solicitacoes/${solicitacao.id}`}>Revisar</Link>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - 1/3 */}
        <div className="space-y-8">
          {/* Estatísticas da Semana */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-800 dark:text-green-200">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Aprovações desta Semana
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-green-700 dark:text-green-300 mb-2">{stats.aprovacoesSemana}</div>
              <p className="text-sm text-green-600 dark:text-green-400">
                {stats.aprovadosMedicosSemana} médicos e {stats.aprovadasClinicasSemana} clínicas aprovados
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/50 dark:to-red-900/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-800 dark:text-red-200">
                <XCircle className="h-5 w-5 text-red-600" />
                Rejeições desta Semana
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-red-700 dark:text-red-300 mb-2">{stats.rejeicoesSemana}</div>
              <p className="text-sm text-red-600 dark:text-red-400">
                {stats.rejeitadosMedicosSemana} médicos e {stats.rejeitadasClinicasSemana} clínicas rejeitados
              </p>
            </CardContent>
          </Card>

          {/* Ações Administrativas */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-t-lg">
              <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                <Settings className="h-5 w-5 text-purple-600" />
                Configurações
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-3">
              <Button variant="outline" className="w-full justify-start gap-2" asChild>
                <Link to="/admin/configuracoes">
                  <Settings className="h-4 w-4" />
                  Configurações do Sistema
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2" asChild>
                <Link to="/admin/logs">
                  <Activity className="h-4 w-4" />
                  Logs do Sistema
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2" asChild>
                <Link to="/admin/backup">
                  <Shield className="h-4 w-4" />
                  Backup e Segurança
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
