"""As regras da agenda. É o arquivo mais importante da etapa 3.

Toda vez que alguém marca ou remarca, eu confiro nesta ordem:
  1. cliente, barbeiro e serviços existem (e barbeiro/serviço estão ativos);
  2. o horário ainda não passou;
  3. o barbeiro trabalha nesse dia e o serviço cabe dentro do expediente dele;
  4. não cai no almoço do barbeiro;
  5. não bate com outro cliente do mesmo barbeiro (contando o intervalo de limpeza);
  6. o cliente não está marcado com outro barbeiro no mesmo horário.
"""

from calendar import monthrange
from datetime import date, datetime, time

from sqlalchemy import exists, select
from sqlalchemy.orm import Session

from app.core.erros import RegraDaAgenda
from app.crud.comum import salvar
from app.models.agendamento import Agendamento, ItemDoAgendamento
from app.models.barbeiro import Barbeiro, HorarioBarbeiro
from app.models.cliente import Cliente
from app.models.servico import Servico
from app.schemas.agendamento import AgendamentoCriar
from app.schemas.barbeiro import NOME_DOS_DIAS, ORDEM_DOS_DIAS

# de quanto em quanto tempo a tela oferece horário. Igual ao protótipo: 09:00, 09:30...
PASSO_DA_GRADE = 30

# cancelado e faltou liberam a cadeira; o resto ocupa
OCUPAM_A_CADEIRA = ("agendado", "concluido")


# ---------------------------------------------------------------- continhas de hora

def _minutos(hora: time) -> int:
    """14:30 -> 870. Fazer as contas em minutos é bem mais simples que somar time."""
    return hora.hour * 60 + hora.minute


