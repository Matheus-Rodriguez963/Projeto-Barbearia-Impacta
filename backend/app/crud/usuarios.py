"""Regras do login: criar o admin, conferir senha e cuidar das sessões."""

import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core import senha as cofre
from app.models.usuario import Sessao, Usuario

DURACAO_DA_SESSAO = timedelta(hours=12)


def _hash_do_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _agora() -> datetime:
    return datetime.now(timezone.utc)


def garantir_admin(sessao: Session) -> None:
    """Se não existe nenhum admin, cria o 'admin' com a senha 123 (e marca pra trocar)."""
    if sessao.scalar(select(Usuario.id).where(Usuario.tipo == "admin").limit(1)) is not None:
        return
    sessao.add(
        Usuario(
            login="admin",
            senha_hash=cofre.gerar_hash("123"),
            tipo="admin",
            menus=[],
            ativo=True,
            senha_padrao=True,
        )
    )
    sessao.commit()


def autenticar(sessao: Session, login: str, senha: str) -> Usuario | None:
    """Devolve o usuário se login e senha batem (bloqueado também volta; quem decide é a rota)."""
    usuario = sessao.scalar(select(Usuario).where(Usuario.login == login.strip().lower()))
    if usuario is None:
        # gasto o mesmo tempo de uma conferência pra não revelar que o login não existe
        cofre.conferir(senha, cofre.gerar_hash("x"))
        return None
    return usuario if cofre.conferir(senha, usuario.senha_hash) else None


def abrir_sessao(sessao: Session, usuario: Usuario) -> str:
    """Cria a sessão no banco e devolve o token cru (que vai pro cookie)."""
    token = secrets.token_urlsafe(32)
    sessao.add(
        Sessao(usuario_id=usuario.id, token_hash=_hash_do_token(token), expira_em=_agora() + DURACAO_DA_SESSAO)
    )
    sessao.commit()
    return token


def usuario_da_sessao(sessao: Session, token: str | None) -> Usuario | None:
    """O dono do token, se a sessão existe, não venceu e o usuário continua ativo."""
    if not token:
        return None
    registro = sessao.scalar(select(Sessao).where(Sessao.token_hash == _hash_do_token(token)))
    if registro is None:
        return None

    expira_em = registro.expira_em
    if expira_em.tzinfo is None:  # o SQLite devolve a data sem fuso; ela foi gravada em UTC
        expira_em = expira_em.replace(tzinfo=timezone.utc)
    if expira_em <= _agora():
        return None

    usuario = sessao.get(Usuario, registro.usuario_id)
    if usuario is None or not usuario.ativo:
        return None
    return usuario


def fechar_sessao(sessao: Session, token: str | None) -> None:
    if not token:
        return
    sessao.execute(delete(Sessao).where(Sessao.token_hash == _hash_do_token(token)))
    sessao.commit()


def fechar_sessoes_do_usuario(sessao: Session, usuario_id: int) -> None:
    sessao.execute(delete(Sessao).where(Sessao.usuario_id == usuario_id))
    sessao.commit()


def trocar_senha(sessao: Session, usuario: Usuario, senha_nova: str) -> None:
    usuario.senha_hash = cofre.gerar_hash(senha_nova)
    usuario.senha_padrao = False
    sessao.commit()
