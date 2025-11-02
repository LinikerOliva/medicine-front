import React, { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, XCircle, FileText, Calendar, User, Stethoscope } from "lucide-react"
import api from "@/services/api"

export default function VerificarReceita() {
  const { id } = useParams()
  const [receita, setReceita] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function verificarReceita() {
      try {
        setLoading(true)
        const response = await api.get(`/receitas/${id}/verificar/`)
        setReceita(response.data)
      } catch (err) {
        setError(err.response?.data?.detail || "Receita não encontrada ou inválida")
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      verificarReceita()
    }
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando receita...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-red-700">Receita Inválida</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-4">{error}</p>
            <p className="text-sm text-gray-500">
              Esta receita pode ter sido alterada, não existe ou não foi assinada digitalmente.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isValid = receita?.assinada && receita?.hash_documento
  const dataAssinatura = receita?.assinada_em ? new Date(receita.assinada_em).toLocaleString('pt-BR') : null
  const medicoAssinante = receita?.consulta?.medico?.user ? 
    `Dr. ${receita.consulta.medico.user.first_name} ${receita.consulta.medico.user.last_name}` : 
    receita?.medico || "Não informado"
  const crmMedico = receita?.consulta?.medico?.crm || "Não informado"

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-8">
          {isValid ? (
            <CheckCircle2 className="h-20 w-20 text-green-500 mx-auto mb-4" />
          ) : (
            <XCircle className="h-20 w-20 text-red-500 mx-auto mb-4" />
          )}
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Verificação de Receita Médica
          </h1>
          <Badge variant={isValid ? "default" : "destructive"} className="text-lg px-4 py-2">
            {isValid ? "✓ Receita Válida" : "✗ Receita Inválida"}
          </Badge>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Informações da Receita */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Informações da Receita
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">ID da Receita</label>
                <p className="font-mono text-sm bg-gray-100 p-2 rounded">{receita?.id}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Medicamento</label>
                <p className="font-medium">{receita?.medicamento || "Não informado"}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Dosagem</label>
                <p>{receita?.dosagem || "Não informada"}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Validade</label>
                <p>{receita?.validade || "Não informada"}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Data de Criação</label>
                <p className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {receita?.created_at ? new Date(receita.created_at).toLocaleString('pt-BR') : "Não informada"}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Informações do Paciente e Médico */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Paciente e Médico
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Paciente</label>
                <p className="font-medium">{receita?.nome_paciente || "Não informado"}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Médico Responsável</label>
                <p className="flex items-center gap-2">
                  <Stethoscope className="h-4 w-4" />
                  {medicoAssinante}
                </p>
                {crmMedico !== "Não informado" && (
                  <p className="text-sm text-gray-600 mt-1">CRM: {crmMedico}</p>
                )}
              </div>
              
              {receita?.endereco_consultorio && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Consultório</label>
                  <p>{receita.endereco_consultorio}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Informações de Assinatura Digital */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                Assinatura Digital
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-gray-500">Status da Assinatura</label>
                  <Badge variant={isValid ? "default" : "destructive"} className="mt-1">
                    {isValid ? "Assinada Digitalmente" : "Não Assinada"}
                  </Badge>
                </div>
                
                {dataAssinatura && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Data da Assinatura</label>
                    <p className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {dataAssinatura}
                    </p>
                  </div>
                )}
              </div>

              {isValid && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Assinado por</label>
                  <p className="flex items-center gap-2">
                    <Stethoscope className="h-4 w-4" />
                    {medicoAssinante} {crmMedico !== "Não informado" && `(CRM: ${crmMedico})`}
                  </p>
                </div>
              )}
              
              {receita?.hash_documento && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Hash de Verificação</label>
                  <p className="font-mono text-xs bg-gray-100 p-2 rounded break-all">
                    {receita.hash_documento}
                  </p>
                </div>
              )}
              
              {receita?.motivo && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Motivo da Assinatura</label>
                  <p>{receita.motivo}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Esta verificação confirma a autenticidade e integridade da receita médica.
            {isValid && " A receita foi assinada digitalmente e não foi alterada."}
          </p>
        </div>
      </div>
    </div>
  )
}