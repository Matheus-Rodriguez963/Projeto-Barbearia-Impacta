"""Schemas da aparência: validam o que chega e formatam o que sai da API."""

from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, computed_field

# as mesmas opções que aparecem na tela
Tema = Literal["classico", "preto", "marinho", "verde"]


class AparenciaAtualizar(BaseModel):
    """PUT /aparencia — só o que mudou."""

    # a linha de cima pode ficar vazia; o nome não
    linha_de_cima: Annotated[str | None, StringConstraints(strip_whitespace=True, max_length=30)] = None
    nome: Annotated[str | None, StringConstraints(strip_whitespace=True, min_length=1, max_length=40)] = None
    tema: Tema | None = None


class AparenciaResposta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    linha_de_cima: str
    nome: str
    tema: str
    atualizado_em: datetime | None
    # só pra montar o logo_url; os bytes da logo nunca vão no JSON
    logo_atualizada_em: datetime | None = Field(default=None, exclude=True)

    @computed_field
    @property
    def logo_url(self) -> str | None:
        # o ?v= muda toda vez que a logo é trocada, senão o navegador mostra a antiga do cache
        if self.logo_atualizada_em is None:
            return None
        return f"/api/aparencia/logo?v={int(self.logo_atualizada_em.timestamp())}"
