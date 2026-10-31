"""Rotas de serviço — o CRUD do cardápio (etapa 3)."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import pegar_sessao
from app.core.erros import RegistroEmUso
from app.crud import agendamento as crud_agendamento
from app.crud import servico as crud
from app.models.servico import Servico
from app.schemas.servico import ServicoAtualizar, ServicoCriar, ServicoLista, ServicoResposta

roteador = APIRouter(prefix="/api/servicos", tags=["Serviços"])


def _pegar_servico_ou_404(servico_id: int, sessao: Session) -> Servico:
    servico = crud.buscar_por_id(sessao, servico_id)
    if servico is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Serviço não encontrado.")
    return servico


@roteador.post("", response_model=ServicoResposta, status_code=status.HTTP_201_CREATED, summary="Cadastrar um serviço")
def cadastrar(dados: ServicoCriar, sessao: Session = Depends(pegar_sessao)):
    return crud.criar(sessao, dados)


@roteador.get("", response_model=ServicoLista, summary="Listar serviços (com busca, filtro e paginação)")
def listar(
    busca: str | None = Query(default=None, description="Parte do nome"),
    ativo: bool | None = Query(default=None, description="true = só o que está no cardápio"),
    pagina: int = Query(default=1, ge=1),
    tamanho: int = Query(default=20, ge=1, le=100),
    sessao: Session = Depends(pegar_sessao),
):
    total, itens = crud.listar(sessao, busca=busca, ativo=ativo, pagina=pagina, tamanho=tamanho)
    return ServicoLista(total=total, itens=itens)


@roteador.get("/{servico_id}", response_model=ServicoResposta, summary="Ver um serviço")
def detalhar(servico_id: int, sessao: Session = Depends(pegar_sessao)):
    return _pegar_servico_ou_404(servico_id, sessao)


@roteador.put("/{servico_id}", response_model=ServicoResposta, summary="Editar um serviço")
def editar(servico_id: int, dados: ServicoAtualizar, sessao: Session = Depends(pegar_sessao)):
    servico = _pegar_servico_ou_404(servico_id, sessao)
    return crud.atualizar(sessao, servico, dados)


@roteador.delete("/{servico_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Excluir um serviço")
def excluir(servico_id: int, sessao: Session = Depends(pegar_sessao)):
    servico = _pegar_servico_ou_404(servico_id, sessao)
    # serviço que já foi marcado alguma vez fica no histórico; a saída é desligar
    if crud_agendamento.tem_agendamentos(sessao, servico_id=servico.id):
        raise RegistroEmUso("Esse serviço já foi usado em agendamentos. Tire do cardápio em vez de excluir.")
    crud.remover(sessao, servico)
