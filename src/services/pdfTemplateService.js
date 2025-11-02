import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'
import { 
  loadTemplateConfig, 
  loadDoctorLogo, 
  DEFAULT_TEMPLATE_CONFIG,
  mergeTemplateConfig 
} from '@/utils/pdfTemplateUtils'

/**
 * Serviço para geração de PDFs com templates personalizados
 */
export class PdfTemplateService {
  constructor() {
    this.defaultConfig = DEFAULT_TEMPLATE_CONFIG
  }

  /**
   * Carrega a configuração do template para um médico específico
   * @param {string} medicoId - ID do médico
   * @returns {Object} Configuração do template
   */
  loadMedicoTemplate(medicoId) {
    if (!medicoId) return this.defaultConfig
    
    try {
      const savedConfig = loadTemplateConfig(medicoId)
      return savedConfig || this.defaultConfig
    } catch (error) {
      console.warn('Erro ao carregar template do médico:', error)
      return this.defaultConfig
    }
  }

  /**
   * Carrega o logo do médico
   * @param {string} medicoId - ID do médico
   * @returns {Object|null} Dados do logo
   */
  loadMedicoLogo(medicoId) {
    if (!medicoId) return null
    
    try {
      return loadDoctorLogo(medicoId)
    } catch (error) {
      console.warn('Erro ao carregar logo do médico:', error)
      return null
    }
  }

  /**
   * Gera HTML da receita usando o template personalizado
   * @param {Object} receitaData - Dados da receita
   * @param {Object} medicoData - Dados do médico
   * @param {Object} pacienteData - Dados do paciente
   * @param {string} medicoId - ID do médico
   * @returns {string} HTML da receita
   */
  generateReceitaHTML(receitaData, medicoData, pacienteData, medicoId) {
    const config = this.loadMedicoTemplate(medicoId)
    const logo = this.loadMedicoLogo(medicoId)
    
    const styles = this.generateStyles(config)
    const header = this.generateHeader(config, medicoData, logo)
    const content = this.generateContent(receitaData, pacienteData, config)
    const footer = this.generateFooter(config, medicoData)
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Receita Médica</title>
          <style>${styles}</style>
        </head>
        <body>
          <div class="receita-container">
            ${header}
            ${content}
            ${footer}
          </div>
        </body>
      </html>
    `
  }

  /**
   * Gera os estilos CSS baseados na configuração do template
   * @param {Object} config - Configuração do template
   * @returns {string} CSS
   */
  generateStyles(config) {
    const { layout, content, branding } = config
    
    return `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: ${content.fontFamily};
        font-size: ${content.fontSize.body}pt;
        color: ${content.colors.primary};
        line-height: 1.6;
        background: white;
      }
      
