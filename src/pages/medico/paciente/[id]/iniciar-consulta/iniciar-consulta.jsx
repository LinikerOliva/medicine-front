"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useLocation, useParams } from "react-router-dom"
import api from "@/services/api"
import { medicoService } from "@/services/medicoService"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileText, Stethoscope, ClipboardList, Save, Mic, MicOff, CircleDot } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { aiService } from "@/services/aiService"
import { PatientProfileSummary } from "@/components/patient-profile-summary"
import { DatePicker } from "@/components/ui/date-picker"

export default function IniciarConsulta() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()
  const [aiApplied, setAiApplied] = useState(false)
  const [formData, setFormData] = useState({
    queixa: "",
    historia: "",
    medicamentos: "",
    alergias: "",
    pressao: "",
    "frequencia-cardiaca": "",
    temperatura: "",
    saturacao: "",
    "exame-geral": "",
    "sistema-cardiovascular": "",
    "sistema-respiratorio": "",
    diagnostico: "",
    conduta: "",
    exames: "",
    retorno: "",
  })
  const [activeTab, setActiveTab] = useState("anamnese")
  const handleFieldChange = (e) => {
    const { id, value } = e.target
    setFormData((prev) => ({ ...prev, [id]: value }))
  }

  // Extrair consultaId da query string, se presente
  const searchParams = new URLSearchParams(location.search)
  const consultaId = searchParams.get("consultaId")

  // Transcrição em tempo real
  const [transcript, setTranscript] = useState("")
  const [isListening, setIsListening] = useState(false)
  const [micError, setMicError] = useState("")
  const [micPermission, setMicPermission] = useState("unknown")
  const recognitionRef = useRef(null)
  const lastResultIndexRef = useRef(-1)
  const [interimText, setInterimText] = useState("")
  const listeningRef = useRef(false)
  const storageKey = useMemo(() => `iniciar-consulta:${id}:${consultaId || "sem-consulta"}`, [id, consultaId])
  // Ref para acompanhar o último interim e poder "dar flush" quando o motor reinicia
  const interimRef = useRef("")
  useEffect(() => { interimRef.current = interimText }, [interimText])

  // Estados relacionados ao paciente e ao modal de alergias
  const [pacienteInfo, setPacienteInfo] = useState(null)
  const [alergiaDialogOpen, setAlergiaDialogOpen] = useState(false)
  const [novaAlergia, setNovaAlergia] = useState("")

  // Monitorar permissão do microfone quando disponível
  useEffect(() => {
    let perm
    const setup = async () => {
      try {
        if (navigator.permissions && navigator.permissions.query) {
          perm = await navigator.permissions.query({ name: "microphone" })
          setMicPermission(perm.state || "unknown")
          perm.onchange = () => setMicPermission(perm.state || "unknown")
        }
      } catch {}
    }
    setup()
    return () => { if (perm) perm.onchange = null }
  }, [])

  const ensureMicAccess = async () => {
    setMicError("")
    try {
      // Tentar abrir o microfone para forçar prompt de permissão se necessário
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      // Encerrar tracks imediatamente; queremos só a permissão/checagem
      stream.getTracks().forEach((t) => t.stop())
      setMicPermission("granted")
      return true
    } catch (e) {
      const msg = (e && (e.name || e.message)) || "Permissão de microfone negada"
      setMicError(typeof msg === "string" ? msg : "Falha ao acessar microfone")
      setMicPermission("denied")
      return false
    }
  }

  useEffect(() => {
    // Carregar texto salvo (persistência ao trocar de tela)
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) setTranscript(saved)
    } catch {}
  }, [storageKey])

  // Habilitar deep-link por hash para selecionar a aba
  useEffect(() => {
    const hash = (location.hash || "").toLowerCase()
    const tabMap = {
      "#diagnostico": "diagnostico",
      "#problems_and_diagnostics": "diagnostico",
      "#exame-fisico": "exame-fisico",
      "#exame_fisico": "exame-fisico",
      "#anamnese": "anamnese",
    }
    const targetTab = tabMap[hash]
    if (targetTab) setActiveTab(targetTab)

    const idMap = {
      "#diagnostico": "diagnostico",
      "#problems_and_diagnostics": "diagnostico",
      "#exame-fisico": "exame-fisico",
      "#exame_fisico": "exame-fisico",
      "#anamnese": "anamnese",
    }

    const tryScroll = (attempt = 0) => {
      const targetId = idMap[hash]
      const el = document.getElementById(targetId) || document.getElementById(hash.replace(/^#/, ""))
      if (el) {
        try { el.scrollIntoView({ behavior: "smooth", block: "start" }) } catch {}
        return
      }
      if (attempt < 10) setTimeout(() => tryScroll(attempt + 1), 80)
    }
    if (hash) setTimeout(() => tryScroll(0), 50)
  }, [location.hash])

  // Sincronizar hash com a aba ativa para deep-links estáveis
  useEffect(() => {
    const tabToHash = {
      anamnese: "#anamnese",
      "exame-fisico": "#exame-fisico",
      diagnostico: "#problems_and_diagnostics",
    }
    const target = tabToHash[activeTab]
    if (!target) return
    if ((location.hash || "") !== target) {
      try {
        navigate(`${location.pathname}${target}`, { replace: true })
      } catch {}
    }
  }, [activeTab])

  // Carregar dados do paciente por id para preencher alergias automaticamente
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const base = (import.meta.env.VITE_PACIENTES_ENDPOINT || "/pacientes/").replace(/\/?$/, "/")
        const { data } = await api.get(`${base}${id}/`)
        if (!mounted) return
        setPacienteInfo(data)
        const alergiasTxt = data?.alergias || ""
        if (alergiasTxt && !formData.alergias) {
          setFormData((prev) => ({ ...prev, alergias: alergiasTxt }))
        }
      } catch (e) {
        console.debug("[IniciarConsulta] Falha ao buscar paciente por id:", e?.response?.status)
      }
    })()
    return () => { mounted = false }
  }, [id])

  useEffect(() => {
    // Salvar automaticamente ao editar
    try {
      localStorage.setItem(storageKey, transcript || "")
    } catch {}
  }, [storageKey, transcript])

  useEffect(() => {
    // Iniciar reconhecimento de voz quando a tela abre
    startListening()
    // Se houver consultaId, sinalizar início da consulta no backend
    ;(async () => {
      try {
        if (consultaId && medicoService?.iniciarConsulta) {
          await medicoService.iniciarConsulta(consultaId)
        }
      } catch (e) {
        console.debug("[IniciarConsulta] Falha ao marcar início da consulta:", e?.message)
      }
    })()
    return () => {
      stopListening()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const startListening = async () => {
    try {
      // Checar/solicitar permissão do microfone primeiro
      if (!(await ensureMicAccess())) {
        setIsListening(false)
        listeningRef.current = false
        return
      }

      // Sempre tente encerrar instância anterior para evitar estados zumbis
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onend = null
          recognitionRef.current.onresult = null
          recognitionRef.current.onerror = null
          recognitionRef.current.stop()
        } catch {}
        recognitionRef.current = null
      }

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      if (!SpeechRecognition) {
        console.warn("Reconhecimento de fala não suportado neste navegador.")
        setMicError("Seu navegador não suporta reconhecimento de fala.")
        setIsListening(false)
        return
      }

      const recognition = new SpeechRecognition()
      recognition.lang = "pt-BR"
      recognition.continuous = true
      recognition.interimResults = true
      recognition.maxAlternatives = 1
      lastResultIndexRef.current = -1

      recognition.onresult = (event) => {
        let finalBatch = ""
        let interim = ""
        // Iterar apenas resultados que mudaram neste evento
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i]
          const text = Array.from(res, (r) => r.transcript).join("")
          if (res.isFinal) {
            finalBatch += (text + " ")
          } else {
            interim += text
          }
        }

        if (finalBatch) {
          const toAppend = finalBatch.trim()
          setTranscript((prev) => {
            const base = prev ? (prev.endsWith(" ") ? prev : prev + " ") : ""
            if (toAppend && base.endsWith(toAppend)) return prev
            return (base + toAppend).trim()
          })
        }

        setInterimText(interim)
      }

      recognition.onerror = (e) => {
        const err = e?.error || e
        console.warn("Erro no reconhecimento de fala:", err)
        if (typeof err === "string") setMicError(err)
        // Não interromper em 'no-speech' para evitar cortes após a primeira palavra
        const shouldRetry = ["audio-capture", "network"].includes(err)
        if (shouldRetry && listeningRef.current && recognitionRef.current === recognition) {
          try { recognition.stop() } catch {}
        }
        if (err === "not-allowed") {
          setIsListening(false)
          listeningRef.current = false
        }
      }

      recognition.onend = () => {
        // Evitar reiniciar se esta instância não for mais a atual
        const isCurrent = recognitionRef.current === recognition

        const leftover = (interimRef.current || "").trim()
        if (leftover) {
          setTranscript((prev) => {
            const base = prev ? (prev.endsWith(" ") ? prev : prev + " ") : ""
            if (base.endsWith(leftover)) return prev
            return (base + leftover).trim()
          })
        }
        setInterimText("")
        lastResultIndexRef.current = -1

        if (listeningRef.current && isCurrent) {
          setTimeout(() => {
            try { recognition.start() } catch {}
          }, 200)
        }
      }

      // Iniciar reconhecimento com hard reset de flags
      recognitionRef.current = recognition
      listeningRef.current = true
      setIsListening(true)
      try { recognition.start() } catch (e) {
        console.warn("Falha ao iniciar reconhecimento:", e)
        setIsListening(false)
        listeningRef.current = false
        recognitionRef.current = null
        setMicError("Falha ao iniciar reconhecimento de fala.")
        return
      }
    } catch (e) {
      console.warn("Falha ao iniciar reconhecimento de fala:", e)
      setIsListening(false)
      listeningRef.current = false
      setMicError("Falha inesperada ao iniciar microfone.")
    }
  }

  const stopListening = async () => {
    try {
      setIsListening(false)
      listeningRef.current = false
      setInterimText("")
      if (recognitionRef.current) {
        // Garantir que esta instância não se auto-reinicie
        recognitionRef.current.onend = null
        recognitionRef.current.onresult = null
        recognitionRef.current.onerror = null
        recognitionRef.current.stop()
        recognitionRef.current = null
      }
    } catch (e) {}

    // NOVO: ao parar manualmente e se houver transcrição e ainda não aplicamos IA, chama backend
    const hasText = (transcript || "").trim().length > 0
    if (hasText && !aiApplied && consultaId) {
      try {
        const extracted = extractFromTranscript(transcript || "")
        const aiData = await medicoService.finalizarConsultaIA(consultaId, {
          transcript: transcript || "",
          extracted: {
            queixa: extracted.queixa || "",
            historia: extracted.historia || "",
            diagnostico: extracted.diagnostico || "",
            conduta: extracted.conduta || "",
            medicamentos: extracted.medicamentos || "",
            posologia: extracted.posologia || "",
            pressao: extracted.pressao || "",
            frequencia_cardiaca: extracted["frequencia-cardiaca"] || extracted.frequencia || "",
            temperatura: extracted.temperatura || "",
            saturacao: extracted.saturacao || "",
          },
          form: {
            queixa_principal: formData.queixa || "",
            historia_doenca_atual: formData.historia || "",
            diagnostico_principal: formData.diagnostico || "",
            conduta: formData.conduta || "",
            medicamentos_uso: formData.medicamentos || "",
            alergias: formData.alergias || "",
            pressao: formData.pressao || "",
            frequencia_cardiaca: formData.frequencia || formData["frequencia-cardiaca"] || "",
            temperatura: formData.temperatura || "",
            saturacao: formData.saturacao || "",
          },
        })

        const candidates = [aiData, aiData?.data, aiData?.result, aiData?.output, aiData?.summary, aiData?.sumarizacao, aiData?.resumo, aiData?.fields].filter(Boolean)
        const read = (obj, path) => path.split('.').reduce((acc, k) => (acc && acc[k] != null ? acc[k] : undefined), obj)
        const pick = (paths) => {
          for (const obj of candidates) {
            for (const p of paths) {
              const v = read(obj, p)
              if (typeof v === 'string' && v.trim()) return v.trim()
            }
          }
          return ''
        }

        const filled = {
          queixa: formData.queixa || pick(["queixa_principal", "anamnese.queixa_principal", "queixa", "anamnesis.queixaPrincipal", "chiefComplaint", "chief_complaint"]) || extracted.queixa || "",
          historia: formData.historia || pick(["historia_doenca_atual", "anamnese.historia_doenca_atual", "hda", "historia", "history_of_present_illness", "hpi"]) || extracted.historia || "",
          medicamentos: formData.medicamentos || pick(["medicamentos_uso", "medicamentos", "prescricao.medicamentos", "prescription.medications"]) || extracted.medicamentos || "",
          alergias: formData.alergias || pick(["alergias", "anamnese.alergias", "allergies"]) || "",
          diagnostico: formData.diagnostico || pick(["diagnostico_principal", "diagnostico", "diagnosis", "assessment"]) || extracted.diagnostico || "",
          conduta: formData.conduta || pick(["conduta", "plano", "plan", "plan_terapeutico"]) || extracted.conduta || "",
          posologia: formData.posologia || pick(["posologia", "prescricao.posologia", "prescription.posology", "dosage_instructions", "dosage", "instrucoes", "dosagem"]) || extracted.posologia || "",
          pressao: formData.pressao || pick(["pressao", "sinais_vitais.pressao"]) || extracted.pressao || "",
          "frequencia-cardiaca": formData["frequencia-cardiaca"] || formData.frequencia || pick(["frequencia_cardiaca", "sinais_vitais.frequencia_cardiaca", "fc", "heart_rate"]) || extracted["frequencia-cardiaca"] || extracted.frequencia || "",
          temperatura: formData.temperatura || pick(["temperatura", "sinais_vitais.temperatura"]) || extracted.temperatura || "",
          saturacao: formData.saturacao || pick(["saturacao", "sinais_vitais.saturacao", "spo2"]) || extracted.saturacao || "",
        }

        setFormData((prev) => ({ ...prev, ...filled }))
        setAiApplied(true)
        toast({ title: "Resumo aplicado", description: "Pré-preenchimento realizado a partir da transcrição." })
      } catch (e) {
        console.debug("[auto-sumarizar] falhou:", e?.message)
      }
    }
  }

  // Util: extração simples a partir do texto transcrito
  function extractFromTranscript(text = "") {
    let norm = String(text || "").replace(/\r/g, "").trim()
    // Inserir quebras de linha antes de rótulos comuns quando surgem no meio da frase
    norm = norm
      .replace(/(?:^|[.!?])\s*(Ao exame)\s*:/gi, "\n$1:")
      .replace(/(?:^|[.!?])\s*(Exame Físico|Exame)\s*:/gi, "\n$1:")
      .replace(/(?:^|[.!?])\s*(Diagnóstico(?: Principal)?)\s*:/gi, "\n$1:")
      .replace(/(?:^|[.!?])\s*(Conduta)(?!\s*[:：])/gi, "\n$1:")
      .replace(/(?:^|[.!?])\s*(Prescrição|Prescricao|Receita|Rx)\s*:/gi, "\n$1:")
      .replace(/(?:^|[.!?])\s*(História da Doença Atual|HDA|História|Historia)\s*:/gi, "\n$1:")
   
    // Tokens possíveis de início de seção
    const sectionStartTokens = [
      "Queixa",
      "Queixa Principal",
      "História",
      "Historia",
      "HDA",
      "História da Doença Atual",
      "Exame",
      "Exame Físico",
      "Ao exame",
      "Diagnóstico",
      "Diagnostico",
      "Diagnóstico Principal",
      "Conduta",
      "Plano",
      "Plano Terapêutico",
      "Prescrição",
      "Prescricao",
      "Receita",
      "Rx",
      "Alergias",
      "Orientações",
      "Orientacoes",
      "Observações",
      "Observacoes",
      "Exames",
      "Retorno",
    ]
  
    const getSection = (labels) => {
      const labelRe = labels.join("|")
      const boundaryRe = sectionStartTokens.join("|")
      const rx = new RegExp(
        `(?:^|\n)\s*(?:${labelRe})(?:[^\n:]{0,50})?\s*[:：]\s*([\s\S]*?)(?=\s*(?:${boundaryRe})\s*[:：]|$)`,
        "i"
      )
      const m = norm.match(rx)
      return m ? m[1].trim() : ""
    }
  
    const queixa = getSection(["Queixa", "Queixa Principal"]) || norm.split(/\n\n|\n-/)[0]?.slice(0, 300) || ""
    const historia = getSection(["História da Doença Atual", "HDA", "História", "Historia"]) || ""
    const diagnostico = getSection(["Diagnóstico Principal", "Diagnóstico", "Diagnostico"]) || ""
    const conduta = getSection(["Conduta", "Plano", "Plano Terapêutico"]) || ""
    const prescricao = getSection(["Prescrição", "Prescricao", "Receita", "Rx"]) || ""
  
    let medicamentos = ""
    let posologia = ""
  
    if (prescricao) {
      const lines = prescricao.split(/\n+/).map((l) => l.trim()).filter(Boolean)
      // Usar as linhas completas como medicamentos para garantir visibilidade no resumo
      medicamentos = lines.join("\n")
      // Extrair posologia quando possível (após "–" ou após dosagem)
      const posoParts = lines
        .map((l) => {
          const dashIdx = l.indexOf("–")
          if (dashIdx >= 0) return l.slice(dashIdx + 1).trim()
          const m = l.match(/(?:\d+\s?(mg|ml|g|mcg)[^,;]*)[,;]?(.*)$/i)
          return m ? (m[2] || "").trim() : ""
        })
        .filter(Boolean)
      if (posoParts.length) posologia = posoParts.join("\n")
    }
  
    if (!medicamentos && conduta) {
      const medLine = (conduta.match(/.+?(\d+\s?(mg|ml|g|mcg)|comprimid|c[aá]psul|gotas|spray).*/i) || [""])[0]
      if (medLine) {
        medicamentos = medLine.trim()
        posologia = "Conforme conduta descrita."
      }
    }
  
    // Extração simples de sinais vitais no texto completo
    const pressao = (norm.match(/(PA|press[aã]o( arterial)?)[^\d]*(\d{2,3}\s*\/\s*\d{2,3})\s*(mmhg)?/i) || ["", "", "", ""])[3] || ""
    const frequencia = (norm.match(/(FC|freq[uê]ncia\s*card[ií]aca)[^\d]*(\d{2,3})\s*(bpm)?/i) || ["", "", ""])[2] || ""
    const temperatura = (norm.match(/(temp(eratura)?)[^\d]*(\d{2}(?:[\.,]\d)?)\s*(?:°?c|celsius)?/i) || ["", "", "", ""])[3] || ""
    const saturacao = (norm.match(/(sat|satura[cç][aã]o)[^\d]*(\d{2})\s*%/i) || ["", "", ""])[2] || ""
  
    return { queixa, historia, diagnostico, conduta, medicamentos, posologia, pressao, "frequencia-cardiaca": frequencia, temperatura, saturacao }
  }

  // Adiciona alergia no formulário e opcionalmente atualiza no backend
  const handleSalvarAlergia = async () => {
    const nova = (novaAlergia || "").trim()
    if (!nova) {
      setAlergiaDialogOpen(false)
      return
    }
    const atual = (formData.alergias || "").trim()
    const joined = atual ? `${atual}\n${nova}` : nova
    setFormData((prev) => ({ ...prev, alergias: joined }))

    // Atualiza no backend se tivermos id do paciente
    try {
      if (pacienteInfo?.id && medicoService?.atualizarPacienteById) {
        await medicoService.atualizarPacienteById(pacienteInfo.id, { alergias: joined })
        toast({ title: "Alergia adicionada", description: "Atualizamos o cadastro do paciente." })
      }
    } catch (e) {
      console.debug("Falha ao atualizar alergias do paciente:", e?.message)
      toast({ title: "Não foi possível salvar no cadastro", description: "A alergia foi adicionada ao formulário apenas.", variant: "destructive" })
    } finally {
      setNovaAlergia("")
      setAlergiaDialogOpen(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    // garantir que o microfone pare antes de prosseguir
    try { stopListening() } catch {}
    // calcular extrações fora do try/catch para uso no fallback
    const extracted = extractFromTranscript(transcript || "")

    try {
      // Extrair a partir da transcrição (fallback)
      // já extraído acima

      // Permitir seguir no mesmo clique após aplicar IA
      let filledForSave = null

      // ETAPA 1: Finalizar e buscar resumo da IA para preencher os campos na tela
      if (!aiApplied) {
        if (consultaId) {
          let aiData = null
          try {
            aiData = await medicoService.finalizarConsultaIA(consultaId, {
              transcript: transcript || "",
              extracted: {
                queixa: extracted.queixa || "",
                historia: extracted.historia || "",
                diagnostico: extracted.diagnostico || "",
                conduta: extracted.conduta || "",
                medicamentos: extracted.medicamentos || "",
                posologia: extracted.posologia || "",
              },
              form: {
                queixa_principal: formData.queixa || "",
                historia_doenca_atual: formData.historia || "",
                diagnostico_principal: formData.diagnostico || "",
                conduta: formData.conduta || "",
                medicamentos_uso: formData.medicamentos || "",
                alergias: formData.alergias || "",
              },
            })
          } catch (e) {
            console.warn("Falha ao enviar dados para sumarização:", e)
          }

          // Fallback: se não obtivemos dados da API da consulta, tentar sumarizar via serviço de IA diretamente a partir da transcrição
          if (!aiData) {
            try {
              aiData = await aiService.sumarizarTranscricao(transcript || "", {
                queixa: extracted.queixa || "",
                historia_doenca_atual: extracted.historia || "",
                diagnostico_principal: extracted.diagnostico || "",
                conduta: extracted.conduta || "",
                medicamentos: extracted.medicamentos || "",
                posologia: extracted.posologia || "",
                alergias: formData.alergias || "",
              }, { systemPrompt: (
                "Aja como um Especialista em Triagem Médica e Extração de Dados (Scribe).\n"+
                "Receba a transcrição e retorne APENAS JSON estrito com os campos: queixa, historia_doenca_atual, diagnostico_principal, conduta, medicamentos, posologia, alergias, pressao, frequencia_cardiaca, temperatura, saturacao.\n"+
                "Regras: deduza papéis (médico/paciente), ignore saudações e ruído, identifique medicamentos com dosagem e frequência. Campos ausentes devem ser \"\"."
              ) })
            } catch (e) {
              console.debug("[AI] Gemini indisponível:", e?.message)
            }
          }

          // Funções auxiliares para ler de estruturas diversas
          const candidates = [aiData, aiData?.data, aiData?.result, aiData?.output, aiData?.summary, aiData?.sumarizacao, aiData?.resumo, aiData?.fields].filter(Boolean)
          const deepGet = (obj, path) => {
            try {
              return path.split(".").reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj)
            } catch {
              return undefined
            }
          }
          const pick = (paths) => {
            for (const c of candidates) {
              for (const p of paths) {
                const v = deepGet(c, p)
                if (v !== undefined && v !== null) {
                  const s = String(v).trim()
                  if (s) return s
                }
              }
            }
            return ""
          }

          const filled = {
            queixa: formData.queixa || pick(["queixa_principal", "anamnese.queixa_principal", "queixa", "anamnesis.queixaPrincipal", "chiefComplaint", "chief_complaint"]) || extracted.queixa || "",
            historia: formData.historia || pick(["historia_doenca_atual", "anamnese.historia_doenca_atual", "hda", "historia", "history_of_present_illness", "hpi"]) || extracted.historia || "",
            medicamentos: formData.medicamentos || pick(["medicamentos_uso", "medicamentos", "prescricao.medicamentos", "prescription.medications"]) || extracted.medicamentos || "",
            alergias: formData.alergias || pick(["alergias", "anamnese.alergias", "allergies"]) || "",
            diagnostico: formData.diagnostico || pick(["diagnostico_principal", "diagnostico", "diagnosis", "assessment"]) || extracted.diagnostico || "",
            conduta: formData.conduta || pick(["conduta", "plano", "plan", "plan_terapeutico"]) || extracted.conduta || "",
            posologia: formData.posologia || pick(["posologia", "prescricao.posologia", "prescription.posology", "dosage_instructions", "dosage", "instrucoes", "dosagem"]) || extracted.posologia || "",
            // Sinais vitais (nomes compatíveis com o formulário)
            pressao: formData.pressao || pick(["pressao", "sinais_vitais.pressao"]) || extracted.pressao || "",
            "frequencia-cardiaca": formData["frequencia-cardiaca"] || pick(["frequencia_cardiaca", "sinais_vitais.frequencia_cardiaca"]) || extracted["frequencia-cardiaca"] || "",
            temperatura: formData.temperatura || pick(["temperatura", "sinais_vitais.temperatura"]) || extracted.temperatura || "",
            saturacao: formData.saturacao || pick(["saturacao", "sinais_vitais.saturacao"]) || extracted.saturacao || "",
          }

          filledForSave = filled
          setFormData((prev) => ({ ...prev, ...filled }))
          setAiApplied(true)
          toast({
            title: "Resumo aplicado",
            description: "Campos preenchidos com a sugestão da IA. Revise e clique em 'Salvar Prontuário'.",
          })
          setIsSubmitting(false)
          return
        } else {
          // Sem consultaId: ainda assim tentar sumarizar com IA a partir da transcrição
          try {
            const aiData = await aiService.sumarizarTranscricao(transcript || "", {
              queixa_principal: extracted.queixa || formData.queixa || "",
              historia_doenca_atual: extracted.historia || formData.historia || "",
              diagnostico_principal: extracted.diagnostico || formData.diagnostico || "",
              conduta: extracted.conduta || formData.conduta || "",
              medicamentos: extracted.medicamentos || formData.medicamentos || "",
              posologia: extracted.posologia || formData.posologia || "",
              alergias: formData.alergias || "",
            }, { systemPrompt: (
              "Aja como um Especialista em Triagem Médica e Extração de Dados (Scribe).\n"+
              "Retorne APENAS JSON com: queixa, historia_doenca_atual, diagnostico_principal, conduta, medicamentos, posologia, alergias, pressao, frequencia_cardiaca, temperatura, saturacao.\n"+
              "Ignore saudações. Deduza papéis. Unifique medicamentos com dosagem e frequência. Campos não mencionados = \"\"."
            ) })

            // Funções auxiliares para ler de estruturas diversas (IA pode retornar em formatos diferentes)
            const candidates = [aiData, aiData?.data, aiData?.result, aiData?.output, aiData?.summary, aiData?.sumarizacao, aiData?.resumo, aiData?.fields].filter(Boolean)
            const deepGet = (obj, path) => {
              try {
                return path.split(".").reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj)
              } catch {
                return undefined
              }
            }
            const pick = (paths) => {
              for (const c of candidates) {
                for (const p of paths) {
                  const v = deepGet(c, p)
                  if (v !== undefined && v !== null) {
                    const s = String(v).trim()
                    if (s) return s
                  }
                }
              }
              return ""
            }

            const filled = {
              queixa: formData.queixa || pick(["queixa_principal", "anamnese.queixa_principal", "queixa", "anamnesis.queixaPrincipal", "chiefComplaint", "chief_complaint"]) || extracted.queixa || "",
              historia: formData.historia || pick(["historia_doenca_atual", "anamnese.historia_doenca_atual", "hda", "historia", "history_of_present_illness", "hpi"]) || extracted.historia || "",
              medicamentos: formData.medicamentos || pick(["medicamentos_uso", "medicamentos", "prescricao.medicamentos", "prescription.medications"]) || extracted.medicamentos || "",
              alergias: formData.alergias || pick(["alergias", "anamnese.alergias", "allergies"]) || "",
              diagnostico: formData.diagnostico || pick(["diagnostico_principal", "diagnostico", "diagnosis", "assessment"]) || extracted.diagnostico || "",
              conduta: formData.conduta || pick(["conduta", "plano", "plan", "plan_terapeutico"]) || extracted.conduta || "",
              posologia: formData.posologia || pick(["posologia", "prescricao.posologia", "prescription.posology", "dosage_instructions", "dosage", "instrucoes", "dosagem"]) || extracted.posologia || "",
            }

            filledForSave = filled
            setFormData((prev) => ({ ...prev, ...filled }))
            setAiApplied(true)
            toast({ title: "Campos sugeridos", description: "Usamos a transcrição e a IA para preencher. Revise e clique em 'Salvar Prontuário'." })
            setIsSubmitting(false)
            return
          } catch (e) {
            // Fallback final: usar apenas o que foi extraído da transcrição
            const filled = {
              queixa: formData.queixa || extracted.queixa || "",
              historia: formData.historia || extracted.historia || "",
              diagnostico: formData.diagnostico || extracted.diagnostico || "",
              conduta: formData.conduta || extracted.conduta || "",
              medicamentos: formData.medicamentos || extracted.medicamentos || "",
              posologia: formData.posologia || extracted.posologia || "",
            }
            filledForSave = filled
            setFormData((prev) => ({ ...prev, ...filled }))
            setAiApplied(true)
            toast({ title: "Campos sugeridos", description: "Usamos a transcrição para preencher. Revise e clique em 'Salvar Prontuário'." })
            setIsSubmitting(false)
            return
          }
        }
      }

      // ETAPA 2: Salvar de fato o prontuário (e receita)
      const source = filledForSave ? { ...formData, ...filledForSave } : formData
      // Monta payload mínimo e ignora campos vazios para evitar 400
      const prontuarioPayload = {
        consulta_id: consultaId,
        queixa_principal: (source.queixa || extracted.queixa || "").trim(),
        historia_doenca_atual: (source.historia || extracted.historia || "").trim(),
        diagnostico_principal: (source.diagnostico || extracted.diagnostico || "").trim(),
        conduta: (source.conduta || extracted.conduta || "").trim(),
      }
      if (source.medicamentos || extracted.medicamentos) {
        prontuarioPayload.medicamentos_uso = (source.medicamentos || extracted.medicamentos).trim()
      }
      if (source.alergias) prontuarioPayload.alergias = source.alergias
      if (source.exames) prontuarioPayload.exames_solicitados = source.exames
      if (source.retorno) prontuarioPayload.data_retorno = source.retorno

      let prontuarioId = null
      if (consultaId) {
        try {
          const result = await medicoService.criarProntuario(prontuarioPayload)
          prontuarioId = result?.id || result?.data?.id
        } catch (e) {
          console.warn("Falha ao criar prontuário:", e)
        }
      }

      // Gerar receita com base na sugestão do resumo e/ou nos campos preenchidos
      const hoje = new Date()
      const validade = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 7)
      const pad = (n) => String(n).padStart(2, "0")
      const validadeStr = `${validade.getFullYear()}-${pad(validade.getMonth() + 1)}-${pad(validade.getDate())}`

      const medicamentos = source.medicamentos || extracted.medicamentos || ""
      const posologia = source.posologia || extracted.posologia || ""
      const diagnostico = source.diagnostico || extracted.diagnostico || ""
      const conduta = source.conduta || extracted.conduta || ""
      const queixa = source.queixa || extracted.queixa || ""
      const historia = source.historia || extracted.historia || ""

      if (consultaId && (medicamentos || posologia)) {
        try {
          await medicoService.criarReceita({
            consulta_id: consultaId,
            paciente: id,
            paciente_id: id,
            medicamentos,
            posologia,
            validade: validadeStr,
            observacoes: "Receita gerada automaticamente a partir do resumo da consulta.",
          })
        } catch (e) {
          console.warn("Falha ao criar receita automática:", e)
        }
      }

      try { localStorage.removeItem(storageKey) } catch {}
      // Redireciona para a nova tela de resumo da consulta antes do preview da receita
      navigate(`/medico/paciente/${id}/consulta/resumo`, {
        state: {
          resumo: { medicamentos, posologia, validade: validadeStr, diagnostico, conduta, queixa, historia },
          consultaId,
          prontuarioId,
        },
      })
    } catch (err) {
      console.error('Erro ao salvar prontuário/consulta:', err)
      // Mesmo em erro, encaminhar para a tela de resumo com os dados disponíveis
      const hoje = new Date()
      const validade = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 7)
      const pad = (n) => String(n).padStart(2, "0")
      const validadeStr = `${validade.getFullYear()}-${pad(validade.getMonth() + 1)}-${pad(validade.getDate())}`
      const medicamentos = formData.medicamentos || extracted.medicamentos || ""
      const posologia = formData.posologia || extracted.posologia || ""
      const diagnostico = formData.diagnostico || extracted.diagnostico || ""
      const conduta = formData.conduta || extracted.conduta || ""
      const queixa = formData.queixa || extracted.queixa || ""
      const historia = formData.historia || extracted.historia || ""
      navigate(`/medico/paciente/${id}/consulta/resumo`, {
        state: {
          resumo: { medicamentos, posologia, validade: validadeStr, diagnostico, conduta, queixa, historia },
          consultaId,
        },
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Nova Consulta</h1>
        <p className="text-muted-foreground">Paciente ID: {id}{consultaId ? ` • Consulta #${consultaId}` : ""}</p>
      </div>

      <PatientProfileSummary patientId={id} isPacienteView={false} profile={pacienteInfo?.user} patient={pacienteInfo} loading={!pacienteInfo} />

      {/* Transcrição em tempo real */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Transcrição de Áudio (tempo real)</CardTitle>
            <CardDescription>Fale normalmente; o texto aparecerá abaixo e pode ser editado.</CardDescription>
            {micError && (
              <p className="text-xs text-red-600 mt-1">Microfone: {micError}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1 text-sm ${isListening ? "text-green-600" : "text-muted-foreground"}`}>
              <CircleDot className={`h-4 w-4 ${isListening ? "animate-pulse" : ""}`} />
              {isListening ? "Ouvindo" : "Pausado"}
            </div>
            {isListening ? (
              <Button type="button" variant="outline" size="sm" onClick={stopListening}>
                <MicOff className="h-4 w-4 mr-2" /> Pausar
              </Button>
            ) : (
              <Button type="button" variant="default" size="sm" onClick={startListening}>
                <Mic className="h-4 w-4 mr-2" /> Retomar
              </Button>
            )}
            <Button type="button" variant="outline" size="sm" onClick={ensureMicAccess}>
              Testar microfone
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                stopListening()
                setTimeout(() => startListening(), 250)
              }}
            >
              Resetar microfone
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="transcript">Resumo em tempo real</Label>
            <Textarea
              id="transcript"
              placeholder="O que você ditar será transcrito aqui. Você pode editar livremente."
              className="min-h-[160px]"
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
            />
            {interimText && (
              <p className="text-xs text-muted-foreground mt-1" aria-live="polite">
                Ditando: {interimText}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="anamnese" className="flex items-center gap-2">
              <Stethoscope className="h-4 w-4" />
              Anamnese
            </TabsTrigger>
            <TabsTrigger value="exame-fisico" className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Exame Físico
            </TabsTrigger>
            <TabsTrigger value="diagnostico" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Diagnóstico
            </TabsTrigger>
          </TabsList>

          <TabsContent value="anamnese">
            <Card>
              <CardHeader>
                <CardTitle>Anamnese</CardTitle>
                <CardDescription>Registre a queixa principal e o histórico do paciente</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="queixa">Queixa Principal</Label>
                  <Textarea
                    id="queixa"
                    placeholder="Descreva a queixa principal do paciente"
                    className="min-h-[100px]"
                    value={formData.queixa}
                    onChange={handleFieldChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="historia">História da Doença Atual</Label>
                  <Textarea id="historia" placeholder="Descreva a história da doença atual" className="min-h-[150px]" value={formData.historia} onChange={handleFieldChange} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="medicamentos">Medicamentos em Uso</Label>
                    <Textarea id="medicamentos" placeholder="Liste os medicamentos em uso" className="min-h-[100px]" value={formData.medicamentos} onChange={handleFieldChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="alergias">Alergias</Label>
                    <Textarea id="alergias" placeholder="Liste as alergias conhecidas" className="min-h-[100px]" value={formData.alergias} onChange={handleFieldChange} />
                    <div className="mt-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => setAlergiaDialogOpen(true)}>
                        Adicionar alergia
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="exame-fisico">
            <Card>
              <CardHeader>
                <CardTitle>Exame Físico</CardTitle>
                <CardDescription>Registre os dados do exame físico do paciente</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pressao">Pressão Arterial</Label>
                    <Input id="pressao" placeholder="Ex: 120/80 mmHg" value={formData.pressao} onChange={handleFieldChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="frequencia-cardiaca">Freq. Cardíaca</Label>
                    <Input id="frequencia-cardiaca" placeholder="Ex: 75 bpm" value={formData["frequencia-cardiaca"]} onChange={handleFieldChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="temperatura">Temperatura</Label>
                    <Input id="temperatura" placeholder="Ex: 36.5 °C" value={formData.temperatura} onChange={handleFieldChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="saturacao">Saturação O2</Label>
                    <Input id="saturacao" placeholder="Ex: 98%" value={formData.saturacao} onChange={handleFieldChange} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="exame-geral">Exame Geral</Label>
                  <Textarea
                    id="exame-geral"
                    placeholder="Descreva o estado geral do paciente"
                    className="min-h-[100px]"
                    value={formData["exame-geral"]}
                    onChange={handleFieldChange}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sistema-cardiovascular">Sistema Cardiovascular</Label>
                    <Textarea
                      id="sistema-cardiovascular"
                      placeholder="Descreva os achados cardiovasculares"
                      className="min-h-[100px]"
                      value={formData["sistema-cardiovascular"]}
                      onChange={handleFieldChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sistema-respiratorio">Sistema Respiratório</Label>
                    <Textarea
                      id="sistema-respiratorio"
                      placeholder="Descreva os achados respiratórios"
                      className="min-h-[100px]"
                      value={formData["sistema-respiratorio"]}
                      onChange={handleFieldChange}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="diagnostico" id="problems_and_diagnostics">
            <Card>
              <CardHeader>
                <CardTitle>Diagnóstico e Conduta</CardTitle>
                <CardDescription>Registre o diagnóstico e plano terapêutico</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="diagnostico">Diagnóstico</Label>
                  <Textarea
                    id="diagnostico"
                    placeholder="Descreva o diagnóstico principal e diferenciais"
                    className="min-h-[100px]"
                    value={formData.diagnostico}
                    onChange={handleFieldChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="conduta">Conduta</Label>
                  <Textarea id="conduta" placeholder="Descreva a conduta terapêutica" className="min-h-[150px]" value={formData.conduta} onChange={handleFieldChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="exames">Exames Solicitados</Label>
                  <Textarea id="exames" placeholder="Liste os exames solicitados" className="min-h-[100px]" value={formData.exames} onChange={handleFieldChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="retorno">Retorno</Label>
                  <DatePicker id="retorno" name="retorno" className="max-w-xs" value={formData.retorno} onChange={(val) => handleFieldChange({ target: { name: "retorno", value: val } })} minDate={new Date()} />
                </div>
              </CardContent>
              {/* Botões foram movidos para um rodapé fixo do formulário, visível em todas as abas */}
            </Card>
          </TabsContent>
        </Tabs>

        {/* Rodapé fixo do formulário: sempre visível para finalizar a consulta */}
        <div className="sticky bottom-0 left-0 right-0 z-10 border-t bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>Salvando...</>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {aiApplied ? "Salvar Prontuário" : "Finalizar e Preencher com IA"}
                </>
              )}
            </Button>
          </div>
        </div>
       </form>

       {/* Dialogo para adicionar alergia */}
       <Dialog open={alergiaDialogOpen} onOpenChange={setAlergiaDialogOpen}>
         <DialogContent>
           <DialogHeader>
             <DialogTitle>Adicionar alergia</DialogTitle>
             <DialogDescription>Informe a alergia para adicionar ao prontuário (e ao cadastro do paciente).</DialogDescription>
           </DialogHeader>
           <div className="space-y-2 py-2">
             <Label htmlFor="nova-alergia">Alergia</Label>
             <Input
               id="nova-alergia"
               placeholder="Ex.: Dipirona"
               value={novaAlergia}
               onChange={(e) => setNovaAlergia(e.target.value)}
             />
           </div>
           <DialogFooter>
             <Button type="button" variant="outline" onClick={() => { setAlergiaDialogOpen(false); setNovaAlergia("") }}>Cancelar</Button>
             <Button type="button" onClick={handleSalvarAlergia}>Salvar</Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
     </div>
   )
}
