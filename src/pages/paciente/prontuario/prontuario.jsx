import { useEffect, useState } from "react"
import { pacienteService } from "@/services/pacienteService"
import notificationService from "@/services/notificationService"
import { ProfileTabs } from "@/components/profile-tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { FileText, Pill, Clock } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"

export default function PacienteProntuario() {
  const [prontuario, setProntuario] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [medNotifEnabled, setMedNotifEnabled] = useState(false)
  const [savingNotif, setSavingNotif] = useState(false)
  const { toast } = useToast()

  // toArray centralizada (remove duplicadas)
  const toArray = (v) => {
    if (Array.isArray(v)) return v.filter((x) => x != null && x !== "")
    if (typeof v === "string") {
      return v
        .split(/[\n;,]+/)
        .map((s) => s.trim())
        .filter(Boolean)
    }
    if (v == null) return []
    return [v]
  }

  // Novo: extrai nome, dose e posologia mesmo quando a medicação vem como string
  const parseMedication = (item) => {
    let name = "", dose = "", schedule = ""
    if (typeof item === "string") {
      const segs = item.split(/[-;•|]/).map((s) => s.trim()).filter(Boolean)
      if (segs.length) name = segs[0]
      if (segs[1]) dose = segs[1]
      if (segs[2]) schedule = segs.slice(2).join(" • ")

      // heurísticas para dose/posologia quando não há separadores claros
      if (!dose) {
        const mDose = item.match(/\b(\d+(\.\d+)?\s?(mg|ml|mcg|g|gotas|ui))\b/i)
        if (mDose) dose = mDose[0]
      }
      if (!schedule) {
        const mFreq = item.match(/\b(\d+x\s?\/\s?dia|[1-9]\s?x\/dia|a\s?cada\s?\d+\s?h|de\s?\d+\s?em\s?\d+\s?h)\b/i)
        if (mFreq) schedule = mFreq[0]
      }
    } else if (item && typeof item === "object") {
      name = item.nome || item.medicamento || item.nome_medicamento || item.name || item.descricao || ""
      dose = item.dose || item.dosagem || item.dosage || ""
      schedule = item.posologia || item.frequencia || item.intervalo || item.schedule || ""
    }

    return {
      name: name || (typeof item === "string" ? item : JSON.stringify(item)),
      dose: dose || "",
      schedule: schedule || "",
    }
  }

  // Novo: renderer focado em acessibilidade para Medicações
  const renderMedications = (value) => {
    const items = toArray(value)
    return items.length > 0 ? (
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((x, i) => {
          const m = parseMedication(x)
          return (
            <div
              key={i}
              className="rounded-xl border bg-card p-3 shadow-sm hover:shadow-md transition-shadow"
              role="group"
              aria-label={`Medicação ${m.name}`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-md bg-primary/10 p-2 text-primary">
                  <Pill className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-base md:text-lg font-semibold leading-snug break-words">
                    {m.name}
                  </div>
                  {m.dose && (
                    <div className="text-sm md:text-base text-muted-foreground mt-0.5 break-words">
                      {m.dose}
                    </div>
                  )}
                  {m.schedule && (
                    <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-muted/60 px-2 py-1 text-xs md:text-sm text-foreground/80">
                      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                      <span className="break-words">{m.schedule}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    ) : (
      <p className="text-sm text-muted-foreground">Nenhum item.</p>
    )
  }

  useEffect(() => {
    let mounted = true

    const normalizeProntuario = (raw) => {
      // Suporta {results: [...]}, array na raiz ou objeto único
      const base = Array.isArray(raw)
        ? raw[0]
        : Array.isArray(raw?.results)
        ? raw.results[0]
        : raw || {}
      // Mapear chaves alternativas
      const alergias = base.alergias ?? base.allergies ?? base.alergia
      const condicoes = base.condicoes ?? base.condicoes_cronicas ?? base.condicoesCronicas
      const medicacoes =
        base.medicacoes ??
        base.medicamentos ??
        base.medicacoes_em_uso ??
        base.medicamentos_em_uso ??
        base.medicamentos_uso ??     // <--- incluir campo do backend
        base.em_uso ??
        base.medicacoesEmUso ??
        base.medicamentosEmUso ??
        base.medications ??
        base.current_medications ??
        base.prontuario?.medicacoes ??
        base.prontuario?.medicamentos
      const observacoes = base.observacoes ?? base.observacao ?? base.notes ?? base.anotacoes
      return {
        alergias: toArray(alergias),
        condicoes: toArray(condicoes),
        medicacoes: toArray(medicacoes),
        observacoes: observacoes ?? "—",
      }
    }

    const normalizeFromPatient = (p) => {
      if (!p) return null
      return {
        alergias: toArray(p.alergias),
        condicoes: toArray(p.condicoes_cronicas ?? p.condicoes),
        medicacoes: toArray(
          p.medicacoes ??
            p.medicamentos ??
            p.medicacoes_em_uso ??
            p.medicamentos_em_uso ??
            p.medicamentos_uso ??     // <--- incluir campo do backend
            p.em_uso ??
            p.medicacoesEmUso ??
            p.medicamentosEmUso ??
            p.medications ??
            p.current_medications
        ),
        observacoes: p.observacoes ?? "—",
      }
    }

    ;(async () => {
      const [pr, paciente] = await Promise.allSettled([
        pacienteService.getProntuario(),
        pacienteService.getPacienteDoUsuario(),
      ])

      let data = null
      try {
        if (pr.status === "fulfilled") data = normalizeProntuario(pr.value)
      } catch (_) {}

      const isEmpty =
        !data ||
        (toArray(data?.alergias).length === 0 &&
          toArray(data?.condicoes).length === 0 &&
          toArray(data?.medicacoes).length === 0 &&
          (!data?.observacoes || data?.observacoes === "—"))

      if (isEmpty && paciente.status === "fulfilled") {
        try {
          const pf = normalizeFromPatient(paciente.value)
          if (pf) data = pf
        } catch (_) {}
      }

      if (mounted) {
        setProntuario(data || { alergias: [], condicoes: [], medicacoes: [], observacoes: "—" })
        setError(null)
        setLoading(false)
      }
    })()

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const cfg = await notificationService.buscarConfiguracoes()
        const types = Array.isArray(cfg?.tipos_habilitados) ? cfg.tipos_habilitados : []
        const enabled = types.map((s) => String(s).toLowerCase()).includes("medicamento")
        if (active) setMedNotifEnabled(enabled)
      } catch (_) {
        try {
          const local = JSON.parse(localStorage.getItem("notif_pref_medication") || "null")
          if (local != null && active) setMedNotifEnabled(Boolean(local))
        } catch {}
      }
    })()
    return () => { active = false }
  }, [])

  const handleToggleMedicationNotif = async (checked) => {
    setSavingNotif(true)
    try {
      const cfg = await notificationService.buscarConfiguracoes().catch(() => ({}))
      const types = Array.isArray(cfg?.tipos_habilitados) ? cfg.tipos_habilitados.map(String) : []
      const lower = types.map((s) => s.toLowerCase())
      let newTypes = [...types]
      if (checked) {
        if (!lower.includes("medicamento")) newTypes.push("medicamento")
      } else {
        newTypes = newTypes.filter((t) => String(t).toLowerCase() !== "medicamento")
      }
      await notificationService.atualizarConfiguracoes({ ...cfg, tipos_habilitados: newTypes })
      setMedNotifEnabled(checked)
      toast({ title: checked ? "Notificações ativadas" : "Notificações desativadas", description: "Preferência de medicamento atualizada." })
    } catch (e) {
      setMedNotifEnabled(checked)
      try { localStorage.setItem("notif_pref_medication", JSON.stringify(checked)) } catch {}
      const msg = e?.response?.data ? JSON.stringify(e.response.data) : e?.message || "Preferência salva localmente"
      toast({ title: "Ajuste de notificação", description: msg })
    } finally {
      setSavingNotif(false)
    }
  }

  const renderList = (value) => {
    const items = toArray(value)
    return items.length > 0 ? (
      <div className="flex flex-wrap gap-2">
        {items.map((x, i) => {
          const label =
            typeof x === "string"
              ? x
              : x?.nome ||
                x?.medicamento ||
                x?.nome_medicamento ||
                [x?.descricao, x?.dose || x?.dosagem, x?.posologia || x?.frequencia]
                  .filter(Boolean)
                  .join(" • ") ||
                JSON.stringify(x)
          return (
            <Badge key={i} variant="secondary" className="px-2.5 py-1 text-xs">
              {label}
            </Badge>
          )
        })}
      </div>
    ) : (
      <p className="text-sm text-muted-foreground">Nenhum item.</p>
    )
  }

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

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <div className="flex items-center gap-2">
        <FileText className="h-5 w-5" />
        <h1 className="text-2xl font-bold tracking-tight">Prontuário</h1>
      </div>

      <ProfileTabs tabs={pacienteTabs} basePath="/paciente" />

      {loading ? (
        <div className="grid gap-6 lg:grid-cols-3 items-start">
          {/* Principal: Medicações (skeleton) */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <Skeleton className="h-5 w-40" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
          {/* Lateral direita (skeletons) */}
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-40" />
                </CardHeader>
                <CardContent className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : error ? (
        <p className="text-sm text-red-500">{error}</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3 items-start">
          <Card className="lg:col-span-2 min-h-[320px]">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Medicações</CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Notificação</span>
                <Switch checked={medNotifEnabled} onCheckedChange={handleToggleMedicationNotif} disabled={savingNotif} />
              </div>
            </CardHeader>
            <CardContent>
              {renderMedications(prontuario?.medicacoes)}
            </CardContent>
          </Card>

          {/* Lateral direita: Alergias, Condições e Observações empilhadas */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Alergias</CardTitle>
              </CardHeader>
              <CardContent>{renderList(prontuario?.alergias)}</CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Condições</CardTitle>
              </CardHeader>
              <CardContent>{renderList(prontuario?.condicoes)}</CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Observações</CardTitle>
              </CardHeader>
              <CardContent>
                {prontuario?.observacoes && prontuario?.observacoes !== "—" ? (
                  <div className="rounded-md bg-muted/40 p-3 text-sm leading-relaxed whitespace-pre-wrap">
                    {prontuario?.observacoes}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">—</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
