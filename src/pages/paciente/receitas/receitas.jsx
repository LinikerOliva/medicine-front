import { useEffect, useMemo, useState } from "react"
import { pacienteService } from "../../../services/pacienteService"
import { useToast } from "../../../hooks/use-toast"
import { ProfileTabs } from "@/components/profile-tabs"
import { Pill } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue, SelectLabel } from "@/components/ui/select"

export default function ReceitasPaciente() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState("")
  const [receitas, setReceitas] = useState([])
  const [medicos, setMedicos] = useState([])
  const [solicitarOpen, setSolicitarOpen] = useState(false)
  const [form, setForm] = useState({ medico: "", mensagem: "" })
  const [submitting, setSubmitting] = useState(false)

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
  const hasReceitas = useMemo(() => {
    if (Array.isArray(receitas)) return receitas.length > 0
    if (Array.isArray(receitas?.results)) return receitas.results.length > 0
    return false
  }, [receitas])

  const receitasList = useMemo(() => {
    if (Array.isArray(receitas)) return receitas
    if (Array.isArray(receitas?.results)) return receitas.results
    return []
  }, [receitas])

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      setErro("")
      try {
        const [r, ms] = await Promise.all([
          pacienteService.getReceitas(),
          pacienteService.getMedicosVinculados(),
        ])
        if (!mounted) return
        setReceitas(r)
        setMedicos(ms)

        // Fallback: se não vier médico vinculado, tenta listar geral
        if (Array.isArray(ms) && ms.length === 0) {
          try {
            const all = await pacienteService.getMedicos({ limit: 50 })
            const arr = Array.isArray(all) ? all : all?.results || []
            if (mounted && arr.length > 0) {
              setMedicos(arr)
            }
          } catch {}
        }
      } catch (e) {
        if (!mounted) return
        setErro("Falha ao carregar receitas.")
      } finally {
        if (mounted) setLoading(false)
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
      await pacienteService.solicitarReceita({ medico: form.medico, mensagem: form.mensagem })
      toast({ title: "Solicitação enviada", description: "Seu pedido de receita foi enviado ao médico." })
      setSolicitarOpen(false)
      setForm({ medico: "", mensagem: "" })
    } catch (err) {
      toast({
        title: "Erro ao solicitar",
        description: err?.response?.data?.detail || "Não foi possível enviar a solicitação.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
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

  if (loading) return <div>Carregando receitas...</div>
  if (erro) return <div className="text-red-600">{erro}</div>

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="flex items-center gap-2">
        <Pill className="h-5 w-5" />
        <h1 className="text-2xl font-bold tracking-tight">Minhas Receitas</h1>
      </div>

      <ProfileTabs tabs={pacienteTabs} basePath="/paciente" />

      <div className="flex items-center justify-between">
        <div />
        <Button onClick={() => setSolicitarOpen(true)}>
          Solicitar Receita
        </Button>
      </div>

      {/* Lista de receitas */}
      {!hasReceitas ? (
        <div className="text-gray-600">Você ainda não possui receitas.</div>
      ) : (
        <div className="grid gap-4">
          {receitasList.map((r) => {
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
              <div key={r.id} className="border rounded p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium">Emitida em: {new Date(r.created_at).toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Validade: {r.validade}</div>
                </div>
                <div className="text-sm text-gray-700">
                  <div><strong>Médico:</strong> {medicoNome}</div>
                  <div><strong>Paciente:</strong> {pacienteNome}</div>
                </div>
                <div className="mt-2">
                  <div className="font-semibold">Medicamentos</div>
                  <div className="whitespace-pre-wrap text-sm">{r.medicamentos}</div>
                </div>
                <div className="mt-2">
                  <div className="font-semibold">Posologia</div>
                  <div className="whitespace-pre-wrap text-sm">{r.posologia}</div>
                </div>
                {r.observacoes ? (
                  <div className="mt-2">
                    <div className="font-semibold">Observações</div>
                    <div className="whitespace-pre-wrap text-sm">{r.observacoes}</div>
                  </div>
                ) : null}
                {Array.isArray(r.itens) && r.itens.length > 0 ? (
                  <div className="mt-3">
                    <div className="font-semibold">Itens estruturados</div>
                    <ul className="list-disc ml-6 text-sm">
                      {r.itens.map((it) => (
                        <li key={it.id}>
                          {it.medicamento?.nome || "Medicamento"} - {it.dose || ""} {it.frequencia ? `| ${it.frequencia}` : ""} {it.duracao ? `| ${it.duracao}` : ""}
                          {it.observacoes ? <span> — {it.observacoes}</span> : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {r.arquivo_assinado ? (
                  <div className="mt-3">
                    <a
                      className="text-blue-600 underline"
                      href={r.arquivo_assinado}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Baixar PDF assinado
                    </a>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal/Seção de Solicitar Receita */}
      {solicitarOpen ? (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card text-card-foreground border rounded-lg p-6 w-full max-w-lg shadow-lg">
            <h2 className="text-lg font-semibold mb-4">Solicitar Receita</h2>
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
                  placeholder="Descreva sua necessidade (ex: renovação de medicamento de uso contínuo)"
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
                    setForm({ medico: "", mensagem: "" })
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Enviando..." : "Enviar solicitação"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}