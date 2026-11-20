"""Rotas do login: entrar, sair, ver quem sou eu e trocar a minha senha."""

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.core import senha as cofre
from app.core.acesso import NOME_DO_COOKIE, menus_do, usuario_logado
from app.core.database import pegar_sessao
from app.crud import usuarios as crud
from app.models.usuario import Usuario
from app.schemas.usuario import LoginEntrada, TrocarSenhaEntrada, UsuarioLogado

roteador = APIRouter(prefix="/api", tags=["Acesso"])


def _como_logado(usuario: Usuario) -> UsuarioLogado:
    return UsuarioLogado(
        id=usuario.id,
        login=usuario.login,
        tipo=usuario.tipo,
        menus=menus_do(usuario),
        senha_padrao=usuario.senha_padrao,
    )


@roteador.post("/login", response_model=UsuarioLogado, summary="Entrar no sistema")
def entrar(dados: LoginEntrada, request: Request, resposta: Response, sessao: Session = Depends(pegar_sessao)):
    usuario = crud.autenticar(sessao, dados.login, dados.senha)
    if usuario is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Login ou senha incorretos.")
    if not usuario.ativo:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Seu acesso está bloqueado. Fale com o administrador.")

    # entrar de novo com um cookie antigo no navegador: fecha a sessão velha em vez de deixá-la órfã
    crud.fechar_sessao(sessao, request.cookies.get(NOME_DO_COOKIE))
    token = crud.abrir_sessao(sessao, usuario)
    resposta.set_cookie(
        NOME_DO_COOKIE,
        token,
        max_age=int(crud.DURACAO_DA_SESSAO.total_seconds()),
        httponly=True,
        samesite="lax",
        path="/",
    )
    return _como_logado(usuario)


@roteador.post("/logout", status_code=status.HTTP_204_NO_CONTENT, summary="Sair do sistema")
def sair(request: Request, sessao: Session = Depends(pegar_sessao)):
    crud.fechar_sessao(sessao, request.cookies.get(NOME_DO_COOKIE))
    resposta = Response(status_code=status.HTTP_204_NO_CONTENT)
    resposta.delete_cookie(NOME_DO_COOKIE, path="/")
    return resposta


@roteador.get("/eu", response_model=UsuarioLogado, summary="Quem está logado e o que pode abrir")
def quem_sou_eu(usuario: Usuario = Depends(usuario_logado)):
    return _como_logado(usuario)


@roteador.put("/eu/senha", status_code=status.HTTP_204_NO_CONTENT, summary="Trocar a minha senha")
def trocar_minha_senha(
    dados: TrocarSenhaEntrada,
    usuario: Usuario = Depends(usuario_logado),
    sessao: Session = Depends(pegar_sessao),
):
    if not cofre.conferir(dados.senha_atual, usuario.senha_hash):
        # mesmo formato do handler de validação, pra tela pintar o campo
        return JSONResponse(
            status_code=422,
            content={
                "detail": "Confira os campos do formulário.",
                "erros": [{"campo": "senha_atual", "mensagem": "Senha atual incorreta."}],
            },
        )
    crud.trocar_senha(sessao, usuario, dados.senha_nova)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
