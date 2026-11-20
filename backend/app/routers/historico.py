"""Rotas do histórico de atendimentos (etapa 4). Só leitura: relatório do mês."""

from typing import Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import pegar_sessao
from app.crud import historico as crud
from app.schemas.historico import HistoricoLista, ResumoDoMes

roteador = APIRouter(prefix="/api/historico", tags=["Histórico"])


@roteador.get("", response_model=HistoricoLista, summary="Os atendimentos de um mês")
def listar(
    ano: int = Query(ge=2000, le=2100),
    mes: int = Query(ge=1, le=12),
    barbeiro_id: int | None = None,
    cliente_id: int | None = None,
    situacao: Literal["agendado", "concluido", "faltou", "cancelado", "todas"] = "concluido",
    pagina: int = Query(default=1, ge=1),
    tamanho: int = Query(default=20, ge=1, le=100),
    sessao: Session = Depends(pegar_sessao),
):
    total, itens = crud.listar(
        sessao, ano, mes, barbeiro_id=barbeiro_id, cliente_id=cliente_id, situacao=situacao, pagina=pagina, tamanho=tamanho
    )
    return {"total": total, "itens": itens}


@roteador.get("/resumo", response_model=ResumoDoMes, summary="Números, ranking de serviços e duplas do mês")
def resumo(
    ano: int = Query(ge=2000, le=2100),
    mes: int = Query(ge=1, le=12),
    barbeiro_id: int | None = None,
    sessao: Session = Depends(pegar_sessao),
):
    return crud.resumo_do_mes(sessao, ano, mes, barbeiro_id)
