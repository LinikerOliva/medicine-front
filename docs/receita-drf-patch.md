# Patch DRF para Receita e Itens (Django REST Framework)

Este documento descreve as alterações necessárias no backend (Django + DRF) para:
- Criar/atualizar `Receita` com itens associados (`ReceitaItem`), validando e salvando corretamente.
- Retornar, nas respostas, dados completos do médico e do paciente, além de todos os itens da receita em ordem.
- Alinhar o formato de resposta ao preview exibido no frontend (médico e paciente), garantindo consistência com o layout do PDF.

## Modelos (exemplo)

```python
# models.py
class Receita(models.Model):
    paciente = models.ForeignKey(Paciente, on_delete=models.CASCADE, related_name='receitas')
    medico = models.ForeignKey(Medico, on_delete=models.CASCADE, related_name='receitas')
    data_emissao = models.DateTimeField(auto_now_add=True)
    validade_receita = models.DateField(null=True, blank=True)
    observacoes = models.TextField(blank=True)
    arquivo_assinado = models.FileField(upload_to='receitas/', null=True, blank=True)

class ReceitaItem(models.Model):
    receita = models.ForeignKey(Receita, on_delete=models.CASCADE, related_name='itens')
    ordem = models.PositiveIntegerField(default=1)
    medicamento = models.CharField(max_length=255)
    dosagem = models.CharField(max_length=255, blank=True)
    frequencia = models.CharField(max_length=255, blank=True)
    duracao = models.CharField(max_length=255, blank=True)
    observacoes = models.TextField(blank=True)

    class Meta:
        ordering = ["ordem", "id"]
```

## Serializers

```python
# serializers.py
from rest_framework import serializers
from .models import Receita, ReceitaItem

class ReceitaItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReceitaItem
        fields = [
            'id', 'ordem', 'medicamento', 'dosagem', 'frequencia', 'duracao', 'observacoes'
        ]

class ReceitaSerializer(serializers.ModelSerializer):
    itens = ReceitaItemSerializer(many=True, required=False)

    # Campos derivados do médico
    medico_nome = serializers.SerializerMethodField()
    medico_crm = serializers.SerializerMethodField()
    medico_especialidade = serializers.SerializerMethodField()
    medico_endereco = serializers.SerializerMethodField()
    medico_telefone = serializers.SerializerMethodField()

    # Campos derivados do paciente
    paciente_nome = serializers.SerializerMethodField()
    idade = serializers.SerializerMethodField()

    class Meta:
        model = Receita
        fields = [
            'id', 'paciente', 'medico', 'data_emissao', 'validade_receita', 'observacoes',
            'arquivo_assinado', 'itens',
            'medico_nome', 'medico_crm', 'medico_especialidade', 'medico_endereco', 'medico_telefone',
            'paciente_nome', 'idade'
        ]
        read_only_fields = ['data_emissao']

    def get_medico_nome(self, obj):
        u = getattr(obj.medico, 'user', None)
        if u and (u.first_name or u.last_name):
            return f"{u.first_name} {u.last_name}".strip()
        return getattr(obj.medico, 'nome', None) or 'Médico'

    def get_medico_crm(self, obj):
        return getattr(obj.medico, 'crm', '')

    def get_medico_especialidade(self, obj):
        return getattr(obj.medico, 'especialidade', '')

    def get_medico_endereco(self, obj):
        return getattr(obj.medico, 'endereco_consultorio', '')

    def get_medico_telefone(self, obj):
        return getattr(obj.medico, 'telefone_consultorio', '')

    def get_paciente_nome(self, obj):
        u = getattr(obj.paciente, 'user', None)
        if u and (u.first_name or u.last_name):
            return f"{u.first_name} {u.last_name}".strip()
        return getattr(obj.paciente, 'nome', None) or 'Paciente'

    def get_idade(self, obj):
        from datetime import date
        dob = getattr(obj.paciente, 'data_nascimento', None)
        if not dob:
            return None
        today = date.today()
        years = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
        return years

    def create(self, validated_data):
        itens_data = validated_data.pop('itens', [])
        receita = super().create(validated_data)
        # criar itens vinculados
        if itens_data:
            ReceitaItem.objects.bulk_create([
                ReceitaItem(
                    receita=receita,
                    ordem=it.get('ordem') or idx + 1,
                    medicamento=it.get('medicamento', ''),
                    dosagem=it.get('dosagem', ''),
                    frequencia=it.get('frequencia', ''),
                    duracao=it.get('duracao', ''),
                    observacoes=it.get('observacoes', ''),
                )
                for idx, it in enumerate(itens_data)
            ])
        return receita

    def update(self, instance, validated_data):
        itens_data = validated_data.pop('itens', None)
        instance = super().update(instance, validated_data)
        if itens_data is not None:
            # estratégia simples: remove e recria (ou use upsert conforme necessário)
            instance.itens.all().delete()
            ReceitaItem.objects.bulk_create([
                ReceitaItem(
                    receita=instance,
                    ordem=it.get('ordem') or idx + 1,
                    medicamento=it.get('medicamento', ''),
                    dosagem=it.get('dosagem', ''),
                    frequencia=it.get('frequencia', ''),
                    duracao=it.get('duracao', ''),
                    observacoes=it.get('observacoes', ''),
                )
                for idx, it in enumerate(itens_data)
            ])
        return instance
```

