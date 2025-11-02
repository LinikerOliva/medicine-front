import React, { useState, useEffect } from 'react';
import MedicamentoAutocomplete from './MedicamentoAutocomplete';
import './ReceitaItemManager.css';

const ReceitaItemManager = ({ 
  items = [], 
  onChange, 
  disabled = false,
  showLegacyFields = true 
}) => {
  const [receitaItems, setReceitaItems] = useState(items);
  const [legacyMedicamentos, setLegacyMedicamentos] = useState('');
  const [legacyPosologia, setLegacyPosologia] = useState('');

  useEffect(() => {
    setReceitaItems(items);
  }, [items]);

  const addNewItem = () => {
    const newItem = {
      id: Date.now(), // ID temporário para novos itens
      medicamento: null,
      medicamento_nome: '',
      dose: '',
      frequencia: '',
      duracao: '',
      observacoes: ''
    };
    
    const updatedItems = [...receitaItems, newItem];
    setReceitaItems(updatedItems);
    onChange && onChange(updatedItems);
  };

  const removeItem = (index) => {
    const updatedItems = receitaItems.filter((_, i) => i !== index);
    setReceitaItems(updatedItems);
    onChange && onChange(updatedItems);
  };

  const updateItem = (index, field, value) => {
    const updatedItems = [...receitaItems];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value
    };
    setReceitaItems(updatedItems);
    onChange && onChange(updatedItems);
  };

  const handleMedicamentoSelect = (index, medicamento) => {
    updateItem(index, 'medicamento', medicamento.id);
    updateItem(index, 'medicamento_nome', `${medicamento.nome} - ${medicamento.apresentacao}`);
  };

  const parseLegacyText = () => {
    if (!legacyMedicamentos.trim()) return;

    const medicamentoLines = legacyMedicamentos.split('\n').filter(line => line.trim());
    const posologiaLines = legacyPosologia.split('\n').filter(line => line.trim());

    const newItems = medicamentoLines.map((medicamento, index) => ({
      id: Date.now() + index,
      medicamento: null,
      medicamento_nome: medicamento.trim(),
      dose: '',
      frequencia: posologiaLines[index] ? posologiaLines[index].trim() : '',
      duracao: '',
      observacoes: ''
    }));

    const updatedItems = [...receitaItems, ...newItems];
    setReceitaItems(updatedItems);
    onChange && onChange(updatedItems);

    // Limpar campos legacy
    setLegacyMedicamentos('');
    setLegacyPosologia('');
  };

  return (
    <div className="receita-item-manager">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h6>Medicamentos da Receita</h6>
        <button
          type="button"
          className="btn btn-sm btn-outline-primary"
          onClick={addNewItem}
          disabled={disabled}
        >
          + Adicionar Medicamento
        </button>
      </div>

      {/* Lista de itens estruturados */}
      {receitaItems.length > 0 && (
        <div className="receita-items-list">
          {receitaItems.map((item, index) => (
            <div key={item.id || index} className="receita-item-card">
              <div className="d-flex justify-content-between align-items-start mb-2">
                <span className="item-number">#{index + 1}</span>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger"
                  onClick={() => removeItem(index)}
                  disabled={disabled}
                >
                  ×
                </button>
              </div>

              <div className="row">
                <div className="col-md-6 mb-2">
                  <label className="form-label">Medicamento</label>
                  <MedicamentoAutocomplete
                    value={item.medicamento_nome}
                    onChange={(value) => updateItem(index, 'medicamento_nome', value)}
                    onSelect={(medicamento) => handleMedicamentoSelect(index, medicamento)}
                    disabled={disabled}
                    placeholder="Digite o nome do medicamento..."
                  />
                </div>

                <div className="col-md-3 mb-2">
                  <label className="form-label">Dose</label>
                  <input
                    type="text"
                    className="form-control"
                    value={item.dose}
                    onChange={(e) => updateItem(index, 'dose', e.target.value)}
                    placeholder="Ex: 500mg"
                    disabled={disabled}
                  />
                </div>

                <div className="col-md-3 mb-2">
                  <label className="form-label">Frequência</label>
                  <input
                    type="text"
                    className="form-control"
                    value={item.frequencia}
                    onChange={(e) => updateItem(index, 'frequencia', e.target.value)}
                    placeholder="Ex: 2x ao dia"
                    disabled={disabled}
                  />
                </div>

                <div className="col-md-6 mb-2">
                  <label className="form-label">Duração</label>
                  <input
                    type="text"
                    className="form-control"
                    value={item.duracao}
                    onChange={(e) => updateItem(index, 'duracao', e.target.value)}
                    placeholder="Ex: 7 dias"
                    disabled={disabled}
                  />
                </div>

                <div className="col-md-6 mb-2">
                  <label className="form-label">Observações</label>
                  <input
                    type="text"
                    className="form-control"
                    value={item.observacoes}
                    onChange={(e) => updateItem(index, 'observacoes', e.target.value)}
                    placeholder="Observações adicionais"
                    disabled={disabled}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Campos legacy para compatibilidade */}
      {showLegacyFields && (
        <div className="legacy-fields mt-4">
          <h6>Importar de Texto Livre</h6>
          <p className="text-muted small">
            Cole aqui o texto dos medicamentos e posologia para converter em itens estruturados.
          </p>
          
          <div className="row">
            <div className="col-md-6 mb-2">
              <label className="form-label">Medicamentos (um por linha)</label>
              <textarea
                className="form-control"
                rows="4"
                value={legacyMedicamentos}
                onChange={(e) => setLegacyMedicamentos(e.target.value)}
                placeholder="Ex:&#10;Paracetamol 500mg&#10;Ibuprofeno 400mg"
                disabled={disabled}
              />
            </div>

            <div className="col-md-6 mb-2">
              <label className="form-label">Posologia (uma por linha)</label>
              <textarea
                className="form-control"
                rows="4"
                value={legacyPosologia}
                onChange={(e) => setLegacyPosologia(e.target.value)}
                placeholder="Ex:&#10;1 comprimido de 8/8h por 7 dias&#10;1 comprimido de 12/12h por 5 dias"
                disabled={disabled}
              />
            </div>
          </div>

          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={parseLegacyText}
            disabled={disabled || !legacyMedicamentos.trim()}
          >
            Converter para Itens Estruturados
          </button>
        </div>
      )}

      {receitaItems.length === 0 && (
        <div className="empty-state text-center py-4">
          <p className="text-muted">Nenhum medicamento adicionado ainda.</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={addNewItem}
            disabled={disabled}
          >
            Adicionar Primeiro Medicamento
          </button>
        </div>
      )}
    </div>
  );
};

export default ReceitaItemManager;