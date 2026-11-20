"""Schemas do login: o que entra no login/troca de senha e o que a API diz sobre quem está logado."""

import re
from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, StringConstraints, field_validator

# a senha nova tem de 4 a 72 caracteres
SenhaNova = Annotated[str, StringConstraints(min_length=4, max_length=72)]


class LoginEntrada(BaseModel):
    login: Annotated[str, StringConstraints(max_length=60)]
    senha: Annotated[str, StringConstraints(max_length=200)]


class TrocarSenhaEntrada(BaseModel):
    senha_atual: Annotated[str, StringConstraints(max_length=200)]
    senha_nova: SenhaNova


class UsuarioLogado(BaseModel):
    """Quem está logado e o que ele pode abrir (o front desenha o menu a partir disso)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    login: str
    tipo: str
    menus: list[str]
    senha_padrao: bool


# os menus que o admin pode liberar (mesma lista de app.core.acesso.MENUS; "acessos" nunca entra)
Menu = Literal["agenda", "clientes", "barbeiros", "servicos", "historico", "aparencia"]


class RecepcionistaCriar(BaseModel):
    login: str
    senha: SenhaNova
    menus: list[Menu] = []

    @field_validator("login")
    @classmethod
    def _login(cls, valor: str) -> str:
        valor = valor.strip().lower()
        if not re.fullmatch(r"[a-z0-9._]{3,30}", valor):
            raise ValueError("use de 3 a 30 caracteres: letras, números, ponto ou sublinhado")
        return valor


class RecepcionistaAtualizar(BaseModel):
    menus: list[Menu] | None = None
    ativo: bool | None = None


class NovaSenhaEntrada(BaseModel):
    senha_nova: SenhaNova


class Recepcionista(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    login: str
    menus: list[str]
    ativo: bool
    criado_em: datetime
