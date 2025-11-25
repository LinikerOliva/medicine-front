"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, Link } from "react-router-dom"
import { PatientProfileSummary } from "@/components/patient-profile-summary"
import { ProfileTabs } from "@/components/profile-tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import api from "@/services/api"
import { Calendar, Pill, CheckCircle, XCircle } from "lucide-react"

export default function ReceitasPacienteMedico() {
  const { id } = useParams()
  const [patient, setPatient] = useState(null)
  const [loadingPatient, setLoadingPatient] = useState(true)
  const [receitas, setReceitas] = useState([])
  const [loadingReceitas, setLoadingReceitas] = useState(true)
  const [togglingId, setTogglingId] = useState(null)

  useEffect(() => {
    let active = true
    ;(async () => {
      // carregar paciente
      try {
        const baseRaw = import.meta.env.VITE_PACIENTES_ENDPOINT || "/pacientes/"
        const base = baseRaw.endsWith("/") ? baseRaw : `${baseRaw}/`
        const res = await api.get(`${base}${id}/`)
        if (active) setPatient(res.data)
      } catch (e) {
        try { console.debug("[Medico/Receitas] Falha paciente:", e?.response?.status) } catch {}
      } finally {
        if (active) setLoadingPatient(false)
      }
      // carregar receitas ativas
      try {
        const recBaseRaw = String(import.meta.env.VITE_RECEITAS_ENDPOINT || "/receitas/")
        const recBase = recBaseRaw.endsWith("/") ? recBaseRaw : `${recBaseRaw}/`
        const params = { paciente: id, paciente_id: id, status: "ativa", situacao: "ativa", limit: 100 }
        const r = await api.get(recBase, { params })
        const data = r?.data
        let list = Array.isArray(data) ? data : (Array.isArray(data?.results) ? data.results : [])
        // filtro por validade/status client-side para garantir apenas ativas
        const toLower = (s) => String(s || "").toLowerCase()
        list = list.filter((rec) => {
          const st = toLower(rec.status || rec.situacao || "")
          const validade = rec.validade || rec.validade_receita || null
          const byStatus = ["ativa", "valida", "válida"].includes(st)
          if (validade) {
            try { return byStatus || new Date(validade) >= new Date() } catch { return byStatus }
          }
          return byStatus || true
        })
        if (active) setReceitas(list)
      } catch (e2) {
        try { console.debug("[Medico/Receitas] Falha receitas:", e2?.response?.status) } catch {}
        if (active) setReceitas([])
      } finally {
        if (active) setLoadingReceitas(false)
      }
    })()
    return () => { active = false }
  }, [id])

  const medicoTabs = useMemo(() => ([
    { label: "Resumo", href: `/medico/paciente/${id}/perfil` },
    { label: "Prontuário", href: `/medico/paciente/${id}/prontuario` },
    { label: "Consultas", href: `/medico/paciente/${id}/consultas` },
    { label: "Exames", href: `/medico/paciente/${id}/exames` },
    { label: "Receitas", href: `/medico/paciente/${id}/receitas` },
  ]), [id])

  const isActive = (rec) => {
    const st = String(rec?.status || rec?.situacao || "").toLowerCase()
    if (["ativa", "valida", "válida"].includes(st)) return true
    const v = rec?.validade || rec?.validade_receita
    if (v) {
      try { return new Date(v) >= new Date() } catch { return false }
    }
    return false
  }

  const toggleActive = async (rec) => {
    const recId = rec?.id || rec?.pk || rec?.uuid
    if (!recId) return
    setTogglingId(recId)
    try {
      const baseRaw = String(import.meta.env.VITE_RECEITAS_ENDPOINT || "/receitas/")
      const base = baseRaw.endsWith("/") ? baseRaw : `${baseRaw}/`
      const willActivate = !isActive(rec)
      const payload = {}
      payload.status = willActivate ? "ativa" : "inativa"
      payload.situacao = payload.status
      payload.ativa = willActivate
      // manter validade se já existir, opcionalmente atualizar para hoje+30 ao ativar
      if (willActivate && !rec.validade && !rec.validade_receita) {
        const d = new Date(); d.setDate(d.getDate() + 30)
        payload.validade = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`
      }
      const url = `${base}${recId}/`
      const res = await api.patch(url, payload)
      const updated = res?.data || { ...rec, ...payload }
      setReceitas((prev) => prev.map((r) => (String(r.id) === String(recId) ? { ...r, ...updated } : r)))
    } catch (e) {
      try { console.warn("[Medico/Receitas] toggle falhou:", e?.response?.status, e?.response?.data) } catch {}
    } finally {
      setTogglingId(null)
    }
  }

  if (loadingPatient && loadingReceitas) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Receitas do Paciente</h1>
        <p className="text-muted-foreground">Visualize e gerencie receitas ativas</p>
      </div>

      <PatientProfileSummary patientId={id} isPacienteView={false} profile={patient?.user} patient={patient} loading={loadingPatient} />

      <ProfileTabs tabs={medicoTabs} basePath={`/medico/paciente/${id}`} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Pill className="h-5 w-5" /> Receitas Ativas</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingReceitas ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : receitas.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              Nenhuma receita ativa encontrada para este paciente.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Médico</TableHead>
                  <TableHead>Emitida</TableHead>
                  <TableHead>Validade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ativa</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receitas.map((r) => {
                  const dt = r.created_at || r.data_emissao
                  const validade = r.validade || r.validade_receita
                  const st = String(r.status || r.situacao || "").toLowerCase()
                  const active = isActive(r)
                  const doctorName = r?.medico?.nome || r?.medico_nome || (r?.consulta?.medico?.user ? `${r.consulta.medico.user.first_name || ""} ${r.consulta.medico.user.last_name || ""}`.trim() : r?.consulta?.medico?.nome)
                  return (
                    <TableRow key={r.id || r.pk || r.uuid}>
                      <TableCell>{r.id || r.pk || r.uuid}</TableCell>
                      <TableCell>{doctorName || "Médico"}</TableCell>
                      <TableCell>{dt ? new Date(dt).toLocaleDateString() : "—"}</TableCell>
                      <TableCell>{validade || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={active ? "default" : "secondary"}>
                          {active ? "Ativa" : (st || "inativa")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Switch
                            checked={active}
                            disabled={togglingId === (r.id || r.pk || r.uuid)}
                            onCheckedChange={() => toggleActive(r)}
                          />
                          <Button variant="outline" size="sm" asChild>
                            <Link to={r.arquivo_assinado ? r.arquivo_assinado : `/medico/paciente/${id}/receita/preview`} target={r.arquivo_assinado ? "_blank" : undefined}>
                              {r.arquivo_assinado ? <CheckCircle className="h-4 w-4 mr-1" /> : <Calendar className="h-4 w-4 mr-1" />}
                              {r.arquivo_assinado ? "Abrir PDF" : "Preview"}
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}