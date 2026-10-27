"""Rotas de agendamento — marcar, ver a agenda, remarcar e cancelar (etapa 3)."""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import pegar_sessao
from app.crud import agendamento as crud
from app.crud import barbeiro as crud_barbeiro
from app.crud import servico as crud_servico
from app.models.agendamento import Agendamento
from app.schemas.agendamento import (
    AgendamentoAtualizar,
    AgendamentoCriar,
    AgendamentoLista,
    AgendamentoResposta,
    HorariosLivres,
    Status,
)

roteador = APIRouter(prefix="/api/agendamentos", tags=["Agendamentos"])


def _pegar_agendamento_ou_404(agendamento_id: int, sessao: Session) -> Agendamento:
    agendamento = crud.buscar_por_id(sessao, agendamento_id)
    if agendamento is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Agendamento não encontrado.")
    return agendamento


@roteador.post(
    "",
    response_model=AgendamentoResposta,
    status_code=status.HTTP_201_CREATED,
    summary="Marcar um horário",
)
def marcar(dados: AgendamentoCriar, sessao: Session = Depends(pegar_sessao)):
    # se bater em alguma regra (folga, horário ocupado...), o crud levanta RegraDaAgenda
    # e o tratador lá no main.py transforma em 409
    return crud.criar(sessao, dados)


@roteador.get("", response_model=AgendamentoLista, summary="Ver a agenda (por período, barbeiro, cliente ou status)")
def listar(
    de: date | None = Query(default=None, description="Primeiro dia, ex: 2026-10-27"),
    ate: date | None = Query(default=None, description="Último dia (inclusive)"),
    barbeiro_id: int | None = Query(default=None),
    cliente_id: int | None = Query(default=None),
    status_: Status | None = Query(default=None, alias="status"),
    pagina: int = Query(default=1, ge=1),
    tamanho: int = Query(default=100, ge=1, le=500),
    sessao: Session = Depends(pegar_sessao),
):
    total, itens = crud.listar(
        sessao,
        de=de,
        ate=ate,
        barbeiro_id=barbeiro_id,
        cliente_id=cliente_id,
        status=status_,
        pagina=pagina,
        tamanho=tamanho,
    )
    return AgendamentoLista(total=total, itens=itens)


# essa rota tem que vir antes da /{agendamento_id}, senão o FastAPI tenta ler "horarios-livres" como id
@roteador.get("/horarios-livres", response_model=HorariosLivres, summary="Horários livres de um barbeiro num dia")
def horarios_livres(
    barbeiro_id: int,
    servico_id: int,
    data: date,
    ignorar_id: int | None = Query(default=None, description="Na remarcação: o id do próprio agendamento"),
    sessao: Session = Depends(pegar_sessao),
):
    barbeiro = crud_barbeiro.buscar_por_id(sessao, barbeiro_id)
    servico = crud_servico.buscar_por_id(sessao, servico_id)
    if barbeiro is None or servico is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Barbeiro ou serviço não encontrado.")

    horarios, motivo = crud.horarios_livres(sessao, barbeiro, servico, data, ignorar_id)
    return HorariosLivres(data=data, horarios=horarios, motivo=motivo)


@roteador.get("/{agendamento_id}", response_model=AgendamentoResposta, summary="Ver um agendamento")
def detalhar(agendamento_id: int, sessao: Session = Depends(pegar_sessao)):
    return _pegar_agendamento_ou_404(agendamento_id, sessao)


@roteador.put(
    "/{agendamento_id}", response_model=AgendamentoResposta, summary="Remarcar ou mudar o status (concluído, cancelado...)"
)
def editar(agendamento_id: int, dados: AgendamentoAtualizar, sessao: Session = Depends(pegar_sessao)):
    agendamento = _pegar_agendamento_ou_404(agendamento_id, sessao)
    return crud.atualizar(sessao, agendamento, dados)


@roteador.delete("/{agendamento_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Apagar o agendamento")
def excluir(agendamento_id: int, sessao: Session = Depends(pegar_sessao)):
    # no dia a dia o certo é cancelar (fica no histórico); apagar é pra quando marcou errado
    agendamento = _pegar_agendamento_ou_404(agendamento_id, sessao)
    crud.remover(sessao, agendamento)
