"""Schemas do serviço: validam o que chega e formatam o que sai da API."""

from datetime import datetime
from decimal import Decimal
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas import regras

# de 5 em 5 minutos, que é como a agenda é dividida; 4 horas já cobre uma pigmentação longa
Duracao = Annotated[int, Field(ge=5, le=240, multiple_of=5, description="Minutos de cadeira")]
Preco = Annotated[Decimal, Field(ge=0, le=9999, max_digits=6, decimal_places=2, description="Em reais: 45.00")]


class _RegrasDoServico(BaseModel):
    _valida_texto = field_validator("nome", "descricao", check_fields=False)(regras.limpar_texto)


class ServicoCriar(_RegrasDoServico):
    """POST /servicos"""

    nome: Annotated[str, Field(min_length=3, max_length=60)]
    descricao: Annotated[str | None, Field(default=None, max_length=300)]
    duracao: Duracao
    preco: Preco
    ativo: bool = True


class ServicoAtualizar(_RegrasDoServico):
    """PUT /servicos/{id} — só o que mudou."""

    nome: Annotated[str | None, Field(default=None, min_length=3, max_length=60)]
    descricao: Annotated[str | None, Field(default=None, max_length=300)]
    duracao: Duracao | None = None
    preco: Preco | None = None
    ativo: bool | None = None


class ServicoResposta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nome: str
    descricao: str | None
    duracao: int
    preco: float  # o front faz conta e formata como R$, então mando número e não texto
    ativo: bool
    criado_em: datetime | None
    atualizado_em: datetime | None


class ServicoLista(BaseModel):
    total: int
    itens: list[ServicoResposta]