def _hora(minutos: int) -> time:
    return time(minutos // 60, minutos % 60)


def _agora() -> datetime:
    # separei numa função só pra deixar claro que é a hora da máquina onde a API roda
    return datetime.now()


# ---------------------------------------------------------------- consultas de apoio

def _expediente(barbeiro: Barbeiro, dia: date) -> HorarioBarbeiro | None:
    """A linha de horarios_barbeiro desse dia da semana. None = folga."""
    sigla = ORDEM_DOS_DIAS[dia.weekday()]  # weekday() começa na segunda, igual à minha lista
    return next((h for h in barbeiro.horarios if h.dia == sigla), None)


def almoco_no_dia(barbeiro: Barbeiro, expediente: HorarioBarbeiro) -> tuple[int, int] | None:
    """O almoço daquele dia em minutos (início, fim), ou None se ele não almoça nesse dia.

    O almoço só vale se tiver trabalho antes e depois dele: no sábado em que o Seu Alfredo
    fecha às 13h, o almoço do meio-dia não faz sentido e a manhã fica toda livre.
    """
    if barbeiro.almoco is None:
        return None
    inicio = _minutos(barbeiro.almoco)
    fim = inicio + barbeiro.almoco_duracao
    if inicio <= _minutos(expediente.entrada) or fim >= _minutos(expediente.saida):
        return None
    return inicio, fim


def _ocupados(sessao: Session, dia: date, ignorar_id: int | None = None, **filtro) -> list[Agendamento]:
    """Os agendamentos que ocupam cadeira no dia. ignorar_id serve na remarcação."""
    consulta = select(Agendamento).where(Agendamento.data == dia, Agendamento.situacao.in_(OCUPAM_A_CADEIRA))
    for campo, valor in filtro.items():
        consulta = consulta.where(getattr(Agendamento, campo) == valor)
    if ignorar_id is not None:
        consulta = consulta.where(Agendamento.id != ignorar_id)
    return list(sessao.scalars(consulta))


def _choque(inicio: int, fim: int, outros: list[Agendamento], folga: int) -> Agendamento | None:
    """Devolve o primeiro agendamento que bate com [inicio, fim), ou None.

    A folga é o intervalo de limpeza do barbeiro: depois de cada cliente a cadeira fica
    parada esses minutos. Somo nos dois lados porque tanto faz quem vem antes.
    """
    for outro in outros:
        if inicio < _minutos(outro.fim) + folga and _minutos(outro.inicio) < fim + folga:
            return outro
    return None


def tem_agendamentos(sessao: Session, **filtro) -> bool:
    """Usado antes de apagar cliente, barbeiro ou serviço: tem algum agendamento apontando?"""
    if "servico_id" in filtro:
        consulta = select(exists().where(ItemDoAgendamento.servico_id == filtro["servico_id"]))
    else:
        campo, valor = next(iter(filtro.items()))
        consulta = select(exists().where(getattr(Agendamento, campo) == valor))
    return bool(sessao.scalar(consulta))


# ---------------------------------------------------------------- as regras

def _conferir(sessao: Session, dados: AgendamentoCriar, ignorar_id: int | None = None):
    """Passa por todas as regras. Se alguma quebrar, levanta RegraDaAgenda com o campo culpado."""
    cliente = sessao.get(Cliente, dados.cliente_id)
    if cliente is None:
        raise RegraDaAgenda("cliente_id", "Cliente não encontrado. Cadastre antes de marcar.")

    barbeiro = sessao.get(Barbeiro, dados.barbeiro_id)
    if barbeiro is None:
        raise RegraDaAgenda("barbeiro_id", "Barbeiro não encontrado.")
    chamada = barbeiro.apelido or barbeiro.nome.split()[0]
    if not barbeiro.ativo:
        raise RegraDaAgenda("barbeiro_id", f"{chamada} está fora da agenda (férias ou afastamento).")

    encontrados = {s.id: s for s in sessao.scalars(select(Servico).where(Servico.id.in_(dados.servicos)))}
    servicos = []
    for servico_id in dados.servicos:  # mantenho a ordem que a recepção marcou
        servico = encontrados.get(servico_id)
        if servico is None or not servico.ativo:
            raise RegraDaAgenda("servicos", "Um dos serviços escolhidos saiu do cardápio. Atualize a tela.")
        servicos.append(servico)

    if datetime.combine(dados.data, dados.inicio) < _agora():
        raise RegraDaAgenda("inicio", "Esse horário já passou.")

    expediente = _expediente(barbeiro, dados.data)
    if expediente is None:
        dia = NOME_DOS_DIAS[ORDEM_DOS_DIAS[dados.data.weekday()]]
        raise RegraDaAgenda("data", f"{chamada} não trabalha na {dia}.")

    inicio = _minutos(dados.inicio)
    fim = inicio + sum(s.duracao for s in servicos)
    if inicio < _minutos(expediente.entrada) or fim > _minutos(expediente.saida):
        raise RegraDaAgenda(
            "inicio",
            f"{chamada} atende das {expediente.entrada:%H:%M} às {expediente.saida:%H:%M} nesse dia, "
            f"e esse atendimento leva {fim - inicio} min.",
        )

    almoco = almoco_no_dia(barbeiro, expediente)
    if almoco and inicio < almoco[1] and almoco[0] < fim:
        raise RegraDaAgenda(
            "inicio", f"{chamada} almoça das {_hora(almoco[0]):%H:%M} às {_hora(almoco[1]):%H:%M}."
        )

    outro = _choque(inicio, fim, _ocupados(sessao, dados.data, ignorar_id, barbeiro_id=barbeiro.id), barbeiro.intervalo)
    if outro:
        limpeza = f" (mais {barbeiro.intervalo} min de limpeza)" if barbeiro.intervalo else ""
        raise RegraDaAgenda(
            "inicio", f"{chamada} já tem cliente das {outro.inicio:%H:%M} às {outro.fim:%H:%M}{limpeza}."
        )

    # o cliente não está em duas cadeiras ao mesmo tempo. Aqui sem folga: a limpeza é do barbeiro
    outro = _choque(inicio, fim, _ocupados(sessao, dados.data, ignorar_id, cliente_id=cliente.id), 0)
    if outro:
        raise RegraDaAgenda("inicio", f"Esse cliente já está marcado às {outro.inicio:%H:%M} nesse dia.")

    return servicos, _hora(fim)


def _montar_itens(servicos: list[Servico]) -> list[ItemDoAgendamento]:
    return [ItemDoAgendamento(servico_id=s.id, servico=s, duracao=s.duracao, preco=s.preco) for s in servicos]


# ---------------------------------------------------------------- crud

def criar(sessao: Session, dados: AgendamentoCriar) -> Agendamento:
    servicos, fim = _conferir(sessao, dados)
    agendamento = Agendamento(
        cliente_id=dados.cliente_id,
        barbeiro_id=dados.barbeiro_id,
        data=dados.data,
        inicio=dados.inicio,
        fim=fim,
        situacao="agendado",
    )
    agendamento.itens = _montar_itens(servicos)
    return salvar(sessao, agendamento)


def buscar_por_id(sessao: Session, agendamento_id: int) -> Agendamento | None:
    return sessao.get(Agendamento, agendamento_id)


def listar_do_dia(sessao: Session, dia: date) -> list[Agendamento]:
    """Tudo do dia, inclusive cancelados: quem decide o que desenhar é a tela."""
    consulta = select(Agendamento).where(Agendamento.data == dia).order_by(Agendamento.inicio, Agendamento.id)
    return list(sessao.scalars(consulta))


def _so_se_agendado(agendamento: Agendamento) -> None:
    if agendamento.situacao != "agendado":
        raise RegraDaAgenda("situacao", "Esse agendamento já foi fechado e não pode mais mudar.")


def remarcar(sessao: Session, agendamento: Agendamento, dados: AgendamentoCriar) -> Agendamento:
    _so_se_agendado(agendamento)
    servicos, fim = _conferir(sessao, dados, ignorar_id=agendamento.id)

    agendamento.cliente_id = dados.cliente_id
    agendamento.barbeiro_id = dados.barbeiro_id
    agendamento.data = dados.data
    agendamento.inicio = dados.inicio
    agendamento.fim = fim

    # remarcar é escolher de novo, então pega o preço de hoje. Mesmo truque do flush que eu
    # usei nos horários do barbeiro: sem ele o banco recusa o "corte" novo antes de apagar o velho
    agendamento.itens.clear()
    sessao.flush()
    agendamento.itens = _montar_itens(servicos)

    salvar(sessao, agendamento)
    # o refresh não recarrega os relacionamentos, e eu troquei cliente/barbeiro pelo id
    sessao.expire(agendamento, ["cliente", "barbeiro"])
    return agendamento


def mudar_situacao(sessao: Session, agendamento: Agendamento, situacao: str) -> Agendamento:
    _so_se_agendado(agendamento)

    # cancelar pode a qualquer hora; concluído e faltou só depois que o horário chegou
    comeca = datetime.combine(agendamento.data, agendamento.inicio)
    if situacao != "cancelado" and comeca > _agora():
        raise RegraDaAgenda("situacao", "Esse atendimento ainda não começou.")

    agendamento.situacao = situacao
    return salvar(sessao, agendamento)


def grade_do_dia(sessao: Session, barbeiro: Barbeiro, dia: date, duracao: int, ignorar_id: int | None = None) -> dict:
    """Os horários que a tela oferece: de meia em meia hora dentro do expediente,
    marcando como ocupado o que bate com outro cliente ou que já passou."""
    expediente = _expediente(barbeiro, dia)
    if expediente is None:
        return {"trabalha": False}

    outros = _ocupados(sessao, dia, ignorar_id, barbeiro_id=barbeiro.id)
    almoco = almoco_no_dia(barbeiro, expediente)
    agora = _agora()
    entrada, saida = _minutos(expediente.entrada), _minutos(expediente.saida)

    horarios = []
    # só ofereço o que termina antes do barbeiro ir embora
    for inicio in range(entrada, saida - duracao + 1, PASSO_DA_GRADE):
        passou = datetime.combine(dia, _hora(inicio)) < agora
        no_almoco = almoco is not None and inicio < almoco[1] and almoco[0] < inicio + duracao
        livre = not passou and not no_almoco and _choque(inicio, inicio + duracao, outros, barbeiro.intervalo) is None
        horarios.append({"hora": _hora(inicio), "livre": livre})

    return {"trabalha": True, "entrada": expediente.entrada, "saida": expediente.saida, "horarios": horarios}


def ocupacao_do_mes(sessao: Session, ano: int, mes: int) -> list[dict]:
    """Quanto da casa está tomado em cada dia do mês, pras barrinhas do calendário da agenda.

    A conta é: minutos de serviço marcados / minutos de expediente da equipe naquele dia.
    Conto só o tempo de cadeira (sem a limpeza), que é o que a recepção pensa quando
    fala "o sábado está 80% cheio". O almoço sai do total, porque nele ninguém atende.
    """
    equipe = list(sessao.scalars(select(Barbeiro).where(Barbeiro.ativo.is_(True))))
    # quantos minutos a equipe trabalha em cada dia da semana (seg, ter...)
    def minutos_de_trabalho(barbeiro: Barbeiro, h: HorarioBarbeiro) -> int:
        almoco = almoco_no_dia(barbeiro, h)
        return _minutos(h.saida) - _minutos(h.entrada) - (almoco[1] - almoco[0] if almoco else 0)

    capacidade = {
        sigla: sum(minutos_de_trabalho(b, h) for b in equipe for h in b.horarios if h.dia == sigla)
        for sigla in ORDEM_DOS_DIAS
    }

    dias_no_mes = monthrange(ano, mes)[1]
    primeiro, ultimo = date(ano, mes, 1), date(ano, mes, dias_no_mes)
    marcados = sessao.scalars(
        select(Agendamento).where(
            Agendamento.data.between(primeiro, ultimo), Agendamento.situacao.in_(OCUPAM_A_CADEIRA)
        )
    )
    usado: dict[date, int] = {}
    for agendamento in marcados:
        minutos = _minutos(agendamento.fim) - _minutos(agendamento.inicio)
        usado[agendamento.data] = usado.get(agendamento.data, 0) + minutos

    resposta = []
    for numero in range(1, dias_no_mes + 1):
        dia = date(ano, mes, numero)
        total = capacidade[ORDEM_DOS_DIAS[dia.weekday()]]
        # min(100): barbeiro desligado com cliente marcado conta no usado mas não no total
        ocupacao = min(100, round(100 * usado.get(dia, 0) / total)) if total else 0
        resposta.append({"data": dia, "trabalha": total > 0, "ocupacao": ocupacao})
    return resposta
