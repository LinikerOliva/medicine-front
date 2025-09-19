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
import { FileText, CheckCircle2, Download, Mail, Printer } from "lucide-react"

export default function PreviewReceitaMedico() {
  const { id } = useParams()
  const location = useLocation()
  const { toast } = useToast()

  // Dados vindos da tela de finalizar consulta (se houver)
  const fromConsulta = location.state?.fromConsulta || {}

  // Helper: normalizar data para formato yyyy-MM-dd aceito pelo input type=date
  const toInputDate = (v) => {
    if (!v) return ""
    // Já no formato correto
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v
    // Tenta ISO completa
    const iso = new Date(v)
    if (!isNaN(iso)) {
      const y = iso.getFullYear()
      const m = String(iso.getMonth() + 1).padStart(2, "0")
      const d = String(iso.getDate()).padStart(2, "0")
      return `${y}-${m}-${d}`
    }
    // Tenta dd/mm/aaaa
    const m1 = String(v).match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
    if (m1) return `${m1[3]}-${m1[2]}-${m1[1]}`
    return ""
  }

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
    formato: "pdf", // padrão agora é PDF
    acao: "imprimir", // nova ação padrão
    email_paciente: "", // preenchido ao carregar paciente
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
          if (import.meta.env.VITE_API_VERBOSE_LOGS === "true") {
            console.debug("[preview receita] paciente carregado:", data)
          }
          const user = data?.user || {}
          const nome = [user.first_name, user.last_name].filter(Boolean).join(" ") || data?.nome || ""
          const nascRaw = data?.data_nascimento || data?.nascimento || ""
          const nasc = toInputDate(nascRaw)
          const rg = data?.rg || data?.documento || ""
          const email = user?.email || data?.email || ""
          // idade simples baseada na data de nascimento
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
              rg: f.rg || rg,
              idade: f.idade || idade,
              email_paciente: f.email_paciente || email,
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

  async function handleGerarDocumento() {
    setSubmitLoading(true)
    try {
      const baseReceitas = (import.meta.env.VITE_RECEITAS_ENDPOINT || "/receitas/").replace(/\/+$/, "") + "/"
      const endpoint = import.meta.env.VITE_GERAR_RECEITA_ENDPOINT || `${baseReceitas}gerar-documento`

      // Variantes de payload com sinônimos e chaves alternativas
      const variants = [
        {
          receita_id: fromConsulta?.receitaId,
          consulta_id: fromConsulta?.consultaId,
          paciente_id: id,
          formato: form.formato,
          acao: form.acao,
          ...form
        },
        {
          id: fromConsulta?.receitaId,
          consultation_id: fromConsulta?.consultaId,
          patient_id: id,
          format: form.formato,
          action: form.acao,
          ...form
        },
        form
      ]

      function baixarBlob(blob, filename) {
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(url)
      }

      async function tryBlob(url, payload, headers) {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...headers },
          body: JSON.stringify(payload)
        })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.blob()
      }

      async function processResponse(blob, contentType, filename) {
        const maybeSign = async () => {
          try {
            if (!blob || blob.size === 0) return false
            const pdfFile = new File([blob], filename, { type: "application/pdf" })
            const meta = { reason: `Assinatura de receita do paciente ${form.nome_paciente || ""}` }
            const resSign = await medicoService.signDocumento(pdfFile, meta)
            const signedUrl = URL.createObjectURL(resSign.blob)
            const a2 = document.createElement("a")
            a2.href = signedUrl
            a2.download = resSign.filename || filename.replace(/\.pdf$/i, "_assinado.pdf")
            document.body.appendChild(a2)
            a2.click()
            a2.remove()
            URL.revokeObjectURL(signedUrl)
            toast({ title: "Receita assinada", description: "Arquivo assinado baixado com sucesso." })
            return true
          } catch (e) {
            console.error("Falha ao assinar receita:", e)
            toast({ title: "Falha na assinatura", description: e?.response?.data?.detail || e?.message || "Não foi possível assinar o PDF.", variant: "destructive" })
            return false
          }
        }
      
        if ((form.acao === "imprimir") && contentType.includes("pdf")) {
          // Abrir para impressão
          const url = URL.createObjectURL(blob)
          const iframe = document.createElement("iframe")
          iframe.style.display = "none"
          iframe.src = url
          document.body.appendChild(iframe)
          iframe.onload = async () => {
            try { iframe.contentWindow?.focus(); iframe.contentWindow?.print(); } catch {}
            setTimeout(() => { URL.revokeObjectURL(url); iframe.remove() }, 2000)
            await maybeSign()
          }
          toast({ title: "Pronto para impressão", description: `Abrimos o PDF da receita. Use a caixa de diálogo para imprimir.` })
        } else {
          baixarBlob(blob, filename)
          toast({ title: "Documento gerado", description: `Arquivo ${filename} baixado.` })
          // Após baixar, oferecer assinatura
          maybeSign()
        }
      }

      // Se estiver em DEV com mock habilitado, gerar PDF no cliente e evitar chamadas de rede
      const isMock = import.meta.env.DEV && String(import.meta.env.VITE_MOCK_RECEITA ?? "true").toLowerCase() !== "false"
      if (isMock) {
        try {
          const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib")
          const pdfDoc = await PDFDocument.create()
          const page = pdfDoc.addPage([595.28, 841.89]) // A4 em pontos
          const font = await pdfDoc.embedFont(StandardFonts.TimesRoman)
          const draw = (textVal, x, y, size = 12) => {
            if (!textVal && textVal !== 0) return
            page.drawText(String(textVal), { x, y, size, font, color: rgb(0, 0, 0) })
          }
          let y = 800
          draw("Prescrição Médica", 200, y, 18); y -= 28
          draw(`Nome: ${form.nome_paciente || "Paciente"}`, 50, y); y -= 18
          draw(`Idade: ${form.idade ? `${form.idade} anos` : ""}`, 50, y); y -= 18
          draw(`RG: ${form.rg || ""}`, 50, y); y -= 18
          draw(`Nascimento: ${form.data_nascimento || ""}`, 50, y); y -= 28
          draw("Prescrição:", 50, y); y -= 18
          draw(form.medicamento || form.medicamentos || "", 60, y); y -= 18
          if (form.posologia) { draw(`Posologia: ${form.posologia}`, 60, y); y -= 18 }
          y -= 10
          draw(`Validade: ${form.validade_receita || ""}`, 50, y); y -= 28
          if (form.observacoes) { draw(`Observações: ${form.observacoes}`, 50, y); y -= 28 }
          draw(`Emitido por: ${form.medico || "Dr(a)."} • CRM ${form.crm || ""}`, 50, y); y -= 18
          const pdfBytes = await pdfDoc.save()
          const blob = new Blob([pdfBytes], { type: "application/pdf" })
          await processResponse(blob, "application/pdf", "Receita_Medica.pdf")
          setSubmitLoading(false)
          return
        } catch (e) {
          console.error("Mock de geração falhou:", e)
          toast({ title: "Erro no mock", description: "Não foi possível gerar o PDF de exemplo.", variant: "destructive" })
          setSubmitLoading(false)
          return
        }
      }

      // Tentativas de geração no backend
      for (const payload of variants) {
        try {
          const blob = await tryBlob(endpoint, payload)
          const contentType = blob.type || "application/pdf"
          const filename = `receita_${Date.now()}.${form.formato || "pdf"}`
          await processResponse(blob, contentType, filename)
          setSubmitLoading(false)
          return
        } catch (e) {
          console.warn(`Falha com payload:`, payload, e)
        }
      }

      // Fallback para POST em /receitas/gerar
      try {
        const fallbackUrl = `${baseReceitas}gerar`
        const blob = await tryBlob(fallbackUrl, variants[0])
        const contentType = blob.type || "application/pdf"
        const filename = `receita_${Date.now()}.${form.formato || "pdf"}`
        await processResponse(blob, contentType, filename)
        setSubmitLoading(false)
        return
      } catch (e) {
        console.warn("Fallback também falhou:", e)
      }

      throw new Error("Nenhum endpoint respondeu com sucesso")
    } catch (err) {
      console.error("Falha na geração:", err)
      toast({ title: "Não foi possível gerar", description: err?.response?.data?.detail || err?.message || "Tente novamente mais tarde.", variant: "destructive" })
    } finally {
      setSubmitLoading(false)
    }
  }

  const todayStr = useMemo(() => new Date().toLocaleDateString(), [])

  async function handleEnviarPaciente() {
    setSubmitLoading(true)
    try {
      // Mock em desenvolvimento
      const isMock = import.meta.env.DEV && String(import.meta.env.VITE_MOCK_RECEITA ?? "true").toLowerCase() !== "false"
      if (isMock) {
        // 1) Gera um PDF usando pdf-lib
        const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib")
        const pdfDoc = await PDFDocument.create()
        const page = pdfDoc.addPage([595.28, 841.89]) // A4 em pontos
        const font = await pdfDoc.embedFont(StandardFonts.TimesRoman)
        const draw = (textVal, x, y, size = 12) => {
          if (!textVal && textVal !== 0) return
          page.drawText(String(textVal), { x, y, size, font, color: rgb(0, 0, 0) })
        }
        let y = 800
        draw("Prescrição Médica", 200, y, 18); y -= 28
        draw(`Nome: ${form.nome_paciente || "Paciente"}`, 50, y); y -= 18
        draw(`Idade: ${form.idade ? `${form.idade} anos` : ""}`, 50, y); y -= 18
        draw(`RG: ${form.rg || ""}`, 50, y); y -= 18
        draw(`Nascimento: ${form.data_nascimento || ""}`, 50, y); y -= 28
        draw("Prescrição:", 50, y); y -= 18
        draw(form.medicamento || form.medicamentos || "", 60, y); y -= 18
        if (form.posologia) { draw(`Posologia: ${form.posologia}`, 60, y); y -= 18 }
        y -= 10
        draw(`Validade: ${form.validade_receita || ""}`, 50, y); y -= 28
        if (form.observacoes) { draw(`Observações: ${form.observacoes}`, 50, y); y -= 28 }
        draw(`Emitido por: ${form.medico || "Dr(a)."} • CRM ${form.crm || ""}`, 50, y); y -= 18
        const pdfBytes = await pdfDoc.save()
        const unsignedFile = new File([pdfBytes], "Receita_Medica.pdf", { type: "application/pdf" })

        // 2) Assina o PDF via serviço (mock no Vite intercepta e devolve um blob assinado)
        let signedBlob = null
        let signedFilename = "Receita_Medica_assinado.pdf"
        try {
          const meta = { reason: `Assinatura de receita do paciente ${form.nome_paciente || ""}` }
          const resSign = await medicoService.signDocumento(unsignedFile, meta)
          signedBlob = resSign.blob
          signedFilename = resSign.filename || signedFilename
        } catch (e) {
          console.error("Falha ao assinar PDF em modo mock:", e)
          // Fallback: usa o PDF não assinado para não bloquear o envio
          signedBlob = new Blob([pdfBytes], { type: "application/pdf" })
        }

        const signedUrl = URL.createObjectURL(signedBlob)

        // 3) Monta o registro da receita para persistir (mock)
        const now = Date.now()
        const receitaMock = {
          id: `mock-${now}`,
          created_at: new Date().toISOString(),
          validade: form.validade_receita || "",
          medicamentos: form.medicamento || "",
          posologia: form.posologia || "",
          observacoes: form.observacoes || "",
          paciente_id: id,
          consulta_id: fromConsulta?.consultaId || null,
          medico_nome: form.medico || "",
          arquivo_assinado: signedUrl,
          origem: "mock-dev",
        }

        try {
          const key = "mock_receitas"
          const arr = JSON.parse(localStorage.getItem(key) || "[]")
          arr.push(receitaMock)
          localStorage.setItem(key, JSON.stringify(arr))
        } catch (_) {}

        toast({
          title: "Enviado",
          description: form.email_paciente ? `Receita assinada e enviada para ${form.email_paciente} (mock) e salva em Minhas Receitas.` : "Receita assinada (mock) enviada e salva em Minhas Receitas.",
        })
        setSubmitLoading(false)
        return
      }

      // Fluxo real: garante uma receita existente para vincular, se possível
      let receitaId = null
      try {
        const created = await medicoService.criarReceita({
          consulta_id: fromConsulta.consultaId || undefined,
          paciente: id,
          paciente_id: id,
          medicamentos: form.medicamento || "",
          posologia: form.posologia || "",
          validade: toInputDate(form.validade_receita) || undefined,
          observacoes: form.observacoes || undefined,
        })
        receitaId = created?.id || created?.data?.id || created?.receita?.id || null
      } catch (_) {}

      const resp = await medicoService.enviarReceita({
        receitaId,
        pacienteId: id,
        email: form.email_paciente,
        formato: form.formato,
      })
      toast({ title: "Enviado", description: resp?.message || "Receita enviada ao paciente." })
    } catch (err) {
      console.error("Falha ao enviar receita ao paciente:", err)
      toast({ title: "Não foi possível enviar", description: err?.response?.data?.detail || err?.message || "Tente novamente mais tarde.", variant: "destructive" })
    } finally {
      setSubmitLoading(false)
    }
  }

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
                <Input type="date" name="data_nascimento" value={toInputDate(form.data_nascimento)} onChange={handleChange} />
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
                <Input type="date" name="validade_receita" value={toInputDate(form.validade_receita)} onChange={handleChange} />
              </div>
              <div>
                <Label>Formato</Label>
                <select className="border rounded h-10 px-3 bg-background" name="formato" value={form.formato} onChange={handleChange}>
                  <option value="pdf">PDF</option>
                  <option value="docx">DOCX</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Ação</Label>
                <select className="border rounded h-10 px-3 bg-background" name="acao" value={form.acao} onChange={handleChange}>
                  <option value="imprimir">Imprimir</option>
                  <option value="baixar">Baixar arquivo</option>
                </select>
              </div>
              <div>
                <Label>E-mail do Paciente (opcional)</Label>
                <Input name="email_paciente" value={form.email_paciente} onChange={handleChange} placeholder="paciente@exemplo.com" />
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

            <div className="rounded-md bg-amber-50 text-amber-900 border border-amber-200 p-3 text-sm">
              Ao gerar PDF, a assinatura digital será aplicada no backend, contendo seu CRM e certificado digital cadastrado. Verifique suas credenciais nas Configurações do Médico.
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" onClick={handleValidar} variant={validado ? "secondary" : "default"}>
                <CheckCircle2 className="h-4 w-4 mr-2" /> {validado ? "Validado" : "Validar receita"}
              </Button>
              <Button type="button" onClick={handleGerarDocumento} disabled={submitLoading}>
                <Printer className="h-4 w-4 mr-2" /> {submitLoading ? (form.acao === "imprimir" ? "Imprimindo..." : "Gerando...") : (form.acao === "imprimir" ? "Imprimir" : "Baixar")}
              </Button>
              <Button type="button" variant="secondary" onClick={handleEnviarPaciente} disabled={submitLoading || !form.email_paciente} title={!form.email_paciente ? "Informe o e-mail do paciente" : ""}>
                <Mail className="h-4 w-4 mr-2" /> Enviar ao paciente
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
                <div className="text-xs text-muted-foreground mt-1">Assinado digitalmente com certificado ICP-Brasil (backend)</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}