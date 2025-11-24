"use client"

import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { pacienteService } from "@/services/pacienteService"
import { secretariaService } from "@/services/secretariaService"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DatePicker } from "@/components/ui/date-picker"

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

export default function ContatoMedicoPaciente() {
  const [medicos, setMedicos] = useState([])
  const [loadingMedicos, setLoadingMedicos] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const { toast } = useToast()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    medico: "",
    modalidade: "presencial", // fixo: apenas presencial neste fluxo
    local: "",
    tipo: "primeira",
    preferenciaData: "",
    preferenciaTurno: "indiferente",
    motivo: "",
    observacoes: "",
  })


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
    if (!form.motivo) return "Informe o motivo principal."
    if (form.modalidade === "presencial" && !form.local) return "Local do médico não definido."
    if (!form.preferenciaData) return "Selecione uma data preferida."
    return null
  }

  const handleContact = async (e) => {
    e.preventDefault()
    const msg = validate()
    if (msg) {
      toast({ title: "Validação", description: msg, variant: "destructive" })
      return
    }

    setSaving(true)
    setError(null)
    try {
      // Enviar solicitação de agendamento para a Secretaria (interno)
      const selected = medicos.find((m) => String(m.id || m?.user?.id || m?.nome) === String(form.medico))
      const medicoId =
        selected?.id ||
        selected?.user?.id ||
        (Number(form.medico) ? Number(form.medico) : undefined)

      if (!medicoId) {
        throw new Error("Não foi possível identificar o médico selecionado.")
      }

      const turnoToHora = (t) => {
        if (!t || t === "indiferente") return "08:00"
        if (t === "manha") return "08:00"
        if (t === "tarde") return "14:00"
        if (t === "noite") return "19:00"
        return "08:00"
      }

      // Obter ID do paciente atual para enviar ao backend
      const me = await pacienteService.getPacienteDoUsuario()
      const pacienteId = me?.id
      if (!pacienteId) throw new Error("Paciente atual não encontrado.")

      // Enviar via endpoint de consultas do paciente (sem exigir data_hora_inicio/fim)
      const consultaPayload = {
        medico: medicoId,
        modalidade: form.modalidade,
        tipo: form.tipo,
        motivo: form.motivo,
      }
      if (form.preferenciaData) consultaPayload.data = form.preferenciaData
      const h = turnoToHora(form.preferenciaTurno)
      if (h) consultaPayload.hora = h
      if (form.observacoes) consultaPayload.observacoes = form.observacoes
      
      await pacienteService.agendarConsulta(consultaPayload)

      toast({
        title: "Solicitação enviada",
        description: "Sua solicitação foi enviada à Secretaria. Aguarde confirmação.",
      })
      navigate("/paciente/consultas")
    } catch (e) {
      const raw = e?.response?.data
      let backendMsg = (typeof raw === "string" && raw) || raw?.detail || e?.message || "Não foi possível enviar sua solicitação."
      if (raw && typeof raw === "object") {
        try {
          const parts = Object.entries(raw).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : (typeof v === "object" ? JSON.stringify(v) : String(v))}`)
          if (parts.length) backendMsg = parts.join(" | ")
        } catch {}
      }
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
        <h1 className="text-2xl font-bold tracking-tight">Entrar em contato com o médico</h1>
      </div>

      <ProfileTabs tabs={pacienteTabs} basePath="/paciente" />

      <Card>
        <CardHeader>
          <CardTitle>Contato para agendamento</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleContact} className="space-y-6">
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
                    <SelectItem value="primeira">Primeira consulta</SelectItem>
                    <SelectItem value="retorno">Retorno</SelectItem>
                    <SelectItem value="rotina">Rotina</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Modalidade</Label>
                <Select value={form.modalidade} onValueChange={(v) => setForm((p) => ({ ...p, modalidade: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a modalidade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="presencial">Presencial</SelectItem>
                    <SelectItem value="online" disabled>Online (em breve)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Local</Label>
                <div className="relative">
                  <Input value={form.local} placeholder="Rua das Flores, 123" readOnly />
                  <MapPin className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
                {form.modalidade === "presencial" && (
                  <div className="text-xs text-muted-foreground">O local é definido pelo médico e preenchido automaticamente.</div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Preferência de Data</Label>
                <DatePicker id="preferenciaData" name="preferenciaData" value={form.preferenciaData} onChange={(v) => setForm((p) => ({ ...p, preferenciaData: v }))} />
                <div className="text-xs text-muted-foreground">Opcional: ajuda a secretaria a oferecer horários próximos.</div>
              </div>

              <div className="space-y-2">
                <Label>Turno período</Label>
                <Select value={form.preferenciaTurno} onValueChange={(v) => setForm((p) => ({ ...p, preferenciaTurno: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="indiferente">Indiferente</SelectItem>
                    <SelectItem value="manha">Manhã</SelectItem>
                    <SelectItem value="tarde">Tarde</SelectItem>
                    <SelectItem value="noite">Noite</SelectItem>
                  </SelectContent>
                </Select>
                <div className="text-xs text-muted-foreground">Opcional: a secretaria tenta encaixar nesse período.</div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Motivo</Label>
                <Input value={form.motivo} onChange={handleChange("motivo")} placeholder="Ex: dor, retorno de exame, etc." />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Observações</Label>
                <Textarea value={form.observacoes} onChange={handleChange("observacoes")} placeholder="Opcional" />
              </div>
            </div>

            {error && <div className="text-sm text-red-600">{error}</div>}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => navigate("/paciente/consultas")}>Cancelar</Button>
              <Button type="submit" disabled={saving}>Entrar em contato</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}