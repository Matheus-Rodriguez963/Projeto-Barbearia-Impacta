"""Consultas e regras da agenda.

As regras pra marcar um horário ficam todas aqui, num lugar só, porque tanto o "marcar"
quanto o "remarcar" e a lista de horários livres precisam delas:

1. não marca no passado;
2. o barbeiro e o serviço têm que estar ativos;
3. o barbeiro tem que trabalhar naquele dia da semana, e o serviço inteiro cabe no horário dele;
4. o barbeiro não pode ter outro cliente no mesmo horário (contando o intervalo de limpar a cadeira);
5. o cliente também não pode estar em duas cadeiras ao mesmo tempo.
"""

from datetime import date, datetime, time

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.erros import RegraDaAgenda
from app.crud.comum import paginar, salvar
from app.models.agendamento import Agendamento
from app.models.barbeiro import Barbeiro, HorarioBarbeiro
from app.models.cliente import Cliente
from app.models.servico import Servico
from app.schemas.agendamento import AgendamentoAtualizar, AgendamentoCriar
from app.schemas.barbeiro import NOME_DOS_DIAS, ORDEM_DOS_DIAS

# a tela oferece um horário a cada 15 minutos (09:00, 09:15, 09:30...)
PASSO_DOS_HORARIOS = 15


def _minutos(hora: time) -> int:
    """09:30 -> 570. Com tudo em minutos, ver se dois horários se cruzam vira conta de somar."""
    return hora.hour * 60 + hora.minute


def _hora(minutos: int) -> str:
    return f"{minutos // 60:02d}:{minutos % 60:02d}"


def _nome_do_dia(data: date) -> str:
    # weekday() começa na segunda (0), igual à ordem que eu uso no barbeiro
    return NOME_DOS_DIAS[ORDEM_DOS_DIAS[data.weekday()]]


def _agenda_do_dia(sessao: Session, data: date, ignorar_id: int | None = None, **filtro) -> list[Agendamento]:
    """Os horários que ainda ocupam cadeira nesse dia. Cancelado e falta liberam o horário."""
    consulta = select(Agendamento).where(Agendamento.data == data, Agendamento.status == "agendado")
    for campo, valor in filtro.items():
        consulta = consulta.where(getattr(Agendamento, campo) == valor)
    if ignorar_id is not None:  # na remarcação o próprio agendamento não pode brigar com ele mesmo
        consulta = consulta.where(Agendamento.id != ignorar_id)
    return list(sessao.scalars(consulta))


def _quem(barbeiro: Barbeiro) -> str:
    return barbeiro.apelido or barbeiro.nome.split()[0]


def _conferir_dia(barbeiro: Barbeiro, servico: Servico, data: date) -> HorarioBarbeiro:
    """As regras que valem pro dia inteiro. Devolve o expediente do barbeiro nesse dia."""
    if data < date.today():
        raise RegraDaAgenda("data", "Essa data já passou.")
    if not barbeiro.ativo:
        raise RegraDaAgenda("barbeiro_id", f"{_quem(barbeiro)} está fora da agenda no momento.")
    if not servico.ativo:
        raise RegraDaAgenda("servico_id", f"{servico.nome} saiu do cardápio.")

    sigla = ORDEM_DOS_DIAS[data.weekday()]
    expediente = next((h for h in barbeiro.horarios if h.dia == sigla), None)
    if expediente is None:
        raise RegraDaAgenda("data", f"{_quem(barbeiro)} não trabalha na {_nome_do_dia(data)}.")
    return expediente


def _conferir(
    barbeiro: Barbeiro,
    servico: Servico,
    data: date,
    hora: time,
    do_barbeiro: list[Agendamento],
    do_cliente: list[Agendamento],
) -> None:
    """Passa pelas regras na ordem; a primeira que falhar vira o erro que a tela mostra."""
    expediente = _conferir_dia(barbeiro, servico, data)

    inicio = _minutos(hora)
    fim = inicio + servico.duracao
    quem = _quem(barbeiro)
    agora = datetime.now()

    if data == agora.date() and inicio < _minutos(agora.time()):
        raise RegraDaAgenda("hora", "Esse horário de hoje já passou.")
    if inicio < _minutos(expediente.entrada) or fim > _minutos(expediente.saida):
        raise RegraDaAgenda(
            "hora",
            f"Na {_nome_do_dia(data)}, {quem} atende das {expediente.entrada:%H:%M} às "
            f"{expediente.saida:%H:%M}, e o serviço leva {servico.duracao} min.",
        )

    # o intervalo entra dos dois lados: depois do cliente de antes e depois deste
    for outro in do_barbeiro:
        comeco_outro = _minutos(outro.hora)
        fim_outro = comeco_outro + outro.duracao
        if inicio < fim_outro + barbeiro.intervalo and comeco_outro < fim + barbeiro.intervalo:
            raise RegraDaAgenda(
                "hora", f"{quem} já tem cliente das {_hora(comeco_outro)} às {_hora(fim_outro)}."
            )

    for outro in do_cliente:
        comeco_outro = _minutos(outro.hora)
        if inicio < comeco_outro + outro.duracao and comeco_outro < fim:
            raise RegraDaAgenda(
                "hora", f"Esse cliente já tem horário às {_hora(comeco_outro)} nesse dia ({outro.servico.nome})."
            )


def _buscar(sessao: Session, modelo, registro_id: int, campo: str, nome: str):
    registro = sessao.get(modelo, registro_id)
    if registro is None:
        raise RegraDaAgenda(campo, f"{nome} não encontrado.")
    return registro


# ---------------------------------------------------------------- marcar

