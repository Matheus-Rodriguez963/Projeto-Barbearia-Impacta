"""Schemas do login: o que entra no login/troca de senha e o que a API diz sobre quem está logado."""

from typing import Annotated

from pydantic import BaseModel, ConfigDict, StringConstraints

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
