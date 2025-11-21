# Patch DRF: meu_app_receita e meu_app_receitaitem (com nested items)

Este documento traz os modelos, serializers, views, URLs e instruções de migração para refazer as tabelas de receita (`meu_app_receita`) e itens de receita (`meu_app_receitaitem`) de forma compatível com o frontend atual, incluindo criação aninhada dos itens, campos de layout/template e metadados de assinatura.

## Modelos

Arquivo: `meu_app/models.py`

```python
import uuid
from django.db import models
from django.contrib.postgres.fields import JSONField  # se usar Postgres


class Receita(models.Model):
    STATUS_CHOICES = (
        ("emitida", "Emitida"),
        ("assinada", "Assinada"),
        ("revogada", "Revogada"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Relações principais
    paciente = models.ForeignKey(
        "meu_app.Paciente", null=True, blank=True, on_delete=models.SET_NULL, related_name="receitas"
    )
    consulta = models.ForeignKey(
        "meu_app.Consulta", null=True, blank=True, on_delete=models.SET_NULL, related_name="receitas"
    )
    medico = models.ForeignKey(
        "meu_app.Medico", null=True, blank=True, on_delete=models.SET_NULL, related_name="receitas"
    )

    # Snapshots (histórico) – campos textuais para preservar dados no momento da emissão
    nome_paciente = models.CharField(max_length=255, blank=True, null=True)
    cpf = models.CharField(max_length=14, blank=True, null=True, db_index=True)  # 000.000.000-00
    rg = models.CharField(max_length=32, blank=True, null=True)
    data_nascimento = models.DateField(blank=True, null=True)

    medico_nome = models.CharField(max_length=255, blank=True, null=True)
    crm = models.CharField(max_length=20, blank=True, null=True)
    endereco_consultorio = models.CharField(max_length=255, blank=True, null=True)
    telefone_consultorio = models.CharField(max_length=32, blank=True, null=True)
    email_paciente = models.EmailField(blank=True, null=True)

    # Campos principais da receita
    medicamento = models.TextField(blank=True, null=True)  # texto legado (quando não há itens estruturados)
    posologia = models.TextField(blank=True, null=True)    # texto legado
    observacoes = models.TextField(blank=True, null=True)
    validade = models.DateField(blank=True, null=True, db_index=True)

    # Datas
    data_emissao = models.DateTimeField(blank=True, null=True)
    data_prescricao = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Layout/template configurados no frontend
    layout_nome = models.CharField(max_length=64, blank=True, null=True)  # ex.: "modern", "classic"
    layout_versao = models.CharField(max_length=32, blank=True, null=True)
    template_config = JSONField(blank=True, null=True)  # ou models.JSONField no Django 3.1+

    # Assinatura digital e verificação
    assinada = models.BooleanField(default=False, db_index=True)
    assinada_em = models.DateTimeField(blank=True, null=True)
    algoritmo_assinatura = models.CharField(max_length=64, blank=True, null=True)  # ex.: RSA-SHA256-PADES
    hash_pre = models.CharField(max_length=128, blank=True, null=True)
    hash_documento = models.CharField(max_length=128, blank=True, null=True)
    carimbo_tempo = models.DateTimeField(blank=True, null=True)
    motivo = models.CharField(max_length=128, blank=True, null=True, default="Receita Médica")

    arquivo_assinado = models.FileField(upload_to="receitas/", blank=True, null=True)
    url_verificacao = models.URLField(blank=True, null=True)

    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default="emitida", db_index=True)

    class Meta:
        db_table = "meu_app_receita"
        indexes = [
            models.Index(fields=["paciente"]),
            models.Index(fields=["medico"]),
            models.Index(fields=["validade"]),
            models.Index(fields=["assinada"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        return f"Receita {self.id} – paciente={self.paciente_id}"


class ReceitaItem(models.Model):
    id = models.AutoField(primary_key=True)
    receita = models.ForeignKey(Receita, on_delete=models.CASCADE, related_name="itens")

    # FK opcional para medicamento estruturado
    medicamento = models.ForeignKey("meu_app.Medicamento", null=True, blank=True, on_delete=models.SET_NULL)

    # Campos textuais (quando não há cadastro de Medicamento ou para descrever)
    nome = models.CharField(max_length=255, blank=True, null=True)
    descricao = models.TextField(blank=True, null=True)

    # Posologia detalhada
    posologia = models.TextField(blank=True, null=True)
    dose = models.CharField(max_length=64, blank=True, null=True)
    frequencia = models.CharField(max_length=64, blank=True, null=True)
    duracao = models.CharField(max_length=64, blank=True, null=True)
    observacoes = models.TextField(blank=True, null=True)

    class Meta:
        db_table = "meu_app_receitaitem"
        indexes = [
            models.Index(fields=["receita"]),
            models.Index(fields=["medicamento"]),
        ]

    def __str__(self):
        return f"Item {self.id} – receita={self.receita_id}"
```

