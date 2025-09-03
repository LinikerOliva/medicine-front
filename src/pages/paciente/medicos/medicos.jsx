import { useEffect, useState } from "react"
import { pacienteService } from "@/services/pacienteService"
import { ProfileTabs } from "@/components/profile-tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Stethoscope, Phone, Mail, User } from "lucide-react"

export default function PacienteMedicos() {
  const [medicos, setMedicos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const data = await pacienteService.getMedicos()
        if (mounted) setMedicos(Array.isArray(data) ? data : data?.results || [])
      } catch (e) {
        setError("Não foi possível carregar os médicos vinculados.")
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

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
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="flex items-center gap-2">
        <Stethoscope className="h-5 w-5" />
        <h1 className="text-2xl font-bold tracking-tight">Médicos Vinculados</h1>
      </div>

      <ProfileTabs tabs={pacienteTabs} basePath="/paciente" />

      {loading ? (
        <div className="grid gap-6 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-48" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-56" />
                <Skeleton className="h-4 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-red-500">{error}</p>
      ) : medicos.length === 0 ? (
        <div className="text-sm text-muted-foreground">Nenhum médico vinculado.</div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {medicos.map((m) => (
            <Card key={m.id || getDoctorCrm(m) || m.user?.id || m.user?.email}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {getDoctorName(m)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="text-muted-foreground">
                  {getDoctorSpecialty(m)}
                </div>
                <div className="flex items-center gap-2">
                  <Stethoscope className="h-4 w-4 text-muted-foreground" />
                  <span>CRM: {getDoctorCrm(m) || "—"}</span>
                </div>
                {getDoctorPhone(m) && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{getDoctorPhone(m)}</span>
                  </div>
                )}
                {getDoctorEmail(m) && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{getDoctorEmail(m)}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// Helpers de mapeamento (nome, especialidade e contatos)
const getDoctorName = (m) => {
  const u = m?.user || {}
  const full = [u.first_name, u.last_name].filter(Boolean).join(" ").trim()
  return full || u.nome || u.name || u.username || m?.nome || m?.name || m?.full_name || "Médico"
}

const getDoctorSpecialty = (m) => {
  const tryFromObj = (obj) => obj?.nome || obj?.titulo || obj?.name || obj?.descricao || obj?.description

  // Muitos-para-muitos: lista de especialidades
  if (Array.isArray(m?.especialidades) && m.especialidades.length) {
    const parts = m.especialidades
      .map((x) => tryFromObj(x) || (typeof x === "string" ? x : null))
      .filter(Boolean)
    if (parts.length) return parts.join(", ")
  }

  // Objeto único
  if (m?.especialidade && typeof m.especialidade === "object") {
    const v = tryFromObj(m.especialidade)
    if (v) return v
  }

  // Strings/alternativos
  if (typeof m?.especialidade === "string" && m.especialidade.trim()) return m.especialidade.trim()
  if (typeof m?.especialidade_nome === "string" && m.especialidade_nome.trim()) return m.especialidade_nome.trim()
  if (typeof m?.specialty === "string" && m.specialty.trim()) return m.specialty.trim()
  if (typeof m?.area === "string" && m.area.trim()) return m.area.trim()
  if (typeof m?.user?.especialidade === "string" && m.user.especialidade.trim()) return m.user.especialidade.trim()

  return "Especialidade não informada"
}

const getDoctorPhone = (m) => m?.telefone || m?.phone || m?.celular || m?.user?.phone || null
const getDoctorEmail = (m) => m?.email || m?.user?.email || null
const getDoctorCrm = (m) => m?.crm || m?.crm_numero || m?.crmNumber || m?.crm_registro || null
