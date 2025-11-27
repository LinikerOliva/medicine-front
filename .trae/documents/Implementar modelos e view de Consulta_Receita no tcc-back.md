## Objetivo
Implementar `Consulta`, `Receita` e `ReceitaItem` em `meu_app/models.py` e a view de persistência em `meu_app/views.py` que cria consulta, receita e itens via `ai_gemini.extract_prescription_items`, tudo dentro de `transaction.atomic`.

## Mapeamento do Projeto
- Localizar app `meu_app` no `tcc-back` e confirmar existência/escopo de `Paciente` e `Medico`.
- Verificar módulo `meu_app/views/ai_gemini.py` para importar `extract_prescription_items` corretamente.
- Confirmar `urls.py` do app ou projeto para registrar a nova rota.

## Modelos (meu_app/models.py)
- `Consulta`: FKs para `Paciente` e `Medico`; campos `data`, `queixa_principal`, `historia_doenca`, `diagnostico`, `conduta`, `resumo_clinico`.
- `Receita`: FK para `Consulta`; `data_emissao=auto_now_add`; `status` com choices `PENDENTE`/`ASSINADA`; `arquivo_pdf_assinado` opcional com `upload_to` definido.
- `ReceitaItem`: FK para `Receita`; campos `medicamento`, `posologia`, `quantidade` opcional.
- Usar `related_name`s previsíveis: `consulta.receitas` e `receita.itens`.

## View (meu_app/views.py)
- `criar_consulta_e_receita(request)` (POST, CSRF-exempt ou API DRF) que:
  1. Lê JSON com `dados` (campos clínicos) e `texto` (para a IA).
  2. Converte `data` (ISO) ou usa `timezone.now()` se ausente.
  3. Dentro de `transaction.atomic`: cria `Consulta`, cria `Receita` com `status=PENDENTE`.
  4. Chama `extract_prescription_items(texto)`.
  5. Itera e persiste `ReceitaItem` para cada remédio.
  6. Retorna `{"receita_id": <id>}`.

## Rotas
- Registrar rota POST, por exemplo `path("api/consultas/criar-consulta-e-receita/", views.criar_consulta_e_receita)`.

## Migrações
- Gerar e aplicar migrações: `makemigrations meu_app` e `migrate`.

## Teste Básico
- Teste de integração criando payload mínimo e validando criação de `Consulta`, `Receita` e `ReceitaItem`.

Confirma prosseguir com a implementação direta no `tcc-back` conforme acima?