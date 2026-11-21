"""Rotas do admin pra cuidar das recepcionistas: criar, liberar menus, bloquear, excluir e trocar a senha."""

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.core.acesso import exigir_admin
from app.core.database import pegar_sessao
from app.crud import usuarios as crud
from app.models.usuario import Usuario
from app.schemas.usuario import NovaSenhaEntrada, Recepcionista, RecepcionistaAtualizar, RecepcionistaCriar

roteador = APIRouter(prefix="/api/usuarios", tags=["Acessos"], dependencies=[Depends(exigir_admin)])


def _pegar_recepcionista_ou_404(usuario_id: int, sessao: Session) -> Usuario:
    usuario = crud.pegar_recepcionista(sessao, usuario_id)
    if usuario is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Recepcionista não encontrada.")
    return usuario


@roteador.get("", response_model=list[Recepcionista], summary="Listar as recepcionistas")
def listar(sessao: Session = Depends(pegar_sessao)):
    return crud.listar_recepcionistas(sessao)


@roteador.post("", response_model=Recepcionista, status_code=status.HTTP_201_CREATED, summary="Criar uma recepcionista")
def criar(dados: RecepcionistaCriar, sessao: Session = Depends(pegar_sessao)):
    return crud.criar_recepcionista(sessao, dados.login, dados.senha, dados.menus)


@roteador.put("/{usuario_id}", response_model=Recepcionista, summary="Liberar menus ou bloquear/aprovar")
def editar(usuario_id: int, dados: RecepcionistaAtualizar, sessao: Session = Depends(pegar_sessao)):
    usuario = _pegar_recepcionista_ou_404(usuario_id, sessao)
    return crud.atualizar_recepcionista(sessao, usuario, dados.menus, dados.ativo)


@roteador.delete("/{usuario_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Excluir uma recepcionista")
def excluir(usuario_id: int, sessao: Session = Depends(pegar_sessao)):
    usuario = _pegar_recepcionista_ou_404(usuario_id, sessao)
    crud.excluir_recepcionista(sessao, usuario)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@roteador.put("/{usuario_id}/senha", status_code=status.HTTP_204_NO_CONTENT, summary="Definir uma senha nova pra ela")
def trocar_senha(usuario_id: int, dados: NovaSenhaEntrada, sessao: Session = Depends(pegar_sessao)):
    usuario = _pegar_recepcionista_ou_404(usuario_id, sessao)
    crud.redefinir_senha(sessao, usuario, dados.senha_nova)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
