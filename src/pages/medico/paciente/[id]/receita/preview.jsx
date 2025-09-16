"use client"

import { useEffect, useMemo, useState } from "react"
import { useLocation, useParams } from "react-router-dom"
import api from "@/services/api"
import { medicoService } from "@/services/medicoService"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { FileText, CheckCircle2, Download } from "lucide-react"

export default function PreviewReceitaMedico() {
  const { id } = useParams()
  const location = useLocation()
  const { toast } = useToast()

  // Dados vindos da tela de finalizar consulta (se houver)
  const fromConsulta = location.state?.fromConsulta || {}

  // Estado do formulário (editável)
  const [form, setForm] = useState({
    nome_paciente: "",
    idade: "",
    rg: "",
    data_nascimento: "",
    medicamento: fromConsulta.medicamentos || "",
    posologia: fromConsulta.posologia || "",
    validade_receita: fromConsulta.validade || "",
    medico: "",
    crm: "",
    endereco_consultorio: "",
    telefone_consultorio: "",
    observacoes: "",
    formato: "docx", // ou pdf
  })
  const [validado, setValidado] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitLoading, setSubmitLoading] = useState(false)

  // Carregar informações do médico e do paciente
  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      try {
        // Perfil do médico
        try {
          const perfil = await medicoService.getPerfil()
          const medicoNome = perfil?.user
            ? `${perfil.user.first_name || ""} ${perfil.user.last_name || ""}`.trim()
            : perfil?.nome || "Médico"
          const crm = perfil?.crm || ""

          if (mounted) {
            setForm((f) => ({
              ...f,
              medico: medicoNome || f.medico,
              crm: crm || f.crm,
              endereco_consultorio: perfil?.endereco || f.endereco_consultorio || "",
              telefone_consultorio: perfil?.telefone || f.telefone_consultorio || "",
            }))
          }
        } catch {}

        // Paciente (buscar por id diretamente no endpoint)
        try {
          const base = (import.meta.env.VITE_PACIENTES_ENDPOINT || "/pacientes/").replace(/\/?$/, "/")
          const { data } = await api.get(`${base}${id}/`)
          const user = data?.user || {}
          const nome = [user.first_name, user.last_name].filter(Boolean).join(" ") || data?.nome || ""
          const nasc = data?.data_nascimento || data?.nascimento || ""
          // idade simples baseada no ano (fallback)
          let idade = ""
          if (nasc) {
            const dt = new Date(nasc)
            if (!isNaN(dt)) {
              const today = new Date()
              let years = today.getFullYear() - dt.getFullYear()
              const m = today.getMonth() - dt.getMonth()
              if (m < 0 || (m === 0 && today.getDate() < dt.getDate())) years--
              idade = String(years)
            }
          }
          if (mounted) {
            setForm((f) => ({
              ...f,
              nome_paciente: nome || f.nome_paciente,
              data_nascimento: nasc || f.data_nascimento,
              idade: f.idade || idade,
            }))
          }
        } catch {}
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [id])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  const handleValidar = () => {
    setValidado(true)
    toast({ title: "Receita validada", description: "Os dados foram conferidos. Você pode gerar o documento." })
  }

  const baixarBlob = (blob, filenameFallback = "Receita_Medica") => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filenameFallback
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const handleGerarDocumento = async () => {
    setSubmitLoading(true)
    try {
      const endpoint = (import.meta.env.VITE_GERAR_RECEITA_ENDPOINT || "/gerar-receita/").replace(/\/?$/, "/")
      const payload = {
        nome_paciente: form.nome_paciente,
        idade: form.idade,
        rg: form.rg,
        data_nascimento: form.data_nascimento,
        medicamento: form.medicamento,
        posologia: form.posologia,
        medico: form.medico,
        crm: form.crm,
        endereco_consultorio: form.endereco_consultorio,
        telefone_consultorio: form.telefone_consultorio,
        validade_receita: form.validade_receita,
        observacoes: form.observacoes,
        formato: form.formato, // "docx" ou "pdf"
        paciente_id: id,
        consulta_id: fromConsulta.consultaId || undefined,
      }

      const res = await api.post(endpoint, payload, { responseType: "blob" })
      const contentType = res.headers["content-type"] || (form.formato === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
      const cd = res.headers["content-disposition"] || ""
      let filename = cd.match(/filename\*=UTF-8''([^;\n]+)/)?.[1] || cd.match(/filename=\"?([^;\n\"]+)/)?.[1] || "Receita_Medica"
      if (!filename.includes(".")) filename += form.formato === "pdf" ? ".pdf" : ".docx"
      const blob = new Blob([res.data], { type: contentType })
      baixarBlob(blob, filename)
      toast({ title: "Documento gerado", description: `Arquivo ${filename} baixado.` })
    } catch (err) {
      console.error("Falha ao gerar documento de receita:", err)
      toast({
        title: "Erro ao gerar documento",
        description: err?.response?.data?.detail || "Tente novamente mais tarde.",
        variant: "destructive",
      })
    } finally {
      setSubmitLoading(false)
    }
  }

  const todayStr = useMemo(() => new Date().toLocaleDateString(), [])

  if (loading) return <div>Carregando preview...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <FileText className="h-5 w-5" />
        <h1 className="text-2xl font-bold tracking-tight">Preview da Receita</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coluna de edição */}
        <Card>
          <CardHeader>
            <CardTitle>Dados da Receita</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Nome do Paciente</Label>
              <Input name="nome_paciente" value={form.nome_paciente} onChange={handleChange} placeholder="João da Silva" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label>Idade</Label>
                <Input name="idade" value={form.idade} onChange={handleChange} placeholder="45" />
              </div>
              <div>
                <Label>RG</Label>
                <Input name="rg" value={form.rg} onChange={handleChange} placeholder="12.345.678-9" />
              </div>
              <div>
                <Label>Data de Nascimento</Label>
                <Input type="date" name="data_nascimento" value={form.data_nascimento} onChange={handleChange} />
              </div>
            </div>

            <div>
              <Label>Medicamentos</Label>
              <Textarea name="medicamento" rows={3} value={form.medicamento} onChange={handleChange} placeholder="Nome do medicamento, dose, apresentação..." />
            </div>
            <div>
              <Label>Posologia</Label>
              <Textarea name="posologia" rows={3} value={form.posologia} onChange={handleChange} placeholder="Ex: 1 comprimido de 12/12h por 7 dias" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Validade da Receita</Label>
                <Input type="date" name="validade_receita" value={form.validade_receita} onChange={handleChange} />
              </div>
              <div>
                <Label>Formato</Label>
                <select className="border rounded h-10 px-3 bg-background" name="formato" value={form.formato} onChange={handleChange}>
                  <option value="docx">DOCX</option>
                  <option value="pdf">PDF</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Médico</Label>
                <Input name="medico" value={form.medico} onChange={handleChange} placeholder="Dr. Carlos Souza" />
              </div>
              <div>
                <Label>CRM</Label>
                <Input name="crm" value={form.crm} onChange={handleChange} placeholder="12345-SP" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Endereço do Consultório</Label>
                <Input name="endereco_consultorio" value={form.endereco_consultorio} onChange={handleChange} placeholder="Rua das Flores, 123" />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input name="telefone_consultorio" value={form.telefone_consultorio} onChange={handleChange} placeholder="(11) 91234-5678" />
              </div>
            </div>

            <div>
              <Label>Observações (opcional)</Label>
              <Textarea name="observacoes" rows={2} value={form.observacoes} onChange={handleChange} placeholder="Orientações adicionais ao paciente" />
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" onClick={handleValidar} variant={validado ? "secondary" : "default"}>
                <CheckCircle2 className="h-4 w-4 mr-2" /> {validado ? "Validado" : "Validar receita"}
              </Button>
              <Button type="button" onClick={handleGerarDocumento} disabled={submitLoading}>
                <Download className="h-4 w-4 mr-2" /> {submitLoading ? "Gerando..." : "Gerar documento"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Coluna de preview visual */}
        <Card className="bg-white">
          <CardHeader>
            <CardTitle>Pré-visualização</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mx-auto bg-white shadow-md border rounded-md p-6 max-w-[800px] aspect-[1/1.414] overflow-auto">
              {/* Cabeçalho */}
              <div className="text-center border-b pb-3">
                {/* <img src={logoUrl} alt="Logo" className="mx-auto h-12" /> */}
                <div className="font-bold text-lg">Consultório Médico</div>
                <div className="font-semibold">{form.medico || "Dr(a)."}</div>
                <div>CRM: {form.crm}</div>
                <div className="text-sm text-muted-foreground">{form.endereco_consultorio}</div>
                <div className="text-sm text-muted-foreground">Telefone: {form.telefone_consultorio}</div>
              </div>

              {/* Dados do Paciente */}
              <div className="text-center my-4">
                <div><span className="font-medium">Nome do Paciente: </span>{form.nome_paciente}</div>
                <div><span className="font-medium">Idade: </span>{form.idade} {form.idade ? "anos" : ""}</div>
                <div><span className="font-medium">RG: </span>{form.rg}</div>
                <div><span className="font-medium">Data de Nascimento: </span>{form.data_nascimento}</div>
              </div>

              {/* Título */}
              <div className="text-center text-xl font-semibold my-4">Prescrição Médica</div>

              {/* Conteúdo da Prescrição */}
              <div className="text-center">
                <div className="whitespace-pre-wrap font-semibold">{form.medicamento}</div>
                {form.posologia ? (
                  <div className="mt-2 whitespace-pre-wrap">{form.posologia}</div>
                ) : null}
              </div>

              {/* Datas */}
              <div className="text-center my-6">
                <div>Data de Emissão: {todayStr}</div>
                <div>Validade da Receita: {form.validade_receita || ""}</div>
              </div>

              {/* Assinatura */}
              <div className="text-center mt-10">
                <div className="mx-auto w-64 border-t pt-1">&nbsp;</div>
                <div>Dr(a). {form.medico} • CRM {form.crm}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}