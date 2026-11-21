"""Regras do login: criar o admin, conferir senha e cuidar das sessões."""

import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core import senha as cofre
from app.core.erros import RegistroDuplicado
from app.core.acesso import MENUS
from app.models.usuario import Sessao, Usuario

DURACAO_DA_SESSAO = timedelta(hours=12)

# hash de mentira, calculado uma vez, só pra login inexistente gastar o mesmo tempo de um real
_HASH_DE_MENTIRA = cofre.gerar_hash("x")


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
        # uma conferência só (igual a de um usuário real) pra não revelar que o login não existe
        cofre.conferir(senha, _HASH_DE_MENTIRA)
        return None
    return usuario if cofre.conferir(senha, usuario.senha_hash) else None


def abrir_sessao(sessao: Session, usuario: Usuario) -> str:
    """Cria a sessão no banco e devolve o token cru (que vai pro cookie)."""
    # aproveita pra jogar fora as sessões vencidas, senão elas só se acumulam na tabela
    sessao.execute(delete(Sessao).where(Sessao.expira_em < _agora()))
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


def listar_recepcionistas(sessao: Session) -> list[Usuario]:
    return list(sessao.scalars(select(Usuario).where(Usuario.tipo == "recepcionista").order_by(Usuario.login)))


def pegar_recepcionista(sessao: Session, usuario_id: int) -> Usuario | None:
    """Só devolve recepcionista: o admin nunca é mexido por aqui (assim ele não se tranca pra fora)."""
    usuario = sessao.get(Usuario, usuario_id)
    return usuario if usuario is not None and usuario.tipo == "recepcionista" else None


def criar_recepcionista(sessao: Session, login: str, senha: str, menus: list[str]) -> Usuario:
    if sessao.scalar(select(Usuario.id).where(Usuario.login == login)) is not None:
        raise RegistroDuplicado("login", login, "usuário", "Já existe um usuário com esse login.")
    usuario = Usuario(
        login=login,
        senha_hash=cofre.gerar_hash(senha),
        tipo="recepcionista",
        menus=[menu for menu in MENUS if menu in menus],  # sem repetição e na ordem do sistema
        ativo=True,
        senha_padrao=False,
    )
    sessao.add(usuario)
    try:
        sessao.commit()
    except IntegrityError:  # duas requisições com o mesmo login ao mesmo tempo: a segunda cai aqui
        sessao.rollback()
        raise RegistroDuplicado("login", login, "usuário", "Já existe um usuário com esse login.")
    return usuario


def atualizar_recepcionista(sessao: Session, usuario: Usuario, menus: list[str] | None, ativo: bool | None) -> Usuario:
    if menus is not None:
        usuario.menus = [menu for menu in MENUS if menu in menus]
    if ativo is not None:
        usuario.ativo = ativo
    sessao.commit()
    if ativo is False:  # bloqueada: derruba quem já estava logada
        fechar_sessoes_do_usuario(sessao, usuario.id)
    return usuario


def excluir_recepcionista(sessao: Session, usuario: Usuario) -> None:
    """Apaga a recepcionista de vez; as sessões dela vão junto (apago na mão: o SQLite dos testes não faz o CASCADE)."""
    sessao.execute(delete(Sessao).where(Sessao.usuario_id == usuario.id))
    sessao.delete(usuario)
    sessao.commit()


def redefinir_senha(sessao: Session, usuario: Usuario, senha_nova: str) -> None:
    """O admin define uma senha nova pra recepcionista; as sessões dela caem."""
    trocar_senha(sessao, usuario, senha_nova)
    fechar_sessoes_do_usuario(sessao, usuario.id)