> Observação: se seu projeto não usa Postgres, substitua `JSONField` por `models.JSONField` (Django 3.1+) ou um `TextField` com JSON serializado.

## Serializers

Arquivo: `meu_app/serializers.py`

```python
from rest_framework import serializers
from .models import Receita, ReceitaItem
from django.utils.timezone import now


class ReceitaItemSerializer(serializers.ModelSerializer):
    medicamento_id = serializers.PrimaryKeyRelatedField(
        source="medicamento", queryset=None, required=False, allow_null=True
    )

    class Meta:
        model = ReceitaItem
        fields = [
            "id", "receita", "medicamento", "medicamento_id",
            "nome", "descricao",
            "posologia", "dose", "frequencia", "duracao", "observacoes",
        ]
        read_only_fields = ["id", "receita", "medicamento"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Adiar import para evitar ciclos: 
        from meu_app.models import Medicamento
        self.fields["medicamento_id"].queryset = Medicamento.objects.all()


class ReceitaSerializer(serializers.ModelSerializer):
    # suporte a criação aninhada
    itens = ReceitaItemSerializer(many=True, required=False)

    # Sinônimos aceitos do frontend
    paciente_id = serializers.IntegerField(write_only=True, required=False)
    consulta_id = serializers.IntegerField(write_only=True, required=False)
    medico_id = serializers.IntegerField(write_only=True, required=False)
    validade_receita = serializers.DateField(write_only=True, required=False)

    class Meta:
        model = Receita
        fields = [
            "id",
            # relações
            "paciente", "consulta", "medico",
            # snapshots
            "nome_paciente", "cpf", "rg", "data_nascimento",
            "medico_nome", "crm", "endereco_consultorio", "telefone_consultorio", "email_paciente",
            # conteúdo
            "medicamento", "posologia", "observacoes", "validade",
            # datas
            "data_emissao", "data_prescricao", "created_at", "updated_at",
            # layout
            "layout_nome", "layout_versao", "template_config",
            # assinatura
            "assinada", "assinada_em", "algoritmo_assinatura", "hash_pre", "hash_documento", "carimbo_tempo", "motivo",
            "arquivo_assinado", "url_verificacao", "status",
            # nested items
            "itens",
            # sinônimos
            "paciente_id", "consulta_id", "medico_id", "validade_receita",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate(self, attrs):
        # Mapear sinônimos → campos reais
        pid = attrs.pop("paciente_id", None)
        cid = attrs.pop("consulta_id", None)
        mid = attrs.pop("medico_id", None)
        if pid and not attrs.get("paciente"):
            attrs["paciente"] = pid
        if cid and not attrs.get("consulta"):
            attrs["consulta"] = cid
        if mid and not attrs.get("medico"):
            attrs["medico"] = mid

        val_alt = attrs.pop("validade_receita", None)
        if val_alt and not attrs.get("validade"):
            attrs["validade"] = val_alt

        # Datas padrão
        if not attrs.get("data_emissao"):
            attrs["data_emissao"] = now()
        if not attrs.get("data_prescricao"):
            attrs["data_prescricao"] = attrs["data_emissao"]

        # Status derivado
        if attrs.get("assinada") and not attrs.get("status"):
            attrs["status"] = "assinada"
        elif not attrs.get("status"):
            attrs["status"] = "emitida"

        return attrs

    def create(self, validated_data):
        itens_data = validated_data.pop("itens", [])
        instance = Receita.objects.create(**validated_data)

        # Criar itens aninhados
        for item in itens_data:
            med = item.pop("medicamento", None)
            # Se vier medicamento_id via 'medicamento', já é FK resolvida
            ReceitaItem.objects.create(receita=instance, medicamento=med, **item)

        return instance

    def update(self, instance, validated_data):
        itens_data = validated_data.pop("itens", None)
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save()

        # Atualização básica dos itens (opcional): apaga e recria, se enviados
        if isinstance(itens_data, list):
            instance.itens.all().delete()
            for item in itens_data:
                med = item.pop("medicamento", None)
                ReceitaItem.objects.create(receita=instance, medicamento=med, **item)

        return instance
```

## Views e URLs

Arquivo: `meu_app/views.py`

