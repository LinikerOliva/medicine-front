// Mock service para simular respostas de endpoints que não existem
// Este serviço intercepta chamadas para endpoints inexistentes e retorna dados simulados

export const mockService = {
  // Mock data para diferentes endpoints
  mockData: {
    medicos: [
      {
        id: "550e8400-e29b-41d4-a716-446655440000",
        nome: "Dr. João Silva",
        crm: "12345-SP",
        especialidade: "Cardiologia",
        telefone: "(11) 99999-9999",
        email: "joao.silva@hospital.com",
        user: {
          id: "550e8400-e29b-41d4-a716-446655440000",
          username: "dr.joao",
          email: "joao.silva@hospital.com",
          first_name: "João",
          last_name: "Silva"
        }
      }
    ],
    pacientes: [
      {
        id: 1,
        nome: "Maria Santos",
        cpf: "123.456.789-00",
        email: "maria@exemplo.com",
        telefone: "(11) 99999-9999",
        user: { id: 2, username: "maria.santos", email: "maria@exemplo.com" }
      }
    ],
    consultas: [
      {
        id: 1,
        data: new Date().toISOString().split('T')[0],
        hora: "14:00",
        medico: 1,
        paciente: 1,
        status: "agendada"
      }
    ],
    receitas: [
      {
        id: 1,
        medico: 1,
        paciente: 1,
        data: new Date().toISOString().split('T')[0],
        medicamentos: "Paracetamol 500mg - 1 comprimido a cada 8 horas",
        status: "ativa",
        assinada: false,
        arquivo_assinado: null,
        data_assinatura: null,
        hash_assinatura: null
      }
    ],
    notificacoes: [
      {
        id: 1,
        titulo: "Nova consulta agendada",
        mensagem: "Você tem uma nova consulta agendada para hoje às 14:00",
        lida: false,
        data: new Date().toISOString()
      }
    ]
  },

  // Verifica se uma URL deve ser mockada
  shouldMock(url) {
    // Lista de endpoints que devem ser mockados (que não existem no backend)
    const mockEndpoints = [
      '/api/medicos/me/',
      '/api/pacientes/me/',
      '/api/users/me/',
      '/api/auth/user/',
      '/api/clinica/',
      '/api/clinicas/',
      '/api/admin/',
      '/api/auditoria/',
      '/api/assinatura/',
      '/api/documentos/',
      '/api/secretarias/',
      '/api/solicitacaomedico/',
      '/api/solicitacoes/',
      '/api/notificacoes/',
      '/api/exames/',
      '/api/prontuarios/',
      '/api/receita/gerar/',
      '/api/receita/generate/',
      '/api/receita/documento/',
      '/api/receita/pdf/',
      '/api/receitas/preview/'
    ];

    return mockEndpoints.some(endpoint => url.includes(endpoint));
  },

  // Gera resposta mockada baseada na URL
  getMockResponse(url, method = 'GET') {
    console.log(`[MOCK] Interceptando ${method} ${url}`);

    // Extrair o tipo de endpoint da URL
    if (url.includes('/medicos')) {
      if (url.includes('/me/') || url.includes('/perfil/')) {
        return {
          data: {
            id: "550e8400-e29b-41d4-a716-446655440000",
            nome: "Dr. João Silva",
            crm: "12345-SP",
            especialidade: "Cardiologia",
            telefone: "(11) 99999-9999",
            email: "joao.silva@hospital.com",
            user: {
              id: "550e8400-e29b-41d4-a716-446655440000",
              username: "dr.joao",
              email: "joao.silva@hospital.com",
              first_name: "João",
              last_name: "Silva"
            },
            medico: {
              id: "550e8400-e29b-41d4-a716-446655440000",
              nome: "Dr. João Silva",
              crm: "12345-SP",
              especialidade: "Cardiologia"
            }
          }
        };
      }
      return { data: { results: this.mockData.medicos, count: this.mockData.medicos.length } };
    }

    if (url.includes('/pacientes')) {
      if (url.includes('/me/')) {
        return { data: this.mockData.pacientes[0] };
      }
      return { data: { results: this.mockData.pacientes, count: this.mockData.pacientes.length } };
    }

    if (url.includes('/consultas')) {
      return { data: { results: this.mockData.consultas, count: this.mockData.consultas.length } };
    }

    if (url.includes('/receitas')) {
      if (url.includes('/preview/')) {
        // Mock para preview de receita
        return { 
          data: {
            id: 'preview-123',
            nome_paciente: 'Liniker Oliva',
            idade: '22 anos e 339 dias',
            rg: '529.594.598-73',
            cpf: '529.594.598-73',
            data_nascimento: '2002-11-25',
            medicamento: 'Paracetamol 500mg',
            medicamentos: 'Paracetamol 500mg - 1 comprimido a cada 8 horas',
            posologia: 'Tomar 1 comprimido a cada 8 horas',
            medico: 'Dr. João Silva',
            crm: 'CRM-12345',
            endereco_consultorio: 'Rua das Flores, 123',
            telefone_consultorio: '(11) 98888-7777',
            validade_receita: '2025-11-05',
            observacoes: '',
            validade: '2025-11-05',
            formato: 'pdf',
            medico_id: '550e8400-e29b-41d4-a716-446655440000', // UUID válido
            status: 'gerada',
            data_criacao: new Date().toISOString(),
            validade: '2025-11-05',
            assinada: false,
            arquivo_assinado: null,
            data_assinatura: null,
            hash_assinatura: null,
            assinatura_digital: {
              assinado: false,
              certificado: null,
              timestamp: null
            }
          }
        };
      }
      return { data: { results: this.mockData.receitas, count: this.mockData.receitas.length } };
    }

    // Mock para endpoints de geração de receita
    if (url.includes('/receita/gerar/') || url.includes('/receita/generate/') || url.includes('/receita/documento/') || url.includes('/receita/pdf/')) {
      if (method === 'POST' || method === 'PUT') {
        return {
          data: {
            id: 'receita-' + Date.now(),
            status: 'success',
            message: 'Receita gerada com sucesso',
            documento_url: '/api/receitas/documento/receita-' + Date.now() + '.pdf',
            receita: {
              id: 'receita-' + Date.now(),
              nome_paciente: 'Liniker Oliva',
              idade: '22 anos e 339 dias',
              medicamentos: 'Paracetamol 500mg - 1 comprimido a cada 8 horas',
              medico: 'Dr. João Silva',
              crm: 'CRM-12345',
              data_criacao: new Date().toISOString(),
              validade: '2025-11-05',
              assinada: false,
              arquivo_assinado: null,
              data_assinatura: null,
              hash_assinatura: null,
              assinatura_digital: {
                assinado: false,
                certificado: null,
                timestamp: null
              }
            }
          }
        };
      }
      
      // GET request para receita
      return {
        data: {
          id: 'receita-123',
          nome_paciente: 'Liniker Oliva',
          idade: '22 anos e 339 dias',
          medicamentos: 'Paracetamol 500mg - 1 comprimido a cada 8 horas',
          medico: 'Dr. João Silva',
          crm: 'CRM-12345',
          data_criacao: new Date().toISOString(),
          validade: '2025-11-05',
          status: 'pendente_assinatura',
          assinada: false,
          arquivo_assinado: null,
          data_assinatura: null,
          hash_assinatura: null,
          assinatura_digital: {
            assinado: false,
            certificado: null,
            timestamp: null
          }
        }
      };
    }

    // Endpoints de assinatura digital
    if (url.includes('/api/assinatura/assinar/') || url.includes('/assinatura/assinar/') || url.includes('/assinar-receita/') || url.includes('/documentos/assinar/') || url.includes('/receitas/assinar/')) {
      return {
        data: new Blob(['%PDF-1.4 mock signed pdf content'], { type: 'application/pdf' }),
        headers: {
          'content-type': 'application/pdf',
          'content-disposition': 'attachment; filename="receita_assinada.pdf"'
        }
      };
    }

    // Endpoints de verificação de status de serviços
    if (url.includes('digitalsignatureservice.test:8010') || url.includes('/api/prescriptions/status/')) {
      return {
        data: {
          status: 'success',
          signed: false,
          message: 'Serviço de assinatura disponível'
        }
      };
    }

    // Mock para solicitações administrativas
    if (url.includes('/admin/solicitacoes') || url.includes('/solicitacoes')) {
      const mockSolicitacoes = [
        {
          id: 1,
          tipo: "medico",
          status: "aprovada",
          nome: "Dr. Carlos Oliveira",
          email: "carlos.oliveira@email.com",
          crm: "54321-RJ",
          especialidade: "Pediatria",
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 dias atrás
          updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 2,
          tipo: "clinica",
          status: "pendente",
          nome: "Clínica São Paulo",
          email: "contato@clinicasp.com",
          cnpj: "12.345.678/0001-90",
          endereco: "Av. Paulista, 1000",
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 dias atrás
          updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 3,
          tipo: "medico",
          status: "rejeitada",
          nome: "Dra. Ana Santos",
          email: "ana.santos@email.com",
          crm: "98765-MG",
          especialidade: "Dermatologia",
          createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 dias atrás
          updatedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 4,
          tipo: "medico",
          status: "aprovada",
          nome: "Dr. Roberto Lima",
          email: "roberto.lima@email.com",
          crm: "11111-SP",
          especialidade: "Ortopedia",
          createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 dias atrás
          updatedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 5,
          tipo: "clinica",
          status: "aprovada",
          nome: "Hospital Central",
          email: "admin@hospitalcentral.com",
          cnpj: "98.765.432/0001-10",
          endereco: "Rua Central, 500",
          createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(), // 20 dias atrás
          updatedAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 6,
          tipo: "medico",
          status: "pendente",
          nome: "Dr. Fernando Costa",
          email: "fernando.costa@email.com",
          crm: "22222-RJ",
          especialidade: "Neurologia",
          createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 dia atrás
          updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];

      return { 
        data: mockSolicitacoes,
        count: mockSolicitacoes.length,
        results: mockSolicitacoes
      };
    }

    if (url.includes('/notificacoes')) {
      return { data: { results: this.mockData.notificacoes, count: this.mockData.notificacoes.length } };
    }

    if (url.includes('/users/me/') || url.includes('/auth/user/')) {
      return { 
        data: { 
          id: "550e8400-e29b-41d4-a716-446655440000", 
          username: "dr.joao", 
          email: "joao.silva@hospital.com",
          first_name: "João",
          last_name: "Silva",
          is_staff: true,
          is_active: true,
          medico: {
            id: "550e8400-e29b-41d4-a716-446655440000",
            nome: "Dr. João Silva",
            crm: "12345-SP",
            especialidade: "Cardiologia"
          }
        } 
      };
    }

    // Resposta genérica para outros endpoints
    return { 
      data: { 
        message: "Endpoint mockado - dados não disponíveis",
        results: [],
        count: 0
      } 
    };
  },

  // Simula delay de rede
  async simulateNetworkDelay(ms = 100) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
};