"""Rotas do agendamento (etapa 3).

Não tem DELETE de propósito: agendamento que não vai acontecer é cancelado, e fica
registrado. Apagar e cancelar fariam a mesma coisa na tela, só que um perde o histórico.
"""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import pegar_sessao
from app.crud import agendamento as crud
from app.crud import barbeiro as crud_barbeiro
from app.models.agendamento import Agendamento
from app.schemas.agendamento import (
    AgendamentoCriar,
    AgendamentoRemarcar,
    AgendamentoResposta,
    DiaDoMes,
    GradeDoDia,
    MudarSituacao,
)

roteador = APIRouter(prefix="/api/agendamentos", tags=["Agendamentos"])


def _pegar_agendamento_ou_404(agendamento_id: int, sessao: Session) -> Agendamento:
    agendamento = crud.buscar_por_id(sessao, agendamento_id)
    if agendamento is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Agendamento não encontrado.")
    return agendamento


@roteador.post("", response_model=AgendamentoResposta, status_code=status.HTTP_201_CREATED, summary="Marcar um horário")
def marcar(dados: AgendamentoCriar, sessao: Session = Depends(pegar_sessao)):
    # se o horário quebrar alguma regra, o crud levanta RegraDaAgenda e o main.py devolve 409
    return crud.criar(sessao, dados)


@roteador.get("", response_model=list[AgendamentoResposta], summary="A agenda de um dia")
def listar(data: date = Query(description="Ex: 2026-11-03"), sessao: Session = Depends(pegar_sessao)):
    # sem paginação: um dia cheio da casa não passa de umas 60 linhas
    return crud.listar_do_dia(sessao, data)


# essa rota vem antes do /{agendamento_id}, senão o FastAPI tenta ler "horarios" como id
@roteador.get("/horarios", response_model=GradeDoDia, summary="Horários livres de um barbeiro num dia")
def horarios_livres(
    barbeiro_id: int,
    data: date,
    duracao: int = Query(ge=5, le=600, description="Soma da duração dos serviços escolhidos"),
    ignorar: int | None = Query(default=None, description="Id do agendamento que está sendo remarcado"),
    sessao: Session = Depends(pegar_sessao),
):
    barbeiro = crud_barbeiro.buscar_por_id(sessao, barbeiro_id)
    if barbeiro is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Barbeiro não encontrado.")
    return crud.grade_do_dia(sessao, barbeiro, data, duracao, ignorar_id=ignorar)


@roteador.get("/ocupacao", response_model=list[DiaDoMes], summary="Quanto cada dia do mês está ocupado")
def ocupacao(
    ano: int = Query(ge=2000, le=2100),
    mes: int = Query(ge=1, le=12),
    sessao: Session = Depends(pegar_sessao),
):
    # é o que pinta as barrinhas do calendário na lateral da agenda
    return crud.ocupacao_do_mes(sessao, ano, mes)


@roteador.get("/{agendamento_id}", response_model=AgendamentoResposta, summary="Ver um agendamento")
def detalhar(agendamento_id: int, sessao: Session = Depends(pegar_sessao)):
    return _pegar_agendamento_ou_404(agendamento_id, sessao)


@roteador.put("/{agendamento_id}", response_model=AgendamentoResposta, summary="Remarcar (trocar serviço, barbeiro ou horário)")
def remarcar(agendamento_id: int, dados: AgendamentoRemarcar, sessao: Session = Depends(pegar_sessao)):
    agendamento = _pegar_agendamento_ou_404(agendamento_id, sessao)
    return crud.remarcar(sessao, agendamento, dados)


@roteador.put("/{agendamento_id}/situacao", response_model=AgendamentoResposta, summary="Concluir, marcar falta ou cancelar")
def mudar_situacao(agendamento_id: int, dados: MudarSituacao, sessao: Session = Depends(pegar_sessao)):
    agendamento = _pegar_agendamento_ou_404(agendamento_id, sessao)
    return crud.mudar_situacao(sessao, agendamento, dados.situacao)