      .receita-container {
        width: 100%;
        max-width: ${layout.pageSize === 'A4' ? '210mm' : '8.5in'};
        margin: 0 auto;
        padding: ${layout.margins.top}px ${layout.margins.right}px ${layout.margins.bottom}px ${layout.margins.left}px;
        min-height: ${layout.pageSize === 'A4' ? '297mm' : '11in'};
        position: relative;
      }
      
      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 30px;
        padding-bottom: 20px;
        border-bottom: 2px solid ${content.colors.accent};
      }
      
      .header-logo {
        max-height: 80px;
        max-width: 150px;
        object-fit: contain;
      }
      
      .header-info {
        text-align: right;
        flex: 1;
        margin-left: 20px;
      }
      
      .clinic-name {
        font-size: ${content.fontSize.title}pt;
        font-weight: bold;
        color: ${content.colors.primary};
        margin-bottom: 5px;
      }
      
      .clinic-details {
        font-size: ${content.fontSize.small}pt;
        color: ${content.colors.secondary};
        line-height: 1.4;
      }
      
      .doctor-info {
        margin-bottom: 30px;
        padding: 15px;
        background-color: #f8f9fa;
        border-radius: 8px;
        border-left: 4px solid ${content.colors.accent};
      }
      
      .doctor-name {
        font-size: ${content.fontSize.subtitle}pt;
        font-weight: bold;
        color: ${content.colors.primary};
        margin-bottom: 5px;
      }
      
      .doctor-details {
        font-size: ${content.fontSize.small}pt;
        color: ${content.colors.secondary};
      }
      
      .patient-info {
        margin-bottom: 30px;
        padding: 15px;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
      }
      
      .patient-name {
        font-size: ${content.fontSize.subtitle}pt;
        font-weight: bold;
        color: ${content.colors.primary};
        margin-bottom: 10px;
      }
      
      .patient-details {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
        font-size: ${content.fontSize.small}pt;
        color: ${content.colors.secondary};
      }
      
      .prescription-title {
        font-size: ${content.fontSize.title}pt;
        font-weight: bold;
        color: ${content.colors.primary};
        text-align: center;
        margin-bottom: 30px;
        text-transform: uppercase;
        letter-spacing: 1px;
      }
      
      .medications {
        margin-bottom: 40px;
      }
      
      .medication-item {
        margin-bottom: 20px;
        padding: 15px;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        background-color: #fafafa;
      }
      
      .medication-name {
        font-size: ${content.fontSize.subtitle}pt;
        font-weight: bold;
        color: ${content.colors.primary};
        margin-bottom: 8px;
      }
      
      .medication-details {
        font-size: ${content.fontSize.body}pt;
        color: ${content.colors.secondary};
        margin-bottom: 5px;
      }
      
      .medication-instructions {
        font-size: ${content.fontSize.body}pt;
        color: ${content.colors.primary};
        font-style: italic;
        margin-top: 10px;
        padding: 10px;
        background-color: #f0f8ff;
        border-radius: 4px;
        border-left: 3px solid ${content.colors.accent};
      }
      
      .observations {
        margin-bottom: 40px;
        padding: 20px;
        background-color: #fff9e6;
        border-radius: 8px;
        border: 1px solid #ffd700;
      }
      
      .observations-title {
        font-size: ${content.fontSize.subtitle}pt;
        font-weight: bold;
        color: ${content.colors.primary};
        margin-bottom: 10px;
      }
      
      .observations-text {
        font-size: ${content.fontSize.body}pt;
        color: ${content.colors.secondary};
        line-height: 1.6;
      }
      
      .footer {
        position: absolute;
        bottom: ${layout.margins.bottom}px;
        left: ${layout.margins.left}px;
        right: ${layout.margins.right}px;
        text-align: center;
        padding-top: 20px;
        border-top: 1px solid #e0e0e0;
      }
      
      .signature-area {
        margin-top: 40px;
        text-align: center;
      }
      
      .signature-line {
        width: 300px;
        height: 1px;
        background-color: ${content.colors.secondary};
        margin: 40px auto 10px;
      }
      
      .signature-text {
        font-size: ${content.fontSize.small}pt;
        color: ${content.colors.secondary};
      }
      
      .date-location {
        margin-top: 30px;
        font-size: ${content.fontSize.small}pt;
        color: ${content.colors.secondary};
      }
      
      @media print {
        .receita-container {
          margin: 0;
          padding: 20px;
        }
        
        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      }
    `
  }

  /**
   * Gera o cabeçalho da receita
   * @param {Object} config - Configuração do template
   * @param {Object} medicoData - Dados do médico
   * @param {Object} logo - Logo do médico
   * @returns {string} HTML do cabeçalho
   */
  generateHeader(config, medicoData, logo) {
    const { header, branding } = config
    
    if (!header.showLogo && !header.showDoctorInfo) {
      return ''
    }
    
    let logoHTML = ''
    if (header.showLogo && logo?.data) {
      logoHTML = `<img src="${logo.data}" alt="Logo" class="header-logo" />`
    }
    
    let clinicInfoHTML = ''
    if (header.showDoctorInfo) {
      clinicInfoHTML = `
        <div class="header-info">
          <div class="clinic-name">${branding.clinicName || medicoData?.nome || 'Clínica Médica'}</div>
          <div class="clinic-details">
            ${branding.clinicAddress ? `<div>${branding.clinicAddress}</div>` : ''}
            ${branding.clinicPhone ? `<div>Tel: ${branding.clinicPhone}</div>` : ''}
            ${branding.clinicEmail ? `<div>Email: ${branding.clinicEmail}</div>` : ''}
          </div>
        </div>
      `
    }
    
    return `
      <div class="header">
        ${logoHTML}
        ${clinicInfoHTML}
      </div>
    `
  }

  /**
   * Gera o conteúdo principal da receita
   * @param {Object} receitaData - Dados da receita
   * @param {Object} pacienteData - Dados do paciente
   * @param {Object} config - Configuração do template
   * @returns {string} HTML do conteúdo
   */
  generateContent(receitaData, pacienteData, config) {
    const doctorInfoHTML = this.generateDoctorInfo(receitaData.medico, config)
    const patientInfoHTML = this.generatePatientInfo(pacienteData, config)
    const medicationsHTML = this.generateMedications(receitaData.itens || [], config)
    const observationsHTML = this.generateObservations(receitaData.observacoes, config)
    
    return `
      ${doctorInfoHTML}
      ${patientInfoHTML}
      <div class="prescription-title">Receita Médica</div>
      ${medicationsHTML}
      ${observationsHTML}
    `
  }

  /**
   * Gera as informações do médico
   * @param {Object} medicoData - Dados do médico
   * @param {Object} config - Configuração do template
   * @returns {string} HTML das informações do médico
   */
  generateDoctorInfo(medicoData, config) {
    if (!medicoData) return ''
    
    return `
      <div class="doctor-info">
        <div class="doctor-name">Dr(a). ${medicoData.nome || medicoData.user?.first_name + ' ' + medicoData.user?.last_name}</div>
        <div class="doctor-details">
          ${medicoData.crm ? `CRM: ${medicoData.crm}` : ''}
          ${medicoData.especialidade ? ` | ${medicoData.especialidade}` : ''}
        </div>
      </div>
    `
  }

  /**
   * Gera as informações do paciente
   * @param {Object} pacienteData - Dados do paciente
   * @param {Object} config - Configuração do template
   * @returns {string} HTML das informações do paciente
   */
  generatePatientInfo(pacienteData, config) {
    if (!pacienteData) return ''
    
    const idade = this.calculateAge(pacienteData.data_nascimento)
    
    return `
      <div class="patient-info">
        <div class="patient-name">Paciente: ${pacienteData.nome || pacienteData.user?.first_name + ' ' + pacienteData.user?.last_name}</div>
        <div class="patient-details">
          ${idade ? `<div>Idade: ${idade} anos</div>` : ''}
          ${pacienteData.cpf ? `<div>CPF: ${pacienteData.cpf}</div>` : ''}
          ${pacienteData.telefone ? `<div>Telefone: ${pacienteData.telefone}</div>` : ''}
          ${pacienteData.endereco ? `<div>Endereço: ${pacienteData.endereco}</div>` : ''}
        </div>
      </div>
    `
  }

  /**
   * Gera a lista de medicamentos
   * @param {Array} medicamentos - Lista de medicamentos
   * @param {Object} config - Configuração do template
   * @returns {string} HTML dos medicamentos
   */
  generateMedications(medicamentos, config) {
    if (!medicamentos || medicamentos.length === 0) {
      return '<div class="medications"><p>Nenhum medicamento prescrito.</p></div>'
    }
    
    const medicationsHTML = medicamentos.map((med, index) => `
      <div class="medication-item">
        <div class="medication-name">${index + 1}. ${med.medicamento || med.nome}</div>
        ${med.dosagem ? `<div class="medication-details">Dosagem: ${med.dosagem}</div>` : ''}
        ${med.frequencia ? `<div class="medication-details">Frequência: ${med.frequencia}</div>` : ''}
        ${med.duracao ? `<div class="medication-details">Duração: ${med.duracao}</div>` : ''}
        ${med.instrucoes ? `<div class="medication-instructions">${med.instrucoes}</div>` : ''}
      </div>
    `).join('')
    
    return `<div class="medications">${medicationsHTML}</div>`
  }

  /**
   * Gera as observações
   * @param {string} observacoes - Observações da receita
   * @param {Object} config - Configuração do template
   * @returns {string} HTML das observações
   */
  generateObservations(observacoes, config) {
    if (!observacoes) return ''
    
    return `
      <div class="observations">
        <div class="observations-title">Observações:</div>
        <div class="observations-text">${observacoes}</div>
      </div>
    `
  }

  /**
   * Gera o rodapé da receita
   * @param {Object} config - Configuração do template
   * @param {Object} medicoData - Dados do médico
   * @returns {string} HTML do rodapé
   */
  generateFooter(config, medicoData) {
    const { footer } = config
    
    if (!footer.showSignature && !footer.showDate) {
      return ''
    }
    
    let signatureHTML = ''
    if (footer.showSignature) {
      signatureHTML = `
        <div class="signature-area">
          <div class="signature-line"></div>
          <div class="signature-text">
            Dr(a). ${medicoData?.nome || medicoData?.user?.first_name + ' ' + medicoData?.user?.last_name}
            ${medicoData?.crm ? `<br>CRM: ${medicoData.crm}` : ''}
          </div>
        </div>
      `
    }
    
    let dateHTML = ''
    if (footer.showDate) {
      const today = new Date().toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      })
      dateHTML = `<div class="date-location">Data: ${today}</div>`
    }
    
    return `
      <div class="footer">
        ${signatureHTML}
        ${dateHTML}
      </div>
    `
  }

  /**
   * Calcula a idade baseada na data de nascimento
   * @param {string} dataNascimento - Data de nascimento
   * @returns {number|null} Idade em anos
   */
  calculateAge(dataNascimento) {
    if (!dataNascimento) return null
    
    const birth = new Date(dataNascimento)
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    
    return age
  }

  /**
   * Gera PDF da receita usando template personalizado
   * @param {Object} receitaData - Dados da receita
   * @param {Object} medicoData - Dados do médico
   * @param {Object} pacienteData - Dados do paciente
   * @param {string} medicoId - ID do médico
   * @returns {Promise<Blob>} PDF gerado
   */
  async generatePDF(receitaData, medicoData, pacienteData, medicoId) {
    try {
      const config = this.loadMedicoTemplate(medicoId)
      const html = this.generateReceitaHTML(receitaData, medicoData, pacienteData, medicoId)
      
      // Criar elemento temporário para renderização
      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = html
      tempDiv.style.position = 'absolute'
      tempDiv.style.left = '-9999px'
      tempDiv.style.top = '-9999px'
      document.body.appendChild(tempDiv)
      
      // Configurar jsPDF baseado no template
      const orientation = config.layout.orientation === 'landscape' ? 'l' : 'p'
      const format = config.layout.pageSize.toLowerCase()
      
      const pdf = new jsPDF({
        orientation,
        unit: 'mm',
        format
      })
      
      // Renderizar HTML para canvas
      const canvas = await html2canvas(tempDiv.querySelector('.receita-container'), {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      })
      
      // Adicionar imagem ao PDF
      const imgData = canvas.toDataURL('image/png')
      const imgWidth = pdf.internal.pageSize.getWidth()
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight)
      
      // Limpar elemento temporário
      document.body.removeChild(tempDiv)
      
      // Retornar PDF como blob
      return pdf.output('blob')
      
    } catch (error) {
      console.error('Erro ao gerar PDF:', error)
      throw new Error('Falha na geração do PDF: ' + error.message)
    }
  }

  /**
   * Salva o PDF gerado
   * @param {Blob} pdfBlob - PDF como blob
   * @param {string} filename - Nome do arquivo
   */
  savePDF(pdfBlob, filename = 'receita-medica.pdf') {
    const url = URL.createObjectURL(pdfBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  /**
   * Gera preview do PDF em nova janela
   * @param {Blob} pdfBlob - PDF como blob
   */
  previewPDF(pdfBlob) {
    const url = URL.createObjectURL(pdfBlob)
    window.open(url, '_blank')
  }
}

// Instância singleton do serviço
export const pdfTemplateService = new PdfTemplateService()
export default pdfTemplateService