```python
from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from .models import Receita, ReceitaItem
from .serializers import ReceitaSerializer, ReceitaItemSerializer


class ReceitaViewSet(viewsets.ModelViewSet):
    queryset = Receita.objects.all().order_by("-created_at")
    serializer_class = ReceitaSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["paciente", "consulta", "medico", "assinada", "status", "validade"]
    search_fields = ["nome_paciente", "cpf", "rg", "medico_nome", "crm", "observacoes"]
    ordering_fields = ["created_at", "validade", "assinada_em"]


class ReceitaItemViewSet(viewsets.ModelViewSet):
    queryset = ReceitaItem.objects.select_related("receita", "medicamento").all().order_by("id")
    serializer_class = ReceitaItemSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["receita", "medicamento"]
    search_fields = ["nome", "descricao", "posologia"]
    ordering_fields = ["id"]
```

Arquivo: `project/urls.py` (ou `meu_app/urls.py` + include no root)

```python
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from meu_app.views import ReceitaViewSet, ReceitaItemViewSet

router = DefaultRouter()
router.register(r"receitas", ReceitaViewSet, basename="receitas")
router.register(r"receitaitem", ReceitaItemViewSet, basename="receitaitem")

urlpatterns = [
    path("api/", include(router.urls)),
]
```

## Admin

Arquivo: `meu_app/admin.py`

```python
from django.contrib import admin
from .models import Receita, ReceitaItem


@admin.register(Receita)
class ReceitaAdmin(admin.ModelAdmin):
    list_display = ("id", "paciente", "medico", "assinada", "validade", "created_at")
    list_filter = ("assinada", "status", "validade", "created_at")
    search_fields = ("nome_paciente", "cpf", "rg", "medico_nome", "crm", "observacoes")


@admin.register(ReceitaItem)
class ReceitaItemAdmin(admin.ModelAdmin):
    list_display = ("id", "receita", "medicamento", "nome", "dose", "frequencia", "duracao")
    list_filter = ("medicamento",)
    search_fields = ("nome", "descricao", "posologia")
```

## Migrações

1. Remova ou ajuste modelos antigos se necessário.
2. Gere e aplique migrações:

```bash
python manage.py makemigrations meu_app
python manage.py migrate
```

> Se trocar `id` por `UUIDField` em uma tabela existente, considere criar uma nova tabela e migrar dados, ou usar `RunPython` para migração gradual.

## Integração com o frontend

- O frontend envia `POST /api/receitas/` com `itens` aninhados. O `ReceitaSerializer` acima aceita:
  - `paciente_id`/`paciente`, `consulta_id`/`consulta`, `medico_id`/`medico` (sinônimos)
  - `validade` ou `validade_receita`
  - `data_emissao`/`data_prescricao` (opcional; definidos automaticamente se omitidos)
  - `itens`: cada item pode usar `medicamento_id` ou apenas `nome`/`descricao` + posologia.

- Upload do arquivo assinado: o frontend faz `PATCH/POST` no `/api/receitas/:id/` com `arquivo_assinado`/`pdf_assinado` etc. O `ModelViewSet` suporta `update/partial_update` – certifique-se de enviar `multipart/form-data`.

## Teste rápido

```bash
curl -X POST http://127.0.0.1:8000/api/receitas/ \
  -H "Authorization: Token SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "paciente_id": 1,
    "medico_id": 1,
    "consulta_id": 10,
    "nome_paciente": "Linker Oliva",
    "cpf": "12345678909",
    "data_nascimento": "1995-05-18",
    "medico_nome": "Dr. Liniker",
    "crm": "12345/PR",
    "endereco_consultorio": "Rua Central, 100",
    "telefone_consultorio": "+55 41 99999-0000",
    "email_paciente": "paciente@example.com",
    "validade": "2025-12-01",
    "observacoes": "Tomar após refeições",
    "data_emissao": "2025-11-11T13:33:00Z",
    "data_prescricao": "2025-11-11T13:33:00Z",
    "layout_nome": "modern",
    "layout_versao": "1.0",
    "template_config": {"accentColor": "#16a34a"},
    "itens": [
      {
        "medicamento_id": 5,
        "nome": "Paracetamol 500mg",
        "posologia": "1 comprimido de 8/8h por 7 dias",
        "dose": "500mg",
        "frequencia": "8/8h",
        "duracao": "7 dias",
        "observacoes": "Tomar com água"
      }
    ]
  }'
```

## Observações finais

- Se o seu projeto já tem `Paciente/Medico/Consulta`, manter `on_delete=SET_NULL` preserva histórico ao remover registros.
- Para `JSONField`, em Django 4+ use `models.JSONField`.
- Caso precise aceitar nomes alternativos nos endpoints (ex.: `/receita/` singular), mantenha apenas um router principal e crie `SimpleRouter` adicional conforme necessário.
- Ajuste permissões conforme sua política (ex.: `IsAuthenticated` + `DjangoModelPermissions`).

---

Com essas alterações, o frontend atual (medicine-front) persiste receitas e itens corretamente em `/api/receitas/` e `/api/receitaitem/`, incluindo dados de layout, médico, assinatura e upload de arquivo assinado.