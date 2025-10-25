"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { DatePicker } from "@/components/ui/date-picker"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, Search, Stethoscope } from "lucide-react"
import { secretariaService } from "@/services/secretariaService"
import { medicoService } from "@/services/medicoService"

function normalizeConsulta(c = {}) {
  const pacienteNome =
    c.paciente_nome ||
    c?.paciente?.nome ||
    (c?.paciente?.user ? [c.paciente.user.first_name, c.paciente.user.last_name].filter(Boolean).join(" ") : null) ||
    "Paciente"

  const dataHora = c.data_hora || c.horario || c.inicio || c.data || c.start_time || ""
  const status = c.status || "Agendada"
  const clinica = c.clinica_nome || c?.clinica?.nome || c.local || "—"

  return {
    id: c.id || c.consulta_id || Math.random().toString(36).slice(2),
    pacienteNome,
    dataHora,
    status,
    clinica,
    tipo: c.tipo || c.modalidade || "Consulta",
  }
}

export default function ConsultasSecretaria() {
  const [medicos, setMedicos] = useState([])
  const [medicoId, setMedicoId] = useState("")
  const [q, setQ] = useState("")
  const [date, setDate] = useState("")
  const [loading, setLoading] = useState(false)
  const [consultas, setConsultas] = useState([])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const list = await secretariaService.listarMedicos()
        if (!mounted) return
        setMedicos(Array.isArray(list) ? list : [])
        const stored = localStorage.getItem("secretaria.medicoId")
        if (stored) setMedicoId(String(stored))
      } catch {}
    })()
    return () => {
      mounted = false
    }
  }, [])

  const fetchConsultas = async () => {
    if (!medicoId) return setConsultas([])
    setLoading(true)
    try {
      localStorage.setItem("secretaria.medicoId", String(medicoId))
      const params = {}
      if (date) params.date = date
      const data = await medicoService.getConsultasDoMedico({ ...params, medico: medicoId })
      const list = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : []
      const normalized = list.map(normalizeConsulta)
      setConsultas(
        q
          ? normalized.filter((c) => c.pacienteNome.toLowerCase().includes(q.toLowerCase()))
          : normalized
      )
    } catch (e) {
      setConsultas([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConsultas()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [medicoId])

  const medicoOptions = useMemo(
    () => medicos.map((m) => ({ value: String(m.id), label: m.nome || m?.user?.first_name || `Médico #${m.id}` })),
    [medicos]
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Calendar className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-semibold">Consultas</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5" /> Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="text-sm text-muted-foreground">Médico</label>
              <Select value={medicoId || undefined} onValueChange={(v) => setMedicoId(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha um médico" />
                </SelectTrigger>
                <SelectContent>
                  {medicoOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Data</label>
              <DatePicker value={date} onChange={setDate} />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm text-muted-foreground">Pesquisar por paciente</label>
              <div className="flex gap-2">
                <Input placeholder="Nome do paciente" value={q} onChange={(e) => setQ(e.target.value)} />
                <Button onClick={fetchConsultas}>
                  <Search className="h-4 w-4 mr-2" />
                  Buscar
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resultados</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Carregando...</p>
          ) : consultas.length === 0 ? (
            <p className="text-muted-foreground">Nenhuma consulta encontrada.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Clínica</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {consultas.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.pacienteNome}</TableCell>
                    <TableCell>{c.dataHora || "—"}</TableCell>
                    <TableCell>{c.tipo}</TableCell>
                    <TableCell>{c.status}</TableCell>
                    <TableCell>{c.clinica}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}