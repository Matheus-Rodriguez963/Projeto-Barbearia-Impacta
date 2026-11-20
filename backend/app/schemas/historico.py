"""Schemas do histórico (etapa 4).

A lista reaproveita o AgendamentoResposta da agenda: é o mesmo atendimento, só que visto
de longe. O que é novo aqui é o resumo do mês.
"""

from pydantic import BaseModel

from app.schemas.agendamento import AgendamentoResposta, BarbeiroDoAgendamento, ClienteDoAgendamento


class HistoricoLista(BaseModel):
    total: int  # de todas as páginas, pro contador e a paginação da tela
    itens: list[AgendamentoResposta]


class ServicoDoRanking(BaseModel):
    servico_id: int
    nome: str
    quantidade: int
    faturamento: float


class ParDoMes(BaseModel):
    """Quantas vezes um cliente foi atendido por um barbeiro no mês."""

    cliente: ClienteDoAgendamento
    barbeiro: BarbeiroDoAgendamento
    atendimentos: int


class ResumoDoMes(BaseModel):
    atendimentos: int
    faturamento: float
    ticket_medio: float
    faltas: int
    cancelados: int
    servicos: list[ServicoDoRanking]
    pares: list[ParDoMes]
