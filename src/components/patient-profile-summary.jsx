import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Link } from "react-router-dom"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { capitalizeWords } from "@/lib/utils"
import { User, Heart, Droplets } from "lucide-react"

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

  const calcAgeStr = (dateStr) => {
    if (!dateStr) return null
    const dob = new Date(dateStr)
    if (Number.isNaN(dob.getTime())) return null
    const today = new Date()
    let years = today.getFullYear() - dob.getFullYear()
    const monthDiff = today.getMonth() - dob.getMonth()
    const dayDiff = today.getDate() - dob.getDate()
    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) years--
    let lastBirthday = new Date(today.getFullYear(), dob.getMonth(), dob.getDate())
    if (lastBirthday > today) lastBirthday = new Date(today.getFullYear() - 1, dob.getMonth(), dob.getDate())
    const msPerDay = 24 * 60 * 60 * 1000
    const days = Math.floor((today - lastBirthday) / msPerDay)
    return `${years} anos e ${days} dias`
  }

  const birth = profile?.data_nascimento || patient?.data_nascimento || null
  const ageStr = calcAgeStr(birth)

  // Dados médicos: prioriza patient e faz fallback para profile, caso algum fluxo antigo use esse formato
  const bloodType = patient?.tipo_sanguineo || profile?.tipo_sanguineo || "—"
  const allergiesRaw = patient?.alergias ?? profile?.alergias
  const allergies =
    Array.isArray(allergiesRaw) ? (alergiesRaw.length ? allergiesRaw.join(", ") : "—") : allergiesRaw || "—"

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 mb-6">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Skeleton className="h-20 w-20 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20">
          <CardContent className="pt-6">
            <div className="grid grid-cols-3 gap-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 mb-6">
      {/* Card do Perfil */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 hover:shadow-xl transition-all duration-300">
        <CardContent className="pt-6">
          <div className="flex items-center gap-6">
            <div className="relative">
              <Avatar className="h-20 w-20 ring-4 ring-white/50 shadow-lg">
                <AvatarImage src={profile?.avatar} alt={displayName} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-2xl font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1.5 shadow-lg">
                <User className="h-3 w-3 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">
                {displayName}
              </h2>
              <div className="flex items-center gap-2">
                <Badge 
                  variant={isPacienteView ? "default" : "secondary"}
                  className="text-xs font-medium"
                >
                  {isPacienteView ? "Paciente" : `ID: ${patientId || profile?.id || "-"}`}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card de Informações Médicas */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 hover:shadow-xl transition-all duration-300">
        <CardContent className="pt-6">
          <div className="grid grid-cols-3 gap-4">
            {/* Idade */}
            <div className="text-center p-3 bg-white/60 dark:bg-slate-800/60 rounded-lg backdrop-blur-sm">
              <div className="flex items-center justify-center mb-2">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-full">
                  <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Idade</p>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {ageStr || "—"}
              </p>
            </div>

            {/* Tipo Sanguíneo */}
            <div className="text-center p-3 bg-white/60 dark:bg-slate-800/60 rounded-lg backdrop-blur-sm">
              <div className="flex items-center justify-center mb-2">
                <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-full">
                  <Droplets className="h-4 w-4 text-red-600 dark:text-red-400" />
                </div>
              </div>
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Tipo Sanguíneo</p>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {bloodType}
              </p>
            </div>

            {/* Alergias */}
            <div className="text-center p-3 bg-white/60 dark:bg-slate-800/60 rounded-lg backdrop-blur-sm">
              <div className="flex items-center justify-center mb-2">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/50 rounded-full">
                  <Heart className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Alergias</p>
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate" title={allergies}>
                {allergies}
              </p>
            </div>
          </div>
          
          {!isPacienteView && (
            <div className="mt-6 pt-4 border-t border-white/20">
              <Button 
                size="sm" 
                asChild
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Link to={`/medico/paciente/${patientId || profile?.id}/iniciar-consulta`}>
                  Iniciar Consulta
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