def criar(sessao: Session, dados: AgendamentoCriar) -> Agendamento:
    cliente = _buscar(sessao, Cliente, dados.cliente_id, "cliente_id", "Cliente")
    barbeiro = _buscar(sessao, Barbeiro, dados.barbeiro_id, "barbeiro_id", "Barbeiro")
    servico = _buscar(sessao, Servico, dados.servico_id, "servico_id", "Serviço")

    _conferir(
        barbeiro,
        servico,
        dados.data,
        dados.hora,
        do_barbeiro=_agenda_do_dia(sessao, dados.data, barbeiro_id=barbeiro.id),
        do_cliente=_agenda_do_dia(sessao, dados.data, cliente_id=cliente.id),
    )

    agendamento = Agendamento(
        cliente=cliente,
        barbeiro=barbeiro,
        servico=servico,
        data=dados.data,
        hora=dados.hora,
        duracao=servico.duracao,
        preco=servico.preco,
        observacoes=dados.observacoes,
    )
    return salvar(sessao, agendamento)


def horarios_livres(
    sessao: Session, barbeiro: Barbeiro, servico: Servico, data: date, ignorar_id: int | None = None
) -> tuple[list[str], str | None]:
    """Testa cada horário do expediente com as mesmas regras do "marcar".

    Devolve (horários, motivo): o motivo só vem quando não sobrou nenhum horário.
    """
    try:
        expediente = _conferir_dia(barbeiro, servico, data)
    except RegraDaAgenda as regra:  # folga, data passada... o dia inteiro está fechado
        return [], str(regra)

    do_barbeiro = _agenda_do_dia(sessao, data, ignorar_id, barbeiro_id=barbeiro.id)
    livres = []

    for inicio in range(_minutos(expediente.entrada), _minutos(expediente.saida), PASSO_DOS_HORARIOS):
        hora = time(inicio // 60, inicio % 60)
        try:
            # o cliente ainda não foi escolhido nessa conta: o choque com ele aparece ao salvar
            _conferir(barbeiro, servico, data, hora, do_barbeiro, do_cliente=[])
            livres.append(_hora(inicio))
        except RegraDaAgenda:
            continue

    if livres:
        return livres, None
    return [], f"{_quem(barbeiro)} não tem horário livre nesse dia para esse serviço."


# ---------------------------------------------------------------- consultar

def buscar_por_id(sessao: Session, agendamento_id: int) -> Agendamento | None:
    return sessao.get(Agendamento, agendamento_id)


def listar(
    sessao: Session,
    de: date | None = None,
    ate: date | None = None,
    barbeiro_id: int | None = None,
    cliente_id: int | None = None,
    status: str | None = None,
    pagina: int = 1,
    tamanho: int = 100,
) -> tuple[int, list[Agendamento]]:
    consulta = select(Agendamento)
    if de is not None:
        consulta = consulta.where(Agendamento.data >= de)
    if ate is not None:
        consulta = consulta.where(Agendamento.data <= ate)
    if barbeiro_id is not None:
        consulta = consulta.where(Agendamento.barbeiro_id == barbeiro_id)
    if cliente_id is not None:
        consulta = consulta.where(Agendamento.cliente_id == cliente_id)
    if status is not None:
        consulta = consulta.where(Agendamento.status == status)

    # a agenda se lê de cima pra baixo, do mais cedo pro mais tarde
    consulta = consulta.order_by(Agendamento.data, Agendamento.hora, Agendamento.id)
    return paginar(sessao, consulta, pagina, tamanho)


# ---------------------------------------------------------------- remarcar e mudar status

def atualizar(sessao: Session, agendamento: Agendamento, dados: AgendamentoAtualizar) -> Agendamento:
    mudancas = {campo: valor for campo, valor in dados.model_dump(exclude_unset=True).items() if valor is not None}

    barbeiro = agendamento.barbeiro
    if "barbeiro_id" in mudancas:
        barbeiro = _buscar(sessao, Barbeiro, mudancas["barbeiro_id"], "barbeiro_id", "Barbeiro")
    servico = agendamento.servico
    if "servico_id" in mudancas:
        servico = _buscar(sessao, Servico, mudancas["servico_id"], "servico_id", "Serviço")

    data = mudancas.get("data", agendamento.data)
    hora = mudancas.get("hora", agendamento.hora)
    status = mudancas.get("status", agendamento.status)

    # só confiro as regras se o horário mudou ou se um cancelado voltou pra agenda.
    # mudar só o status ("concluído") ou a observação de um horário de ontem tem que funcionar.
    remarcou = any(
        campo in mudancas and mudancas[campo] != getattr(agendamento, campo)
        for campo in ("barbeiro_id", "servico_id", "data", "hora")
    )
    voltou_pra_agenda = status == "agendado" and agendamento.status != "agendado"

    if status == "agendado" and (remarcou or voltou_pra_agenda):
        _conferir(
            barbeiro,
            servico,
            data,
            hora,
            do_barbeiro=_agenda_do_dia(sessao, data, agendamento.id, barbeiro_id=barbeiro.id),
            do_cliente=_agenda_do_dia(sessao, data, agendamento.id, cliente_id=agendamento.cliente_id),
        )

    if servico.id != agendamento.servico_id:
        # trocou o serviço: vale o tempo e o preço do serviço novo
        agendamento.duracao = servico.duracao
        agendamento.preco = servico.preco

    agendamento.barbeiro = barbeiro
    agendamento.servico = servico
    agendamento.data = data
    agendamento.hora = hora
    agendamento.status = status
    if "observacoes" in dados.model_fields_set:  # aqui null apaga a observação
        agendamento.observacoes = dados.observacoes

    return salvar(sessao, agendamento)


def remover(sessao: Session, agendamento: Agendamento) -> None:
    sessao.delete(agendamento)
    sessao.commit()
