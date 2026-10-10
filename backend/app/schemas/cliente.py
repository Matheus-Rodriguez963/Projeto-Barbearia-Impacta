"""Schemas do Pydantic: são eles que validam o que chega e formatam o que sai da API."""

from datetime import date, datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, computed_field, field_validator

from app.core.validadores import formatar_cpf, formatar_telefone
from app.schemas import regras

# as mesmas opções que estão nos botões do formulário
Origem = Literal["Indicação", "Passou na porta", "Instagram", "Google"]


def _nascimento(valor: date | None) -> date | None:
    if valor is None:
        return None
    if valor > date.today():
        raise ValueError("data de nascimento não pode estar no futuro")
    if (date.today() - valor).days > 120 * 365:
        raise ValueError("data de nascimento muito antiga, confira o ano")
    return valor


class _RegrasDoCliente(BaseModel):
    """As validações ficam aqui uma vez só e o criar e o atualizar herdam.

    check_fields=False porque os campos em si são declarados nas classes filhas.
    """

    _valida_texto = field_validator("nome", "apelido", "barbeiro_preferido", "observacoes", check_fields=False)(
        regras.limpar_texto
    )
    _valida_nome = field_validator("nome", check_fields=False)(regras.nome_completo)
    _valida_telefone = field_validator("telefone", check_fields=False)(regras.telefone)
    _valida_cpf = field_validator("cpf", check_fields=False)(regras.cpf)
    _valida_nascimento = field_validator("data_nascimento", check_fields=False)(_nascimento)


class ClienteBase(_RegrasDoCliente):
    """Campos que o balcão preenche."""

    nome: Annotated[str, Field(min_length=3, max_length=120, description="Nome completo do cliente")]
    telefone: Annotated[str, Field(description="Com ou sem máscara: (11) 99000-1234")]
    cpf: Annotated[str, Field(description="Com ou sem máscara: 529.982.247-25")]
    apelido: Annotated[str | None, Field(default=None, max_length=60)]
    email: EmailStr | None = None
    data_nascimento: date | None = None
    barbeiro_preferido: Annotated[str, Field(default="Sem preferência", max_length=60)]
    origem: Origem = "Indicação"
    observacoes: str | None = None


class ClienteCriar(ClienteBase):
    """POST /clientes — tudo que é obrigatório continua obrigatório."""


class ClienteAtualizar(_RegrasDoCliente):
    """PUT /clientes/{id} — aqui todo campo é opcional, dá pra mandar só o que mudou."""

    nome: Annotated[str | None, Field(default=None, min_length=3, max_length=120)]
    telefone: str | None = None
    cpf: str | None = None
    apelido: Annotated[str | None, Field(default=None, max_length=60)]
    email: EmailStr | None = None
    data_nascimento: date | None = None
    barbeiro_preferido: Annotated[str | None, Field(default=None, max_length=60)]
    origem: Origem | None = None
    observacoes: str | None = None


class ClienteResposta(BaseModel):
    """O que a API devolve. from_attributes deixa o Pydantic ler direto do modelo do SQLAlchemy."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    nome: str
    apelido: str | None
    telefone: str
    cpf: str
    email: str | None
    data_nascimento: date | None
    barbeiro_preferido: str
    origem: str
    observacoes: str | None
    criado_em: datetime | None
    atualizado_em: datetime | None

    # devolvo os dois já formatados pro front não precisar remontar a máscara
    @computed_field
    @property
    def telefone_formatado(self) -> str:
        return formatar_telefone(self.telefone)

    @computed_field
    @property
    def cpf_formatado(self) -> str:
        return formatar_cpf(self.cpf)


class ClienteLista(BaseModel):
    """Resposta da listagem — mando o total junto pra montar a paginação na tela."""

    total: int
    itens: list[ClienteResposta]
