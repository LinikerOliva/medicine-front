"use client"

import { useLocation, useNavigate, useParams } from "react-router-dom"
import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { FileText, ListChecks, ClipboardList, FileSignature } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { medicoService } from "@/services/medicoService"
import { DatePicker } from "@/components/ui/date-picker"
import ReceitaItemManager from "@/components/ReceitaItemManager"

export default function ResumoConsultaMedico() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { toast } = useToast()

  const initial = location.state?.resumo || {}
  const consultaId = location.state?.consultaId
  const prontuarioId = location.state?.prontuarioId

  const [form, setForm] = useState({
    queixa: initial.queixa || "",
    historia: initial.historia || "",
    diagnostico: initial.diagnostico || "",
    conduta: initial.conduta || "",
    medicamentos: initial.medicamentos || "",
    posologia: initial.posologia || "",
    validade: initial.validade || "",
  })

  const [receitaItems, setReceitaItems] = useState([])
  const [useStructuredItems, setUseStructuredItems] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  const handleReceitaItemsChange = (items) => {
    setReceitaItems(items)
    
    // Atualizar campos legacy para compatibilidade
    const medicamentos = items.map(item => item.medicamento_nome).filter(Boolean).join('\n')
    const posologia = items.map(item => {
      const parts = []
      if (item.dose) parts.push(item.dose)
      if (item.frequencia) parts.push(item.frequencia)
      if (item.duracao) parts.push(item.duracao)
      if (item.observacoes) parts.push(`(${item.observacoes})`)
      return parts.join(' - ')
    }).filter(Boolean).join('\n')
    
    setForm(f => ({
      ...f,
      medicamentos,
      posologia
    }))
  }

  const handleConfirmar = async () => {
    // Opcionalmente podemos atualizar o prontuário com ajustes
    try {
      if (prontuarioId) {
        try {
          await medicoService.atualizarProntuario?.(prontuarioId, {
            queixa_principal: form.queixa,
            historia_doenca_atual: form.historia,
            diagnostico_principal: form.diagnostico,
            conduta: form.conduta,
            medicamentos_uso: form.medicamentos,
          })
        } catch {}
      }
    } finally {
      navigate(`/medico/paciente/${id}/receita/preview`, {
        state: {
          fromConsulta: {
            medicamentos: form.medicamentos,
            posologia: form.posologia,
            validade: form.validade,
            receitaItems: useStructuredItems ? receitaItems : undefined,
          },
          consultaId,
        },
      })
    }
  }

  const todayStr = useMemo(() => new Date().toLocaleDateString(), [])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ListChecks className="h-5 w-5" />
        <h1 className="text-2xl font-bold tracking-tight">Resumo da Consulta</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Informações Principais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Queixa Principal</Label>
              <Textarea name="queixa" rows={3} value={form.queixa} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label>História da Doença Atual</Label>
              <Textarea name="historia" rows={4} value={form.historia} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label>Diagnóstico</Label>
              <Textarea name="diagnostico" rows={3} value={form.diagnostico} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label>Conduta</Label>
              <Textarea name="conduta" rows={3} value={form.conduta} onChange={handleChange} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Prescrição
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="useStructured"
                  checked={useStructuredItems}
                  onChange={(e) => setUseStructuredItems(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="useStructured" className="text-sm font-normal">
                  Usar itens estruturados
                </label>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {useStructuredItems ? (
              <ReceitaItemManager
                items={receitaItems}
                onChange={handleReceitaItemsChange}
                showLegacyFields={true}
              />
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Medicamentos</Label>
                  <Textarea name="medicamentos" rows={4} value={form.medicamentos} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label>Posologia</Label>
                  <Textarea name="posologia" rows={3} value={form.posologia} onChange={handleChange} />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label>Validade da Receita</Label>
              <DatePicker name="validade" value={form.validade} onChange={(val) => handleChange({ target: { name: "validade", value: val } })} className="border rounded h-10 px-3 bg-background" minDate={new Date()} />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleConfirmar}>
                <FileSignature className="h-4 w-4 mr-2" /> Gerar Receita
              </Button>
              <Button variant="outline" onClick={() => navigate(-1)}>Voltar</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resumo Visual</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <div><strong>Data:</strong> {todayStr}</div>
            <div><strong>Queixa:</strong> {form.queixa || "-"}</div>
            <div><strong>História:</strong> {form.historia || "-"}</div>
            <div><strong>Diagnóstico:</strong> {form.diagnostico || "-"}</div>
            <div><strong>Conduta:</strong> {form.conduta || "-"}</div>
            <div><strong>Medicamentos:</strong> {form.medicamentos || "-"}</div>
            <div><strong>Posologia:</strong> {form.posologia || "-"}</div>
            <div><strong>Validade:</strong> {form.validade || "-"}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}