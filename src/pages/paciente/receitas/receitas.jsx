import { useEffect, useMemo, useState } from "react"
import { pacienteService } from "../../../services/pacienteService"
import { useToast } from "../../../hooks/use-toast"
import './receitas.css'
import { ProfileTabs } from "@/components/profile-tabs"
import { 
  Pill, 
  Download, 
  Search, 
  Calendar,
  FileText,
  Activity,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Info,
  Stethoscope,
  Plus,
  Eye,
  User,
  RefreshCw,
  Filter,
  History,
  CheckCircle,
  XCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue, SelectLabel } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import api from "@/services/api"
import ReceitaPreviewLayout from "@/components/ReceitaPreviewLayout"
import { loadTemplateConfig, loadDoctorLogo } from "@/utils/pdfTemplateUtils"
import { createRoot } from "react-dom/client"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function ReceitasPaciente() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState("")
  const [receitas, setReceitas] = useState([])
  const [medicos, setMedicos] = useState([])
  const [solicitarOpen, setSolicitarOpen] = useState(false)
  const [form, setForm] = useState({ medico: "", observacoes: "" })
  const [submitting, setSubmitting] = useState(false)
  const [busca, setBusca] = useState("")
  const [abaAtiva, setAbaAtiva] = useState("todas")
  const [emptyMsg, setEmptyMsg] = useState("")
  const [isFallback, setIsFallback] = useState(false)
  
  // Dados de exemplo para fallback quando a API falhar
  const receitasExemplo = useMemo(() => [
    {
      id: "exemplo-1",
      created_at: "2024-01-15T10:30:00Z",
      medicamentos: "Paracetamol 750mg - 1 comprimido de 8/8h se dor",
      posologia: "Conforme prescrição médica",
      observacoes: "Tomar com água, após as refeições",
      validade: "2024-07-15",
      status: "ativa",
      situacao: "finalizada",
      arquivo_assinado: null,
      medico: {
        id: 1,
        nome: "Dr. João Silva",
        especialidade: "Clínico Geral",
        crm: "12345-SP"
      },
      consulta: {
        id: 1,
        data: "2024-01-15",
        paciente_id: 1
      }
    },
    {
      id: "exemplo-2", 
      created_at: "2023-12-10T14:20:00Z",
      medicamentos: "Amoxicilina 500mg - 1 cápsula de 8/8h por 7 dias",
      posologia: "Via oral",
      observacoes: "Completar todo o tratamento mesmo com melhora dos sintomas",
      validade: "2024-06-10",
      status: "expirada",
      situacao: "finalizada",
      arquivo_assinado: null,
      medico: {
        id: 2,
        nome: "Dra. Maria Santos",
        especialidade: "Pediatra", 
        crm: "67890-SP"
      },
      consulta: {
        id: 2,
        data: "2023-12-10",
        paciente_id: 1
      }
    }
  ], [])

  const medicosExemplo = useMemo(() => [
    {
      id: 1,
      nome: "Dr. João Silva",
      especialidade: "Clínico Geral",
      crm: "12345-SP"
    },
    {
      id: 2,
      nome: "Dra. Maria Santos", 
      especialidade: "Pediatra",
      crm: "67890-SP"
    }
  ], [])
  
  // Filtrar itens inválidos para evitar <SelectItem value=""> (Radix não permite valor vazio)
  const medicosValidos = useMemo(() =>
    Array.isArray(medicos)
      ? medicos.filter((m) => m && String(m.id ?? "").trim() !== "")
      : []
  , [medicos])

  // Helper robusto para exibir o nome do médico
  const getDoctorName = (med) => {
    const user = med?.user
    const full = [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim()
    return (
      full ||
      user?.nome ||
      user?.username ||
      med?.nome ||
      med?.name ||
      med?.full_name ||
      med?.medico_nome ||
      med?.doctor_name ||
      "Médico"
    )
  }

  // Usar apenas receitas da API (dados reais do banco de dados)
  const todasReceitas = useMemo(() => {
    const apiReceitas = Array.isArray(receitas) ? receitas : (Array.isArray(receitas?.results) ? receitas.results : [])
    return apiReceitas.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
  }, [receitas])

  const hasReceitas = useMemo(() => {
    return todasReceitas.length > 0
  }, [todasReceitas])

  // Filtrar receitas por aba ativa
  const receitasFiltradas = useMemo(() => {
    let filtradas = todasReceitas

    // Para debug, vamos mostrar todas as receitas na aba "todas"
    if (abaAtiva === "todas") {
      // Não aplicar filtros, mostrar todas
      filtradas = todasReceitas
    } else if (abaAtiva === "ativas") {
      filtradas = filtradas.filter(r => {
        const validade = r.validade || r.validade_receita
        if (validade) {
          const dataValidade = new Date(validade)
          const hoje = new Date()
          return dataValidade >= hoje
        }
        return true // Se não tem validade, considera ativa
      })
    } else if (abaAtiva === "historico") {
      filtradas = filtradas.filter(r => {
        const validade = r.validade || r.validade_receita
        if (validade) {
          const dataValidade = new Date(validade)
          const hoje = new Date()
          return dataValidade < hoje
        }
        return false // Se não tem validade, não vai para histórico
      })
    }

    // Filtrar por busca
    if (busca) {
      const term = busca.toLowerCase()
      filtradas = filtradas.filter(r => {
        const medicoNome = getDoctorName(r.medico) || getDoctorName(r.consulta?.medico) || ""
        const medicamentos = r.medicamentos || ""
        const observacoes = r.observacoes || ""
        return (
          medicoNome.toLowerCase().includes(term) ||
          medicamentos.toLowerCase().includes(term) ||
          observacoes.toLowerCase().includes(term)
        )
      })
    }

    return filtradas
  }, [todasReceitas, abaAtiva, busca])

  // Função para determinar status da receita
  const getStatusReceita = (receita) => {
    const validade = receita.validade || receita.validade_receita
    if (validade) {
      const dataValidade = new Date(validade)
      const hoje = new Date()
      return dataValidade >= hoje ? "ativa" : "expirada"
    }
    const status = receita.status || receita.situacao || "ativa"
    return status.toLowerCase()
  }

  // Função para obter cor do badge de status
  const getStatusColor = (status) => {
    switch (status) {
      case "ativa":
      case "valida":
      case "válida":
        return "bg-green-100 text-green-800 border-green-200"
      case "expirada":
      case "vencida":
      case "inativa":
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  // Calcular estatísticas baseadas nas receitas filtradas
  const receitasAtivas = useMemo(() => {
    return todasReceitas.filter(r => getStatusReceita(r) === "ativa").length
  }, [todasReceitas])

  const receitasExpiradas = useMemo(() => {
    return todasReceitas.filter(r => getStatusReceita(r) === "expirada").length
  }, [todasReceitas])

  useEffect(() => {
    let mounted = true
    
    const load = async () => {
      setLoading(true)
      setErro("")
      
      try {
        // Carregar receitas
        let receitasResult = []
        try {
          const r = await pacienteService.getReceitas()
          receitasResult = Array.isArray(r) ? r : (r?.results || [])
        } catch (receitasError) {
          console.error('Erro ao carregar receitas:', receitasError.message)
          // Continuar mesmo com erro nas receitas
        }

        // Carregar médicos vinculados
        let medicosResult = []
        try {
          const ms = await pacienteService.getMedicosVinculados()
          medicosResult = Array.isArray(ms) ? ms : (ms?.results || [])
        } catch (medicosError) {
          console.error('Erro ao carregar médicos vinculados:', medicosError.message)
        }

        if (!mounted) return

        setReceitas(receitasResult)
        setMedicos(medicosResult)

        // Fallback: se não vier médico vinculado, tenta listar geral
        if (medicosResult.length === 0) {
          try {
            const all = await pacienteService.getMedicos({ limit: 50 })
            const arr = Array.isArray(all) ? all : all?.results || []
            if (mounted && arr.length > 0) {
              setMedicos(arr)
            }
          } catch (fallbackError) {
            console.error('Erro no fallback de médicos:', fallbackError.message)
          }
        }

        if (receitasResult.length === 0) {
          setReceitas(receitasExemplo)
          setEmptyMsg("Exibindo dados de exemplo. Conecte-se à API para ver suas receitas reais.")
          setIsFallback(true)
        } else {
          setIsFallback(false)
        }

      } catch (e) {
        console.error('Erro ao carregar dados:', e.message)
        if (!mounted) return
        setReceitas(receitasExemplo)
        setEmptyMsg("Exibindo dados de exemplo. Conecte-se à API para ver suas receitas reais.")
        setIsFallback(true)
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }
    
    load()
    
    return () => {
      mounted = false
    }
  }, [])

  const handleSolicitar = async (e) => {
    e.preventDefault()
    if (!form.medico) {
      toast({ title: "Selecione um médico", description: "Escolha o médico para enviar a solicitação." })
      return
    }
    setSubmitting(true)
    try {
      if (form.renovacao) {
        await pacienteService.solicitarRenovacao({ medico: form.medico, mensagem: form.mensagem, receita: form.receita })
        toast({ title: "Renovação enviada", description: "Seu pedido de renovação foi enviado ao médico." })
      } else {
        await pacienteService.solicitarReceita({ medico: form.medico, mensagem: form.mensagem, receita: form.receita })
        toast({ title: "Solicitação enviada", description: "Seu pedido de receita foi enviado ao médico." })
      }
      setSolicitarOpen(false)
      setForm({ medico: "", mensagem: "", receita: null, renovacao: false })
    } catch (err) {
      console.error('Erro ao solicitar receita:', err)
      toast({
        title: "Erro ao solicitar",
        description: err?.response?.data?.detail || err?.message || "Não foi possível enviar a solicitação.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Download autenticado do PDF assinado
  const handleDownloadAssinado = async (url, r) => {
    try {
      if (!url) return

      const downloadBlob = (blob, filename) => {
        const link = document.createElement("a")
        const objUrl = URL.createObjectURL(blob)
        link.href = objUrl
        link.download = decodeURIComponent(filename)
        document.body.appendChild(link)
        link.click()
        link.remove()
        setTimeout(() => URL.revokeObjectURL(objUrl), 2000)
      }

      const ensurePdfExt = (name, fallback = "Receita_Medica.pdf") => {
        let n = name || fallback
        if (!/\.[a-z0-9]+$/i.test(n)) n += ".pdf"
        return n
      }

      // data: URL -> converter em Blob e baixar
      if (/^data:/i.test(url)) {
        try {
          const arr = url.split(",")
          const header = arr[0] || ""
          const base64 = arr.slice(1).join(",")
          const mime = (header.match(/data:([^;]+)/i) || [])[1] || "application/pdf"
          const binary = atob(base64)
          const len = binary.length
          const bytes = new Uint8Array(len)
          for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i)
          const blob = new Blob([bytes], { type: mime })
          const baseName = `Receita_${r?.id || "documento"}`
          const filename = ensurePdfExt(baseName)
          downloadBlob(blob, filename)
          return
        } catch (e) {
          console.error("[Receitas] Falha ao processar data URL:", e)
          toast({ title: "Falha no download", description: "Arquivo inválido ou corrompido.", variant: "destructive" })
          return
        }
      }

      // blob: URL -> tentar fetch para reidratar. Se não for do mesmo contexto, avisa o usuário.
      if (/^blob:/i.test(url)) {
        try {
          const resp = await fetch(url)
          const blob = await resp.blob()
          const baseName = `Receita_${r?.id || "documento"}`
          const filename = ensurePdfExt(baseName)
          downloadBlob(blob, filename)
          return
        } catch (e) {
          console.error("[Receitas] Blob URL indisponível (provavelmente de outra aba/sessão):", e)
          toast({ title: "Arquivo indisponível", description: "Essa receita foi gerada em outra aba/sessão. Gere novamente para baixar.", variant: "destructive" })
          return
        }
      }

      // Se relativo, prefixa com API base
      if (!/^https?:\/\//i.test(url)) {
        const base = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "")
        url = `${base}${url.startsWith("/") ? "" : "/"}${url}`
      }
      const res = await api.get(url, { responseType: "blob", baseURL: "" })
      const cd = res.headers["content-disposition"] || ""
      const ct = String(res.headers["content-type"] || "").toLowerCase()
      let filename = (() => {
        const m = /filename\*=UTF-8''([^;]+)|filename="?([^\";]+)"?/i.exec(cd)
        return m?.[1] || m?.[2] || null
      })()
      if (!ct.includes("application/pdf")) {
        try {
          const txt = await new Response(res.data).text()
          const payload = (() => { try { return JSON.parse(txt) } catch { return null } })()
          const b64 = payload?.pdf_base64 || payload?.documento_base64 || payload?.file_base64 || payload?.arquivo_base64
          if (b64) {
            const bytes = Uint8Array.from(atob(String(b64)), c => c.charCodeAt(0))
            const blob = new Blob([bytes], { type: "application/pdf" })
            const name = ensurePdfExt(payload?.filename || payload?.nome_arquivo || filename || `Receita_${r?.id || "documento"}.pdf`)
            downloadBlob(blob, name)
            return
          }
        } catch {}
        toast({ title: "Falha no download", description: "Conteúdo não é um PDF válido.", variant: "destructive" })
        return
      }
      const blob = new Blob([res.data], { type: "application/pdf" })
      try {
        const ab = await blob.slice(0, 8).arrayBuffer()
        const sig = String.fromCharCode(...new Uint8Array(ab))
        if (!sig.startsWith("%PDF-")) {
          toast({ title: "Falha no download", description: "Arquivo recebido não é um PDF válido.", variant: "destructive" })
          return
        }
      } catch {}
      if (!filename) {
        try {
          const u = new URL(url)
          filename = decodeURIComponent(u.pathname.split('/').pop() || "")
        } catch {
          filename = ""
        }
      }
      filename = ensurePdfExt(filename || `Receita_${r?.id || "documento"}.pdf`)
      downloadBlob(blob, filename)
    } catch (e) {
      console.error("[Receitas] Falha ao baixar PDF assinado:", e?.response?.status || e)
      toast({ title: "Falha no download", description: "Não foi possível baixar o arquivo. Tente novamente.", variant: "destructive" })
    }
  }

  // Abas do paciente (mesmo padrão das outras telas)
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

  // Calcular estatísticas
  const totalReceitas = todasReceitas.length
  const receitasAssinadas = todasReceitas.filter(r => r.arquivo_assinado).length
  const receitasEsteAno = todasReceitas.filter(r => {
    if (!r.created_at) return false
    const receitaYear = new Date(r.created_at).getFullYear()
    return receitaYear === new Date().getFullYear()
  }).length
  const receitasRecentes = todasReceitas.filter(r => {
    if (!r.created_at) return false
    const receitaDate = new Date(r.created_at)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    return receitaDate >= thirtyDaysAgo
  }).length

  // Gerar PDF usando template personalizado (consistente com preview)
  async function handleDownloadGerado(r) {
    try {
      if (r?.arquivo_assinado) {
        await handleDownloadAssinado(r.arquivo_assinado, r)
        return
      }
      toast({ title: "Assinatura pendente", description: "Esta receita ainda não foi assinada digitalmente pelo médico.", variant: "destructive" })
      return
      // Importar o serviço (lazy) para evitar bundle pesado inicial
      const { pdfTemplateService } = await import("@/services/pdfTemplateService")

      // ID do médico para carregar template e logo
      const medicoId = r?.medico?.id || r?.medico_id || "default"
      const templateConfig = loadTemplateConfig(medicoId)
      const doctorLogo = loadDoctorLogo(medicoId)

      // Normalizar dados para o layout compartilhado
      const doctorName = (r?.medico && (r.medico.nome || r.medico.user?.first_name && `${r.medico.user.first_name} ${r.medico.user.last_name}`)) || r?.medico_nome || r?.medico || "Médico"
      const crm = r?.medico?.crm || r?.medico_crm || r?.crm || ""
      const especialidade = r?.medico?.especialidade || r?.especialidade || r?.medico_especialidade || ""
      const enderecoConsultorio = r?.medico?.endereco_consultorio || r?.medico_endereco || ""
      const telefoneConsultorio = r?.medico?.telefone_consultorio || r?.medico?.telefone || r?.medico_telefone || ""
      const emailMedico = r?.medico?.email || r?.email_medico || ""

      const pacienteNome = r?.paciente?.nome || r?.paciente_nome || r?.paciente || "Paciente"
      const cpf = r?.paciente?.cpf || r?.cpf || ""
      const dataNascimento = r?.paciente?.data_nascimento || r?.data_nascimento || ""
      const idade = r?.idade || ""

      const dataEmissao = (() => {
        const d = r?.created_at || r?.data_emissao || new Date().toISOString()
        try { return new Date(d).toLocaleDateString() } catch { return String(d) }
      })()
      const validadeReceita = r?.validade || r?.validade_receita || ""
      const isSigned = Boolean(r?.arquivo_assinado)

      // Itens estruturados
      const structured = Array.isArray(r?.itens) && r.itens.length ? r.itens : (Array.isArray(r?.itens_estruturados) ? r.itens_estruturados : [])
      const receitaItems = (structured || []).map((it) => ({
        descricao: it?.descricao || it?.medicamento || it?.nome || "",
        dosagem: it?.dosagem || it?.dose || "",
        frequencia: it?.frequencia || "",
        duracao: it?.duracao || "",
        observacoes: it?.observacoes || "",
        medicamento: typeof it?.medicamento === 'object' ? it.medicamento : undefined,
      }))
      const hasStructuredItems = receitaItems.length > 0

      // Fallback para campos legados (não estruturados)
      const medicamento = r?.medicamentos || r?.itens || r?.descricao || ""
      const posologia = r?.posologia || r?.orientacoes || ""
      const observacoes = r?.observacoes || ""

      // Renderizar o layout em um container temporário fora da tela
      const container = document.createElement("div")
      container.style.position = "absolute"
      container.style.left = "-9999px"
      container.style.top = "-9999px"
      document.body.appendChild(container)

      const root = createRoot(container)
      root.render(
        <ReceitaPreviewLayout
          id="receita-preview-paciente"
          templateConfig={templateConfig}
          doctorLogo={doctorLogo}
          medico={doctorName}
          crm={crm}
          especialidade={especialidade}
          endereco_consultorio={enderecoConsultorio}
          telefone_consultorio={telefoneConsultorio}
          email_medico={emailMedico}
          nome_paciente={pacienteNome}
          idade={idade}
          cpf={cpf}
          data_nascimento={dataNascimento}
          data_emissao={dataEmissao}
          validade_receita={validadeReceita}
          isSigned={isSigned}
          hasStructuredItems={hasStructuredItems}
          receitaItems={receitaItems}
          medicamento={medicamento}
          posologia={posologia}
          observacoes={observacoes}
        />
      )

      // Aguarda o próximo tick para garantir montagem
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Gera PDF diretamente do DOM para garantir identidade visual
      const pdfBlob = await pdfTemplateService.generatePDFFromElement(container, { pageSize: "a4", orientation: "portrait", scale: 2 })

      // Limpar container React
      try { root.unmount() } catch {}
      document.body.removeChild(container)

      // Baixar com nome padronizado
      const filename = `Receita_${pacienteNome.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
      pdfTemplateService.savePDF(pdfBlob, filename)
      return

    } catch (error) {
      console.error('Erro ao gerar PDF com template personalizado:', error);
      
      // Fallback para o método original apenas em caso de erro crítico
      try {
        const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib")

        const pdfDoc = await PDFDocument.create()
        const page = pdfDoc.addPage([595.28, 841.89]) // A4
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica)

        const draw = (text, x, y, size = 12, color = rgb(0, 0, 0)) => {
          page.drawText(String(text || ""), { x, y, size, font, color })
        }

        let y = 800
        draw("Receita Médica", 50, y, 16)
        y -= 30

        const fmt = (label, val) => `${label}: ${val ?? ""}`
        draw(fmt("Emitida em", r?.created_at || r?.data_emissao || ""), 50, y); y -= 18
        draw(fmt("Médico", r?.medico_nome || r?.medico || r?.medico_id || ""), 50, y); y -= 18
        draw(fmt("Paciente", r?.paciente_nome || r?.paciente || r?.paciente_id || ""), 50, y); y -= 24

        draw("Medicamentos", 50, y, 14); y -= 18
        draw(String(r?.medicamentos || r?.itens || r?.descricao || ""), 50, y); y -= 36

        draw("Posologia", 50, y, 14); y -= 18
        draw(String(r?.posologia || r?.orientacoes || ""), 50, y); y -= 36

        if (r?.observacoes) {
          draw("Observações", 50, y, 14); y -= 18
          draw(String(r?.observacoes), 50, y); y -= 36
        }

        if (Array.isArray(r?.itens_estruturados) && r.itens_estruturados.length) {
          draw("Itens estruturados", 50, y, 14); y -= 18
          r.itens_estruturados.forEach((it) => {
            const line = Object.values(it || {}).filter(Boolean).join(" · ")
            draw(`• ${line}`, 60, y)
            y -= 16
          })
          y -= 10
        }

        const pdfBytes = await pdfDoc.save()
        const blob = new Blob([pdfBytes], { type: "application/pdf" })
        const filename = `Receita_${r?.id || "documento"}.pdf`

        const link = document.createElement("a")
        const objUrl = URL.createObjectURL(blob)
        link.href = objUrl
        link.download = filename
        document.body.appendChild(link)
        link.click()
        link.remove()
        setTimeout(() => URL.revokeObjectURL(objUrl), 2000)
      } catch (e) {
        console.error("[Receitas] Falha ao gerar PDF local:", e)
        toast({ title: "Falha ao gerar PDF", description: "Tente novamente.", variant: "destructive" })
      }
    }
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-7xl space-y-8 p-6">
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-16 w-full" />
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-48 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (erro) {
    // Com fallback ativo, mantemos a página e mostramos banner informativo abaixo
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 p-6">
      {/* Header moderno */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 p-8 text-white shadow-2xl">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-white/20 p-3 backdrop-blur-sm">
                  <Pill className="h-8 w-8" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">Minhas Receitas</h1>
                  <p className="text-emerald-100">Gerencie suas receitas médicas</p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button 
                variant="secondary" 
                className="bg-white/20 border-white/30 text-white hover:bg-white/30 backdrop-blur-sm"
              >
                <Stethoscope className="mr-2 h-4 w-4" />
                Médicos
              </Button>
            </div>
          </div>
        </div>
        <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-white/10"></div>
        <div className="absolute -bottom-16 -left-16 h-32 w-32 rounded-full bg-white/10"></div>
      </div>

      {/* aviso de fallback suprimido */}

      {/* Cards de estatísticas */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-emerald-100 text-sm font-medium">Total de Receitas</p>
                <p className="text-3xl font-bold">{totalReceitas}</p>
              </div>
              <div className="rounded-full bg-white/20 p-3">
                <FileText className="h-6 w-6" />
              </div>
            </div>
            <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-white/10"></div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-blue-100 text-sm font-medium">Assinadas</p>
                <p className="text-3xl font-bold">{receitasAssinadas}</p>
              </div>
              <div className="rounded-full bg-white/20 p-3">
                <CheckCircle2 className="h-6 w-6" />
              </div>
            </div>
            <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-white/10"></div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-amber-100 text-sm font-medium">Últimos 30 dias</p>
                <p className="text-3xl font-bold">{receitasRecentes}</p>
              </div>
              <div className="rounded-full bg-white/20 p-3">
                <Clock className="h-6 w-6" />
              </div>
            </div>
            <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-white/10"></div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-purple-100 text-sm font-medium">Este Ano</p>
                <p className="text-3xl font-bold">{receitasEsteAno}</p>
              </div>
              <div className="rounded-full bg-white/20 p-3">
                <TrendingUp className="h-6 w-6" />
              </div>
            </div>
            <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-white/10"></div>
          </CardContent>
        </Card>
      </div>

      <ProfileTabs tabs={pacienteTabs} basePath="/paciente" />

      {/* Filtros */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por médico ou medicamento..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Abas */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <Tabs value={abaAtiva} onValueChange={setAbaAtiva} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="ativas" className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Ativas ({receitasAtivas})
              </TabsTrigger>
              <TabsTrigger value="historico" className="flex items-center gap-2">
                <History className="h-4 w-4" />
                Histórico ({receitasExpiradas})
              </TabsTrigger>
              <TabsTrigger value="todas" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Todas ({totalReceitas})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={abaAtiva} className="mt-6">
              {!hasReceitas ? (
                <div className="text-center py-12">
                  <Pill className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-muted-foreground mb-2">Nenhuma receita encontrada</h3>
                  <p className="text-muted-foreground mb-6">
                    {emptyMsg ||
                      (abaAtiva === 'ativas' ? 'Você não possui receitas ativas no momento.' : 
                       abaAtiva === 'historico' ? 'Você não possui receitas no histórico.' :
                       'Você ainda não possui receitas médicas.')}
                  </p>
                </div>
              ) : receitasFiltradas.length === 0 ? (
                <div className="text-center py-12">
                  <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-muted-foreground mb-2">Nenhuma receita encontrada</h3>
                  <p className="text-muted-foreground mb-6">Tente ajustar os filtros de busca.</p>
                </div>
              ) : (
                <div className="grid gap-6">
                  <Card className="border-0 shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Tabela de Receitas</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>ID</TableHead>
                              <TableHead>Data</TableHead>
                              <TableHead>Médico</TableHead>
                              <TableHead>Medicamentos</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>PDF</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {receitasFiltradas.map((r) => {
                              const medicoNome = getDoctorName(r.medico) || getDoctorName(r.consulta?.medico) || "Médico"
                              const dataStr = (() => {
                                const d = r?.created_at || r?.data_emissao || ""
                                try { return d ? new Date(d).toLocaleDateString() : "—" } catch { return String(d || "—") }
                              })()
                              const status = getStatusReceita(r)
                              const medsShort = String(r?.medicamentos || "").split("\n")[0]
                              return (
                                <TableRow key={`row-${r.id}`}>
                                  <TableCell className="whitespace-nowrap">{r.id}</TableCell>
                                  <TableCell className="whitespace-nowrap">{dataStr}</TableCell>
                                  <TableCell className="min-w-[160px]">{medicoNome}</TableCell>
                                  <TableCell className="truncate max-w-[260px]" title={r?.medicamentos || ""}>{medsShort || "—"}</TableCell>
                                  <TableCell>
                                    <Badge className={getStatusColor(status)} variant="outline">{status}</Badge>
                                  </TableCell>
                                  <TableCell>
                                    {(r.arquivo_assinado || r.arquivo_pdf_assinado) ? (
                                      <Button size="sm" variant="outline" onClick={() => handleDownloadAssinado(r.arquivo_assinado || r.arquivo_pdf_assinado, r)}>Baixar</Button>
                                    ) : (
                                      <Button size="sm" variant="outline" disabled>Assinatura pendente</Button>
                                    )}
                                  </TableCell>
                                </TableRow>
                              )
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                  {receitasFiltradas.map((r) => {
            const consulta = r.consulta
            const medicoNome =
              getDoctorName(r.medico) ||
              getDoctorName(consulta?.medico) ||
              r.medico_nome ||
              r.medicoName ||
              "Médico"
            const pacienteNome =
              (consulta?.paciente?.user
                ? `${consulta.paciente.user.first_name || ""} ${consulta.paciente.user.last_name || ""}`.trim()
                : "Paciente") || "Paciente"

            return (
              <Card key={r.id} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader className="pb-4">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-emerald-100 p-2 dark:bg-emerald-900">
                          <Pill className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">Receita Médica</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            Emitida em {new Date(r.created_at).toLocaleDateString()} às {new Date(r.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={r.arquivo_assinado ? "default" : "secondary"} className={r.arquivo_assinado ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300" : "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300"}>
                        {r.arquivo_assinado ? "Assinada" : "Não assinada"}
                      </Badge>
                      {r.validade && (
                        <Badge variant="outline" className="text-xs">
                          Válida até {r.validade}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Informações do médico e paciente */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <Stethoscope className="h-4 w-4" />
                        Médico
                      </div>
                      <p className="font-medium">{medicoNome}</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <User className="h-4 w-4" />
                        Paciente
                      </div>
                      <p className="font-medium">{pacienteNome}</p>
                    </div>
                  </div>

                  {/* Medicamentos */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-foreground">Medicamentos</h4>
                    <div className="rounded-lg bg-muted/50 p-4">
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">{r.medicamentos}</p>
                    </div>
                  </div>

                  {/* Posologia */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-foreground">Posologia</h4>
                    <div className="rounded-lg bg-muted/50 p-4">
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">{r.posologia}</p>
                    </div>
                  </div>

                  {/* Observações */}
                  {r.observacoes && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-foreground">Observações</h4>
                      <div className="rounded-lg bg-muted/50 p-4">
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">{r.observacoes}</p>
                      </div>
                    </div>
                  )}

                  {/* Itens estruturados */}
                  {Array.isArray(r.itens) && r.itens.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-foreground">Itens estruturados</h4>
                      <div className="rounded-lg bg-muted/50 p-4">
                        <ul className="space-y-2">
                          {r.itens.map((it) => (
                            <li key={it.id} className="flex items-start gap-2 text-sm">
                              <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500 flex-shrink-0"></div>
                              <div>
                                <span className="font-medium">{it.medicamento?.nome || "Medicamento"}</span>
                                {it.dose && <span className="text-muted-foreground"> - {it.dose}</span>}
                                {it.frequencia && <span className="text-muted-foreground"> | {it.frequencia}</span>}
                                {it.duracao && <span className="text-muted-foreground"> | {it.duracao}</span>}
                                {it.observacoes && <div className="text-muted-foreground text-xs mt-1">{it.observacoes}</div>}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Ações */}
                  <div className="flex flex-wrap gap-3 pt-4 border-t">
                    {(r.arquivo_assinado || r.arquivo_pdf_assinado) ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="group border-emerald-500/60 bg-gradient-to-b from-emerald-500/10 to-emerald-600/10 text-emerald-700 hover:from-emerald-500/20 hover:to-emerald-600/20 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-100"
                          onClick={() => window.open(r.arquivo_assinado || r.arquivo_pdf_assinado, '_blank')}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Visualizar PDF
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="group border-blue-500/60 bg-gradient-to-b from-blue-500/10 to-blue-600/10 text-blue-700 hover:from-blue-500/20 hover:to-blue-600/20 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-100"
                          onClick={() => handleDownloadAssinado(r.arquivo_assinado || r.arquivo_pdf_assinado, r)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Baixar PDF Assinado
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled
                          className="group border-amber-500/60 bg-gradient-to-b from-amber-500/10 to-amber-600/10 text-amber-700 dark:text-amber-300"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Assinatura pendente
                        </Button>
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          <AlertCircle className="h-3 w-3" />
                          Aguarde o médico assinar para baixar o PDF.
                        </div>
                      </>
                    )}
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        const mid = r?.medico?.id || r?.consulta?.medico?.id || r?.medico_id || ""
                        setForm({ medico: String(mid || ""), mensagem: "", receita: r?.id || null, renovacao: false })
                        setSolicitarOpen(true)
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Solicitar Receita
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        const mid = r?.medico?.id || r?.consulta?.medico?.id || r?.medico_id || ""
                        const msg = `Solicito renovação da receita #${r?.id ?? ""}`.trim()
                        setForm({ medico: String(mid || ""), mensagem: msg, receita: r?.id || null, renovacao: true })
                        setSolicitarOpen(true)
                      }}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Pedir Renovação
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Modal/Seção de Solicitar Receita */}
      {solicitarOpen ? (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card text-card-foreground border rounded-lg p-6 w-full max-w-lg shadow-lg">
            <h2 className="text-lg font-semibold mb-4">{form.renovacao ? "Pedir Renovação de Receita" : "Solicitar Receita"}</h2>
            <form onSubmit={handleSolicitar} className="space-y-4">
              <div>
                <Label className="mb-1 block">Médico</Label>
                <Select value={form.medico} onValueChange={(v) => setForm((f) => ({ ...f, medico: v }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={loading ? "Carregando..." : (medicosValidos.length ? "Selecione..." : "Nenhum médico disponível")} />
                  </SelectTrigger>
                  <SelectContent>
                    {medicosValidos.length === 0 ? (
                      <SelectLabel>Nenhum médico disponível</SelectLabel>
                    ) : (
                      medicosValidos.map((m) => {
                        const nome = (m?.user ? `${m.user.first_name || ""} ${m.user.last_name || ""}`.trim() : m?.nome) || "Médico"
                        return (
                          <SelectItem key={String(m.id)} value={String(m.id)}>
                            {nome} {m.crm ? `- CRM ${m.crm}` : ""}
                          </SelectItem>
                        )
                      })
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1 block">Mensagem (opcional)</Label>
                <Textarea
                  rows={3}
                  placeholder={form.renovacao ? "Explique sua necessidade de renovação (uso contínuo, desabastecimento, etc.)" : "Descreva sua necessidade (ex: nova receita de medicamento)"}
                  value={form.mensagem}
                  onChange={(e) => setForm((f) => ({ ...f, mensagem: e.target.value }))}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSolicitarOpen(false)
                    setForm({ medico: "", mensagem: "", receita: null, renovacao: false })
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Enviando..." : (form.renovacao ? "Enviar pedido de renovação" : "Enviar solicitação")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
