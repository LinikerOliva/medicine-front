## Modelos (Django)
- Atualizar/crear `Consulta` com: `medico` FK, `paciente` FK, `data_hora`, `queixa_principal` (Char), `historia_doenca` (Text), `diagnostico` (Text), `conduta` (Text), `resumo_texto` (Text), timestamps.
- Atualizar/crear `Receita` com: `consulta` FK, `medico` FK, `paciente` FK, `status` Choice (`PENDENTE`, `ASSINADA`, `CANCELADA`), `assinada` bool, `arquivo_assinado` FileField, `hash_documento`, `hash_alg`, `assinada_em`, `data_emissao`.
- Atualizar/crear `ReceitaItem` apenas com: `receita` FK, `medicamento` (Char), `posologia` (Text), `quantidade` (Char opcional).
- Gerar migrações e aplicar.

## Endpoint de Processamento
- Criar `POST /consultas/processar_transcricao/`.
- Lógica:
  1) Validar entrada: `texto`, opcional `consulta_id`, `paciente_id`, `medico_id`.
  2) `summarize_transcript(texto)` → dados clínicos; `extract_prescription_items(texto)` → lista de itens.
  3) `transaction.atomic()` para persistência:
     - Criar/atualizar `Consulta` com campos estruturados e `resumo_texto`.
     - Criar `Receita` vinculada à consulta (`status='PENDENTE'`).
     - Limpar itens existentes e criar `ReceitaItem` por cada dict retornado.
  4) Retornar JSON `{ consulta_id, receita_id }`.
- Mapear em `urls.py`.

## Assinatura e Persistência
- Backend: expor endpoints que atualizam `Receita` (`assinada`, `status`, `hash_*`, `assinada_em`) e aceitam upload do `arquivo_assinado` (PDF PADES).
- Front mantém lógica de assinatura PFX/Token, e após assinar:
  - Envia PDF assinado, salva arquivo, atualiza hashes e marca `ASSINADA`.
  - Usa env `VITE_CERT_PFX_URL` e `VITE_CERT_PFX_PASSWORD` (sem hardcode).

## Integração no Front (já alinhado)
- Iniciar Consulta: chamar `processar_transcricao_consulta` com transcrição, receber `receitaId`, navegar para Preview.
- Preview da Receita: carregar dados exclusivamente do banco via `receitaId` (cabeçalho e itens) e exibir; permite assinar e enviar.

## Segurança e Validações
- Sanitizar entradas; restringir upload a `application/pdf`.
- Bloquear quaisquer fluxos mock/bypass; sempre exigir certificado real.
- Garantir `MEDIA_ROOT/MEDIA_URL` configurados para `arquivo_assinado`.

## Verificação
- Teste unitário/integração para o endpoint (dados de exemplo de transcrição).
- Testar migrações, persistência de itens, carregamento no Preview, assinatura e gravação do arquivo.
- Verificar status/assinada/hashes no banco e download do PDF.

## Entregáveis
- Atualizações em `models.py`, `views.py` (processamento e assinatura), `urls.py` e migrações.
- Front apontando para o novo endpoint e lendo `receitaId`.

Confirma que posso aplicar essas mudanças agora (models + view + urls + migrações + integração)?