"""Consultas do histórico: tudo sai de agendamentos + agendamento_servicos, sem tabela nova.

Regra de ouro: faturamento, ranking e pares contam só atendimento concluído. E o preço
vem do item do agendamento (o combinado na hora de marcar), não do cardápio de hoje.
"""

from calendar import monthrange
from datetime import date

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.crud.comum import paginar
from app.models.agendamento import Agendamento, ItemDoAgendamento
from app.models.barbeiro import Barbeiro
from app.models.cliente import Cliente
from app.models.servico import Servico

# quantos pares cliente <-> barbeiro aparecem no resumo
TAMANHO_DO_TOP_DE_PARES = 5


def _periodo(ano: int, mes: int) -> tuple[date, date]:
    """Primeiro e último dia do mês (o último varia: 28, 29, 30 ou 31)."""
    return date(ano, mes, 1), date(ano, mes, monthrange(ano, mes)[1])


def _filtros_do_mes(
    ano: int, mes: int, situacao: str | None, barbeiro_id: int | None, cliente_id: int | None = None
) -> list:
    """As condições que a lista e o resumo têm em comum. situacao None = qualquer uma."""
    primeiro, ultimo = _periodo(ano, mes)
    filtros = [Agendamento.data.between(primeiro, ultimo)]
    if situacao is not None:
        filtros.append(Agendamento.situacao == situacao)
    if barbeiro_id is not None:
        filtros.append(Agendamento.barbeiro_id == barbeiro_id)
    if cliente_id is not None:
        filtros.append(Agendamento.cliente_id == cliente_id)
    return filtros


def listar(
    sessao: Session,
    ano: int,
    mes: int,
    *,
    barbeiro_id: int | None,
    cliente_id: int | None,
    situacao: str,
    pagina: int,
    tamanho: int,
) -> tuple[int, list[Agendamento]]:
    """Os atendimentos do mês, do mais recente pro mais antigo. situacao 'todas' não filtra."""
    filtros = _filtros_do_mes(ano, mes, None if situacao == "todas" else situacao, barbeiro_id, cliente_id)
    # o id desempata horários iguais (dois barbeiros às 9h), senão a página pode embaralhar
    consulta = (
        select(Agendamento)
        .where(*filtros)
        .order_by(Agendamento.data.desc(), Agendamento.inicio.desc(), Agendamento.id.desc())
    )
    return paginar(sessao, consulta, pagina, tamanho)


def _contar(sessao: Session, ano: int, mes: int, situacao: str, barbeiro_id: int | None) -> int:
    consulta = select(func.count()).select_from(Agendamento).where(*_filtros_do_mes(ano, mes, situacao, barbeiro_id))
    return sessao.scalar(consulta) or 0


def resumo_do_mes(sessao: Session, ano: int, mes: int, barbeiro_id: int | None = None) -> dict:
    atendimentos = _contar(sessao, ano, mes, "concluido", barbeiro_id)
    concluidos = _filtros_do_mes(ano, mes, "concluido", barbeiro_id)

    # ranking: uma linha por serviço, somando os itens dos atendimentos concluídos
    quantidade = func.count()
    faturamento_do_servico = func.sum(ItemDoAgendamento.preco)
    linhas = sessao.execute(
        select(ItemDoAgendamento.servico_id, Servico.nome, quantidade, faturamento_do_servico)
        .join(Agendamento, Agendamento.id == ItemDoAgendamento.agendamento_id)
        .join(Servico, Servico.id == ItemDoAgendamento.servico_id)
        .where(*concluidos)
        .group_by(ItemDoAgendamento.servico_id, Servico.nome)
        .order_by(quantidade.desc(), faturamento_do_servico.desc(), Servico.nome)
    ).all()
    servicos = [
        {"servico_id": servico_id, "nome": nome, "quantidade": qtd, "faturamento": round(float(total), 2)}
        for servico_id, nome, qtd, total in linhas
    ]

    # o faturamento do mês é a soma do ranking (cada item pertence a um serviço só)
    faturamento = round(sum(servico["faturamento"] for servico in servicos), 2)
    ticket_medio = round(faturamento / atendimentos, 2) if atendimentos else 0.0

    # pares: quem foi atendido por quem mais vezes. Os ids desempatam pra ordem não variar
    repeticoes = func.count()
    pares_no_banco = sessao.execute(
        select(Agendamento.cliente_id, Agendamento.barbeiro_id, repeticoes)
        .where(*concluidos)
        .group_by(Agendamento.cliente_id, Agendamento.barbeiro_id)
        .order_by(repeticoes.desc(), Agendamento.cliente_id, Agendamento.barbeiro_id)
        .limit(TAMANHO_DO_TOP_DE_PARES)
    ).all()
    pares = [
        {"cliente": sessao.get(Cliente, cliente_id), "barbeiro": sessao.get(Barbeiro, barbeiro_do_par), "atendimentos": qtd}
        for cliente_id, barbeiro_do_par, qtd in pares_no_banco
    ]

    return {
        "atendimentos": atendimentos,
        "faturamento": faturamento,
        "ticket_medio": ticket_medio,
        "faltas": _contar(sessao, ano, mes, "faltou", barbeiro_id),
        "cancelados": _contar(sessao, ano, mes, "cancelado", barbeiro_id),
        "servicos": servicos,
        "pares": pares,
    }
