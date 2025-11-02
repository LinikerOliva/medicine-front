import React, { useState } from 'react';
import { signPrescription } from '../services/api';
import digitalSignatureService from '../services/digitalSignatureService';

const TestSignature = () => {
  const [prescriptionId, setPrescriptionId] = useState('f86c1245-2d66-4e5b-8830-e774c7c0f31f'); // ID da receita de teste
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const testSignature = async () => {
    if (!prescriptionId) {
      setError('Por favor, insira um ID de receita');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      console.log('Tentando assinar receita com ID:', prescriptionId);
      
      // Teste usando o digitalSignatureService atualizado
      const prescriptionData = {
        id: prescriptionId,
        receita_id: prescriptionId,
        algoritmo_assinatura: 'SHA256',
        hash_documento: `test_hash_${Date.now()}`
      };
      
      const response = await digitalSignatureService.signPrescription(prescriptionData);
      
      console.log('Resposta da assinatura:', response);
      setResult({
        success: true,
        data: response
      });
    } catch (err) {
      console.error('Erro na assinatura:', err);
      setError({
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
        url: err.config?.url
      });
    } finally {
      setLoading(false);
    }
  };

  const testEndpoints = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Teste dos endpoints Django disponíveis
      const baseUrl = 'http://127.0.0.1:8000/api';
      const endpoints = [
        '/receitas/',
        '/receitas/f86c1245-2d66-4e5b-8830-e774c7c0f31f/',
        '/receitas/f86c1245-2d66-4e5b-8830-e774c7c0f31f/assinar/',
        '/auth/login/',
        '/auth/user/'
      ];

      const results = {};
      const token = localStorage.getItem('token');
      
      for (const endpoint of endpoints) {
        try {
          const isSignEndpoint = endpoint.includes('/assinar/');
          const method = isSignEndpoint ? 'POST' : 'GET';
          const body = isSignEndpoint ? JSON.stringify({
            algoritmo_assinatura: 'SHA256',
            hash_documento: `test_hash_${Date.now()}`
          }) : undefined;

          const response = await fetch(`${baseUrl}${endpoint}`, {
            method: method,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': token ? `Token ${token}` : 'no-token'
            },
            body: body
          });
          
          results[endpoint] = {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok,
            method: method
          };

          // Se for o endpoint de assinatura e deu certo, pegar a resposta
          if (isSignEndpoint && response.ok) {
            const data = await response.json();
            results[endpoint].data = data;
          }
        } catch (err) {
          results[endpoint] = {
            error: err.message
          };
        }
      }

      setResult({
        endpoints: results,
        token: token ? 'Token presente' : 'Token ausente',
        tokenValue: token ? token.substring(0, 10) + '...' : 'N/A'
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      padding: '20px', 
      border: '1px solid #ccc', 
      margin: '20px',
      backgroundColor: '#f9f9f9'
    }}>
      <h3>Teste de Assinatura de Receita</h3>
      
      <div style={{ marginBottom: '20px' }}>
        <label>
          ID da Receita:
          <input
            type="text"
            value={prescriptionId}
            onChange={(e) => setPrescriptionId(e.target.value)}
            placeholder="Digite o ID da receita"
            style={{ marginLeft: '10px', padding: '5px' }}
          />
        </label>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={testSignature} 
          disabled={loading}
          style={{ 
            padding: '10px 20px', 
            marginRight: '10px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Testando...' : 'Testar Assinatura'}
        </button>
        
        <button 
          onClick={testEndpoints} 
          disabled={loading}
          style={{ 
            padding: '10px 20px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Testando...' : 'Testar Endpoints'}
        </button>
      </div>

      {error && (
        <div style={{ 
          padding: '10px', 
          backgroundColor: '#f8d7da', 
          border: '1px solid #f5c6cb',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          <h4>Erro:</h4>
          <pre>{JSON.stringify(error, null, 2)}</pre>
        </div>
      )}

      {result && (
        <div style={{ 
          padding: '10px', 
          backgroundColor: '#d4edda', 
          border: '1px solid #c3e6cb',
          borderRadius: '4px'
        }}>
          <h4>Resultado:</h4>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default TestSignature;