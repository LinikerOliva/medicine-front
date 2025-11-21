import api from './api'

class NotificationService {
  constructor() {
    this.baseUrl = import.meta.env.VITE_NOTIFICATIONS_ENDPOINT || '/api/notifications/'
    this.verbose = String(import.meta.env.VITE_VERBOSE_ENDPOINT_LOGS || '').toLowerCase() === 'true'
  }

  /**
   * Envia notificação interna para o paciente
   */
  async enviarNotificacaoInterna({ 
    pacienteId, 
    titulo, 
    mensagem, 
    tipo = 'receita', 
    dados = {},
    prioridade = 'normal' 
  }) {
    try {
      const payload = {
        destinatario_id: pacienteId,
        titulo,
        mensagem,
        tipo,
        dados,
        prioridade,
        canal: 'interno'
      }

      const response = await api.post(`${this.baseUrl}enviar/`, payload)
      
      if (this.verbose) {
        console.log('[NotificationService] Notificação interna enviada:', response.data)
      }
      
      return response.data
    } catch (error) {
      console.error('[NotificationService] Erro ao enviar notificação interna:', error)
      throw error
    }
  }

  /**
   * Envia receita por e-mail
   */
  async enviarReceitaPorEmail({ 
    pacienteId, 
    email, 
    receitaId, 
    arquivo, 
    nomeArquivo,
    assunto,
    mensagem,
    linkDownload 
  }) {
    try {
      const formData = new FormData()
      
      // Dados básicos
      formData.append('destinatario_id', pacienteId)
      formData.append('email', email)
      formData.append('receita_id', receitaId)
      formData.append('canal', 'email')
      formData.append('tipo', 'receita')
      
      // Assunto e mensagem personalizados
      if (assunto) formData.append('assunto', assunto)
      if (mensagem) formData.append('mensagem', mensagem)
      
      // Arquivo da receita
      if (arquivo) {
        const fileName = nomeArquivo || `receita_${receitaId}.pdf`
        formData.append('arquivo', arquivo, fileName)
      }

      // Link de download (fallback quando não há arquivo)
      if (linkDownload) {
        formData.append('link_download', linkDownload)
      }

      const response = await api.post(`${this.baseUrl}enviar-email/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      
      if (this.verbose) {
        console.log('[NotificationService] E-mail enviado:', response.data)
      }
      
      return response.data
    } catch (error) {
      console.error('[NotificationService] Erro ao enviar e-mail:', error)
      throw error
    }
  }

  /**
   * Envia receita por SMS
   */
  async enviarReceitaPorSMS({ 
    pacienteId, 
    telefone, 
    receitaId, 
    mensagem,
    linkDownload 
  }) {
    try {
      // Normalizar telefone (remover caracteres especiais)
      const telefoneNormalizado = telefone?.replace(/\D/g, '');
      
      if (!telefoneNormalizado || telefoneNormalizado.length < 10) {
        throw new Error('Número de telefone inválido. Deve conter pelo menos 10 dígitos.');
      }

      // Formatação brasileira do telefone
      let telefoneFormatado = telefoneNormalizado;
      if (telefoneNormalizado.length === 11 && telefoneNormalizado.startsWith('0')) {
        telefoneFormatado = telefoneNormalizado.substring(1); // Remove 0 inicial
      }
      if (telefoneNormalizado.length === 10) {
        telefoneFormatado = `55${telefoneNormalizado}`; // Adiciona código do país
      } else if (telefoneNormalizado.length === 11) {
        telefoneFormatado = `55${telefoneNormalizado}`;
      }

      const payload = {
        destinatario_id: pacienteId,
        telefone: telefoneFormatado,
        telefone_original: telefone,
        receita_id: receitaId,
        mensagem: mensagem || `Nova receita médica disponível. Acesse: ${linkDownload || window.location.origin}/paciente/receitas`,
        link_download: linkDownload,
        canal: 'sms',
        tipo: 'receita'
      }

      // Tentar múltiplos endpoints para SMS
      const smsEndpoints = [
        `${this.baseUrl}enviar-sms/`,
        '/api/sms/enviar/',
        '/sms/send/',
        '/notifications/sms/',
        '/receitas/sms/',
        '/comunicacao/sms/'
      ];

      let lastError = null;
      
      for (const endpoint of smsEndpoints) {
        try {
          if (this.verbose) {
            console.log(`[NotificationService] Tentando enviar SMS via: ${endpoint}`, payload);
          }
          
          const response = await api.post(endpoint, payload);
          
          if (this.verbose) {
            console.log('[NotificationService] SMS enviado com sucesso:', response.data);
          }
          
          return {
            success: true,
            data: response.data,
            message: 'SMS enviado com sucesso',
            endpoint: endpoint,
            telefone_usado: telefoneFormatado
          };
        } catch (error) {
          lastError = error;
          const status = error.response?.status;
          
          if (this.verbose) {
            console.log(`[NotificationService] Falha no endpoint ${endpoint}:`, error.message);
          }
          
          // Se for erro de autenticação, não tentar outros endpoints
          if (status === 401 || status === 403) {
            throw error;
          }
          
          // Continuar tentando outros endpoints para outros tipos de erro
          continue;
        }
      }

      // Se chegou aqui, nenhum endpoint funcionou
      console.error('[NotificationService] Todos os endpoints de SMS falharam. Último erro:', lastError);
      throw lastError || new Error('Nenhum endpoint de SMS disponível ou configurado');
      
    } catch (error) {
      console.error('[NotificationService] Erro ao enviar SMS:', error);
      return {
        success: false,
        error: error.response?.data || error.message,
        message: error.message || 'Falha ao enviar SMS'
      };
    }
  }

  /**
   * Envia receita através de múltiplos canais
   */
  async enviarReceitaMulticanal({ 
    pacienteId, 
    receitaId, 
    arquivo, 
    nomeArquivo,
    canais = ['interno'], // ['interno', 'email', 'sms']
    dadosPaciente = {},
    configuracoes = {}
  }) {
    const resultados = {
      interno: null,
      email: null,
      sms: null,
      erros: []
    }

    // Notificação interna (sempre enviada)
    if (canais.includes('interno')) {
      try {
        const titulo = configuracoes.tituloInterno || 'Nova receita médica disponível'
        const mensagem = configuracoes.mensagemInterna || 
          'Você tem uma nova receita médica disponível. Acesse sua área do paciente para visualizar.'
        
        resultados.interno = await this.enviarNotificacaoInterna({
          pacienteId,
          titulo,
          mensagem,
          tipo: 'receita',
          dados: { receita_id: receitaId },
          prioridade: 'alta'
        })
      } catch (error) {
        resultados.erros.push({ canal: 'interno', erro: error.message })
      }
    }

    // E-mail
    if (canais.includes('email') && dadosPaciente.email) {
      try {
        const assunto = configuracoes.assuntoEmail || 'Nova receita médica'
        const mensagemDefaultComAnexo = `Olá ${dadosPaciente.nome || ''},\n\nVocê tem uma nova receita médica em anexo.\n\nAtenciosamente,\nEquipe Médica`
        const mensagemDefaultComLink = `Olá ${dadosPaciente.nome || ''},\n\nSua receita médica está disponível neste link: ${configuracoes.linkDownload}.\n\nAtenciosamente,\nEquipe Médica`
        const mensagem = configuracoes.mensagemEmail || (arquivo ? mensagemDefaultComAnexo : mensagemDefaultComLink)
        
        resultados.email = await this.enviarReceitaPorEmail({
          pacienteId,
          email: dadosPaciente.email,
          receitaId,
          arquivo,
          nomeArquivo,
          assunto,
          mensagem,
          linkDownload: configuracoes.linkDownload
        })
      } catch (error) {
        resultados.erros.push({ canal: 'email', erro: error.message })
      }
    }

    // SMS
    if (canais.includes('sms') && dadosPaciente.telefone) {
      try {
        const mensagem = configuracoes.mensagemSMS || 
          `Nova receita médica disponível. Acesse: ${configuracoes.linkSite || window.location.origin}/paciente/receitas`
        
        const resultadoSMS = await this.enviarReceitaPorSMS({
          pacienteId,
          telefone: dadosPaciente.telefone,
          receitaId,
          mensagem,
          linkDownload: configuracoes.linkDownload
        })
        
        // Verificar se o SMS foi enviado com sucesso
        if (resultadoSMS.success) {
          resultados.sms = resultadoSMS
        } else {
          resultados.erros.push({ 
            canal: 'sms', 
            erro: resultadoSMS.message || 'Falha ao enviar SMS' 
          })
        }
      } catch (error) {
        resultados.erros.push({ canal: 'sms', erro: error.message })
      }
    }

    return resultados
  }

  /**
   * Busca notificações do usuário atual
   */
  async buscarNotificacoes({ 
    page = 1, 
    pageSize = 20, 
    tipo = null, 
    lidas = null 
  }) {
    try {
      const params = {
        page,
        page_size: pageSize
      }
      
      if (tipo) params.tipo = tipo
      if (lidas !== null) params.lidas = lidas

      const response = await api.get(this.baseUrl, { params })
      return response.data
    } catch (error) {
      console.error('[NotificationService] Erro ao buscar notificações:', error)
      throw error
    }
  }

  /**
   * Marca notificação como lida
   */
  async marcarComoLida(notificacaoId) {
    try {
      const response = await api.patch(`${this.baseUrl}${notificacaoId}/`, {
        lida: true,
        data_leitura: new Date().toISOString()
      })
      return response.data
    } catch (error) {
      console.error('[NotificationService] Erro ao marcar notificação como lida:', error)
      throw error
    }
  }

  /**
   * Marca todas as notificações como lidas
   */
  async marcarTodasComoLidas() {
    try {
      const response = await api.post(`${this.baseUrl}marcar-todas-lidas/`)
      return response.data
    } catch (error) {
      console.error('[NotificationService] Erro ao marcar todas como lidas:', error)
      throw error
    }
  }

  /**
   * Deleta uma notificação
   */
  async deletarNotificacao(notificacaoId) {
    try {
      await api.delete(`${this.baseUrl}${notificacaoId}/`)
      return true
    } catch (error) {
      console.error('[NotificationService] Erro ao deletar notificação:', error)
      throw error
    }
  }

  /**
   * Busca configurações de notificação do usuário
   */
  async buscarConfiguracoes() {
    try {
      const response = await api.get(`${this.baseUrl}configuracoes/`)
      return response.data
    } catch (error) {
      console.error('[NotificationService] Erro ao buscar configurações:', error)
      return {
        email_ativo: true,
        sms_ativo: false,
        push_ativo: true,
        tipos_habilitados: ['receita', 'consulta', 'exame']
      }
    }
  }

  /**
   * Atualiza configurações de notificação do usuário
   */
  async atualizarConfiguracoes(configuracoes) {
    try {
      const response = await api.put(`${this.baseUrl}configuracoes/`, configuracoes)
      return response.data
    } catch (error) {
      console.error('[NotificationService] Erro ao atualizar configurações:', error)
      throw error
    }
  }
}

export default new NotificationService()