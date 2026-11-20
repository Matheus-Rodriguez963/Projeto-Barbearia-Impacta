"""Quem pode o quê: a lista de menus e as dependências que protegem as rotas."""

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.database import pegar_sessao
from app.models.usuario import Usuario

# os menus que o admin pode liberar. "Acessos" fica de fora de propósito: é só do admin.
MENUS: tuple[str, ...] = ("agenda", "clientes", "barbeiros", "servicos", "historico", "aparencia")

NOME_DO_COOKIE = "sessao"


def menus_do(usuario: Usuario) -> list[str]:
    """Admin enxerga tudo; recepcionista só o que foi liberado (na ordem do sistema)."""
    if usuario.tipo == "admin":
        return list(MENUS)
    return [menu for menu in MENUS if menu in (usuario.menus or [])]


def usuario_logado(request: Request, sessao: Session = Depends(pegar_sessao)) -> Usuario:
    """Lê o cookie, acha a sessão no banco e devolve o usuário; senão, 401."""
    # import aqui dentro pra o crud poder importar este módulo no futuro sem dar volta
    from app.crud import usuarios as crud

    usuario = crud.usuario_da_sessao(sessao, request.cookies.get(NOME_DO_COOKIE))
    if usuario is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Faça login para continuar.")
    return usuario


def exigir_menu(menu: str):
    """Fabrica a dependência de uma rota que só quem tem aquele menu pode usar."""

    def dependencia(usuario: Usuario = Depends(usuario_logado)) -> Usuario:
        if menu not in menus_do(usuario):
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Você não tem acesso a este menu.")
        return usuario

    return dependencia


def exigir_admin(usuario: Usuario = Depends(usuario_logado)) -> Usuario:
    if usuario.tipo != "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Você não tem acesso a este menu.")
    return usuario
