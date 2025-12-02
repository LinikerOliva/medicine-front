import React, { useEffect, useMemo, useState, useCallback } from "react"
import { useLocation, useParams, useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { FileText, CheckCircle2, Printer, Mail, MessageSquare, Smartphone, Bell, Shield } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import api from "@/services/api"
import { medicoService } from "@/services/medicoService"
import notificationService from "@/services/notificationService"
import digitalSignatureService from "@/services/digitalSignatureService"
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
const getLocalAgent = async () => (await import("@/services/localAgent")).default

import { useUser } from "@/contexts/user-context"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Info } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { DatePicker } from "@/components/ui/date-picker"
import { loadTemplateConfig, loadDoctorLogo, DEFAULT_TEMPLATE_CONFIG } from "@/utils/pdfTemplateUtils"

export default function PreviewReceitaMedico() {
  // Estado para controlar assinatura obrigatória e blobs
  const [isSigned, setIsSigned] = useState(false)
  const [signedBlob, setSignedBlob] = useState(null)
  const [signedFilename, setSignedFilename] = useState("")
  const [lastGeneratedBlob, setLastGeneratedBlob] = useState(null)
  const [lastGeneratedFilename, setLastGeneratedFilename] = useState("")
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [lastReceitaId, setLastReceitaId] = useState(location.state?.receitaId || null)
  // Helper: SHA-256 em hex do conteúdo (Blob)
  const sha256Hex = async (blob) => {
    const ab = await blob.arrayBuffer()
    const digest = await crypto.subtle.digest('SHA-256', ab)
    return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')
  }
  // Dados vindos da tela de finalizar consulta (se houver)
  const fromConsulta = location.state?.fromConsulta || {}
  // Novo: garantir leitura do consultaId tanto do topo do state quanto do objeto fromConsulta
  const consultaId = location.state?.consultaId || fromConsulta.consultaId
  
  // Novo: suporte a itens estruturados
  const receitaItems = fromConsulta.receitaItems || []
  const hasStructuredItems = Array.isArray(receitaItems) && receitaItems.length > 0

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

  // Helper: calcular idade em anos e dias
  const calcAgeYearsAndDays = (dateStr) => {
    if (!dateStr) return ""
    const dob = new Date(dateStr)
    if (isNaN(dob)) return ""
    const today = new Date()
    let years = today.getFullYear() - dob.getFullYear()
    const monthDiff = today.getMonth() - dob.getMonth()
    const dayDiff = today.getDate() - dob.getDate()
    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) years--
    // aniversário deste ano
    let lastBirthday = new Date(today.getFullYear(), dob.getMonth(), dob.getDate())
    if (lastBirthday > today) {
      lastBirthday = new Date(today.getFullYear() - 1, dob.getMonth(), dob.getDate())
    }
    const msPerDay = 24 * 60 * 60 * 1000
    const days = Math.floor((today - lastBirthday) / msPerDay)
    return `${years} anos e ${days} dias`
  }

  const todayStr = useMemo(() => new Date().toLocaleDateString(), [])

  // Helper: pegar o primeiro valor não vazio de uma lista de possíveis chaves
  const firstNonEmpty = (arr) => {
    for (const v of arr) {
      if (v === undefined || v === null) continue
      const s = typeof v === "string" ? v.trim() : v
      if (s) return typeof s === "string" ? s : String(s)
    }
    return ""
  }

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
    // NOVO: e-mail institucional do médico (editável)
    email_medico: "",
  })
  const [validado, setValidado] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [signDialogOpen, setSignDialogOpen] = useState(false)
  const [signMethod, setSignMethod] = useState("token") // "pfx" ou "token"
  const [tokenPin, setTokenPin] = useState("")

  // Configuração de template e logo (sincronização com Configurações)
  const [templateConfig, setTemplateConfig] = useState(DEFAULT_TEMPLATE_CONFIG)
  const [doctorLogo, setDoctorLogo] = useState(null)

  // Carrega config e logo do médico e escuta alterações no localStorage
  useEffect(() => {
    let mounted = true
    const loadCfg = async () => {
      let mid = form.medico_id || null
      try {
        if (!mid) mid = await medicoService._resolveMedicoId().catch(() => null)
      } catch {}
      mid = mid || (typeof window !== 'undefined' ? localStorage.getItem('medico_id') : null) || 'default'
      const cfg = loadTemplateConfig(mid)
      const logo = loadDoctorLogo(mid)
      if (mounted) {
        setTemplateConfig(cfg || DEFAULT_TEMPLATE_CONFIG)
        setDoctorLogo(logo || null)
      }
    }
    loadCfg()

    const onStorage = (e) => {
      const k = e?.key || ''
      if (k.startsWith('pdf_template_config_') || k.startsWith('template_config_') || k.startsWith('doctor_logo_')) {
        loadCfg()
      }
    }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadCfg()
      }
    }
    window.addEventListener('focus', loadCfg)
    window.addEventListener('storage', onStorage)
    document.addEventListener('visibilitychange', onVisibility)
    return () => { 
      mounted = false
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('focus', loadCfg)
      document.removeEventListener('visibilitychange', onVisibility)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.medico_id])

  const templateStyles = useMemo(() => {
    const c = templateConfig?.content || {}
    const h = templateConfig?.header || {}
    return {
      accentBorderColor: c?.colors?.accent || templateConfig?.branding?.primaryColor || '#3b82f6',
      titleSize: `${c?.fontSize?.title ?? 16}pt`,
      smallSize: `${c?.fontSize?.small ?? 10}pt`,
      primaryColor: c?.colors?.primary || '#1f2937',
      secondaryColor: c?.colors?.secondary || '#6b7280',
      showLogo: h?.showLogo !== false,
      headerBgColor: h?.backgroundColor || '#ffffff',
      headerBorderBottom: h?.borderBottom !== false,
      headerBorderColor: h?.borderColor || '#e5e7eb',
      logoPosition: h?.logoPosition || 'left',
      doctorInfoPosition: h?.doctorInfoPosition || 'right',
    }
  }, [templateConfig])
  
  // NOVO: certificado efêmero para assinatura (usando contexto)
  const { user, ephemeralCertFile, setEphemeralCertFile, ephemeralCertPassword, setEphemeralCertPassword, clearEphemeralCert } = useUser()
  const [pfxFile, setPfxFile] = useState(ephemeralCertFile || null)
  const [pfxPassword, setPfxPassword] = useState(ephemeralCertPassword || "")
  // Sync local state to context
  useEffect(() => { setEphemeralCertFile(pfxFile) }, [pfxFile, setEphemeralCertFile])
  useEffect(() => { setEphemeralCertPassword(pfxPassword) }, [pfxPassword, setEphemeralCertPassword])
  
  // Criar objeto certificadoEfemero baseado no contexto
  const certificadoEfemero = useMemo(() => {
    if (!pfxFile || !pfxPassword) return null
    return {
      arquivo: pfxFile,
      senha: pfxPassword,
      modo: "pfx"
    }
  }, [pfxFile, pfxPassword])
  // NOVO: metadados de assinatura e validação de vínculo
  const [certInfo, setCertInfo] = useState(null)
  const [signDate, setSignDate] = useState(null)
  const [linkage, setLinkage] = useState({ ok: true, errors: [], expected: { medicoId: null, pacienteId: id, consultaId } })

  // Carregar informações do médico e do paciente
  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      try {
        // Perfil do médico
        try {
          const perfil = await medicoService.getPerfil()
          const user = perfil?.user || perfil?.usuario || {}
          const medicoNome = firstNonEmpty([
            `${(user?.first_name || "")} ${(user?.last_name || "")}`.trim(),
            perfil?.nome,
            perfil?.nome_completo,
            perfil?.full_name,
            perfil?.name,
          ])
          const crm = firstNonEmpty([
            perfil?.crm,
            perfil?.matricula,
            perfil?.registro,
            perfil?.crm_numero,
            user?.crm,
          ])
          const enderecoMedico = firstNonEmpty([
            perfil?.endereco_consultorio,
            perfil?.consultorio_endereco,
            perfil?.endereco,
            user?.endereco,
            perfil?.clinica?.endereco,
          ])
          const telefoneMedico = firstNonEmpty([
            perfil?.telefone_consultorio,
            perfil?.consultorio_telefone,
            perfil?.telefone,
            user?.telefone,
            user?.phone,
            perfil?.clinica?.telefone,
            perfil?.celular,
          ])
          const emailMedico = firstNonEmpty([
            user?.email_institucional,
            user?.email,
            perfil?.email_institucional,
            perfil?.email,
            perfil?.contato_email,
          ])
          const mid = perfil?.medico?.id || perfil?.id || null
      
          // Ajuste: se temos qualquer perfil, preenche com o que estiver disponível (não zerar se faltar CRM)
          if (mounted && perfil) {
            setForm((f) => ({
              ...f,
              medico: medicoNome || f.medico,
              crm: crm || f.crm,
              endereco_consultorio: enderecoMedico || f.endereco_consultorio || "",
              telefone_consultorio: telefoneMedico || f.telefone_consultorio || "",
              email_medico: emailMedico || f.email_medico || "",
            }))
            setLinkage((lk) => ({ ...lk, expected: { ...lk.expected, medicoId: mid } }))
          }
        } catch (e) {
          // Mantém campos existentes se falhar
        }
      
      // Paciente por ID (com fallbacks robustos)
      try {
        const base = (import.meta.env.VITE_PACIENTES_ENDPOINT || "/pacientes/").replace(/\/?$/, "/")
        let data = null
        let consultaData = null
      
        // 1) Tentativa direta /pacientes/:id/
        try {
          const { data: d1 } = await api.get(`${base}${id}/`)
          data = d1
        } catch (error) {
        console.error("Erro ao carregar dados do médico:", error)
      }
      
        // 2) Fallback por query params comuns
        if (!data) {
          const candidates = [
            { id },
            { paciente_id: id },
            { user: id },
            { usuario: id },
            { user__id: id },
            { usuario_id: id },
          ]
          for (const params of candidates) {
            try {
              const { data: d2 } = await api.get(base, { params })
              const list = Array.isArray(d2?.results) ? d2.results : (Array.isArray(d2) ? d2 : [])
              if (list?.length) { data = list[0]; break }
              if (d2?.id) { data = d2; break }
            } catch (error) {
          console.error("Erro ao carregar dados do paciente:", error)
        }
          }
        }
      
        // 3) Fallback via consulta quando disponível
        if (!data && consultaId) {
          try {
            const { data: c } = await api.get(`/consultas/${consultaId}/`)
            consultaData = c
            const pac = c?.paciente || (c?.paciente_id ? { id: c.paciente_id } : null)
            if (pac) data = pac
          } catch (error) {
          console.error("Erro ao carregar dados do usuário:", error)
        }
        }
      
        // 4) Fallback: dados presentes em fromConsulta
        if (!data && fromConsulta?.paciente) {
          data = fromConsulta.paciente
        }
      
        if (mounted && data) {
           const user = data?.user || data?.usuario || {}
           const nome = firstNonEmpty([
             user?.display_name,
             `${(user?.first_name || "")} ${(user?.last_name || "")}`.trim(),
             user?.nome,
             user?.nome_completo,
             data?.nome,
             data?.nome_completo,
             data?.name,
           ])
           // data de nascimento priorizando user (tabela meu_app_user no backend) e depois paciente
           const nasc = toInputDate(
             user?.data_nascimento || user?.nascimento || user?.dob ||
             data?.data_nascimento || data?.nascimento || data?.dob ||
             ""
           )
           // Mapear CPF (fallbacks) e usar no campo "rg" por compatibilidade interna (prioriza user)
           let cpf = firstNonEmpty([
             user?.cpf,
             user?.profile?.cpf,
             user?.meu_app_user?.cpf,
             user?.dados?.cpf,
             data?.cpf,
             data?.profile?.cpf,
             data?.meu_app_user?.cpf,
             data?.dados?.cpf,
             data?.usuario?.cpf,
             data?.usuario?.profile?.cpf,
             data?.usuario?.meu_app_user?.cpf,
             fromConsulta?.paciente?.cpf,
             fromConsulta?.cpf,
             data?.documento,
             data?.doc,
             data?.rg,
           ])
           // Fallback extra: se ainda não temos CPF, tentar buscar no endpoint de usuários usando o id do usuário
           if (!cpf) {
             try {
              // Descobrir userId de forma resiliente
              let userId = null
              const isUserObj = user && typeof user === "object" && Object.keys(user).length > 0
              if (typeof user === "number" || typeof user === "string") {
                userId = user
              } else if (isUserObj) {
                userId = user.id || user.pk || user.user || user.usuario || null
              }
              if (!userId) {
                // Tenta em data (tanto id direto quanto objeto)
                userId =
                  data?.usuario?.id ||
                  data?.user?.id ||
                  data?.usuario_id ||
                  data?.user_id ||
                  (typeof data?.usuario === "number" || typeof data?.usuario === "string" ? data.usuario : null) ||
                  (typeof data?.user === "number" || typeof data?.user === "string" ? data.user : null)
              }
               if (userId) {
                 const userBase = (import.meta.env.VITE_USER_PROFILE_ENDPOINT || "/users/").replace(/\/?$/, "/")
                 const { data: ud } = await api.get(`${userBase}${userId}/`)
                 cpf = firstNonEmpty([
                   ud?.cpf,
                   ud?.profile?.cpf,
                   ud?.meu_app_user?.cpf,
                   ud?.dados?.cpf,
                 ]) || cpf
               }
             } catch (error) {
        console.error("Erro ao carregar dados da consulta:", error)
      }
           }
           const email = user?.email || data?.email || ""
           // Idade como "X anos e Y dias"
           const idade = nasc ? calcAgeYearsAndDays(nasc) : ""
           setForm((f) => ({
             ...f,
             nome_paciente: nome || f.nome_paciente,
             data_nascimento: nasc || f.data_nascimento,
             rg: f.rg || cpf, // manter chave, exibindo como CPF
             idade: f.idade || idade,
             email_paciente: f.email_paciente || email,
           }))
        }

        // 5) Verificação de integridade relacional entre consulta → médico/paciente
        try {
          const expectedMedId = (val) => (val == null ? null : String(val))
          const errs = []
          let medFromConsulta = null
          let pacFromConsulta = null
          if (consultaData) {
            medFromConsulta = consultaData?.medico?.id || consultaData?.medico || consultaData?.medico_id || null
            pacFromConsulta = consultaData?.paciente?.id || consultaData?.paciente || consultaData?.paciente_id || null
          } else if (consultaId) {
            try {
              const { data: c2 } = await api.get(`/consultas/${consultaId}/`)
              medFromConsulta = c2?.medico?.id || c2?.medico || c2?.medico_id || null
              pacFromConsulta = c2?.paciente?.id || c2?.paciente || c2?.paciente_id || null
            } catch (error) {
        console.error("Erro ao carregar dados do médico:", error)
      }
          }
          if (pacFromConsulta && String(pacFromConsulta) !== String(id)) {
            errs.push("Paciente da consulta não corresponde ao paciente exibido.")
          }
          // compara com médico esperado quando já resolvido
          setLinkage((lk) => {
            const expMed = lk.expected?.medicoId
            if (expMed && medFromConsulta && expectedMedId(expMed) !== expectedMedId(medFromConsulta)) {
              errs.push("Médico da consulta não corresponde ao médico logado.")
            }
            return { ok: errs.length === 0, errors: errs, expected: { ...lk.expected, pacienteId: id, consultaId, medicoId: expMed || lk.expected?.medicoId || null } }
          })
        } catch (error) {
          console.error("Erro ao carregar dados do paciente:", error)
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error)
      }
    } finally {
      if (mounted) setLoading(false)
    }
  }
  load()
  return () => { mounted = false }
}, [id, consultaId, fromConsulta?.cpf, fromConsulta.paciente])

  // NOVO: se vier receitaId no state, carregar do banco e preencher
  useEffect(() => {
    let mounted = true
    ;(async () => {
      if (!lastReceitaId) return
      try {
        const rec = await medicoService.getReceitaById(lastReceitaId)
        const itens = await medicoService.getReceitaItens(lastReceitaId).catch(() => [])
        const nomePac = rec?.paciente_nome || rec?.paciente?.nome || form.nome_paciente
        const idadePac = form.idade
        const rgCpf = rec?.cpf || rec?.paciente?.cpf || form.rg
        const nasc = rec?.data_nascimento || form.data_nascimento
        const meds = rec?.medicamentos || rec?.medicamento || form.medicamento
        const poso = rec?.posologia || form.posologia
        const val = rec?.validade || rec?.validade_receita || form.validade_receita
        const obs = rec?.observacoes || form.observacoes
        if (mounted) {
          setForm((f)=>({ ...f, nome_paciente:nomePac||f.nome_paciente, idade:idadePac||f.idade, rg:rgCpf||f.rg, data_nascimento:nasc||f.data_nascimento, medicamento:meds||f.medicamento, posologia:poso||f.posologia, validade_receita:toInputDate(val)||f.validade_receita, observacoes:obs||f.observacoes }))
        }
        if (mounted && Array.isArray(itens) && itens.length) {
          const mapped = itens.map((it)=>({ medicamento:{ nome: it.nome || it.medicamento_nome || it.descricao }, dose: it.dose, frequencia: it.frequencia, duracao: it.duracao, observacoes: it.observacoes, descricao: it.descricao, }))
          receitaItems.splice(0, receitaItems.length, ...mapped)
        }
      } catch (e) {
        console.warn("Falha ao carregar receita por id:", e?.message)
      }
    })()
    return ()=>{ mounted=false }
  }, [lastReceitaId])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
    // Invalida assinatura se qualquer conteúdo for alterado após assinar
    if (isSigned) {
      setIsSigned(false)
      setSignedBlob(null)
      setSignedFilename("")
      setSignDate(null)
      if (lastReceitaId) {
        medicoService.atualizarReceita(lastReceitaId, { assinada: false }).catch(() => {})
      }
      toast({ title: "Assinatura invalidada", description: "A receita foi alterada. Assine novamente para validade jurídica." })
    }
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

  // NOVO: verificação antes de ações críticas
  const ensureLinkageOrWarn = () => {
    if (!linkage?.ok) {
      toast({ title: "Vínculo inválido", description: linkage.errors?.join(" \n") || "Verifique dados da consulta, médico e paciente.", variant: "destructive" })
      // Em DEV não bloquear a ação: apenas alertar e prosseguir
      return true
    }
    return true
  }

  // Garante que exista um registro de Receita e retorna seu ID
  const ensureReceitaRecord = async () => {
    try {
      if (lastReceitaId) return lastReceitaId
      const perfil = await medicoService.getPerfil().catch(() => null)
      const mid = perfil?.medico?.id || perfil?.id || null
      const medsText = (form.medicamento || (hasStructuredItems ? receitaItems.map(it => (it.medicamento?.nome || it.descricao || '')).filter(Boolean).join('; ') : '')).trim()
      const posoText = (form.posologia || (hasStructuredItems ? receitaItems.map(it => [it.dose, it.frequencia, it.duracao].filter(Boolean).join(' ')).filter(Boolean).join(' | ') : '')).trim()
      const payload = {
        paciente_id: id,
        consulta_id: consultaId || undefined,
        medico_id: mid || undefined,
        nome_paciente: form.nome_paciente,
        cpf: form.rg,
        data_nascimento: toInputDate(form.data_nascimento),
        medicamento: medsText,
        posologia: posoText,
        validade: toInputDate(form.validade_receita),
        observacoes: form.observacoes,
        medico: form.medico,
        crm: form.crm,
        endereco_consultorio: form.endereco_consultorio,
        telefone_consultorio: form.telefone_consultorio,
        email_paciente: form.email_paciente || undefined,
      }
      const created = await medicoService.criarReceita(payload)
      const rid = created?.id || created?.receita_id || created?.uuid
      if (rid) {
        setLastReceitaId(rid)
        // Persistir itens básicos (Medicamentos e Posologia) na tabela receitaitem
        try {
          const itens = []
          
          if (hasStructuredItems) {
            receitaItems.forEach(item => {
              itens.push({
                medicamento_id: item.medicamento?.id || undefined,
                dose: item.dose || undefined,
                frequencia: item.frequencia || undefined,
                duracao: item.duracao || undefined,
                observacoes: item.observacoes || undefined,
                descricao: item.medicamento?.nome || item.descricao || undefined,
                posologia: `${item.dose || ''} ${item.frequencia || ''} ${item.duracao || ''}`.trim() || undefined
              })
            })
          } else {
            const { parsePrescriptionToItems } = await import("@/utils/aiPrescriptionParser")
            const parsed = parsePrescriptionToItems(form.medicamento || "", form.posologia || "")
            parsed.forEach((p) => itens.push({
              descricao: p.descricao || undefined,
              dose: p.dose || undefined,
              frequencia: p.frequencia || undefined,
              duracao: p.duracao || undefined,
              posologia: p.posologia || undefined,
              observacoes: p.observacoes || form.observacoes || undefined
            }))
          }
          
          if (itens.length) await medicoService.salvarItensReceita(rid, itens)
        } catch (e) {
          try { console.warn("Falha ao salvar itens da receita:", e?.response?.status, e?.response?.data || e?.message) } catch {}
        }
      }
      return rid || null
    } catch {
      return lastReceitaId || null
    }
  }

  const handleGerarDocumento = async () => {
    if (!ensureLinkageOrWarn()) return
    setSubmitLoading(true)
    try {
      // Importar o serviço de templates PDF
      const { pdfTemplateService } = await import('@/services/pdfTemplateService');
      // Garantir preenchimento de dados do médico/paciente antes da captura
      try {
        const perfil = await medicoService.getPerfil().catch(() => null)
        const userMed = perfil?.user || {}
        const medicoNome = (form.medico || `${userMed.first_name || ''} ${userMed.last_name || ''}`.trim()).trim()
        const crmVal = form.crm || perfil?.crm || perfil?.medico?.crm || ''
        const enderecoVal = form.endereco_consultorio || perfil?.endereco_consultorio || perfil?.endereco || ''
        const telefoneVal = form.telefone_consultorio || perfil?.telefone_consultorio || perfil?.telefone || ''
        setForm((f) => ({
          ...f,
          medico: medicoNome || f.medico,
          crm: crmVal || f.crm,
          endereco_consultorio: enderecoVal || f.endereco_consultorio,
          telefone_consultorio: telefoneVal || f.telefone_consultorio,
          nome_paciente: f.nome_paciente || fromConsulta?.paciente?.nome || f.nome_paciente,
        }))
        await new Promise((res) => requestAnimationFrame(() => res()))
      } catch {}
      
      // Preparar dados da receita
      const receitaData = {
        medicamento: form.medicamento,
        medicamentos: form.medicamento,
        posologia: form.posologia,
        observacoes: form.observacoes,
        validade_receita: form.validade_receita,
        data_prescricao: new Date().toISOString(),
        itens: hasStructuredItems ? receitaItems.map(item => ({
          medicamento: item.medicamento?.nome || item.descricao,
          apresentacao: item.medicamento?.apresentacao,
          concentracao: item.medicamento?.concentracao,
          fabricante: item.medicamento?.fabricante,
          dose: item.dose,
          frequencia: item.frequencia,
          duracao: item.duracao,
          posologia: `${item.dose || ''} ${item.frequencia || ''} ${item.duracao || ''}`.trim(),
          observacoes: item.observacoes
        })) : (form.medicamento ? [{
          medicamento: form.medicamento,
          posologia: form.posologia,
          observacoes: form.observacoes
        }] : []),
        hasStructuredItems
      };
      
      // Preparar dados do médico
      const medicoData = {
        nome: form.medico,
        crm: form.crm,
        especialidade: form.especialidade || '',
        endereco_consultorio: form.endereco_consultorio,
        telefone_consultorio: form.telefone_consultorio,
        email: form.email_medico || ''
      };
      
      // Preparar dados do paciente
      const pacienteData = {
        nome: form.nome_paciente,
        idade: form.idade,
        rg: form.rg,
        cpf: form.rg,
        data_nascimento: form.data_nascimento,
        endereco: form.endereco_paciente || '',
        telefone: form.telefone_paciente || ''
      };
      
      // Obter ID do médico com resolução robusta (evita usar user.id por engano)
      let medicoId = form.medico_id || null
      try {
        if (!medicoId) {
          const resolved = await medicoService._resolveMedicoId().catch(() => null)
          medicoId = resolved || localStorage.getItem('medico_id') || 'default'
        }
      } catch {
        medicoId = medicoId || localStorage.getItem('medico_id') || 'default'
      }
      
      // Gerar PDF diretamente do elemento de preview para garantir layout idêntico
      const pdfBlob = await pdfTemplateService.generatePDFFromElement('#receita-preview', {
        pageSize: 'a4',
        orientation: 'portrait',
        scale: 2,
      })
      
      // Usar o PDF gerado a partir do preview
      const generated = { 
        filename: `Receita_${form.nome_paciente || "Medica"}.pdf`, 
        blob: pdfBlob 
      };
      
      // Preparar payload com dados do paciente e médico
      const payload = {
        paciente_nome: form.nome_paciente,
        nome_paciente: form.nome_paciente,
        idade: form.idade,
        rg: form.rg,
        cpf: form.rg,
        data_nascimento: toInputDate(form.data_nascimento),
        medicamento: form.medicamento,
        medicamentos: form.medicamento,
        posologia: form.posologia,
        medico_nome: form.medico,
        medico_crm: form.crm,
        medico: form.medico,
        crm: form.crm,
        endereco_consultorio: form.endereco_consultorio,
        telefone_consultorio: form.telefone_consultorio,
        validade_receita: toInputDate(form.validade_receita),
        observacoes: form.observacoes,
        status: 'PENDENTE',
        data_prescricao: new Date().toISOString(),
      }

      const originalBlob = generated?.blob
      const baseFilename = generated?.filename || `Receita_${form.nome_paciente || "Medica"}.pdf`
      
      if (!(originalBlob instanceof Blob)) {
        throw new Error("Falha ao gerar PDF - resposta inválida")
      }
      
      // Garantir registro para QR/status
      const rid = await ensureReceitaRecord()

      // 2) Se for PDF, tentar assinar digitalmente usando o certificado do médico
      let finalBlob = originalBlob
      let finalFilename = baseFilename
      let signedOk = false
      if (String(form.formato).toLowerCase() === "pdf") {
        // Assinatura agora é uma ação manual via botão "Assinar Receita".
        // Aqui apenas preparamos o PDF gerado; sem exigir certificado nem senha.
        signedOk = false
      }

      // Atualiza estados com o último PDF gerado
      setLastGeneratedBlob(finalBlob)
      setLastGeneratedFilename(finalFilename)

      // Atualiza estados de assinatura conforme resultado
      if (signedOk) {
        setIsSigned(true)
        setSignedBlob(finalBlob)
        setSignedFilename(finalFilename)
        try {
          const preHash = await sha256Hex(originalBlob)
          const signedHash = await sha256Hex(finalBlob)
          if (rid) {
            await medicoService.atualizarReceita(rid, { assinada: true, hash_alg: "SHA-256", hash_pre: preHash, hash_documento: signedHash })
            await medicoService.registrarAuditoriaAssinatura({ receita_id: rid, valido: true, hash_alg: "SHA-256", hash_pre: preHash, hash_documento: signedHash, motivo: "Receita Médica", arquivo: finalFilename })
          }
        } catch (error) {
          console.error("Erro ao atualizar receita:", error)
        }
      } else {
        setIsSigned(false)
        setSignedBlob(null)
        setSignedFilename("")
      }

      // 3) Sempre baixar o arquivo no mesmo aba (não abrir nova guia)
      baixarBlob(finalBlob, finalFilename)

      toast({ title: "Documento gerado", description: "PDF gerado com sucesso!" })
    } catch (e) {
      console.error("Erro na geração de documento:", e)
      const detail = e?.message || "Falha ao gerar documento"
      toast({ title: "Erro", description: detail, variant: "destructive" })
    } finally {
      setSubmitLoading(false)
    }
  }

  // Ação dedicada para assinatura digital: primeiro gera o PDF e depois abre modal
  const handleAssinarReceita = async () => {
    try {
      // Primeiro gerar o PDF se ainda não foi gerado
      if (!lastGeneratedBlob) {
        await handleGerarDocumento()
      }
      
      // Verificar se o PDF foi gerado com sucesso
      if (!lastGeneratedBlob) {
        toast({ 
          title: "Erro", 
          description: "É necessário gerar o PDF antes de assinar", 
          variant: "destructive" 
        })
        return
      }
      
      // Abrir o modal de assinatura
      setSignDialogOpen(true)
    } catch (error) {
      console.error("Erro ao preparar para assinatura:", error)
      toast({ 
        title: "Erro", 
        description: "Falha ao preparar o documento para assinatura", 
        variant: "destructive" 
      })
    }
  }

  // Nova função para assinatura digital via API Flask
  const handleAssinarDigitalmente = async () => {
    try {
      if (!validado) {
        toast({ 
          title: "Receita não validada", 
          description: "Valide a receita antes de assinar digitalmente.", 
          variant: "destructive" 
        })
        return
      }

      setSubmitLoading(true)

      // Validar dados antes de enviar
      const validation = digitalSignatureService.validatePrescriptionData(form)
      if (!validation.isValid) {
        toast({
          title: "Dados incompletos",
          description: validation.errors.join(', '),
          variant: "destructive"
        })
        return
      }

      // Verificar se o serviço está disponível
      await digitalSignatureService.checkServiceStatus()

      // Preparar dados da receita para envio
      const prescriptionData = digitalSignatureService.formatPrescriptionData(form, lastReceitaId)
      
      // Criar FormData para enviar o PDF gerado no frontend
      const formData = new FormData();
      formData.append('pdf', lastGeneratedBlob, lastGeneratedFilename);
      
      // Adicionar os dados da receita ao FormData
      Object.keys(prescriptionData).forEach(key => {
        formData.append(key, prescriptionData[key]);
      });
      
      // Chamar API para assinar o PDF enviado
      const result = await digitalSignatureService.signPrescriptionWithPDF(formData)

      toast({
        title: "Sucesso",
        description: `Receita assinada digitalmente! ID: ${result.signature_id}`,
        variant: "default"
      })

      // Atualizar estado para mostrar que foi assinada
      setIsSigned(true)
      
      // Baixar o PDF assinado no mesmo aba, sem abrir nova guia
      if (result.download_url) {
        try {
          const { data, headers } = await api.get(result.download_url, { responseType: 'blob' })
          const ct = headers?.['content-type'] || 'application/pdf'
          const blob = new Blob([data], { type: ct })
          const filename = signedFilename || lastGeneratedFilename || `Receita_${form.nome_paciente || 'Medica'}_assinada.pdf`
          baixarBlob(blob, filename)
        } catch (e) {
          console.warn('Falha ao baixar via URL de download, usando arquivo local gerado.', e)
          if (signedBlob) baixarBlob(signedBlob, signedFilename || `Receita_${form.nome_paciente || 'Medica'}_assinada.pdf`)
        }
      }

    } catch (error) {
      console.error('Erro na assinatura digital:', error)
      toast({
        title: "Erro na assinatura",
        description: error.message || "Falha ao assinar digitalmente a receita.",
        variant: "destructive"
      })
    } finally {
      setSubmitLoading(false)
    }
  }

  // Estados para integração com agente local de assinatura
  const [agentAvailable, setAgentAvailable] = useState(false)

  // Quando o modal abre, tentar detectar tokens automaticamente via agente local
  useEffect(() => {
    if (!signDialogOpen) return
    let cancelled = false
    async function detect() {
      try {
        const agent = await getLocalAgent()
        const res = await agent.detectTokens()
        const list = Array.isArray(res?.tokens) ? res.tokens : (Array.isArray(res) ? res : [])
        if (!cancelled && list.length > 0) {
          setAgentAvailable(true)
          setSignMethod("token")
        } else if (!cancelled) {
          setAgentAvailable(false)
          setSignMethod("pfx")
        }
      } catch {
        if (!cancelled) {
          setAgentAvailable(false)
          setSignMethod("pfx")
        }
      }
    }
    detect()
    return () => { cancelled = true }
  }, [signDialogOpen])

  // Função auxiliar para gerar documento e hash
  async function gerarDocumentoEHash() {
    if (!lastGeneratedBlob) {
      await handleGerarDocumento()
    }
    if (!lastGeneratedBlob) {
      throw new Error("Falha ao gerar o documento")
    }
    
    const hashHex = await sha256Hex(lastGeneratedBlob)
    return { blob: lastGeneratedBlob, hashHex }
  }

  async function handleConfirmAssinar() {
    setSubmitLoading(true)
    try {
      // 1. Usar o PDF já gerado ou gerar um novo
      let pdfBlob, hashHex;
      
      if (lastGeneratedBlob) {
        // Usar o PDF já gerado
        pdfBlob = lastGeneratedBlob;
        hashHex = await sha256Hex(lastGeneratedBlob);
      } else {
        // Gerar um novo PDF
        const result = await gerarDocumentoEHash();
        pdfBlob = result.blob;
        hashHex = result.hashHex;
      }
      
      // Fluxo de assinatura via TOKEN (agente local)
      if (signMethod === 'token') {
        const agent = await getLocalAgent()
        const detection = await agent.detectTokens()
        const tokens = Array.isArray(detection?.tokens) ? detection.tokens : []
        if (!tokens.length) {
          toast({ title: "Agente local indisponível", description: "Conecte o token/smartcard e inicie o agente local em http://localhost:8172.", variant: "destructive" })
          throw new Error("Agente local não disponível")
        }

        const signResponse = await agent.signHash({ document_hash: hashHex, format: "PAdES", pin: tokenPin || undefined })
        if (signResponse?.status !== 'ok' || !signResponse?.assinatura || !signResponse?.certificado) {
          const msg = signResponse?.message || "Falha ao assinar via agente local"
          throw new Error(msg)
        }
        // Bloquear qualquer assinatura simulada
        const isMock = String(signResponse.assinatura).includes('MOCK_') || String(signResponse.certificado).includes('MOCK_')
        if (isMock) {
          toast({ title: "Assinatura inválida (mock)", description: "Inicie o agente local real ou use certificado PFX.", variant: "destructive" })
          throw new Error("Assinatura mock não aceita")
        }

        const rid = await ensureReceitaRecord()
        const pdfFile = new File([pdfBlob], lastGeneratedFilename || "receita.pdf", { type: "application/pdf" })

        // Finalizar assinatura no backend para obter PDF PADES
        let finalized
        try {
          finalized = await (await getLocalAgent()).finalizeWithBackend({
            receitaId: rid,
            pdfFile,
            assinatura: signResponse.assinatura,
            certificado: signResponse.certificado,
            cert_subject: signResponse?.certDetails?.subjectName || undefined,
            hash_pre: hashHex,
          })
        } catch (e) {
          // Fallback para método dedicado do serviço médico
          finalized = await medicoService.finalizarAssinaturaExterna({
            receitaId: rid,
            pdfFile,
            assinatura: signResponse.assinatura,
            certificado: signResponse.certificado,
          })
        }

        const finalSignedBlob = finalized?.blob
        const finalName = finalized?.filename || (lastGeneratedFilename || "receita_assinada.pdf")
        if (!(finalSignedBlob instanceof Blob)) throw new Error("Finalização da assinatura falhou")

        // Atualizações locais
        setIsSigned(true)
        setSignedBlob(finalSignedBlob)
        setSignedFilename(finalName)
        setSignDate(new Date().toISOString())
        try { setCertInfo(signResponse.certDetails || { algorithm: "SHA256-RSA" }) } catch {}

        // Persistir estado e auditoria
        try {
          const preHash = await sha256Hex(pdfBlob)
          const signedHash = await sha256Hex(finalSignedBlob)
          if (rid) {
            await medicoService.atualizarReceita(rid, { assinada: true, hash_alg: "SHA-256", hash_pre: preHash, hash_documento: signedHash })
            await medicoService.registrarAuditoriaAssinatura({ receita_id: rid, valido: true, hash_alg: "SHA-256", hash_pre: preHash, hash_documento: signedHash, motivo: "Receita Médica", arquivo: finalName })
          }
        } catch (error) {
          console.error("Erro ao atualizar registro:", error)
        }

        clearEphemeralCert()
        toast({ title: "Documento assinado", description: "Assinatura digital aplicada com sucesso." })
        setSignDialogOpen(false)
      } else if (signMethod === 'pfx') {
        // --- FLUXO SIMULADO (A1/PFX) ---
        // Validação de PFX: arquivo e senha obrigatórios
        if (!pfxFile) {
          toast({ title: "Certificado ausente", description: "Selecione o arquivo .pfx/.p12.", variant: "destructive" })
          return
        }
        const name = String(pfxFile?.name || "").toLowerCase()
        const validExt = name.endsWith(".pfx") || name.endsWith(".p12")
        if (!validExt) {
          toast({ title: "Arquivo inválido", description: "Apenas .pfx ou .p12 são aceitos.", variant: "destructive" })
          return
        }
        const maxBytes = 10 * 1024 * 1024 // 10MB
        if (pfxFile.size > maxBytes) {
          toast({ title: "Arquivo muito grande", description: "Limite de 10 MB para PFX.", variant: "destructive" })
          return
        }
        if (!pfxPassword || !pfxPassword.trim()) {
          toast({ title: "Senha obrigatória", description: "Informe a senha do certificado PFX.", variant: "destructive" })
          return
        }
        if (pfxPassword.trim().length < 4) {
          toast({ title: "Senha fraca", description: "A senha deve ter pelo menos 4 caracteres.", variant: "destructive" })
          return
        }

        const rid = await ensureReceitaRecord()
        
        // Obter informações do certificado antes de aplicar o carimbo
        let certInfo = null
        try {
          certInfo = await medicoService.getCertificadoInfo()
        } catch (error) {
          console.warn("Não foi possível obter informações do certificado:", error)
        }
        
        const stampedBlob = await medicoService.applySignatureStamp(pdfBlob, {
          signerName: form.medico || undefined,
          receitaId: rid || undefined,
          certInfo: certInfo
        })
        const pdfFile = new File([stampedBlob], lastGeneratedFilename || `Receita_${form.nome_paciente || "Medica"}.pdf`, { type: "application/pdf" })

        // Usar implementação atual (PFX via backend)
        const meta = {
          motivo: "Receita Médica",
          local: form.endereco_consultorio || "Consultório",
          receitaId: rid || undefined,
          pfxFile: pfxFile || undefined,
          pfxPassword: pfxPassword || ""
        }

        const { filename, blob } = await medicoService.signDocumento(pdfFile, meta)

        // Atualiza estados de assinatura
        setIsSigned(true)
        setSignedBlob(blob)
        setSignedFilename(filename || (lastGeneratedFilename || pdfFile.name))
        setSignDate(new Date().toISOString())

        try {
          const info = await medicoService.getCertificadoInfo()
          setCertInfo(info || null)
        } catch (error) {
          console.error("Erro ao obter informações do certificado:", error)
        }

        // Atualiza registro e auditoria com hashes
        try {
          const preHash = await sha256Hex(pdfBlob)
          const signedHash = await sha256Hex(blob)
          if (rid) {
            await medicoService.atualizarReceita(rid, { 
              assinada: true, 
              hash_alg: "SHA-256", 
              hash_pre: preHash, 
              hash_documento: signedHash, 
              motivo: "Receita Médica" 
            })
            await medicoService.registrarAuditoriaAssinatura({ 
              receita_id: rid, 
              valido: true, 
              hash_alg: "SHA-256", 
              hash_pre: preHash, 
              hash_documento: signedHash, 
              motivo: "Receita Médica", 
              arquivo: filename 
            })
          }
        } catch (error) {
          console.error("Erro ao atualizar registro:", error)
        }

        clearEphemeralCert()
        toast({ title: "Documento assinado", description: "Assinatura digital aplicada com sucesso." })
        setSignDialogOpen(false)
      } else if (signMethod === 'manual') {
        const rid = await ensureReceitaRecord()
        const stampedBlob = await medicoService.applySignatureStamp(pdfBlob, {
          signerName: form.medico || undefined,
          receitaId: rid || undefined
        })
        const filename = lastGeneratedFilename || `Receita_${form.nome_paciente || "Medica"}.pdf`
        setIsSigned(true)
        setSignedBlob(stampedBlob)
        setSignedFilename(filename)
        setSignDate(new Date().toISOString())
        try {
          const preHash = await sha256Hex(pdfBlob)
          const signedHash = await sha256Hex(stampedBlob)
          if (rid) {
            await medicoService.atualizarReceita(rid, {
              assinada: true,
              assinada_em: new Date().toISOString(),
              algoritmo_assinatura: "MANUAL",
              hash_alg: "SHA-256",
              hash_pre: preHash,
              hash_documento: signedHash,
              motivo: "Receita Médica"
            })
            await medicoService.registrarAuditoriaAssinatura({
              receita_id: rid,
              valido: true,
              tipo: "assinatura_manual",
              hash_alg: "SHA-256",
              hash_pre: preHash,
              hash_documento: signedHash,
              motivo: "Receita Médica",
              arquivo: filename
            })
          }
        } catch (error) {
          console.error("Erro ao atualizar registro:", error)
        }
        toast({ title: "Assinatura aplicada", description: "Carimbo de assinatura manual adicionado ao PDF." })
        setSignDialogOpen(false)
      }

    } catch (e) {
      const st = e?.response?.status
      const msg = e?.response?.data?.detail || e?.message || "Falha ao assinar o documento"
      console.warn("[PreviewReceita] Erro assinatura:", st, msg)
      toast({ title: "Erro na assinatura", description: `${msg}${st ? ` [HTTP ${st}]` : ""}` , variant: "destructive" })
    } finally {
      setSubmitLoading(false)
    }
  }

  // Função para gerar conteúdo automático baseado nos dados da receita
  const gerarConteudoAutomatico = useCallback(() => {
    const nomePaciente = form.nome_paciente || 'Paciente'
    const nomeMedico = form.medico || 'Dr(a).'
    
    // Gerar descrição dos medicamentos
    let medicamentos = 'medicamentos prescritos'
    if (hasStructuredItems) {
      medicamentos = receitaItems.map(item => 
        item.medicamento?.nome || item.descricao || 'Medicamento'
      ).join(', ')
    } else if (form.medicamento) {
      medicamentos = form.medicamento
    }
    
    const dataAtual = new Date().toLocaleDateString('pt-BR')
    
    // Gerar assunto do e-mail
    const assuntoEmail = `Nova Receita Médica - ${nomePaciente} - ${dataAtual}`
    
    // Gerar mensagem do e-mail
    const mensagemEmail = `Prezado(a) ${nomePaciente},

Você tem uma nova receita médica disponível, prescrita pelo ${nomeMedico} em ${dataAtual}.

Medicamentos prescritos: ${medicamentos}

Para visualizar e baixar sua receita completa, acesse sua área do paciente em nosso portal.

Atenciosamente,
${nomeMedico}
${form.endereco_consultorio || 'Consultório Médico'}
${form.telefone_consultorio || ''}`
    
    // Gerar mensagem do SMS (limitada a 160 caracteres)
    const mensagemSMS = `${nomePaciente}, você tem nova receita médica de ${nomeMedico}. Acesse o portal para visualizar. ${dataAtual}`
    
    // Gerar título da notificação interna
    const tituloInterno = `Nova Receita - ${nomeMedico}`
    
    // Gerar mensagem da notificação interna
    const mensagemInterna = `Olá ${nomePaciente}! Você tem uma nova receita médica disponível, prescrita pelo ${nomeMedico} em ${dataAtual}. Clique aqui para visualizar os detalhes e fazer o download.`
    
    return {
      assuntoEmail,
      mensagemEmail,
      mensagemSMS,
      tituloInterno,
      mensagemInterna
    }
  }, [form.nome_paciente, form.medico, form.medicamento, form.endereco_consultorio, form.telefone_consultorio, hasStructuredItems, receitaItems])

  // Estados para controle de envio multicanal
  const [canaisEnvio, setCanaisEnvio] = useState(['interno', 'email'])
  const [telefoneEnvio, setTelefoneEnvio] = useState('')
  const [configuracaoEnvio, setConfiguracaoEnvio] = useState({
    assuntoEmail: 'Nova receita médica',
    mensagemEmail: '',
    mensagemSMS: '',
    tituloInterno: 'Nova receita médica disponível',
    mensagemInterna: 'Você tem uma nova receita médica disponível. Acesse sua área do paciente para visualizar.'
  })

  // Atualizar configuração automaticamente quando os dados da receita mudarem
  useEffect(() => {
    if (form.nome_paciente && form.medico) {
      const conteudoAutomatico = gerarConteudoAutomatico()
      setConfiguracaoEnvio(prev => ({
        ...prev,
        ...conteudoAutomatico
      }))
    }
  }, [form.nome_paciente, form.medico, form.medicamento, form.endereco_consultorio, form.telefone_consultorio])

  async function handleEnviarPacienteMulticanal() {
    if (!ensureLinkageOrWarn()) return
    
    // Validar telefone se SMS estiver selecionado
    if (canaisEnvio.includes('sms')) {
      const telefoneNormalizado = telefoneEnvio?.replace(/\D/g, '');
      if (!telefoneNormalizado || telefoneNormalizado.length < 10) {
        toast({ 
          title: "Telefone inválido", 
          description: "Informe um número de telefone válido para envio por SMS.", 
          variant: "destructive" 
        })
        return
      }
    }
    
    // Validar e-mail se e-mail estiver selecionado
    if (canaisEnvio.includes('email') && !form.email_paciente?.trim()) {
      toast({ 
        title: "E-mail obrigatório", 
        description: "Informe o e-mail do paciente para envio por e-mail.", 
        variant: "destructive" 
      })
      return
    }
    
    setSubmitLoading(true)
    try {
      // 1. Primeiro, gerar o documento se ainda não foi gerado
      if (!lastGeneratedBlob) {
        await handleGerarDocumento()
      }
      
      // 2. Se não estiver assinado, tentar assinar automaticamente
      if (!isSigned || !(signedBlob instanceof Blob)) {
        // Verificar se há certificado configurado
        if (!certificadoEfemero?.arquivo) {
          toast({ 
            title: "Certificado necessário", 
            description: "Configure um certificado digital antes de enviar a receita.", 
            variant: "destructive" 
          })
          return
        }
        
        // Assinar automaticamente
        try {
          const rid = await ensureReceitaRecord()
          const pdfToSign = lastGeneratedBlob
          
          if (!pdfToSign) {
            toast({ 
              title: "Erro", 
              description: "Não foi possível gerar o documento para assinatura.", 
              variant: "destructive" 
            })
            return
          }
          
          // Usar a lógica de assinatura existente
          const signResult = await medicoService.assinarDocumento({
            pdfFile: pdfToSign,
            certificado: certificadoEfemero.arquivo,
            senha: certificadoEfemero.senha,
            motivo: "Receita Médica",
            receita_id: rid,
            modo_assinatura: certificadoEfemero.modo || "pfx"
          })
          
          if (signResult?.blob) {
            const preHash = await sha256Hex(pdfToSign)
            const signedHash = await sha256Hex(signResult.blob)
            const filename = signResult.filename || `Receita_${form.nome_paciente || "Medica"}_assinada.pdf`
            
            // Atualizar estados de assinatura
            setIsSigned(true)
            setSignedBlob(signResult.blob)
            setSignedFilename(filename)
            
            // Atualizar receita no backend
            await medicoService.atualizarReceita(rid, { 
              assinada: true, 
              hash_alg: "SHA-256", 
              hash_pre: preHash, 
              hash_documento: signedHash 
            })
            
            await medicoService.registrarAuditoriaAssinatura({ 
              receita_id: rid, 
              valido: true, 
              hash_alg: "SHA-256", 
              hash_pre: preHash, 
              hash_documento: signedHash, 
              motivo: "Receita Médica", 
              arquivo: filename 
            })
            
            toast({ 
              title: "Documento assinado", 
              description: "Receita assinada automaticamente antes do envio." 
            })
          } else {
            throw new Error("Falha na assinatura automática")
          }
        } catch (signError) {
          console.error("[PreviewReceita] Erro na assinatura automática:", signError)
          toast({ 
            title: "Erro na assinatura", 
            description: "Não foi possível assinar automaticamente. Configure o certificado e tente novamente.", 
            variant: "destructive" 
          })
          return
        }
      }
      
      // 3. Verificar novamente se está assinado após tentativa automática
      if (!isSigned || !(signedBlob instanceof Blob)) {
        toast({ 
          title: "Assinatura obrigatória", 
          description: "A receita precisa ser assinada antes do envio ao paciente.", 
          variant: "destructive" 
        })
        return
      }
      
      // 4. Persistir no banco antes do envio
      const rid = await ensureReceitaRecord()
      const fileToSend = signedBlob
      const filenameToSend = signedFilename || lastGeneratedFilename || `Receita_${form.nome_paciente || "Medica"}_assinada.pdf`

      if (rid && fileToSend instanceof Blob) {
        try {
          await medicoService.salvarArquivoAssinado(rid, fileToSend, filenameToSend)
          await medicoService.atualizarReceita(rid, {
            assinada: true,
            status: 'ASSINADA',
            assinada_em: new Date().toISOString(),
          })
        } catch (persistErr) {
          console.warn('[PreviewReceita] Falha ao persistir arquivo/estado da receita:', persistErr?.response?.status, persistErr?.response?.data || persistErr?.message)
        }
      }
      
      // Preparar dados do paciente
      const dadosPaciente = {
        nome: form.nome_paciente,
        email: form.email_paciente,
        telefone: telefoneEnvio || form.telefone_paciente
      }

      // Configurações personalizadas
      const configuracoes = {
        ...configuracaoEnvio,
        linkSite: window.location.origin,
        linkDownload: rid ? `${window.location.origin}/api/receitas/${rid}/download/` : null
      }

      // Enviar através dos canais selecionados
      const resultados = await notificationService.enviarReceitaMulticanal({
        pacienteId: id,
        receitaId: rid,
        arquivo: fileToSend,
        nomeArquivo: filenameToSend,
        canais: canaisEnvio,
        dadosPaciente,
        configuracoes
      })

      // Verificar resultados e mostrar feedback
      const sucessos = []
      const erros = []

      if (resultados.interno) sucessos.push('notificação interna')
      if (resultados.email) sucessos.push('e-mail')
      if (resultados.sms) sucessos.push('SMS')
      
      resultados.erros.forEach(erro => {
        erros.push(`${erro.canal}: ${erro.erro}`)
      })

      if (sucessos.length > 0) {
        toast({ 
          title: "Receita enviada", 
          description: `Receita enviada com sucesso via: ${sucessos.join(', ')}.${erros.length > 0 ? ` Falhas: ${erros.join('; ')}` : ''}` 
        })
      } else {
        toast({ 
          title: "Erro no envio", 
          description: `Falha em todos os canais: ${erros.join('; ')}`, 
          variant: "destructive" 
        })
      }

      // Navegar para confirmação se pelo menos um canal funcionou
      if (sucessos.length > 0) {
        navigate(`/medico/paciente/${id}/receita/confirmacao`, { 
          state: { 
            receitaId: rid || null, 
            email: form.email_paciente || null, 
            filename: filenameToSend,
            canaisEnviados: sucessos,
            resultados
          } 
        })
      }
    } catch (e) {
      const st = e?.response?.status
      const msg = e?.response?.data?.detail || e?.message || "Falha ao enviar a receita"
      toast({ title: "Erro ao enviar", description: `${msg}${st ? ` [HTTP ${st}]` : ""}`, variant: "destructive" })
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
            {/* Alerta de vinculação quando houver inconsistências */}
            {!linkage.ok ? (
              <div className="rounded-md border border-red-200 bg-red-50 text-red-700 p-3 text-sm">
                <div className="font-medium mb-1">Inconsistências de vínculo detectadas</div>
                <ul className="list-disc pl-5 space-y-1">
                  {linkage.errors?.map((e, i) => (<li key={i}>{e}</li>))}
                </ul>
              </div>
            ) : null}

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
                <Label>CPF</Label>
                <Input name="rg" value={form.rg} onChange={handleChange} placeholder="000.000.000-00" />
              </div>
              <div>
                <Label>Data de Nascimento</Label>
                <DatePicker name="data_nascimento" value={toInputDate(form.data_nascimento)} onChange={(val) => handleChange({ target: { name: "data_nascimento", value: val } })} maxDate={new Date()} />
              </div>
            </div>

            <div>
              <Label>Medicamentos e Posologia</Label>
              {hasStructuredItems ? (
                <div className="space-y-3 border rounded-md p-3 bg-muted/20">
                  <div className="text-sm font-medium text-muted-foreground">Itens estruturados:</div>
                  {receitaItems.map((item, index) => (
                    <div key={index} className="border-l-2 border-primary/20 pl-3 space-y-1">
                      <div className="font-medium">
                        {item.medicamento?.nome || item.descricao || `Item ${index + 1}`}
                      </div>
                      {item.medicamento?.apresentacao && (
                        <div className="text-sm text-muted-foreground">
                          {item.medicamento.apresentacao}
                        </div>
                      )}
                      {(item.dose || item.frequencia || item.duracao) && (
                        <div className="text-sm">
                          {[item.dose, item.frequencia, item.duracao].filter(Boolean).join(' • ')}
                        </div>
                      )}
                      {item.observacoes && (
                        <div className="text-sm text-muted-foreground italic">
                          {item.observacoes}
                        </div>
                      )}
                    </div>
                  ))}
                  <div className="text-xs text-muted-foreground mt-2">
                    Campos legados serão preenchidos automaticamente para compatibilidade.
                  </div>
                </div>
              ) : (
                <>
                  <Textarea name="medicamento" rows={3} value={form.medicamento} onChange={handleChange} placeholder="Nome do medicamento, dose, apresentação..." />
                  <div className="mt-2">
                    <Label>Posologia</Label>
                    <Textarea name="posologia" rows={3} value={form.posologia} onChange={handleChange} placeholder="Ex: 1 comprimido de 12/12h por 7 dias" />
                  </div>
                </>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Validade da Receita</Label>
                <DatePicker name="validade_receita" value={toInputDate(form.validade_receita)} onChange={(val) => handleChange({ target: { name: "validade_receita", value: val } })} minDate={new Date()} />
              </div>
              <div>
                <Label>Formato</Label>
                <select className="border rounded h-10 px-3 bg-background" name="formato" value={form.formato} onChange={handleChange}>
                  <option value="pdf">PDF</option>
                  <option value="docx">DOCX</option>
                </select>
              </div>
            </div>

            {/* Dados já preenchidos automaticamente - campos removidos para simplificar o fluxo */}

            {/* Configurações de Envio Multicanal */}
            <div className="border-t pt-4 mt-4">
              <Label className="text-base font-semibold">Opções de Envio</Label>
              <div className="space-y-4 mt-3">
                
                {/* Seleção de Canais */}
                <div>
                  <Label className="text-sm font-medium">Canais de Envio</Label>
                  <div className="flex flex-wrap gap-4 mt-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="canal-interno" 
                        checked={canaisEnvio.includes('interno')}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setCanaisEnvio([...canaisEnvio, 'interno'])
                          } else {
                            setCanaisEnvio(canaisEnvio.filter(c => c !== 'interno'))
                          }
                        }}
                      />
                      <Label htmlFor="canal-interno" className="flex items-center gap-1">
                        <Bell className="h-4 w-4" />
                        Notificação Interna
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="canal-email" 
                        checked={canaisEnvio.includes('email')}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setCanaisEnvio([...canaisEnvio, 'email'])
                          } else {
                            setCanaisEnvio(canaisEnvio.filter(c => c !== 'email'))
                          }
                        }}
                      />
                      <Label htmlFor="canal-email" className="flex items-center gap-1">
                        <Mail className="h-4 w-4" />
                        E-mail
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="canal-sms" 
                        checked={canaisEnvio.includes('sms')}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setCanaisEnvio([...canaisEnvio, 'sms'])
                          } else {
                            setCanaisEnvio(canaisEnvio.filter(c => c !== 'sms'))
                          }
                        }}
                      />
                      <Label htmlFor="canal-sms" className="flex items-center gap-1">
                        <Smartphone className="h-4 w-4" />
                        SMS
                      </Label>
                    </div>
                  </div>
                </div>

                {/* Campo de telefone para SMS */}
                {canaisEnvio.includes('sms') && (
                  <div>
                    <Label>Telefone para SMS</Label>
                    <Input 
                      value={telefoneEnvio} 
                      onChange={(e) => setTelefoneEnvio(e.target.value)}
                      placeholder="(11) 99999-9999" 
                    />
                    {telefoneEnvio && !/^\(?[1-9]{2}\)?\s?9?\d{4}-?\d{4}$/.test(telefoneEnvio.replace(/\D/g, '')) && (
                      <div className="text-xs text-red-500 mt-1">
                        Formato inválido. Use: (11) 99999-9999 ou 11999999999
                      </div>
                    )}
                  </div>
                )}

                {/* Configurações de E-mail - Simplificadas */}
                {canaisEnvio.includes('email') && (
                  <div className="text-sm text-muted-foreground">
                    ✓ E-mail será enviado automaticamente com assunto e mensagem padrão
                  </div>
                )}

                {/* Configurações de SMS - Simplificadas */}
                {canaisEnvio.includes('sms') && (
                  <div className="text-sm text-muted-foreground">
                    ✓ SMS será enviado automaticamente com mensagem padrão
                  </div>
                )}

                {/* Configurações de Notificação Interna - Simplificadas */}
                {canaisEnvio.includes('interno') && (
                  <div className="text-sm text-muted-foreground">
                    ✓ Notificação interna será enviada automaticamente
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label>Observações (opcional)</Label>
              <Textarea name="observacoes" rows={2} value={form.observacoes} onChange={handleChange} placeholder="Orientações adicionais ao paciente" />
            </div>

            <div className="flex flex-wrap gap-3 pt-4 border-t">
              <Button 
                type="button" 
                onClick={handleValidar} 
                variant={validado ? "secondary" : "default"}
                className="flex items-center gap-2"
              >
                <CheckCircle2 className="h-4 w-4" /> 
                {validado ? "✓ Validado" : "Validar Receita"}
              </Button>
              
              <Button 
                type="button" 
                onClick={handleGerarDocumento} 
                disabled={submitLoading}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Printer className="h-4 w-4" /> 
                {submitLoading ? "Gerando..." : "Gerar PDF"}
              </Button>
              
              <Button 
                type="button" 
                variant={isSigned ? "default" : "default"} 
                onClick={handleAssinarReceita} 
                disabled={submitLoading || !validado}
                className={`flex items-center gap-2 ${
                  isSigned 
                    ? "bg-green-600 hover:bg-green-700 text-white" 
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
              >
                <Shield className="h-4 w-4" />
                {submitLoading ? 'Assinando...' : isSigned ? '✓ Assinada Digitalmente' : 'Assinar Receita'}
              </Button>
              
              <Button 
                type="button" 
                variant="secondary" 
                onClick={handleEnviarPacienteMulticanal} 
                disabled={submitLoading || canaisEnvio.length === 0 || !isSigned}
                className="flex items-center gap-2"
              >
                {canaisEnvio.includes('interno') && <Bell className="h-4 w-4" />}
                {canaisEnvio.includes('email') && <Mail className="h-4 w-4" />}
                {canaisEnvio.includes('sms') && <Smartphone className="h-4 w-4" />}
                {canaisEnvio.length === 0 ? 'Selecione um canal' : 
                 canaisEnvio.length === 1 ? `Enviar via ${canaisEnvio[0] === 'interno' ? 'Interno' : canaisEnvio[0] === 'email' ? 'E-mail' : 'SMS'}` :
                 `Enviar via ${canaisEnvio.length} canais`}
              </Button>
            </div>


          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader>
            <CardTitle>Pré-visualização</CardTitle>
          </CardHeader>
          <CardContent>
            <div id="receita-preview" className="mx-auto bg-white shadow-md border rounded-md p-6 max-w-[800px] aspect-[1/1.414] overflow-auto">
              {/* Cabeçalho */}
              {templateStyles.logoPosition === 'center' ? (
                <div 
                  className={`${templateStyles.headerBorderBottom ? 'border-b' : ''} pb-3 flex flex-col items-center`}
                  style={{ backgroundColor: templateStyles.headerBgColor, borderBottomColor: templateStyles.headerBorderColor }}
                >
                  {templateStyles.showLogo && doctorLogo?.data ? (
                    <img src={doctorLogo.data} alt="Logo" className="max-h-20 max-w-[150px] object-contain" />
                  ) : null}
                  <div className="mt-2 text-center w-full">
                    <div className="font-bold" style={{ fontSize: templateStyles.titleSize, color: templateStyles.primaryColor }}>
                      {templateConfig?.branding?.clinicName || form.medico || 'Consultório Médico'}
                    </div>
                    {templateConfig?.header?.showDoctorInfo && (
                      <>
                        <div className="font-semibold" style={{ color: templateStyles.primaryColor }}>{form.medico}</div>
                        {form.crm && (
                          <div style={{ fontSize: templateStyles.smallSize, color: templateStyles.secondaryColor }}>CRM: {form.crm}</div>
                        )}
                      </>
                    )}
                    <div className="text-sm" style={{ fontSize: templateStyles.smallSize, color: templateStyles.secondaryColor }}>
                      {templateConfig?.branding?.clinicAddress || form.endereco_consultorio}
                    </div>
                    <div className="text-sm" style={{ fontSize: templateStyles.smallSize, color: templateStyles.secondaryColor }}>
                      Telefone: {templateConfig?.branding?.clinicPhone || form.telefone_consultorio}
                    </div>
                    {(templateConfig?.branding?.clinicEmail || form.email_medico) ? (
                      <div className="text-sm" style={{ fontSize: templateStyles.smallSize, color: templateStyles.secondaryColor }}>
                        E-mail: {templateConfig?.branding?.clinicEmail || form.email_medico}
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div 
                  className={`flex items-center justify-between ${templateStyles.headerBorderBottom ? 'border-b' : ''} pb-3`}
                  style={{ backgroundColor: templateStyles.headerBgColor, borderBottomColor: templateStyles.headerBorderColor }}
                >
                  {/* Logo à esquerda ou direita conforme configuração */}
                  {templateStyles.logoPosition === 'left' && templateStyles.showLogo && doctorLogo?.data ? (
                    <img src={doctorLogo.data} alt="Logo" className="max-h-20 max-w-[150px] object-contain" />
                  ) : null}
                  <div className={`${templateStyles.doctorInfoPosition === 'center' ? 'text-center' : templateStyles.doctorInfoPosition === 'left' ? 'text-left' : 'text-right'} flex-1 ml-4`}>
                    <div className="font-bold" style={{ fontSize: templateStyles.titleSize, color: templateStyles.primaryColor }}>
                      {templateConfig?.branding?.clinicName || form.medico || 'Consultório Médico'}
                    </div>
                    {templateConfig?.header?.showDoctorInfo && (
                      <>
                        <div className="font-semibold" style={{ color: templateStyles.primaryColor }}>{form.medico}</div>
                        {form.crm && (
                          <div style={{ fontSize: templateStyles.smallSize, color: templateStyles.secondaryColor }}>CRM: {form.crm}</div>
                        )}
                      </>
                    )}
                    <div className="text-sm" style={{ fontSize: templateStyles.smallSize, color: templateStyles.secondaryColor }}>
                      {templateConfig?.branding?.clinicAddress || form.endereco_consultorio}
                    </div>
                    <div className="text-sm" style={{ fontSize: templateStyles.smallSize, color: templateStyles.secondaryColor }}>
                      Telefone: {templateConfig?.branding?.clinicPhone || form.telefone_consultorio}
                    </div>
                    {(templateConfig?.branding?.clinicEmail || form.email_medico) ? (
                      <div className="text-sm" style={{ fontSize: templateStyles.smallSize, color: templateStyles.secondaryColor }}>
                        E-mail: {templateConfig?.branding?.clinicEmail || form.email_medico}
                      </div>
                    ) : null}
                  </div>
                  {templateStyles.logoPosition === 'right' && templateStyles.showLogo && doctorLogo?.data ? (
                    <img src={doctorLogo.data} alt="Logo" className="max-h-20 max-w-[150px] object-contain" />
                  ) : null}
                </div>
              )}

              {/* Corpo */}
              <div className="text-center my-4">
                <div><span className="font-medium">Nome do Paciente: </span>{form.nome_paciente}</div>
                <div><span className="font-medium">Idade: </span>{form.idade}</div>
                <div><span className="font-medium">CPF: </span>{form.rg}</div>
                <div><span className="font-medium">Data de Nascimento: </span>{form.data_nascimento}</div>
              </div>

              <div className="text-center text-xl font-semibold my-4">
                Prescrição Médica
                {isSigned && (
                  <div className="text-sm text-green-600 font-normal mt-1">
                    ✓ Assinada Digitalmente
                  </div>
                )}
                {!isSigned && (
                  <div className="text-sm text-orange-600 font-normal mt-1">
                    ⚠ Aguardando Assinatura Digital
                  </div>
                )}
              </div>

              <div className="text-center">
                {hasStructuredItems ? (
                  <div className="space-y-4">
                    {receitaItems.map((item, index) => (
                      <div key={index} className="border-b border-muted pb-3 last:border-b-0">
                        <div className="font-semibold">
                          {item.medicamento?.nome || item.descricao || `Medicamento ${index + 1}`}
                        </div>
                        {item.medicamento?.apresentacao && (
                          <div className="text-sm text-muted-foreground mt-1">
                            {item.medicamento.apresentacao}
                          </div>
                        )}
                        {(item.dose || item.frequencia || item.duracao) && (
                          <div className="mt-2">
                            {[item.dose, item.frequencia, item.duracao].filter(Boolean).join(' • ')}
                          </div>
                        )}
                        {item.observacoes && (
                          <div className="text-sm text-muted-foreground mt-1 italic">
                            {item.observacoes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    <div className="whitespace-pre-wrap font-semibold">{form.medicamento}</div>
                    {form.posologia ? (
                      <div className="mt-2 whitespace-pre-wrap">{form.posologia}</div>
                    ) : null}
                  </>
                )}
              </div>

              <div className="text-center my-6">
                <div>Data de Emissão: {todayStr}</div>
                <div>Validade da Receita: {form.validade_receita || ""}</div>
              </div>

              {/* Assinatura/QR */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start mt-6">
                <div className="text-center">
                  <div className="mx-auto w-64 border-t pt-1">&nbsp;</div>
                  {form.medico && (
                    <div>Dr(a). {form.medico}{form.crm ? ` • CRM ${form.crm}` : ""}</div>
                  )}
                {isSigned ? (
                    certInfo ? (
                      <div className="text-xs text-muted-foreground mt-1">
                        Assinado digitalmente conforme ICP-Brasil
                        {certInfo?.subject_name || certInfo?.nome || certInfo?.subject ? (
                          <> • Titular: {certInfo?.subject_name || certInfo?.nome || certInfo?.subject}</>
                        ) : null}
                        {form.crm ? (
                          <> • CRM: {form.crm}</>
                        ) : null}
                        {form.rg ? (
                          <> • CPF: {form.rg}</>
                        ) : null}
                        {certInfo?.algorithm ? (
                          <> • Algoritmo: {certInfo.algorithm}</>
                        ) : (
                          <> • Algoritmo: SHA256-RSA</>
                        )}
                        {signDate ? (
                          <> • Carimbo: {new Date(signDate).toLocaleString()}</>
                        ) : null}
                        {(certInfo?.valid_to || certInfo?.not_after || certInfo?.valid_until) ? (
                          <> • Válido até: {new Date(certInfo?.valid_to || certInfo?.not_after || certInfo?.valid_until).toLocaleDateString()}</>
                        ) : null}
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground mt-1">
                        Assinada manualmente com carimbo visual
                        {form.medico ? (
                          <> • Médico: {form.medico}</>
                        ) : null}
                        {form.crm ? (
                          <> • CRM: {form.crm}</>
                        ) : null}
                        {signDate ? (
                          <> • Data: {new Date(signDate).toLocaleString()}</>
                        ) : null}
                      </div>
                    )
                  ) : (
                  <div className="text-xs text-muted-foreground mt-1">
                    Documento gerado. Assine para exibir o selo de assinatura digital.
                  </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal de Assinatura - Interface Melhorada */}
      <Dialog open={signDialogOpen} onOpenChange={setSignDialogOpen}>
        <DialogContent className="sm:max-w-[500px] space-y-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              Assinatura Digital da Receita
            </DialogTitle>
            <DialogDescription>
              Escolha o método de assinatura digital para validar juridicamente a receita médica.
            </DialogDescription>
          </DialogHeader>

          <Separator />

          <Tabs value={signMethod} onValueChange={setSignMethod} className="w-full">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="token" className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Token/Smartcard
              </TabsTrigger>
              <TabsTrigger value="pfx" className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                Certificado PFX
              </TabsTrigger>
              <TabsTrigger value="manual" className="flex items-center gap-2">
                <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                Assinatura Manual
              </TabsTrigger>
            </TabsList>

            <TabsContent value="token" className="space-y-4">
              <div className="rounded-lg border border-green-200 bg-green-50 p-4 space-y-3">
                <div className="flex items-center gap-2 text-green-800">
                  <Shield className="h-4 w-4" />
                  <span className="font-medium">Assinatura via Token</span>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="token-pin">PIN do Token</Label>
                  <Input 
                    id="token-pin"
                    type="password" 
                    value={tokenPin} 
                    onChange={(e) => setTokenPin(e.target.value)} 
                    placeholder="Digite o PIN do seu token"
                    className="bg-white"
                  />
                </div>
                <p className="text-xs text-green-700">
                  ✓ Conecte seu token USB ou smartcard e insira o PIN para assinar digitalmente.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="pfx" className="space-y-4">
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-3">
                <div className="flex items-center gap-2 text-blue-800">
                  <Shield className="h-4 w-4" />
                  <span className="font-medium">Certificado Digital PFX</span>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pfx-file">Arquivo do Certificado</Label>
                  <Input
                    id="pfx-file"
                    type="file"
                    accept=".pfx,.p12"
                    className="bg-white"
                    onChange={(e) => {
                      const f = e.target.files?.[0] || null
                      if (!f) { setPfxFile(null); return }
                      const name = (f.name || "").toLowerCase()
                      const validExt = name.endsWith(".pfx") || name.endsWith(".p12")
                      const maxBytes = 10 * 1024 * 1024
                      if (!validExt) {
                        toast({ title: "Arquivo inválido", description: "Selecione um arquivo .pfx ou .p12.", variant: "destructive" })
                        e.target.value = ""
                        setPfxFile(null)
                        return
                      }
                      if (f.size > maxBytes) {
                        toast({ title: "Arquivo muito grande", description: "Limite de 10 MB para certificados PFX.", variant: "destructive" })
                        e.target.value = ""
                        setPfxFile(null)
                        return
                      }
                      setPfxFile(f)
                    }}
                  />
                  {pfxFile && (
                    <div className="text-xs text-blue-700 bg-blue-100 p-2 rounded">
                      ✓ Selecionado: {pfxFile.name} ({Math.ceil(pfxFile.size/1024)} KB)
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pfx-password">Senha do Certificado</Label>
                  <Input 
                    id="pfx-password"
                    type="password" 
                    value={pfxPassword} 
                    onChange={(e) => setPfxPassword(e.target.value)} 
                    placeholder="Digite a senha do certificado"
                    className="bg-white"
                  />
                  {(!pfxPassword || !pfxPassword.trim()) && (
                    <p className="text-xs text-red-600">⚠ Senha obrigatória para assinatura digital.</p>
                  )}
                </div>
                <p className="text-xs text-blue-700">
                  ✓ Selecione seu certificado digital (.pfx ou .p12) e informe a senha.
                </p>
              </div>
            </TabsContent>
            <TabsContent value="manual" className="space-y-4">
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
                <div className="flex items-center gap-2 text-amber-800">
                  <Shield className="h-4 w-4" />
                  <span className="font-medium">Assinatura Manual com Carimbo Visual</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome do Médico</Label>
                    <Input value={form.medico || ""} readOnly disabled className="bg-white" />
                  </div>
                  <div className="space-y-2">
                    <Label>CRM</Label>
                    <Input value={form.crm || ""} readOnly disabled className="bg-white" />
                  </div>
                </div>
                <p className="text-xs text-amber-700">
                  ✓ Aplica um carimbo com nome e data na última página e adiciona QR para verificação.
                </p>
                <p className="text-xs text-muted-foreground">
                  Use quando não houver certificado digital. O documento fica identificado e auditável.
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setSignDialogOpen(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button 
              type="button" 
              onClick={handleConfirmAssinar} 
              disabled={submitLoading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {submitLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Assinando...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  Confirmar e Assinar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
