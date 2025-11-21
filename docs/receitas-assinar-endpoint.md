# Endpoint de Assinatura e Persistência de Receita

Este documento descreve o endpoint unificado para criar/atualizar a receita, assinar o PDF e persistir metadados em uma única ação.

## Endpoint

- POST `'/receitas/assinar/'`
- Alternativas aceitas: `'/api/receitas/assinar/'`, `'/assinar-receita/'`, `'{VITE_RECEITAS_ENDPOINT}/assinar/'`

## Content-Types suportados

- `multipart/form-data` (recomendado)
- `application/json` com payload em Base64 como fallback

## Multipart Fields

- `file`/`pdf`/`documento`: arquivo PDF da receita (obrigatório se não for gerar do servidor)
- `pfx`: arquivo de certificado PKCS#12 (`.pfx`/`.p12`) opcional (obrigatório para modo `pfx`)
- `senha`: senha do certificado PFX, obrigatória quando `pfx` for enviado
- `motivo`: motivo da assinatura (ex.: "Receita Médica")
- `modo_assinatura`: `pfx` ou `token`
- `dados_receita`: JSON String com dados da receita
- `itens`: JSON String com lista de itens da receita
- `formato`: sempre `"pdf"`

### Exemplo (`multipart/form-data`)

```
POST /receitas/assinar/
Content-Type: multipart/form-data

file=<PDF>
pfx=<PFX>
senha="minha_senha"
motivo="Receita Médica"
modo_assinatura="pfx"
dados_receita="{\"paciente_id\": 123, \"consulta_id\": 456, \"medico_id\": 789, \"nome_paciente\": \"Fulano\", \"cpf\": \"000.000.000-00\", \"data_nascimento\": \"1990-05-10\", \"validade_receita\": \"2025-12-31\", \"observacoes\": \"Tomar após refeições\", \"crm\": \"12345\", \"endereco_consultorio\": \"Av. Central, 100\", \"telefone_consultorio\": \"(11) 99999-9999\", \"email_paciente\": \"fulano@example.com\", \"formato\": \"pdf\"}"
itens="[{\"descricao\": \"Amoxicilina 500mg\", \"posologia\": \"1 cápsula a cada 8h por 7 dias\"}]"
```

## JSON (Base64) Payload

- `pdf_base64`: PDF em Base64 (opcional, se servidor gerar)
- `pfx_base64`: Certificado PFX em Base64 (obrigatório para `pfx`)
- `senha`: senha do certificado
- `motivo`: motivo da assinatura
- `modo_assinatura`: `pfx` ou `token`
- `dados_receita`: objeto com dados da receita
- `itens`: lista de itens
- `formato`: `"pdf"`

### Exemplo (`application/json`)

```json
{
  "pdf_base64": "<PDF base64>",
  "pfx_base64": "<PFX base64>",
  "senha": "minha_senha",
  "motivo": "Receita Médica",
  "modo_assinatura": "pfx",
  "dados_receita": {
    "paciente_id": 123,
    "consulta_id": 456,
    "medico_id": 789,
    "nome_paciente": "Fulano",
    "cpf": "000.000.000-00",
    "data_nascimento": "1990-05-10",
    "validade_receita": "2025-12-31",
    "observacoes": "Tomar após refeições",
    "crm": "12345",
    "endereco_consultorio": "Av. Central, 100",
    "telefone_consultorio": "(11) 99999-9999",
    "email_paciente": "fulano@example.com",
    "formato": "pdf"
  },
  "itens": [
    { "descricao": "Amoxicilina 500mg", "posologia": "1 cápsula a cada 8h por 7 dias" }
  ]
}
```

## Respostas esperadas

### PDF direto

- `200 OK`
- `Content-Type: application/pdf`
- `Content-Disposition: attachment; filename="receita_assinada.pdf"`

### JSON

```json
{
  "id": 9123,
  "receita_id": 9123,
  "filename": "receita_assinada.pdf",
  "pdf_base64": "<PDF base64>",
  "persisted": true,
  "status_assinatura": "assinado",
  "assinada_em": "2025-11-10T12:34:56Z"
}
```

## Observações de Modelo

- Campos úteis na `Receita`: `assinada` (bool), `assinada_em` (datetime), `algoritmo_assinatura` (str), `hash_documento` (str), `carimbo_tempo` (datetime), `status_assinatura` (`pendente` | `assinado` | `enviado`), `enviado_em` (datetime)
- Serializer deve expor os campos acima e itens aninhados.