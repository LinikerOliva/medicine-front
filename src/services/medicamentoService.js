import api from './api';

const medicamentoService = {
  // Buscar todos os medicamentos
  getAll: async (params = {}) => {
    try {
      const response = await api.get('/medicamentos/', { params });
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar medicamentos:', error);
      throw error;
    }
  },

  // Buscar medicamento por ID
  getById: async (id) => {
    try {
      const response = await api.get(`/medicamentos/${id}/`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar medicamento:', error);
      throw error;
    }
  },

  // Buscar medicamentos por nome (para autocomplete)
  search: async (query) => {
    try {
      const response = await api.get('/medicamentos/', {
        params: {
          search: query,
          page_size: 10
        }
      });
      return response.data.results || response.data;
    } catch (error) {
      console.error('Erro ao buscar medicamentos:', error);
      throw error;
    }
  },

  // Criar novo medicamento
  create: async (medicamentoData) => {
    try {
      const response = await api.post('/medicamentos/', medicamentoData);
      return response.data;
    } catch (error) {
      console.error('Erro ao criar medicamento:', error);
      throw error;
    }
  },

  // Atualizar medicamento
  update: async (id, medicamentoData) => {
    try {
      const response = await api.put(`/medicamentos/${id}/`, medicamentoData);
      return response.data;
    } catch (error) {
      console.error('Erro ao atualizar medicamento:', error);
      throw error;
    }
  },

  // Deletar medicamento (soft delete - marca como inativo)
  delete: async (id) => {
    try {
      const response = await api.patch(`/medicamentos/${id}/`, { ativo: false });
      return response.data;
    } catch (error) {
      console.error('Erro ao deletar medicamento:', error);
      throw error;
    }
  }
};

export default medicamentoService;