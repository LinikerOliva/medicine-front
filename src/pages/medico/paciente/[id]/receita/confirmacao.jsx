import React from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, Mail, CheckCircle2 } from "lucide-react"

export default function ConfirmacaoEnvioReceita() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { state } = useLocation()
  const receitaId = state?.receitaId || null
  const email = state?.email || null
  const filename = state?.filename || null

  return (
    <div className="p-4">
      <div className="max-w-3xl mx-auto space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Receita enviada com sucesso</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="h-5 w-5" />
              <span>O paciente recebeu a receita assinada.</span>
            </div>
            <div className="text-sm text-muted-foreground">
              {email ? (
                <div className="flex items-center gap-2"><Mail className="h-4 w-4" /><span>Enviado para: {email}</span></div>
              ) : (
                <div className="flex items-center gap-2"><Mail className="h-4 w-4" /><span>E-mail do paciente não informado.</span></div>
              )}
              {filename ? (
                <div className="flex items-center gap-2"><FileText className="h-4 w-4" /><span>Arquivo: {filename}</span></div>
              ) : null}
              {receitaId ? (
                <div className="mt-2 text-xs">ID da Receita: {receitaId}</div>
              ) : null}
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={() => navigate(`/medico/paciente/${id}/receita/preview`)} variant="secondary">Voltar à receita</Button>
              <Button onClick={() => navigate("/medico/meus-pacientes")}>Ir para Meus Pacientes</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}