"""Schemas do Pydantic: são eles que validam o que chega e formatam o que sai da API."""

from datetime import date, datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, computed_field, field_validator

from app.core.validadores import cpf_valido, formatar_cpf, formatar_telefone, so_numeros, telefone_valido

# as mesmas opções que estão nos botões do formulário
Origem = Literal["Indicação", "Passou na porta", "Instagram", "Google"]


class ClienteBase(BaseModel):
    """Campos que o balcão preenche. Criar e atualizar herdam daqui."""

    nome: Annotated[str, Field(min_length=3, max_length=120, description="Nome completo do cliente")]
    telefone: Annotated[str, Field(description="Com ou sem máscara: (11) 99000-1234")]
    cpf: Annotated[str, Field(description="Com ou sem máscara: 529.982.247-25")]
    apelido: Annotated[str | None, Field(default=None, max_length=60)]
    email: EmailStr | None = None
    data_nascimento: date | None = None
    barbeiro_preferido: Annotated[str, Field(default="Sem preferência", max_length=60)]
    origem: Origem = "Indicação"
    observacoes: str | None = None

    @field_validator("nome", "apelido", "barbeiro_preferido", "observacoes")
    @classmethod
    def limpar_texto(cls, valor: str | None) -> str | None:
        # tira espaço sobrando das pontas; campo só com espaço vira None
        if valor is None:
            return None
        valor = " ".join(valor.split())
        return valor or None

    @field_validator("nome")
    @classmethod
    def nome_precisa_ser_completo(cls, valor: str) -> str:
        # a ficha é do cliente, então eu exijo pelo menos nome e sobrenome
        if len(valor.split()) < 2:
            raise ValueError("informe o nome completo (nome e sobrenome)")
        return valor

    @field_validator("telefone")
    @classmethod
    def validar_telefone(cls, valor: str) -> str:
        if not telefone_valido(valor):
            raise ValueError("telefone inválido — use DDD + número, ex: (11) 99000-1234")
        return so_numeros(valor)  # no banco guardo só os dígitos

    @field_validator("cpf")
    @classmethod
    def validar_cpf(cls, valor: str) -> str:
        if not cpf_valido(valor):
            raise ValueError("CPF inválido — confira os números digitados")
        return so_numeros(valor)

    @field_validator("data_nascimento")
    @classmethod
    def validar_nascimento(cls, valor: date | None) -> date | None:
        if valor is None:
            return None
        if valor > date.today():
            raise ValueError("data de nascimento não pode estar no futuro")
        if (date.today() - valor).days > 120 * 365:
            raise ValueError("data de nascimento muito antiga, confira o ano")
        return valor


class ClienteCriar(ClienteBase):
    """POST /clientes — tudo que é obrigatório continua obrigatório."""


class ClienteAtualizar(BaseModel):
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

    # reaproveito as validações do ClienteBase pra não escrever a mesma coisa duas vezes
    _limpar_texto = field_validator("nome", "apelido", "barbeiro_preferido", "observacoes")(
        ClienteBase.limpar_texto.__func__
    )
    _nome_completo = field_validator("nome")(ClienteBase.nome_precisa_ser_completo.__func__)
    _telefone = field_validator("telefone")(ClienteBase.validar_telefone.__func__)
    _cpf = field_validator("cpf")(ClienteBase.validar_cpf.__func__)
    _nascimento = field_validator("data_nascimento")(ClienteBase.validar_nascimento.__func__)


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
