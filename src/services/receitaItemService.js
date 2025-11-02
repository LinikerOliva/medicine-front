import api from './api';

const receitaItemService = {
  // Buscar todos os itens de receita
  getAll: async (params = {}) => {
    try {
      const response = await api.get('/receitaitem/', { params });
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar itens de receita:', error);
      throw error;
    }
  },

  // Buscar itens de receita por receita ID
  getByReceita: async (receitaId, params = {}) => {
    try {
      const response = await api.get('/receitaitem/', {
        params: {
          ...params,
          receita: receitaId
        }
      });
      return response.data.results || response.data;
    } catch (error) {
      console.error('Erro ao buscar itens da receita:', error);
      throw error;
    }
  },

  // Buscar item de receita por ID
  getById: async (id) => {
    try {
      const response = await api.get(`/receitaitem/${id}/`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar item de receita:', error);
      throw error;
    }
  },

  // Criar novo item de receita
  create: async (itemData) => {
    try {
      const response = await api.post('/receitaitem/', itemData);
      return response.data;
    } catch (error) {
      console.error('Erro ao criar item de receita:', error);
      throw error;
    }
  },

  // Criar múltiplos itens de receita
  createBulk: async (receitaId, items) => {
    try {
      const promises = items.map(item => 
        api.post('/receitaitem/', {
          ...item,
          receita: receitaId
        })
      );
      const responses = await Promise.all(promises);
      return responses.map(response => response.data);
    } catch (error) {
      console.error('Erro ao criar itens de receita em lote:', error);
      throw error;
    }
  },

  // Atualizar item de receita
  update: async (id, itemData) => {
    try {
      const response = await api.put(`/receitaitem/${id}/`, itemData);
      return response.data;
    } catch (error) {
      console.error('Erro ao atualizar item de receita:', error);
      throw error;
    }
  },

  // Deletar item de receita
  delete: async (id) => {
    try {
      const response = await api.delete(`/receitaitem/${id}/`);
      return response.data;
    } catch (error) {
      console.error('Erro ao deletar item de receita:', error);
      throw error;
    }
  },

  // Deletar todos os itens de uma receita
  deleteByReceita: async (receitaId) => {
    try {
      const items = await this.getByReceita(receitaId);
      const promises = items.map(item => this.delete(item.id));
      await Promise.all(promises);
      return true;
    } catch (error) {
      console.error('Erro ao deletar itens da receita:', error);
      throw error;
    }
  }
};

export default receitaItemService;