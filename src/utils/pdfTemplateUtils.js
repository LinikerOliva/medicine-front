/**
 * Utilitários para gerenciamento de templates de PDF personalizados
 * Permite que cada médico tenha seu próprio layout e configurações de estilo
 */

// Tipos de templates disponíveis
export const TEMPLATE_TYPES = {
  CLASSIC: 'classic',
  MODERN: 'modern',
  MINIMAL: 'minimal',
  CUSTOM: 'custom'
}

// Configuração padrão de template
export const DEFAULT_TEMPLATE_CONFIG = {
  type: TEMPLATE_TYPES.CLASSIC,
  layout: {
    pageSize: 'A4', // A4, Letter
    orientation: 'portrait', // portrait, landscape
    margins: {
      top: 50,
      bottom: 50,
      left: 50,
      right: 50
    }
  },
  header: {
    showLogo: true,
    logoPosition: 'left', // left, center, right
    logoSize: { width: 80, height: 80 },
    showDoctorInfo: true,
    doctorInfoPosition: 'right', // left, center, right
    backgroundColor: '#ffffff',
    borderBottom: true,
    borderColor: '#e5e7eb'
  },
  content: {
    fontSize: {
      title: 16,
      subtitle: 14,
      body: 12,
      small: 10
    },
    fontFamily: 'Helvetica', // Helvetica, Times-Roman, Courier
    colors: {
      primary: '#1f2937',
      secondary: '#6b7280',
      accent: '#3b82f6'
    },
    spacing: {
      sectionGap: 20,
      lineHeight: 1.5
    }
  },
  footer: {
    showSignature: true,
    showDate: true,
    showPageNumber: false,
    customText: '',
    backgroundColor: '#ffffff',
    borderTop: true,
    borderColor: '#e5e7eb'
  },
  branding: {
    primaryColor: '#3b82f6',
    secondaryColor: '#6b7280',
    logoUrl: null,
    clinicName: '',
    clinicAddress: '',
    clinicPhone: '',
    clinicEmail: ''
  }
}

// Templates pré-definidos
export const PREDEFINED_TEMPLATES = {
  [TEMPLATE_TYPES.CLASSIC]: {
    ...DEFAULT_TEMPLATE_CONFIG,
    name: 'Clássico',
    description: 'Layout tradicional com cabeçalho formal',
    preview: '/templates/classic-preview.png'
  },
  [TEMPLATE_TYPES.MODERN]: {
    ...DEFAULT_TEMPLATE_CONFIG,
    type: TEMPLATE_TYPES.MODERN,
    name: 'Moderno',
    description: 'Design contemporâneo com elementos visuais modernos',
    header: {
      ...DEFAULT_TEMPLATE_CONFIG.header,
      backgroundColor: '#f8fafc',
      logoPosition: 'center'
    },
    content: {
      ...DEFAULT_TEMPLATE_CONFIG.content,
      colors: {
        primary: '#0f172a',
        secondary: '#475569',
        accent: '#0ea5e9'
      }
    },
    branding: {
      ...DEFAULT_TEMPLATE_CONFIG.branding,
      primaryColor: '#0ea5e9'
    },
    preview: '/templates/modern-preview.png'
  },
  [TEMPLATE_TYPES.MINIMAL]: {
    ...DEFAULT_TEMPLATE_CONFIG,
    type: TEMPLATE_TYPES.MINIMAL,
    name: 'Minimalista',
    description: 'Layout limpo e simples',
    header: {
      ...DEFAULT_TEMPLATE_CONFIG.header,
      showLogo: false,
      borderBottom: false
    },
    content: {
      ...DEFAULT_TEMPLATE_CONFIG.content,
      fontSize: {
        title: 14,
        subtitle: 12,
        body: 11,
        small: 9
      }
    },
    footer: {
      ...DEFAULT_TEMPLATE_CONFIG.footer,
      borderTop: false
    },
    preview: '/templates/minimal-preview.png'
  }
}

/**
 * Salva a configuração de template do médico no localStorage
 */
