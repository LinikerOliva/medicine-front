import React, { useState, useEffect, useRef } from 'react';
import medicamentoService from '../services/medicamentoService';
import './MedicamentoAutocomplete.css';

const MedicamentoAutocomplete = ({ 
  value, 
  onChange, 
  onSelect, 
  placeholder = "Digite o nome do medicamento...",
  disabled = false,
  className = ""
}) => {
  const [inputValue, setInputValue] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);

  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  const searchMedicamentos = async (query) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsLoading(true);
    try {
      const results = await medicamentoService.search(query);
      setSuggestions(results);
      setShowSuggestions(true);
      setSelectedIndex(-1);
    } catch (error) {
      console.error('Erro ao buscar medicamentos:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange && onChange(newValue);
    
    // Debounce da busca
    clearTimeout(window.medicamentoSearchTimeout);
    window.medicamentoSearchTimeout = setTimeout(() => {
      searchMedicamentos(newValue);
    }, 300);
  };

  const handleSuggestionClick = (medicamento) => {
    const displayValue = `${medicamento.nome} - ${medicamento.apresentacao}`;
    setInputValue(displayValue);
    setShowSuggestions(false);
    onChange && onChange(displayValue);
    onSelect && onSelect(medicamento);
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSuggestionClick(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleBlur = (e) => {
    // Delay para permitir clique nas sugestões
    setTimeout(() => {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }, 200);
  };

  const handleFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  return (
    <div className={`medicamento-autocomplete ${className}`}>
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        onFocus={handleFocus}
        placeholder={placeholder}
        disabled={disabled}
        className="form-control"
        autoComplete="off"
      />
      
      {isLoading && (
        <div className="autocomplete-loading">
          <small>Buscando medicamentos...</small>
        </div>
      )}
      
      {showSuggestions && suggestions.length > 0 && (
        <div ref={suggestionsRef} className="autocomplete-suggestions">
          {suggestions.map((medicamento, index) => (
            <div
              key={medicamento.id}
              className={`suggestion-item ${index === selectedIndex ? 'selected' : ''}`}
              onClick={() => handleSuggestionClick(medicamento)}
            >
              <div className="suggestion-name">{medicamento.nome}</div>
              <div className="suggestion-details">
                {medicamento.apresentacao}
                {medicamento.concentracao && ` - ${medicamento.concentracao}`}
                {medicamento.fabricante && (
                  <span className="suggestion-manufacturer"> ({medicamento.fabricante})</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {showSuggestions && suggestions.length === 0 && !isLoading && inputValue.length >= 2 && (
        <div className="autocomplete-no-results">
          <small>Nenhum medicamento encontrado</small>
        </div>
      )}
    </div>
  );
};

export default MedicamentoAutocomplete;