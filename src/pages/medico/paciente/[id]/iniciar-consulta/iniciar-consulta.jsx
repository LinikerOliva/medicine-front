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

  const stopListening = () => {
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
    } catch {}
  }

  // Util: extração simples a partir do texto transcrito
  function extractFromTranscript(text = "") {
    const norm = text.replace(/\r/g, "").trim()

    const getSection = (labels) => {
      const regex = new RegExp(`(?:^|\n)\s*(?:${labels.join("|")})\s*[:：]\s*([\s\S]*?)(?=\n\s*(?:Queixa|História|Historia|Exame|Diagn[oó]stico|Conduta|Prescri|Rx|Receita)\s*[:：]|$)`, "i")
      const m = norm.match(regex)
      return m ? m[1].trim() : ""
    }

    const queixa = getSection(["Queixa", "Queixa Principal"]) || norm.split(/\n\n|\n-/)[0]?.slice(0, 300) || ""
    const historia = getSection(["História", "Historia", "HDA", "História da Doença Atual"]) || ""
    const diagnostico = getSection(["Diagnóstico", "Diagnostico"]) || ""
    const conduta = getSection(["Conduta", "Plano", "Plano Terapêutico"]) || ""
    const prescricao = getSection(["Prescrição", "Prescricao", "Receita", "Rx"]) || ""

    // Tentar separar medicamentos e posologia de uma seção de prescrição
    let medicamentos = ""
    let posologia = ""
    if (prescricao) {
      // Heurística simples: primeira linha como medicamentos, próximo(s) como posologia
      const lines = prescricao.split(/\n+/).map((l) => l.trim()).filter(Boolean)
      if (lines.length === 1) {
        medicamentos = lines[0]
        posologia = "Conforme descrito na prescrição."
      } else if (lines.length > 1) {
        medicamentos = lines[0]
        posologia = lines.slice(1).join(" ")
      }
    }

    if (!medicamentos && conduta) {
      // fallback: extrair de conduta algum trecho com mg/ml/comprimido
      const medLine = (conduta.match(/.+?(\d+\s?(mg|ml|g|mcg)|comprimid|c[aá]psul|gotas).*/i) || [""])[0]
      if (medLine) {
        medicamentos = medLine.trim()
        posologia = "Conforme conduta descrita."
      }
    }

    return { queixa, historia, diagnostico, conduta, medicamentos, posologia }
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

    try {
      // Extrair a partir da transcrição (fallback)
      const extracted = extractFromTranscript(transcript)

      // ETAPA 1: Finalizar e buscar resumo da IA para preencher os campos na tela
      if (!aiApplied) {
        if (consultaId) {
          try { await medicoService.finalizarConsulta(consultaId) } catch {}
          let aiData = null
          try {
            aiData = await medicoService.sumarizarConsulta(consultaId, {
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
              })
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
          }

          setFormData((prev) => ({ ...prev, ...filled }))
          setAiApplied(true)
          toast({
            title: "Resumo aplicado",
            description: "Preenchemos os campos com a sugestão da IA. Revise e clique novamente para salvar o prontuário.",
          })
          setIsSubmitting(false)
          return
        } else {
          // Sem consultaId: usar apenas o que foi extraído da transcrição
          setFormData((prev) => ({
            ...prev,
            queixa: prev.queixa || extracted.queixa || "",
            historia: prev.historia || extracted.historia || "",
            diagnostico: prev.diagnostico || extracted.diagnostico || "",
            conduta: prev.conduta || extracted.conduta || "",
            medicamentos: prev.medicamentos || extracted.medicamentos || "",
          }))
          setAiApplied(true)
          toast({ title: "Campos sugeridos", description: "Usamos a transcrição para sugerir os campos. Revise e clique novamente para salvar." })
          setIsSubmitting(false)
          return
        }
      }

      // ETAPA 2: Salvar de fato o prontuário (e receita)
      const prontuarioPayload = {
        consulta_id: consultaId,
        queixa_principal: formData.queixa || extracted.queixa || "",
        historia_doenca_atual: formData.historia || extracted.historia || "",
        medicamentos_uso: formData.medicamentos || "",
        alergias: formData.alergias || "",
        pressao_arterial: formData.pressao || "",
        frequencia_cardiaca: formData["frequencia-cardiaca"] || "",
        temperatura: formData.temperatura || "",
        saturacao_oxigenio: formData.saturacao || "",
        exame_geral: formData["exame-geral"] || "",
        sistema_cardiovascular: formData["sistema-cardiovascular"] || "",
        sistema_respiratorio: formData["sistema-respiratorio"] || "",
        diagnostico_principal: formData.diagnostico || extracted.diagnostico || "",
        conduta: formData.conduta || extracted.conduta || "",
        exames_solicitados: formData.exames || "",
        data_retorno: formData.retorno || null,
      }

      const result = await medicoService.criarProntuario(prontuarioPayload)
      const prontuarioId = result?.id || result?.data?.id
  
      // Gerar receita com base na sugestão do resumo e/ou nos campos preenchidos
      const hoje = new Date()
      const validade = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 7)
      const pad = (n) => String(n).padStart(2, "0")
      const validadeStr = `${validade.getFullYear()}-${pad(validade.getMonth() + 1)}-${pad(validade.getDate())}`
  
      const medicamentos = formData.medicamentos || extracted.medicamentos || ""
      const posologia = extracted.posologia || ""
  
      if (consultaId && (medicamentos || posologia)) {
        try {
          await medicoService.criarReceita({
            consulta_id: consultaId,
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
      navigate(`/medico/paciente/${id}/receita/preview`, { state: { fromConsulta: { medicamentos, posologia, validade: validadeStr }, consultaId } })
    } catch (err) {
      console.error('Erro ao salvar prontuário/consulta:', err)
      // Mesmo em erro, encaminhar para preview com dados disponíveis
      const hoje = new Date()
      const validade = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 7)
      const pad = (n) => String(n).padStart(2, "0")
      const validadeStr = `${validade.getFullYear()}-${pad(validade.getMonth() + 1)}-${pad(validade.getDate())}`
      const medicamentos = formData.medicamentos || extracted.medicamentos || ""
      const posologia = extracted.posologia || ""
      navigate(`/medico/paciente/${id}/receita/preview`, { state: { fromConsulta: { medicamentos, posologia, validade: validadeStr }, consultaId } })
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
        <Tabs defaultValue="anamnese" className="space-y-4">
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

          <TabsContent value="diagnostico">
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
                  <Input id="retorno" type="date" className="max-w-xs" value={formData.retorno} onChange={handleFieldChange} />
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
