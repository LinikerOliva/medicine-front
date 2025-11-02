import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { 
  Upload, 
  Eye, 
  Save, 
  RotateCcw, 
  Palette, 
  Layout, 
  FileText,
  Image as ImageIcon,
  Settings
} from 'lucide-react'
import {
  TEMPLATE_TYPES,
  PREDEFINED_TEMPLATES,
  DEFAULT_TEMPLATE_CONFIG,
  saveTemplateConfig,
  loadTemplateConfig,
  saveDoctorLogo,
  loadDoctorLogo,
  removeDoctorLogo,
  validateTemplateConfig,
  mergeTemplateConfig,
  generateTemplatePreview
} from '@/utils/pdfTemplateUtils'

export default function PdfTemplateConfig({ medicoId, medicoInfo = {} }) {
  const { toast } = useToast()
  const logoInputRef = useRef(null)
  
  const [config, setConfig] = useState(DEFAULT_TEMPLATE_CONFIG)
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  // Carregar configuração salva ao montar o componente
  useEffect(() => {
    if (!medicoId) return
    
    const loadSavedConfig = async () => {
      try {
        const savedConfig = loadTemplateConfig(medicoId)
        const savedLogo = loadDoctorLogo(medicoId)
        
        setConfig(savedConfig)
        if (savedLogo) {
          setLogoPreview(savedLogo.data)
        }
      } catch (error) {
        console.error('Erro ao carregar configuração:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadSavedConfig()
  }, [medicoId])

  // Atualizar configuração
  const updateConfig = (path, value) => {
    setConfig(prev => {
      const newConfig = { ...prev }
      const keys = path.split('.')
      let current = newConfig
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {}
        current = current[keys[i]]
      }
      
      current[keys[keys.length - 1]] = value
      return newConfig
    })
  }

  // Selecionar template pré-definido
  const selectPredefinedTemplate = (templateType) => {
    const template = PREDEFINED_TEMPLATES[templateType]
    if (template) {
      setConfig(prev => mergeTemplateConfig(template, {
        branding: {
          ...template.branding,
          clinicName: medicoInfo.nome || prev.branding.clinicName,
          clinicAddress: medicoInfo.endereco || prev.branding.clinicAddress,
          clinicPhone: medicoInfo.telefone || prev.branding.clinicPhone
        }
      }))
      toast({
        title: "Template selecionado",
        description: `Template "${template.name}" aplicado com sucesso.`
      })
    }
  }

  // Upload de logo
  const handleLogoUpload = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione uma imagem válida.",
        variant: "destructive"
      })
      return
    }

    // Validar tamanho (máximo 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O logo deve ter no máximo 2MB.",
        variant: "destructive"
      })
      return
    }

    setLogoFile(file)
    
    // Criar preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setLogoPreview(e.target.result)
    }
    reader.readAsDataURL(file)
  }

  // Remover logo
  const handleRemoveLogo = () => {
    setLogoFile(null)
    setLogoPreview(null)
    if (medicoId) {
      removeDoctorLogo(medicoId)
    }
    updateConfig('header.showLogo', false)
    toast({
      title: "Logo removido",
      description: "O logo foi removido do template."
    })
  }

  // Salvar configuração
  const handleSave = async () => {
    if (!medicoId) {
      toast({
        title: "Erro",
        description: "ID do médico não encontrado.",
        variant: "destructive"
      })
      return
    }

    setSaving(true)
    try {
      // Validar configuração
      const validation = validateTemplateConfig(config)
      if (!validation.isValid) {
        toast({
          title: "Configuração inválida",
          description: validation.errors.join(', '),
          variant: "destructive"
        })
        return
      }

      // Salvar logo se houver
      if (logoFile) {
        await saveDoctorLogo(medicoId, logoFile)
        updateConfig('header.showLogo', true)
      }

      // Salvar configuração
      const success = saveTemplateConfig(medicoId, config)
      if (success) {
        toast({
          title: "Configuração salva",
          description: "Suas configurações de template foram salvas com sucesso."
        })
      } else {
        throw new Error("Falha ao salvar configuração")
      }
    } catch (error) {
      console.error('Erro ao salvar:', error)
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações.",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  // Resetar para padrão
  const handleReset = () => {
    setConfig(DEFAULT_TEMPLATE_CONFIG)
    setLogoFile(null)
    setLogoPreview(null)
    if (medicoId) {
      removeDoctorLogo(medicoId)
    }
    toast({
      title: "Configuração resetada",
      description: "As configurações foram restauradas para o padrão."
    })
  }

  // Preview do template
  const handlePreview = () => {
    const previewConfig = generateTemplatePreview(config)
    // Aqui você pode implementar a lógica de preview
    // Por exemplo, abrir um modal ou nova janela com o preview
    console.log('Preview config:', previewConfig)
    toast({
      title: "Preview gerado",
      description: "Verifique o console para ver a configuração de preview."
    })
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Configuração de Templates de PDF
          </CardTitle>
          <CardDescription>
            Personalize o layout e aparência das suas receitas médicas em PDF
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="templates" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="templates" className="flex items-center gap-2">
                <Layout className="h-4 w-4" />
                Templates
              </TabsTrigger>
              <TabsTrigger value="branding" className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Identidade
              </TabsTrigger>
              <TabsTrigger value="layout" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Layout
              </TabsTrigger>
              <TabsTrigger value="colors" className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Cores
              </TabsTrigger>
            </TabsList>

            {/* Templates Pré-definidos */}
            <TabsContent value="templates" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(PREDEFINED_TEMPLATES).map(([key, template]) => (
                  <Card 
                    key={key} 
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      config.type === key ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => selectPredefinedTemplate(key)}
                  >
                    <CardContent className="p-4">
                      <div className="aspect-[3/4] bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
                        <FileText className="h-8 w-8 text-gray-400" />
                      </div>
                      <h3 className="font-semibold">{template.name}</h3>
                      <p className="text-sm text-muted-foreground">{template.description}</p>
                      {config.type === key && (
                        <Badge className="mt-2">Selecionado</Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Identidade Visual */}
            <TabsContent value="branding" className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-semibold">Logo da Clínica</Label>
                  <p className="text-sm text-muted-foreground mb-4">
                    Adicione o logo da sua clínica que aparecerá no cabeçalho das receitas
                  </p>
                  
                  <div className="flex items-center gap-4">
                    {logoPreview ? (
                      <div className="relative">
                        <img 
                          src={logoPreview} 
                          alt="Logo preview" 
                          className="w-20 h-20 object-contain border rounded-lg"
                        />
                        <Button
                          size="sm"
                          variant="destructive"
                          className="absolute -top-2 -right-2 h-6 w-6 p-0"
                          onClick={handleRemoveLogo}
                        >
                          ×
                        </Button>
                      </div>
                    ) : (
                      <div className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                        <ImageIcon className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        onClick={() => logoInputRef.current?.click()}
                        className="flex items-center gap-2"
                      >
                        <Upload className="h-4 w-4" />
                        {logoPreview ? 'Alterar Logo' : 'Adicionar Logo'}
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        PNG, JPG até 2MB
                      </p>
                    </div>
                  </div>
                  
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="clinicName">Nome da Clínica</Label>
                    <Input
                      id="clinicName"
                      value={config.branding.clinicName}
                      onChange={(e) => updateConfig('branding.clinicName', e.target.value)}
                      placeholder="Nome da sua clínica"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="clinicPhone">Telefone</Label>
                    <Input
                      id="clinicPhone"
                      value={config.branding.clinicPhone}
                      onChange={(e) => updateConfig('branding.clinicPhone', e.target.value)}
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                  
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="clinicAddress">Endereço</Label>
                    <Textarea
                      id="clinicAddress"
                      value={config.branding.clinicAddress}
                      onChange={(e) => updateConfig('branding.clinicAddress', e.target.value)}
                      placeholder="Endereço completo da clínica"
                      rows={2}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="clinicEmail">E-mail</Label>
                    <Input
                      id="clinicEmail"
                      type="email"
                      value={config.branding.clinicEmail}
                      onChange={(e) => updateConfig('branding.clinicEmail', e.target.value)}
                      placeholder="contato@clinica.com"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Layout */}
            <TabsContent value="layout" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold">Configurações da Página</h3>
                  
                  <div className="space-y-2">
                    <Label>Tamanho da Página</Label>
                    <Select
                      value={config.layout.pageSize}
                      onValueChange={(value) => updateConfig('layout.pageSize', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A4">A4</SelectItem>
                        <SelectItem value="Letter">Letter</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Orientação</Label>
                    <Select
                      value={config.layout.orientation}
                      onValueChange={(value) => updateConfig('layout.orientation', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="portrait">Retrato</SelectItem>
                        <SelectItem value="landscape">Paisagem</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold">Margens (px)</h3>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label>Superior</Label>
                      <Input
                        type="number"
                        value={config.layout.margins.top}
                        onChange={(e) => updateConfig('layout.margins.top', parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Inferior</Label>
                      <Input
                        type="number"
                        value={config.layout.margins.bottom}
                        onChange={(e) => updateConfig('layout.margins.bottom', parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Esquerda</Label>
                      <Input
                        type="number"
                        value={config.layout.margins.left}
                        onChange={(e) => updateConfig('layout.margins.left', parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Direita</Label>
                      <Input
                        type="number"
                        value={config.layout.margins.right}
                        onChange={(e) => updateConfig('layout.margins.right', parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="font-semibold">Cabeçalho e Rodapé</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Mostrar Logo</Label>
                      <Switch
                        checked={config.header.showLogo}
                        onCheckedChange={(checked) => updateConfig('header.showLogo', checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label>Mostrar Informações do Médico</Label>
                      <Switch
                        checked={config.header.showDoctorInfo}
                        onCheckedChange={(checked) => updateConfig('header.showDoctorInfo', checked)}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Mostrar Assinatura</Label>
                      <Switch
                        checked={config.footer.showSignature}
                        onCheckedChange={(checked) => updateConfig('footer.showSignature', checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label>Mostrar Data</Label>
                      <Switch
                        checked={config.footer.showDate}
                        onCheckedChange={(checked) => updateConfig('footer.showDate', checked)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Cores */}
            <TabsContent value="colors" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold">Cores do Texto</h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Label className="w-20">Primária</Label>
                      <Input
                        type="color"
                        value={config.content.colors.primary}
                        onChange={(e) => updateConfig('content.colors.primary', e.target.value)}
                        className="w-16 h-10"
                      />
                      <Input
                        value={config.content.colors.primary}
                        onChange={(e) => updateConfig('content.colors.primary', e.target.value)}
                        className="flex-1"
                      />
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Label className="w-20">Secundária</Label>
                      <Input
                        type="color"
                        value={config.content.colors.secondary}
                        onChange={(e) => updateConfig('content.colors.secondary', e.target.value)}
                        className="w-16 h-10"
                      />
                      <Input
                        value={config.content.colors.secondary}
                        onChange={(e) => updateConfig('content.colors.secondary', e.target.value)}
                        className="flex-1"
                      />
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Label className="w-20">Destaque</Label>
                      <Input
                        type="color"
                        value={config.content.colors.accent}
                        onChange={(e) => updateConfig('content.colors.accent', e.target.value)}
                        className="w-16 h-10"
                      />
                      <Input
                        value={config.content.colors.accent}
                        onChange={(e) => updateConfig('content.colors.accent', e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold">Tamanhos de Fonte (pt)</h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Label className="w-20">Título</Label>
                      <Input
                        type="number"
                        min="10"
                        max="24"
                        value={config.content.fontSize.title}
                        onChange={(e) => updateConfig('content.fontSize.title', parseInt(e.target.value) || 16)}
                        className="w-20"
                      />
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Label className="w-20">Subtítulo</Label>
                      <Input
                        type="number"
                        min="8"
                        max="20"
                        value={config.content.fontSize.subtitle}
                        onChange={(e) => updateConfig('content.fontSize.subtitle', parseInt(e.target.value) || 14)}
                        className="w-20"
                      />
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Label className="w-20">Corpo</Label>
                      <Input
                        type="number"
                        min="8"
                        max="16"
                        value={config.content.fontSize.body}
                        onChange={(e) => updateConfig('content.fontSize.body', parseInt(e.target.value) || 12)}
                        className="w-20"
                      />
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Label className="w-20">Pequeno</Label>
                      <Input
                        type="number"
                        min="6"
                        max="12"
                        value={config.content.fontSize.small}
                        onChange={(e) => updateConfig('content.fontSize.small', parseInt(e.target.value) || 10)}
                        className="w-20"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Botões de Ação */}
          <div className="flex items-center justify-between pt-6 border-t">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handlePreview}
                className="flex items-center gap-2"
              >
                <Eye className="h-4 w-4" />
                Preview
              </Button>
              
              <Button
                variant="outline"
                onClick={handleReset}
                className="flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Resetar
              </Button>
            </div>
            
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Salvando...' : 'Salvar Configuração'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}