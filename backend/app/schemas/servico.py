"""Schemas do serviço: validam o que chega e formatam o que sai da API."""

from datetime import datetime
from decimal import Decimal
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas import regras

# o maior serviço da casa (corte + barba + pigmentação) passa pouco de 2h,
# então 4h já barra alguém digitando 450 achando que era o preço
DuracaoEmMinutos = Annotated[int, Field(ge=5, le=240, description="Minutos, de 5 em 5")]
Preco = Annotated[Decimal, Field(gt=0, le=1000, max_digits=6, decimal_places=2, description="Em reais, ex: 55.00")]


def _duracao(valor: int | None) -> int | None:
    # a grade da agenda anda de 5 em 5 minutos; 47 min não cabe certinho em lugar nenhum
    if valor is not None and valor % 5 != 0:
        raise ValueError("use um tempo de 5 em 5 minutos (30, 45, 50...)")
    return valor


class _RegrasDoServico(BaseModel):
    _valida_texto = field_validator("nome", "descricao", check_fields=False)(regras.limpar_texto)
    _valida_duracao = field_validator("duracao", check_fields=False)(_duracao)


class ServicoCriar(_RegrasDoServico):
    """POST /servicos"""

    nome: Annotated[str, Field(min_length=3, max_length=60)]
    descricao: Annotated[str | None, Field(default=None, max_length=120)]
    duracao: DuracaoEmMinutos
    preco: Preco
    ativo: bool = True


class ServicoAtualizar(_RegrasDoServico):
    """PUT /servicos/{id} — só o que mudou."""

    nome: Annotated[str | None, Field(default=None, min_length=3, max_length=60)]
    descricao: Annotated[str | None, Field(default=None, max_length=120)]
    duracao: DuracaoEmMinutos | None = None
    preco: Preco | None = None
    ativo: bool | None = None


class ServicoResposta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nome: str
    descricao: str | None
    duracao: int
    # no JSON vai como número (55.0); o Decimal sairia como texto ("55.00") e o front teria que converter
    preco: float
    ativo: bool
    criado_em: datetime | None
    atualizado_em: datetime | None


class ServicoLista(BaseModel):
    total: int
    itens: list[ServicoResposta]
