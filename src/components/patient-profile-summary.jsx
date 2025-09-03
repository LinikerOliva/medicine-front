import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Link } from "react-router-dom"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { capitalizeWords } from "@/lib/utils"

export function PatientProfileSummary({ patientId, isPacienteView = true, profile, patient, loading = false }) {
  // Nome de exibição com fallback: nome -> first_name + last_name -> username formatado -> "Usuário"
  const formatUsername = (username) => {
    if (!username) return ""
    // Substitui underscores por espaços e capitaliza as palavras
    return capitalizeWords(username.replace(/_/g, " "))
  }

  const displayName =
    (profile?.nome && profile.nome.trim()) ||
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
    formatUsername(profile?.username) ||
    "Usuário"

  const initials =
    displayName
      ?.trim()
      ?.split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0]?.toUpperCase())
      .join("") || "?"

  const calcAge = (dateStr) => {
    if (!dateStr) return null
    const d = new Date(dateStr)
    if (Number.isNaN(d.getTime())) return null
    const diff = Date.now() - d.getTime()
    const age = new Date(diff).getUTCFullYear() - 1970
    return age >= 0 ? age : null
  }

  const age = calcAge(profile?.data_nascimento)

  // Dados médicos: prioriza patient e faz fallback para profile, caso algum fluxo antigo use esse formato
  const bloodType = patient?.tipo_sanguineo || profile?.tipo_sanguineo || "—"
  const allergiesRaw = patient?.alergias ?? profile?.alergias
  const allergies =
    Array.isArray(allergiesRaw) ? (alergiesRaw.length ? allergiesRaw.join(", ") : "—") : allergiesRaw || "—"

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-3 gap-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 mb-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={profile?.avatar} alt={displayName} />
              <AvatarFallback className="bg-muted text-xl font-semibold">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-2xl font-bold">{displayName}</h2>
              <p className="text-sm text-muted-foreground">
                {isPacienteView ? "Paciente" : `ID: ${patientId || profile?.id || "-"}`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="font-medium text-muted-foreground">Idade</p>
              <p>{age ? `${age} anos` : "—"}</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Tipo Sanguíneo</p>
              <p>{bloodType}</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Alergias</p>
              <p>{allergies}</p>
            </div>
          </div>
          {!isPacienteView && (
            <div className="mt-4">
              <Button size="sm" asChild>
                <Link to={`/medico/paciente/${patientId || profile?.id}/iniciar-consulta`}>Iniciar Consulta</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