## ViewSet / Consultas

```python
# views.py
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from django.db.models import Prefetch
from .models import Receita, ReceitaItem
from .serializers import ReceitaSerializer

class ReceitaViewSet(viewsets.ModelViewSet):
    queryset = (
        Receita.objects
        .select_related('paciente', 'medico', 'paciente__user', 'medico__user')
        .prefetch_related(Prefetch('itens', queryset=ReceitaItem.objects.order_by('ordem', 'id')))
    )
    serializer_class = ReceitaSerializer
    permission_classes = [IsAuthenticated]

    # Se necessário, garantir ordenação consistente por padrão
    ordering = ['-data_emissao', '-id']
```

## Endpoint de criação/atualização

- `POST /api/receitas/` — cria receita com itens
- `PUT /api/receitas/{id}/` ou `PATCH /api/receitas/{id}/` — atualiza receita e substitui itens (ou upsert conforme regra)

### Validação

- Validar que `paciente` e `medico` existem e pertencem ao usuário correto se aplicável.
- Validar que `itens` é uma lista; cada item deve ter ao menos `medicamento`.
- Itens devem ser retornados ordenados (por `ordem`).

## Exemplos

### Payload para criar receita com vários itens

```json
{
  "paciente": 123,
  "medico": 45,
  "validade_receita": "2025-12-31",
  "observacoes": "Tomar com água, após as refeições",
  "itens": [
    { "ordem": 1, "medicamento": "Dipirona 500mg", "dosagem": "1 comprimido", "frequencia": "6/6h", "duracao": "5 dias", "observacoes": "Se dor" },
    { "ordem": 2, "medicamento": "Paracetamol 750mg", "dosagem": "1 comprimido", "frequencia": "8/8h", "duracao": "se dor", "observacoes": "Não exceder 3g/dia" }
  ]
}
```

### JSON esperado no preview (médico e paciente)

```json
{
  "id": 9876,
  "data_emissao": "2025-11-10T10:30:00Z",
  "validade_receita": "2025-12-31",
  "observacoes": "Tomar com água, após as refeições",
  "arquivo_assinado": null,
  "medico": 45,
  "paciente": 123,
  "medico_nome": "Dr. João Silva",
  "medico_crm": "12345-SP",
  "medico_especialidade": "Clínico Geral",
  "medico_endereco": "Av. Exemplo, 100 - Centro",
  "medico_telefone": "(11) 99999-9999",
  "paciente_nome": "Maria Souza",
  "idade": 34,
  "itens": [
    { "id": 1, "ordem": 1, "medicamento": "Dipirona 500mg", "dosagem": "1 comprimido", "frequencia": "6/6h", "duracao": "5 dias", "observacoes": "Se dor" },
    { "id": 2, "ordem": 2, "medicamento": "Paracetamol 750mg", "dosagem": "1 comprimido", "frequencia": "8/8h", "duracao": "se dor", "observacoes": "Não exceder 3g/dia" }
  ]
}
```

Esse JSON já atende o frontend: o preview do médico/paciente e o gerador de PDF usam o mesmo layout e conseguem exibir todos os campos exigidos.

## Observações

- Garanta que o `queryset` da `ViewSet` tenha `select_related` e `prefetch_related` para evitar N+1.
- Se houver modelo `Medicamento` separado, ajuste `ReceitaItemSerializer` para usar o nome/apresentação via relação ou flatear as strings.
- Para assinatura digital e selo: acrescente campos como `assinado_em` e metadados de certificado se necessário na resposta; o frontend exibirá “Aguardando assinatura digital” quando `arquivo_assinado` for nulo.
- Caso a criação de itens necessite upsert, substitua o `delete + bulk_create` por uma rotina de comparação (por `id`/`ordem`).

## Integração com o frontend

- O frontend do paciente agora gera o PDF diretamente do DOM usando o mesmo componente de preview do médico (`ReceitaPreviewLayout`), garantindo layout idêntico.
- Com o retorno acima, os campos obrigatórios (médico, paciente, datas e itens em ordem) são renderizados igualmente no preview e no PDF do paciente.