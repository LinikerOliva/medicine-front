"use client"

import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { pacienteService } from "@/services/pacienteService"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ProfileTabs } from "@/components/profile-tabs"
import { Calendar, User, MapPin } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

// Helper para extrair a especialidade como string (evita "[object Object]")
const getDoctorSpecialty = (m) => {
  const tryFromObj = (obj) =>
    obj?.nome || obj?.titulo || obj?.name || obj?.descricao || obj?.description

  // Muitos-para-muitos: lista de especialidades (objetos ou strings)
  if (Array.isArray(m?.especialidades) && m.especialidades.length) {
    const parts = m.especialidades
      .map((x) => tryFromObj(x) || (typeof x === "string" ? x : null))
      .filter(Boolean)
    if (parts.length) return parts.join(", ")
  }

  // Objeto único
  if (m?.especialidade && typeof m.especialidade === "object") {
    const v = tryFromObj(m.especialidade)
    if (v) return v
  }

  // Strings / alternativas
  if (typeof m?.especialidade === "string" && m.especialidade.trim()) return m.especialidade.trim()
  if (typeof m?.especialidade_nome === "string" && m.especialidade_nome.trim()) return m.especialidade_nome.trim()
  if (typeof m?.specialty === "string" && m.specialty.trim()) return m.specialty.trim()
  if (typeof m?.area === "string" && m.area.trim()) return m.area.trim()
  if (typeof m?.user?.especialidade === "string" && m.user.especialidade.trim()) return m.user.especialidade.trim()

  return null
}

