"""Consultas da aparência. A tabela tem uma linha só, a de id 1."""

from datetime import datetime, timezone

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.crud.comum import salvar
from app.models.aparencia import Aparencia
from app.schemas.aparencia import AparenciaAtualizar

ID_UNICO = 1


def pegar(sessao: Session) -> Aparencia:
    """A aparência da casa. Na primeira vez cria a linha com os padrões."""
    aparencia = sessao.get(Aparencia, ID_UNICO)
    if aparencia is not None:
        return aparencia
    try:
        return salvar(sessao, Aparencia(id=ID_UNICO))
    except IntegrityError:
        # duas primeiras leituras ao mesmo tempo: a outra criou a linha antes. Desfaço a
        # minha tentativa e leio a dela.
        sessao.rollback()
        return sessao.get(Aparencia, ID_UNICO)


def atualizar(sessao: Session, dados: AparenciaAtualizar) -> Aparencia:
    aparencia = pegar(sessao)
    for campo, valor in dados.model_dump(exclude_unset=True).items():
        if valor is None:  # null não apaga nada: nome e tema sempre precisam de valor
            continue
        setattr(aparencia, campo, valor)
    return salvar(sessao, aparencia)


def trocar_logo(sessao: Session, conteudo: bytes | None, tipo: str | None = None) -> Aparencia:
    """Com conteudo grava a logo nova; com None tira a logo."""
    aparencia = pegar(sessao)
    aparencia.logo = conteudo
    aparencia.logo_tipo = tipo
    aparencia.logo_atualizada_em = datetime.now(timezone.utc) if conteudo else None
    return salvar(sessao, aparencia)
