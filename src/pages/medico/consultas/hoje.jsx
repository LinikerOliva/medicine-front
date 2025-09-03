import React, { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { medicoService } from "../../../services/medicoService"

// Util simples para formatar datas
function todayYMD() {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${d.getFullYear()}-${mm}-${dd}`
}

function formatLongDate(dateStr) {
  // Evita new Date("YYYY-MM-DD") que interpreta como UTC e pode retroceder 1 dia dependendo do fuso
  if (!dateStr) return ""
  const m = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (m) {
    const [, y, mo, d] = m
    return `${d}/${mo}/${y}`
  }
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
  } catch {
    return dateStr
  }
}

/**
 * @typedef {{ id: string|number, paciente: { id: string|number, nome: string, avatarUrl?: string }, hora: string, status: 'pendente'|'em_andamento'|'finalizado' }} Consulta
 */

// Função de busca de consultas (agora resiliente a diferentes formatos de resposta)
function fetchConsultasPorDia(date) {
  const isToday = date === todayYMD()
  const request = isToday ? medicoService.getConsultasHoje() : medicoService.getConsultasDoMedico({ date })
  return request.then((raw) => {
    // Normaliza diferentes formatos comuns de resposta
    const pickArray = (obj) => {
      if (Array.isArray(obj)) return obj
      if (!obj || typeof obj !== "object") return []
      if (Array.isArray(obj.results)) return obj.results
      if (Array.isArray(obj.data)) return obj.data
      if (Array.isArray(obj.items)) return obj.items
      if (Array.isArray(obj.consultas)) return obj.consultas
      if (Array.isArray(obj.content)) return obj.content
      if (Array.isArray(obj.objects)) return obj.objects
      return []
    }

    const items = pickArray(raw)
    if (!Array.isArray(items)) return []

    return items.map((c) => {
      const user = c?.paciente?.user || {}
      const pacienteNome =
        [user.first_name, user.last_name].filter(Boolean).join(" ") ||
        c?.paciente?.nome ||
        c?.paciente_nome ||
        c?.nome_paciente ||
        "Paciente"

      // Extração do horário: tenta vários campos comuns
      let hora = ""
      const dt = c?.data_hora || c?.horario || c?.inicio || c?.start_time || c?.data || c?.inicio_previsto
      if (dt) {
        try {
          const d = new Date(dt)
          if (!isNaN(d.getTime())) {
            hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
          } else {
            throw new Error("invalid date")
          }
        } catch {
          // tenta extrair HH:mm de uma string ISO
          const m = String(dt).match(/\b(\d{2}:\d{2})\b/)
          hora = m ? m[1] : ""
        }
      }

      // Normaliza status para três estados usados na UI
      const s = String(c?.status || c?.situacao || "").toLowerCase()
      let status = "pendente"
      if (s.includes("andamento")) status = "em_andamento"
      else if (s.includes("finaliz") || s.includes("conclu") || s.includes("cancel") || s.includes("faltou")) status = "finalizado"
      else status = "pendente"

      return {
        id: c.id || c.consulta_id || c.uuid,
        paciente: {
          id: c?.paciente?.id || c?.paciente_id,
          nome: pacienteNome.trim(),
          avatarUrl: c?.paciente?.avatar_url || c?.paciente?.foto || c?.paciente_avatar || null,
        },
        hora,
        status,
      }
    })
  })
}

function StatusBadge({ status }) {
  const map = {
    pendente: "bg-amber-100 text-amber-700",
    em_andamento: "bg-emerald-100 text-emerald-700",
    finalizado: "bg-gray-100 text-gray-600",
  }
  const label = { pendente: "Pendente", em_andamento: "Em Andamento", finalizado: "Finalizado" }
  return <span className={`rounded-full px-3 py-1 text-sm font-medium ${map[status]}`}>{label[status]}</span>
}

function Avatar({ url, name }) {
  if (url) {
    return <img src={url} alt={`Avatar de ${name}`} className="h-14 w-14 rounded-full object-cover" />
  }
  return (
    <svg className="h-14 w-14 rounded-full bg-gray-100 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
    </svg>
  )
}

function SkeletonList() {
  return (
    <div className="mt-6 space-y-4">
      <div className="h-20 animate-pulse rounded-2xl bg-gray-100" />
      <div className="h-20 animate-pulse rounded-2xl bg-gray-100" />
      <div className="h-20 animate-pulse rounded-2xl bg-gray-100" />
    </div>
  )
}

function ErrorState({ onRetry }) {
  return (
    <div className="mt-10 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
      Ocorreu um erro ao carregar as consultas.
      <button className="ml-3 rounded-md bg-red-600 px-3 py-1 text-white" onClick={onRetry}>
        Tentar novamente
      </button>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="mt-12 rounded-2xl border bg-white p-10 text-center text-gray-500">
      Nenhuma consulta encontrada para este dia.
    </div>
  )
}

function PrimaryButton({ children, ...props }) {
  return (
    <button
      {...props}
      className="rounded-lg bg-blue-600 px-4 py-2 text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
    >
      {children}
    </button>
  )
}

function SecondaryButton({ children, ...props }) {
  return (
    <button
      {...props}
      className="rounded-lg bg-gray-100 px-4 py-2 text-gray-700 shadow-sm transition-colors hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-200"
    >
      {children}
    </button>
  )
}

function ConsultaCard({ consulta, onIniciar }) {
  const horaLegivel = useMemo(() => {
    if (!consulta.hora) return ""
    try {
      const [h, m] = String(consulta.hora).split(":")
      const d = new Date()
      d.setHours(Number(h), Number(m), 0, 0)
      return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    } catch {
      return consulta.hora
    }
  }, [consulta.hora])

  const action = () => {
    if (consulta.status === "pendente") {
      return (
        <PrimaryButton onClick={() => onIniciar(consulta)} aria-label={`Iniciar consulta de ${consulta.paciente.nome} às ${consulta.hora}`}>
          Iniciar Consulta
        </PrimaryButton>
      )
    }
    if (consulta.status === "em_andamento") {
      return <SecondaryButton disabled>Em Andamento</SecondaryButton>
    }
    return <SecondaryButton disabled>Finalizado</SecondaryButton>
  }

  return (
    <div className="flex items-center justify-between rounded-2xl border bg-white p-5 shadow-md transition-all hover:shadow-lg">
      <div className="flex items-center gap-4">
        <Avatar url={consulta.paciente.avatarUrl} name={consulta.paciente.nome} />
        <div>
          <div className="text-lg font-semibold text-gray-900">{consulta.paciente.nome}</div>
          <div className="mt-1 text-sm text-gray-500">{horaLegivel}</div>
        </div>
      </div>
      <div className="flex flex-col items-stretch gap-3 md:flex-row md:items-center">
        <StatusBadge status={consulta.status} />
        {action()}
      </div>
    </div>
  )
}

export default function MedicoConsultasHoje() {
  const navigate = useNavigate()
  const [selectedDate, setSelectedDate] = useState(todayYMD())
  const [statusFilter, setStatusFilter] = useState("todos")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [consultas, setConsultas] = useState([])

  const carregar = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchConsultasPorDia(selectedDate)
      setConsultas(data)
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate])

  const handleIniciarConsulta = (consulta) => {
    try {
      navigate(`/medico/paciente/${consulta.paciente.id}/iniciar-consulta`)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log("Iniciar consulta", consulta.id)
    }
  }

  const tituloData = formatLongDate(selectedDate)
  const consultasFiltradas = consultas.filter((c) => (statusFilter === "todos" ? true : c.status === statusFilter))

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      {/* Título com ícone */}
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-blue-50 p-2 text-blue-600">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Consultas de Hoje</h1>
        <span className="text-sm text-gray-500">{tituloData}</span>
      </div>

      {/* Filtros compactos: dropdown + data */}
      <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex w-full gap-3 md:w-auto">
          <div className="relative w-full md:w-60">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2 pr-10 text-sm text-gray-900 shadow-sm outline-none transition-colors hover:bg-gray-50 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            >
              <option value="todos">Filtrar por status</option>
              <option value="pendente">Pendentes</option>
              <option value="em_andamento">Em Andamento</option>
              <option value="finalizado">Finalizadas</option>
            </select>
            <svg className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.085l3.71-3.855a.75.75 0 111.08 1.04l-4.25 4.417a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
            </svg>
          </div>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none transition-colors hover:bg-gray-50 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 md:w-auto"
          />
        </div>
      </div>

      {/* Lista */}
      {loading && <SkeletonList />}
      {!loading && error && <ErrorState onRetry={carregar} />}
      {!loading && !error && consultasFiltradas.length === 0 && <EmptyState />}

      {!loading && !error && consultasFiltradas.length > 0 && (
        <div className="mt-6 space-y-4">
          {consultasFiltradas.map((c) => (
            <ConsultaCard key={c.id} consulta={c} onIniciar={handleIniciarConsulta} />
          ))}
        </div>
      )}
    </div>
  )
}