export const saveTemplateConfig = (medicoId, config) => {
  try {
    const key = `pdf_template_config_${medicoId}`
    localStorage.setItem(key, JSON.stringify(config))
    return true
  } catch (error) {
    console.error('Erro ao salvar configuração de template:', error)
    return false
  }
}

/**
 * Carrega a configuração de template do médico do localStorage
 */
export const loadTemplateConfig = (medicoId) => {
  try {
    const key = `pdf_template_config_${medicoId}`
    const saved = localStorage.getItem(key)
    if (saved) {
      return { ...DEFAULT_TEMPLATE_CONFIG, ...JSON.parse(saved) }
    }
    return DEFAULT_TEMPLATE_CONFIG
  } catch (error) {
    console.error('Erro ao carregar configuração de template:', error)
    return DEFAULT_TEMPLATE_CONFIG
  }
}

/**
 * Salva o logo do médico no localStorage (base64)
 */
export const saveDoctorLogo = (medicoId, logoFile) => {
  return new Promise((resolve, reject) => {
    if (!logoFile) {
      resolve(null)
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const key = `doctor_logo_${medicoId}`
        const logoData = {
          data: e.target.result,
          name: logoFile.name,
          type: logoFile.type,
          size: logoFile.size,
          lastModified: logoFile.lastModified
        }
        localStorage.setItem(key, JSON.stringify(logoData))
        resolve(logoData)
      } catch (error) {
        reject(error)
      }
    }
    reader.onerror = reject
    reader.readAsDataURL(logoFile)
  })
}

/**
 * Carrega o logo do médico do localStorage
 */
export const loadDoctorLogo = (medicoId) => {
  try {
    const key = `doctor_logo_${medicoId}`
    const saved = localStorage.getItem(key)
    if (saved) {
      return JSON.parse(saved)
    }
    return null
  } catch (error) {
    console.error('Erro ao carregar logo do médico:', error)
    return null
  }
}

/**
 * Remove o logo do médico do localStorage
 */
export const removeDoctorLogo = (medicoId) => {
  try {
    const key = `doctor_logo_${medicoId}`
    localStorage.removeItem(key)
    return true
  } catch (error) {
    console.error('Erro ao remover logo do médico:', error)
    return false
  }
}

/**
 * Valida se uma configuração de template é válida
 */
export const validateTemplateConfig = (config) => {
  const errors = []

  if (!config.type || !Object.values(TEMPLATE_TYPES).includes(config.type)) {
    errors.push('Tipo de template inválido')
  }

  if (!config.layout?.pageSize) {
    errors.push('Tamanho da página é obrigatório')
  }

  if (!config.content?.fontSize?.body || config.content.fontSize.body < 8) {
    errors.push('Tamanho da fonte do corpo deve ser pelo menos 8pt')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Mescla configuração personalizada com template base
 */
export const mergeTemplateConfig = (baseTemplate, customConfig) => {
  return {
    ...baseTemplate,
    ...customConfig,
    layout: { ...baseTemplate.layout, ...customConfig.layout },
    header: { ...baseTemplate.header, ...customConfig.header },
    content: {
      ...baseTemplate.content,
      ...customConfig.content,
      fontSize: { ...baseTemplate.content.fontSize, ...customConfig.content?.fontSize },
      colors: { ...baseTemplate.content.colors, ...customConfig.content?.colors }
    },
    footer: { ...baseTemplate.footer, ...customConfig.footer },
    branding: { ...baseTemplate.branding, ...customConfig.branding }
  }
}

/**
 * Gera preview de template (retorna configuração para renderização)
 */
export const generateTemplatePreview = (config) => {
  return {
    ...config,
    isPreview: true,
    content: {
      ...config.content,
      sampleData: {
        doctorName: 'Dr. João Silva',
        crm: 'CRM/SP 123456',
        specialty: 'Cardiologia',
        patientName: 'Maria Santos',
        date: new Date().toLocaleDateString('pt-BR'),
        medications: 'Losartana 50mg - 1 comprimido pela manhã',
        instructions: 'Tomar com água, preferencialmente no mesmo horário todos os dias.'
      }
    }
  }
}