export default function AgendarConsultaPaciente() {
  const [medicos, setMedicos] = useState([])
  const [loadingMedicos, setLoadingMedicos] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const { toast } = useToast()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    medico: "",
    data: "",
    hora: "",
    modalidade: "online", // "online" | "presencial" (visual)
    local: "",
    tipo: "primeira_consulta",
    motivo: "",
    observacoes: "",
  })
  const [horariosDisponiveis, setHorariosDisponiveis] = useState([])

  // Helpers locais para extrair local do médico e montar slots
  const formatAddress = (addr) => {
    if (!addr) return null
    if (typeof addr === "string") return addr
    const parts = [addr.logradouro, addr.numero, addr.bairro, addr.cidade, addr.estado].filter(Boolean)
    const s = parts.join(" ").trim()
    return s || null
  }
  const extractLocationFromMedico = (m) => {
    return (
      m?.local_atendimento ||
      m?.local ||
      formatAddress(m?.endereco) ||
      formatAddress(m?.user?.endereco) ||
      formatAddress(m?.clinica?.endereco) ||
      m?.clinica?.nome ||
      null
    )
  }
  const buildSlots = (items, selectedDate) => {
    const slots = []
    const pushSlot = (timeStr) => {
      if (!timeStr) return
      const [hh, mm] = String(timeStr).split(":")
      if (hh != null && mm != null) {
        slots.push(`${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`)
      }
    }
    const addInterval = (startIso, endIso) => {
      const ini = new Date(startIso)
      const fim = new Date(endIso)
      const cur = new Date(ini)
      while (cur < fim) {
        const hh = String(cur.getHours()).padStart(2, "0")
        const mm = String(cur.getMinutes()).padStart(2, "0")
        slots.push(`${hh}:${mm}`)
        cur.setMinutes(cur.getMinutes() + 30)
      }
    }
    items.forEach((it) => {
      if (it?.data_hora_inicio && it?.data_hora_fim) {
        addInterval(it.data_hora_inicio, it.data_hora_fim)
        return
      }
      if (it?.inicio && it?.fim) {
        addInterval(it.inicio, it.fim)
        return
      }
      if (it?.start && it?.end) {
        addInterval(it.start, it.end)
        return
      }
      if (Array.isArray(it?.horarios)) {
        it.horarios.forEach((h) => {
          if (typeof h === "string") pushSlot(h.slice(0, 5))
          else pushSlot(h?.hora || h)
        })
        return
      }
      if (it?.hora) {
        pushSlot(String(it.hora).slice(0, 5))
        return
      }
      if (it?.horario) {
        pushSlot(String(it.horario).slice(0, 5))
        return
      }
      if (it?.data_hora) {
        const d = new Date(it.data_hora)
        const ymd = d.toISOString().slice(0, 10)
        if (ymd === selectedDate) {
          const hh = String(d.getHours()).padStart(2, "0")
          const mm = String(d.getMinutes()).padStart(2, "0")
          slots.push(`${hh}:${mm}`)
        }
      }
    })
    return Array.from(new Set(slots)).sort()
  }

  useEffect(() => {
    let mounted = true
    ;(async () => {
      setLoadingMedicos(true)
      setError(null)
      try {
        const res = await pacienteService.getMedicos()
        const list = Array.isArray(res) ? res : res?.results || []
        setMedicos(list)
      } catch (e) {
        console.error("Erro ao buscar médicos:", e)
        setError("Não foi possível carregar a lista de médicos.")
      } finally {
        if (mounted) setLoadingMedicos(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    // Carregar agenda quando medico e data estiverem definidos
    const carregarAgenda = async () => {
      if (!form.medico || !form.data) {
        setHorariosDisponiveis([])
        return
      }
      try {
        const res = await pacienteService.getAgendaMedico({ medico: form.medico, date: form.data, apenas_disponiveis: true })
        const items = Array.isArray(res) ? res : res?.results || []
        const slots = buildSlots(items, form.data)
        setHorariosDisponiveis(slots)
        if (form.hora && !slots.includes(form.hora)) {
          setForm((p) => ({ ...p, hora: "" }))
        }
      } catch (e) {
        console.error("Erro ao carregar agenda do médico:", e)
        setHorariosDisponiveis([])
      }
    }
    carregarAgenda()
  }, [form.medico, form.data])

  // NOVO: quando a modalidade for presencial, o local é sempre o do médico (auto-preenchido e bloqueado)
  useEffect(() => {
    if (form.modalidade !== "presencial") {
      if (form.local) setForm((p) => ({ ...p, local: "" }))
      return
    }
    const selected = medicos.find((m) => String(m.id || m?.user?.id) === String(form.medico))
    const loc = selected ? extractLocationFromMedico(selected) : ""
    setForm((p) => ({ ...p, local: loc || "" }))
  }, [form.medico, form.modalidade, medicos])

  const handleChange = (field) => (e) => {
    const value = e?.target ? e.target.value : e
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const validate = () => {
    if (!form.medico) return "Selecione um médico."
    if (!form.data) return "Selecione uma data."
    if (!form.hora) return "Selecione um horário disponível."
    if (!form.motivo) return "Informe o motivo da consulta."
    if (form.modalidade === "presencial" && !form.local) return "Este médico não possui um local de atendimento definido."
    return null
    }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const msg = validate()
    if (msg) {
      toast({ title: "Validação", description: msg, variant: "destructive" })
      return
    }

    setSaving(true)
    setError(null)
    try {
      await pacienteService.agendarConsulta({
        medico: form.medico,
        data: form.data,
        hora: form.hora,
        modalidade: form.modalidade,
        local: form.modalidade === "presencial" ? form.local : undefined,
        tipo: form.tipo,
        motivo: form.motivo,
        observacoes: form.observacoes,
      })
      toast({ title: "Consulta agendada!", description: "Sua consulta foi marcada com sucesso." })
      navigate("/paciente/consultas")
    } catch (e) {
      console.error("Erro ao agendar consulta:", e?.response?.data || e)
      const backendMsg =
        e?.response?.data?.error ||
        e?.response?.data?.detail ||
        e?.response?.data?.message ||
        "Não foi possível agendar a consulta."
      setError(backendMsg)
      toast({ title: "Erro", description: backendMsg, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const pacienteTabs = [
    { label: "Resumo", href: "/paciente/perfil" },
    { label: "Prontuário", href: "/paciente/prontuario" },
    { label: "Consultas", href: "/paciente/consultas" },
    { label: "Exames", href: "/paciente/exames" },
    { label: "Receitas", href: "/paciente/receitas" },
    { label: "Histórico Médico", href: "/paciente/historico-medico" },
    { label: "Médicos Vinculados", href: "/paciente/medicos" },
    { label: "Configurações", href: "/paciente/configuracoes" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Calendar className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">Agendar Consulta</h1>
      </div>

      <ProfileTabs tabs={pacienteTabs} basePath="/paciente" />

      <Card>
        <CardHeader>
          <CardTitle>Dados da Consulta</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Médico</Label>
                <Select value={form.medico} onValueChange={(v) => setForm((p) => ({ ...p, medico: v }))} disabled={loadingMedicos}>
                  <SelectTrigger>
                    <SelectValue placeholder={loadingMedicos ? "Carregando..." : "Selecione um médico"} />
                  </SelectTrigger>
                  <SelectContent>
                    {medicos.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">Nenhum médico disponível</div>
                    ) : (
                      medicos.map((m) => {
                        const nome =
                          m?.nome ||
                          [m?.user?.first_name, m?.user?.last_name].filter(Boolean).join(" ") ||
                          m?.username ||
                          m?.email ||
                          `Médico #${m?.id || ""}`
                        // Usa o helper para obter a especialidade como string
                        const esp = getDoctorSpecialty(m)
                        return (
                          <SelectItem key={m.id || nome} value={String(m.id || m?.user?.id || nome)}>
                            {nome}{esp ? ` - ${esp}` : ""}
                          </SelectItem>
                        )
                      })
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm((p) => ({ ...p, tipo: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="primeira_consulta">Primeira consulta</SelectItem>
                    <SelectItem value="retorno">Retorno</SelectItem>
                    <SelectItem value="urgencia">Urgência</SelectItem>
                    <SelectItem value="rotina">Rotina</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Data</Label>
                <Input type="date" value={form.data} onChange={handleChange("data")} />
              </div>

              <div className="space-y-2">
                <Label>Hora</Label>
                {horariosDisponiveis.length > 0 ? (
                  <Select value={form.hora} onValueChange={(v) => setForm((p) => ({ ...p, hora: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um horário" />
                    </SelectTrigger>
                    <SelectContent>
                      {horariosDisponiveis.map((h) => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    type="time"
                    value={form.hora}
                    onChange={(e) => setForm((p) => ({ ...p, hora: e.target.value }))}
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label>Modalidade</Label>
                <Select value={form.modalidade} onValueChange={(v) => setForm((p) => ({ ...p, modalidade: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a modalidade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="presencial">Presencial</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {form.modalidade === "presencial" && (
                <div className="space-y-2">
                  <Label>Local</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-9" placeholder="Local de atendimento definido pelo médico" value={form.local} readOnly disabled />
                  </div>
                  <p className="text-xs text-muted-foreground">O local é definido pelo médico e preenchido automaticamente.</p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Motivo</Label>
              <Textarea
                rows={3}
                placeholder="Descreva o motivo principal da consulta (obrigatório)"
                value={form.motivo}
                onChange={handleChange("motivo")}
              />
              <p className="text-xs text-muted-foreground">Obrigatório. Ex: dor de cabeça, retorno de exame, etc.</p>
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea rows={4} placeholder="Opcional: descreva sintomas, preferências, etc." value={form.observacoes} onChange={handleChange("observacoes")} />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => navigate("/paciente/consultas")} disabled={saving}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Agendando..." : "Agendar Consulta"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}