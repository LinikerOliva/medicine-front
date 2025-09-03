"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileText, Stethoscope, ClipboardList, Save } from "lucide-react"

export default function IniciarConsulta({ params }) {
  const { id } = params
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Simulando envio de dados
    await new Promise((resolve) => setTimeout(resolve, 1500))

    setIsSubmitting(false)
    router.push(`/medico/paciente/${id}/perfil`)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Nova Consulta</h1>
        <p className="text-muted-foreground">Paciente: João Silva (ID: {id})</p>
      </div>

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
                <CardDescription>Registre a queixa principal e histórico do paciente</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="queixa">Queixa Principal</Label>
                  <Textarea
                    id="queixa"
                    placeholder="Descreva a queixa principal do paciente"
                    className="min-h-[100px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="historia">História da Doença Atual</Label>
                  <Textarea id="historia" placeholder="Descreva a história da doença atual" className="min-h-[150px]" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="medicamentos">Medicamentos em Uso</Label>
                    <Textarea id="medicamentos" placeholder="Liste os medicamentos em uso" className="min-h-[100px]" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="alergias">Alergias</Label>
                    <Textarea id="alergias" placeholder="Liste as alergias conhecidas" className="min-h-[100px]" />
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
                    <Input id="pressao" placeholder="Ex: 120/80 mmHg" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="frequencia-cardiaca">Freq. Cardíaca</Label>
                    <Input id="frequencia-cardiaca" placeholder="Ex: 75 bpm" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="temperatura">Temperatura</Label>
                    <Input id="temperatura" placeholder="Ex: 36.5 °C" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="saturacao">Saturação O2</Label>
                    <Input id="saturacao" placeholder="Ex: 98%" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="exame-geral">Exame Geral</Label>
                  <Textarea
                    id="exame-geral"
                    placeholder="Descreva o estado geral do paciente"
                    className="min-h-[100px]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sistema-cardiovascular">Sistema Cardiovascular</Label>
                    <Textarea
                      id="sistema-cardiovascular"
                      placeholder="Descreva os achados cardiovasculares"
                      className="min-h-[100px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sistema-respiratorio">Sistema Respiratório</Label>
                    <Textarea
                      id="sistema-respiratorio"
                      placeholder="Descreva os achados respiratórios"
                      className="min-h-[100px]"
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
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="conduta">Conduta</Label>
                  <Textarea id="conduta" placeholder="Descreva a conduta terapêutica" className="min-h-[150px]" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="exames">Exames Solicitados</Label>
                  <Textarea id="exames" placeholder="Liste os exames solicitados" className="min-h-[100px]" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="retorno">Retorno</Label>
                  <Input id="retorno" type="date" className="max-w-xs" />
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={() => router.back()}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>Salvando...</>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Finalizar Consulta
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </form>
    </div>
  )
}
