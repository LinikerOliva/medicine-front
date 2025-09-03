"use client"

import { useState, useEffect } from "react"
// Remova esta linha de import:
// import { ClinicaLayout } from "../../../layouts/clinica-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card"
import { Button } from "../../../components/ui/button"
import { Badge } from "../../../components/ui/badge"
import { Input } from "../../../components/ui/input"
import { Label } from "../../../components/ui/label"
import { Clock, Calendar, Plus, Trash2, Save, Copy } from "lucide-react"
import { clinicaService } from "../../../services/clinicaService"
import { useToast } from "../../../hooks/use-toast"

const horariosTemplate = {
  manha: ["08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30"],
  tarde: ["13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00"],
  integral: [
    "08:00",
    "08:30",
    "09:00",
    "09:30",
    "10:00",
    "10:30",
    "11:00",
    "11:30",
    "13:00",
    "13:30",
    "14:00",
    "14:30",
    "15:00",
    "15:30",
    "16:00",
    "16:30",
    "17:00",
  ],
}

export default function ClinicaDisponibilidade() {
  const [dataSelecionada, setDataSelecionada] = useState("")
  const [horariosDisponiveis, setHorariosDisponiveis] = useState([])
  const [novoHorario, setNovoHorario] = useState("")
  const [loading, setLoading] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const { toast } = useToast()

  const breadcrumbs = [{ label: "Dashboard", href: "/clinica/dashboard" }, { label: "Disponibilidade" }]

  useEffect(() => {
    if (dataSelecionada) {
      carregarDisponibilidade()
    }
  }, [dataSelecionada])

  const carregarDisponibilidade = async () => {
    setLoading(true)
    try {
      const response = await clinicaService.getDisponibilidade(dataSelecionada)
      setHorariosDisponiveis(response.data?.horarios || [])
    } catch (error) {
      console.error("Erro ao carregar disponibilidade:", error)
      // Dados mock para demonstração
      setHorariosDisponiveis([
        { horario: "09:00", ocupado: false },
        { horario: "10:00", ocupado: true },
        { horario: "11:00", ocupado: false },
        { horario: "14:00", ocupado: false },
        { horario: "15:00", ocupado: true },
      ])
    } finally {
      setLoading(false)
    }
  }

  const salvarDisponibilidade = async () => {
    if (!dataSelecionada) {
      toast({
        title: "Erro",
        description: "Selecione uma data primeiro",
        variant: "destructive",
      })
      return
    }

    setSalvando(true)
    try {
      await clinicaService.setDisponibilidade(dataSelecionada, horariosDisponiveis)
      toast({
        title: "Sucesso",
        description: "Disponibilidade salva com sucesso",
      })
    } catch (error) {
      console.error("Erro ao salvar disponibilidade:", error)
      toast({
        title: "Erro",
        description: "Erro ao salvar disponibilidade",
        variant: "destructive",
      })
    } finally {
      setSalvando(false)
    }
  }

  const adicionarHorario = () => {
    if (!novoHorario) return

    const horarioExiste = horariosDisponiveis.some((h) => h.horario === novoHorario)
    if (horarioExiste) {
      toast({
        title: "Aviso",
        description: "Este horário já existe",
        variant: "destructive",
      })
      return
    }

    setHorariosDisponiveis(
      [...horariosDisponiveis, { horario: novoHorario, ocupado: false }].sort((a, b) =>
        a.horario.localeCompare(b.horario),
      ),
    )

    setNovoHorario("")
  }

  const removerHorario = (horario) => {
    setHorariosDisponiveis(horariosDisponiveis.filter((h) => h.horario !== horario))
  }

  const aplicarTemplate = (template) => {
    const novosHorarios = horariosTemplate[template].map((horario) => ({
      horario,
      ocupado: false,
    }))
    setHorariosDisponiveis(novosHorarios)
  }

  const copiarDiaAnterior = async () => {
    if (!dataSelecionada) return

    const dataAnterior = new Date(dataSelecionada)
    dataAnterior.setDate(dataAnterior.getDate() - 1)
    const dataAnteriorString = dataAnterior.toISOString().split("T")[0]

    try {
      const response = await clinicaService.getDisponibilidade(dataAnteriorString)
      const horariosAnteriores = response.data?.horarios || []

      // Remove os horários ocupados e mantém apenas os disponíveis
      const horariosLimpos = horariosAnteriores.filter((h) => !h.ocupado).map((h) => ({ ...h, ocupado: false }))

      setHorariosDisponiveis(horariosLimpos)

      toast({
        title: "Sucesso",
        description: "Horários copiados do dia anterior",
      })
    } catch (error) {
      console.error("Erro ao copiar horários:", error)
      toast({
        title: "Erro",
        description: "Erro ao copiar horários do dia anterior",
        variant: "destructive",
      })
    }
  }

  // Data mínima é hoje
  const dataMinima = new Date().toISOString().split("T")[0]

  return (
    <>
      {/* conteúdo da página de Disponibilidade */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Gerenciar Disponibilidade</h1>
            <p className="text-muted-foreground">Configure os horários disponíveis para exames</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Seleção de data e templates */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Selecionar Data
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="data">Data</Label>
                  <Input
                    id="data"
                    type="date"
                    value={dataSelecionada}
                    onChange={(e) => setDataSelecionada(e.target.value)}
                    min={dataMinima}
                  />
                </div>

                {dataSelecionada && (
                  <div className="text-sm text-muted-foreground">
                    {new Date(dataSelecionada + "T00:00:00").toLocaleDateString("pt-BR", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Templates Rápidos</CardTitle>
                <CardDescription>Aplique configurações pré-definidas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start bg-transparent"
                  onClick={() => aplicarTemplate("manha")}
                  disabled={!dataSelecionada}
                >
                  <Clock className="mr-2 h-4 w-4" />
                  Manhã (8h às 11h30)
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start bg-transparent"
                  onClick={() => aplicarTemplate("tarde")}
                  disabled={!dataSelecionada}
                >
                  <Clock className="mr-2 h-4 w-4" />
                  Tarde (13h às 17h)
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start bg-transparent"
                  onClick={() => aplicarTemplate("integral")}
                  disabled={!dataSelecionada}
                >
                  <Clock className="mr-2 h-4 w-4" />
                  Período Integral
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start bg-transparent"
                  onClick={copiarDiaAnterior}
                  disabled={!dataSelecionada}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copiar Dia Anterior
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Gerenciamento de horários */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Horários Disponíveis
                  </CardTitle>
                  <Button onClick={salvarDisponibilidade} disabled={!dataSelecionada || salvando}>
                    <Save className="mr-2 h-4 w-4" />
                    {salvando ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
                {dataSelecionada && (
                  <CardDescription>
                    Configurando horários para {new Date(dataSelecionada + "T00:00:00").toLocaleDateString("pt-BR")}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {!dataSelecionada ? (
                  <div className="text-center text-muted-foreground py-12">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Selecione uma data para gerenciar os horários</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Adicionar novo horário */}
                    <div className="flex gap-2">
                      <Input
                        type="time"
                        value={novoHorario}
                        onChange={(e) => setNovoHorario(e.target.value)}
                        placeholder="Novo horário"
                      />
                      <Button onClick={adicionarHorario} disabled={!novoHorario}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Lista de horários */}
                    {loading ? (
                      <div className="space-y-2">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className="h-12 bg-muted rounded animate-pulse"></div>
                        ))}
                      </div>
                    ) : horariosDisponiveis.length === 0 ? (
                      <div className="text-center text-muted-foreground py-8">
                        <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Nenhum horário configurado</p>
                        <p className="text-sm">Use os templates ou adicione horários manualmente</p>
                      </div>
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {horariosDisponiveis.map((horario, index) => (
                          <div
                            key={index}
                            className={`
                              flex items-center justify-between p-3 border rounded-lg
                              ${
                                horario.ocupado
                                  ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
                                  : "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                              }
                            `}
                          >
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              <span className="font-medium">{horario.horario}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={horario.ocupado ? "destructive" : "default"}>
                                {horario.ocupado ? "Ocupado" : "Livre"}
                              </Badge>
                              {!horario.ocupado && (
                                <Button variant="ghost" size="sm" onClick={() => removerHorario(horario.horario)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {horariosDisponiveis.length > 0 && (
                      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                        <div className="text-sm">
                          <p className="font-medium">Total: {horariosDisponiveis.length} horários</p>
                          <p className="text-muted-foreground">
                            {horariosDisponiveis.filter((h) => !h.ocupado).length} disponíveis,{" "}
                            {horariosDisponiveis.filter((h) => h.ocupado).length} ocupados
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  )
}
