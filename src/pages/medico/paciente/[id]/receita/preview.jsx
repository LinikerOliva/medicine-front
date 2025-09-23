import React, { useEffect, useMemo, useState } from "react"
import { useLocation, useParams } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { FileText, CheckCircle2, Printer, Mail } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import api from "@/services/api"
import { medicoService } from "@/services/medicoService"

export default function PreviewReceitaMedico() {
  const { id } = useParams()
  const location = useLocation()
  const { toast } = useToast()

  // Dados vindos da tela de finalizar consulta (se houver)
  const fromConsulta = location.state?.fromConsulta || {}
  // Novo: garantir leitura do consultaId tanto do topo do state quanto do objeto fromConsulta
  const consultaId = location.state?.consultaId || fromConsulta.consultaId

  // Helper: normalizar data para formato yyyy-MM-dd aceito pelo input type=date
  const toInputDate = (v) => {
    if (!v) return ""
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v
    const iso = new Date(v)
    if (!isNaN(iso)) {
      const y = iso.getFullYear()
      const m = String(iso.getMonth() + 1).padStart(2, "0")
      const d = String(iso.getDate()).padStart(2, "0")
      return `${y}-${m}-${d}`
    }
    const m1 = String(v).match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
    if (m1) return `${m1[3]}-${m1[2]}-${m1[1]}`
    return ""
  }

  const todayStr = useMemo(() => new Date().toLocaleDateString(), [])

  // Estado do formulário
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
    formato: "pdf",
    acao: "imprimir",
    email_paciente: "",
  })
  const [validado, setValidado] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitLoading, setSubmitLoading] = useState(false)
  // NOVO: certificado efêmero para assinatura
  const [pfxFile, setPfxFile] = useState(null)
  const [pfxPassword, setPfxPassword] = useState("")

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

        // Paciente por ID
        try {
          const base = (import.meta.env.VITE_PACIENTES_ENDPOINT || "/pacientes/").replace(/\/?$/, "/")
          const { data } = await api.get(`${base}${id}/`)
          const user = data?.user || {}
          const nome = [user.first_name, user.last_name].filter(Boolean).join(" ") || data?.nome || ""
          const nasc = toInputDate(data?.data_nascimento || data?.nascimento || "")
          const rg = data?.rg || data?.documento || ""
          const email = user?.email || data?.email || ""
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
    const hasExt = /\.[a-z0-9]+$/i.test(filenameFallback)
    a.download = hasExt ? filenameFallback : `${filenameFallback}.pdf`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  }

  const handleGerarDocumento = async () => {
    setSubmitLoading(true)
    try {
      // 1) Gera o documento no backend usando serviço com fallbacks
      const payload = {
        nome_paciente: form.nome_paciente,
        idade: form.idade,
        rg: form.rg,
        data_nascimento: toInputDate(form.data_nascimento),
        medicamento: form.medicamento,
        medicamentos: form.medicamento,
        posologia: form.posologia,
        medico: form.medico,
        crm: form.crm,
        endereco_consultorio: form.endereco_consultorio,
        telefone_consultorio: form.telefone_consultorio,
        validade_receita: toInputDate(form.validade_receita),
        observacoes: form.observacoes,
        formato: form.formato,
        paciente: id,
        paciente_id: id,
        consulta: consultaId || undefined,
        consulta_id: consultaId || undefined,
      }

      const generated = await medicoService.gerarDocumentoReceita(payload)
      const originalBlob = generated?.blob
      const baseFilename = generated?.filename || `Receita_${form.nome_paciente || "Medica"}.pdf`
      if (!(originalBlob instanceof Blob)) throw new Error("Resposta inválida do servidor ao gerar PDF.")

      // 2) Se for PDF, tentar assinar digitalmente usando o certificado do médico
      let finalBlob = originalBlob
      let finalFilename = baseFilename
      if (String(form.formato).toLowerCase() === "pdf") {
        const shouldSign = !!pfxFile
        if (shouldSign) {
          try {
            const pdfFile = new File([originalBlob], finalFilename, { type: "application/pdf" })
            const signMeta = {
              reason: "Receita Médica",
              location: form.endereco_consultorio || undefined,
              pfxFile: pfxFile || undefined,
              // Certificado sem senha: enviar string vazia
              pfxPassword: pfxPassword ?? "",
            }
            const signed = await medicoService.signDocumento(pdfFile, signMeta)
            if (signed?.blob instanceof Blob) {
              finalBlob = signed.blob
              if (signed.filename) finalFilename = signed.filename
            }
          } catch (e) {
            const st = e?.response?.status
            const msg = e?.response?.data?.detail || e?.message || "Falha ao assinar o PDF da receita. Continuaremos sem assinatura."
            console.warn("[PreviewReceita] Falha ao assinar PDF:", st, msg)
            toast({ title: "Assinatura falhou", description: `${msg}${st ? ` [HTTP ${st}]` : ""}` , variant: "destructive" })
          }
        }
      }

      // 3) Imprimir ou baixar usando o arquivo final (assinado quando possível)
      if (form.acao === "imprimir") {
        try {
          const blobUrl = URL.createObjectURL(finalBlob)
          const w = window.open(blobUrl)
          if (!w) throw new Error("Popup bloqueado pelo navegador")
          setTimeout(() => URL.revokeObjectURL(blobUrl), 2000)
        } catch {
          baixarBlob(finalBlob, finalFilename)
        }
      } else {
        baixarBlob(finalBlob, finalFilename)
      }

      toast({ title: "Documento gerado", description: finalBlob === originalBlob ? "Gerado sem assinatura." : "Gerado e assinado com sucesso." })
    } catch (e) {
      const st = e?.response?.status
      const detail = e?.response?.data?.detail || e?.message || "Falha ao gerar documento"
      toast({ title: "Erro", description: `${detail}${st ? ` [HTTP ${st}]` : ""}` , variant: "destructive" })
    } finally {
      setSubmitLoading(false)
    }
  }

  async function handleEnviarPaciente() {
    setSubmitLoading(true)
    try {
      // 1) Salvar/registrar a receita no backend (sem envio ainda)
      const payloadSave = {
        paciente: id,
        paciente_id: id,
        consulta: consultaId || undefined,
        consulta_id: consultaId || undefined,
        medicamento: form.medicamento || form.medicamentos,
        medicamentos: form.medicamentos,
        posologia: form.posologia,
        validade_receita: toInputDate(form.validade_receita),
        observacoes: form.observacoes,
      }

      const created = await medicoService.criarReceita(payloadSave)
      const rid = created?.id || created?.pk || created?.uuid

      // 2) Gerar o documento PDF da receita (no backend)
      const payloadDoc = {
        nome_paciente: form.nome_paciente,
        idade: form.idade,
        rg: form.rg,
        data_nascimento: toInputDate(form.data_nascimento),
        medicamento: form.medicamento,
        medicamentos: form.medicamento,
        posologia: form.posologia,
        medico: form.medico,
        crm: form.crm,
        endereco_consultorio: form.endereco_consultorio,
        telefone_consultorio: form.telefone_consultorio,
        validade_receita: toInputDate(form.validade_receita),
        observacoes: form.observacoes,
        formato: "pdf",
        paciente: id,
        paciente_id: id,
        consulta: consultaId || undefined,
        consulta_id: consultaId || undefined,
      }

      const generated = await medicoService.gerarDocumentoReceita(payloadDoc)
      const originalBlob = generated?.blob
      const baseFilename = generated?.filename || `Receita_${form.nome_paciente || "Medica"}.pdf`
      if (!(originalBlob instanceof Blob)) throw new Error("Resposta inválida do servidor ao gerar PDF.")

      // 3) Assinar digitalmente o PDF com o certificado do médico (no backend de assinatura)
      const pdfFile = new File([originalBlob], baseFilename, { type: "application/pdf" })
      let signed = null
      const shouldSign = !!pfxFile
      if (shouldSign) {
        try {
          signed = await medicoService.signDocumento(pdfFile, {
            reason: "Receita Médica",
            location: form.endereco_consultorio || undefined,
            pfxFile: pfxFile || undefined,
            // Se o certificado não tiver senha, enviamos string vazia explicitamente
            pfxPassword: pfxPassword ?? "",
          })
        } catch (e) {
          const st = e?.response?.status
          const msg = e?.response?.data?.detail || e?.message || "Falha ao assinar o PDF da receita. Enviaremos sem assinatura."
          toast({ title: "Assinatura falhou", description: `${msg}${st ? ` [HTTP ${st}]` : ""}` , variant: "destructive" })
          signed = null
        }
        // Caso a API retorne sem blob válido, prosseguir sem assinatura
        if (!(signed?.blob instanceof Blob)) {
          signed = null
        }
      }

      // 4) Enviar a receita (assinada, se disponível) ao paciente
      const fileToSend = signed?.blob || originalBlob
      const filenameToSend = signed?.filename || baseFilename
      await medicoService.enviarReceita({
        receitaId: rid,
        pacienteId: id,
        email: form.email_paciente || undefined,
        formato: "pdf",
        file: fileToSend,
        filename: filenameToSend,
      })

      toast({ title: "Receita enviada", description: signed ? "A receita assinada foi enviada ao paciente com sucesso." : "A receita foi enviada sem assinatura (certificado ausente ou senha inválida)." })
    } catch (e) {
      const st = e?.response?.status
      const msg = e?.response?.data?.detail || e?.message || "Falha ao enviar a receita assinada"
      toast({ title: "Erro ao enviar", description: `${msg}${st ? ` [HTTP ${st}]` : ""}` , variant: "destructive" })
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
              Ao gerar PDF, a assinatura digital será aplicada usando seu arquivo .pfx carregado no momento. O certificado é usado apenas em memória e descartado após a assinatura. Você pode validar seu certificado nas Configurações.
            </div>

            {/* NOVO: campos para certificado efêmero */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Arquivo PFX para assinatura (não será salvo)</Label>
                <Input type="file" accept=".pfx,.p12" onChange={(e) => setPfxFile(e.target.files?.[0] || null)} />
                {pfxFile && (
                  <p className="text-xs text-muted-foreground">Selecionado: {pfxFile.name} ({Math.ceil(pfxFile.size / 1024)} KB)</p>
                )}
              </div>
              <div>
                <Label>Senha do PFX</Label>
                <Input type="password" value={pfxPassword} onChange={(e) => setPfxPassword(e.target.value)} placeholder="Informe a senha" />
                <p className="text-xs text-muted-foreground">Usado apenas durante a assinatura. Não armazenamos esta informação.</p>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" onClick={handleValidar} variant={validado ? "secondary" : "default"}>
                <CheckCircle2 className="h-4 w-4 mr-2" /> {validado ? "Validado" : "Validar receita"}
              </Button>
              <Button type="button" onClick={handleGerarDocumento} disabled={submitLoading}>
                <Printer className="h-4 w-4 mr-2" /> {submitLoading ? (form.acao === "imprimir" ? "Imprimindo..." : "Gerando...") : (form.acao === "imprimir" ? "Imprimir" : "Baixar")}
              </Button>
              <Button type="button" variant="secondary" onClick={handleEnviarPaciente} disabled={submitLoading} title="Este botão salva a receita no sistema (envio por e-mail desativado temporariamente)">
                <Mail className="h-4 w-4 mr-2" /> Enviar ao paciente
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader>
            <CardTitle>Pré-visualização</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mx-auto bg-white shadow-md border rounded-md p-6 max-w-[800px] aspect-[1/1.414] overflow-auto">
              <div className="text-center border-b pb-3">
                <div className="font-bold text-lg">Consultório Médico</div>
                <div className="font-semibold">{form.medico || "Dr(a)."}</div>
                <div>CRM: {form.crm}</div>
                <div className="text-sm text-muted-foreground">{form.endereco_consultorio}</div>
                <div className="text-sm text-muted-foreground">Telefone: {form.telefone_consultorio}</div>
              </div>

              <div className="text-center my-4">
                <div><span className="font-medium">Nome do Paciente: </span>{form.nome_paciente}</div>
                <div><span className="font-medium">Idade: </span>{form.idade} {form.idade ? "anos" : ""}</div>
                <div><span className="font-medium">RG: </span>{form.rg}</div>
                <div><span className="font-medium">Data de Nascimento: </span>{form.data_nascimento}</div>
              </div>

              <div className="text-center text-xl font-semibold my-4">Prescrição Médica</div>

              <div className="text-center">
                <div className="whitespace-pre-wrap font-semibold">{form.medicamento}</div>
                {form.posologia ? (
                  <div className="mt-2 whitespace-pre-wrap">{form.posologia}</div>
                ) : null}
              </div>

              <div className="text-center my-6">
                <div>Data de Emissão: {todayStr}</div>
                <div>Validade da Receita: {form.validade_receita || ""}</div>
              </div>

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