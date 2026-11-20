"""Coloca alguns clientes, barbeiros e serviços de exemplo no banco, só pra tela não abrir vazia.

Rodar com:  python popular_banco.py
"""

from datetime import date, time, timedelta

from sqlalchemy import select

from app.core.database import Base, SessaoLocal, engine
from app.crud import barbeiro as crud_barbeiro
from app.crud import cliente as crud
from app.crud import servico as crud_servico
from app.crud.agendamento import almoco_no_dia
from app.models.agendamento import Agendamento, ItemDoAgendamento
from app.models.barbeiro import Barbeiro
from app.models.cliente import Cliente
from app.models.servico import Servico
from app.schemas.barbeiro import ORDEM_DOS_DIAS, BarbeiroCriar
from app.schemas.cliente import ClienteCriar
from app.schemas.servico import ServicoCriar

EXEMPLOS = [
    {
        "nome": "Rita Camargo", "apelido": "Rita", "telefone": "(11) 98888-7777",
        "cpf": "168.995.350-09", "email": "rita@email.com", "data_nascimento": "1988-03-12",
        "barbeiro_preferido": "Seu Alfredo", "origem": "Indicação",
        "observacoes": "Sempre marca no fim da tarde.",
    },
    {
        "nome": "Marcos Vieira", "telefone": "(11) 97777-6666", "cpf": "111.444.777-35",
        "email": "marcos@email.com", "barbeiro_preferido": "Tião da Navalha",
        "origem": "Instagram",
    },
    {
        "nome": "Joana Prado", "apelido": "Jô", "telefone": "(21) 96666-5555",
        "cpf": "529.982.247-25", "data_nascimento": "1995-11-30",
        "origem": "Passou na porta", "observacoes": "Máquina 2 nas laterais.",
    },
]

# a equipe da casa. Os apelidos batem com o "barbeiro preferido" dos clientes acima.
# o almoço (etapa 3) vale pra semana toda; no sábado curto do Seu Alfredo ele não conta.
def _semana(dias, entrada="09:00", saida="19:00", sabado=None):
    """Monta a lista de horários; o sábado pode ter um horário diferente dos outros dias."""
    horarios = []
    for dia in dias:
        fim = sabado if dia == "sab" and sabado else saida
        horarios.append({"dia": dia, "entrada": entrada, "saida": fim})
    return horarios


EQUIPE = [
    {
        "nome": "Alfredo Bastos", "apelido": "Seu Alfredo", "telefone": "(11) 3333-1962",
        "cpf": "390.533.447-05", "email": "alfredo@domalfredo.com", "data_admissao": "1985-02-01",
        "especialidades": ["Corte clássico", "Barba na navalha", "Toalha quente"],
        "comissao": 100, "intervalo": 10, "cor_agenda": "terracota", "almoco": "12:00",
        "horarios": _semana(["ter", "qua", "qui", "sex", "sab"], "08:00", "17:00", sabado="13:00"),
        "observacoes": "Dono da casa. Não atende depois das 17h.",
    },
    {
        "nome": "Sebastião Ramos", "apelido": "Tião da Navalha", "telefone": "(11) 98123-4567",
        "cpf": "853.513.468-93", "data_admissao": "2019-03-01",
        "especialidades": ["Barba na navalha", "Toalha quente", "Degradê"],
        "comissao": 45, "intervalo": 5, "cor_agenda": "oliva", "almoco": "12:30",
        "horarios": _semana(["ter", "qua", "qui", "sex", "sab"], sabado="17:00"),
    },
    {
        "nome": "Marcos Antunes", "telefone": "(11) 97654-3210", "cpf": "067.425.950-51",
        "data_admissao": "2023-08-14", "especialidades": ["Corte clássico", "Degradê", "Pigmentação"],
        "comissao": 40, "intervalo": 5, "cor_agenda": "latao", "almoco": "14:00",
        "horarios": _semana(["seg", "ter", "qua", "qui", "sex"], "10:00", "20:00"),
    },
    {
        "nome": "Roberto Lima", "apelido": "Beto", "telefone": "(11) 96543-2109",
        "cpf": "761.729.530-87", "data_admissao": "2021-05-03",
        "especialidades": ["Corte clássico", "Infantil"],
        "comissao": 40, "intervalo": 15, "cor_agenda": "petroleo", "almoco": "12:00", "almoco_duracao": 45,
        "horarios": _semana(["qua", "qui", "sex", "sab", "dom"], "09:00", "18:00", sabado="16:00"),
    },
]

# o cardápio da casa (etapa 3), com os tempos e preços do protótipo
CARDAPIO = [
    {"nome": "Corte clássico", "descricao": "Tesoura e máquina, lavagem e finalização", "duracao": 45, "preco": "55.00"},
    {"nome": "Degradê", "descricao": "Laterais na máquina, topo na tesoura", "duracao": 45, "preco": "60.00"},
    {"nome": "Barba na navalha", "descricao": "Toalha quente, espuma e loção pós-barba", "duracao": 30, "preco": "45.00"},
    {"nome": "Pigmentação", "descricao": "Barba ou contorno do cabelo", "duracao": 20, "preco": "40.00"},
    {"nome": "Corte infantil", "descricao": "Até 12 anos", "duracao": 30, "preco": "40.00"},
]

# o que cada atendimento de exemplo leva: posições no cardápio (0 = primeiro serviço ativo...)
COMBOS = [(0,), (0, 2), (1,), (2,), (1, 2), (3,), (4,), (0, 3)]
QUANTOS_CONCLUIDOS = 15
QUANTAS_FALTAS = 2


def _dias_uteis_passados(hoje):
    """Seg a sáb do mês anterior e do corrente, só os que já passaram (antes de hoje)."""
    primeiro_do_mes = hoje.replace(day=1)
    dia = (primeiro_do_mes - timedelta(days=1)).replace(day=1)
    dias = []
    while dia < hoje:
        if dia.weekday() < 6:
            dias.append(dia)
        dia += timedelta(days=1)
    return dias


def _atendimentos_de_exemplo(sessao):
    """Grava atendimentos antigos (concluídos e umas faltas) pro histórico não abrir vazio.

    Vai direto no modelo porque o crud.criar recusa horário que já passou.
    """
    if sessao.scalars(select(Agendamento).where(Agendamento.situacao == "concluido").limit(1)).first():
        print("- Atendimentos de exemplo já estavam lá, pulei.")
        return

    clientes = list(sessao.scalars(select(Cliente).order_by(Cliente.id)))
    barbeiros = list(sessao.scalars(select(Barbeiro).where(Barbeiro.ativo).order_by(Barbeiro.id)))
    servicos = list(sessao.scalars(select(Servico).where(Servico.ativo).order_by(Servico.id)))
    dias = _dias_uteis_passados(date.today())
    if not (clientes and barbeiros and servicos and dias):
        print("- Sem cliente, barbeiro ou serviço pra montar atendimentos, pulei.")
        return

    ocupados = {}  # (barbeiro, dia) -> [(inicio, fim)] em minutos, pra ninguém atender dois ao mesmo tempo
    total = QUANTOS_CONCLUIDOS + QUANTAS_FALTAS
    for i in range(total):
        # as faltas ficam no meio da lista, misturadas com os concluídos
        situacao = "faltou" if i in (5, 11) else "concluido"
        itens = [servicos[n % len(servicos)] for n in COMBOS[i % len(COMBOS)]]
        itens = list(dict.fromkeys(itens))  # sem serviço repetido no mesmo agendamento
        duracao = sum(servico.duracao for servico in itens)

        marcado = False
        for tentativa in range(len(dias) * len(barbeiros)):
            passo = i * 3 + tentativa
            dia = dias[(passo * 5 + i) % len(dias)]
            barbeiro = barbeiros[(i + tentativa) % len(barbeiros)]
            expediente = next((h for h in barbeiro.horarios if h.dia == ORDEM_DOS_DIAS[dia.weekday()]), None)
            if expediente is None:
                continue
            entrada = expediente.entrada.hour * 60 + expediente.entrada.minute
            saida = expediente.saida.hour * 60 + expediente.saida.minute
            almoco = almoco_no_dia(barbeiro, expediente)
            livres = ocupados.setdefault((barbeiro.id, dia), [])
            # varre de 15 em 15 min a partir de um ponto do dia que varia, achando o primeiro buraco
            largura = max(saida - entrada, 15)
            for deslocamento in range(0, largura, 15):
                inicio = entrada + (i * 45 + deslocamento) % largura // 15 * 15
                fim = inicio + duracao
                if fim > saida:
                    continue
                if almoco and inicio < almoco[1] and almoco[0] < fim:
                    continue
                folga = barbeiro.intervalo
                if any(inicio < f + folga and o < fim + folga for o, f in livres):
                    continue
                livres.append((inicio, fim))
                agendamento = Agendamento(
                    cliente_id=clientes[i % len(clientes)].id,
                    barbeiro_id=barbeiro.id,
                    data=dia,
                    inicio=time(inicio // 60, inicio % 60),
                    fim=time(fim // 60, fim % 60),
                    situacao=situacao,
                    itens=[
                        ItemDoAgendamento(servico_id=s.id, duracao=s.duracao, preco=s.preco)
                        for s in itens
                    ],
                )
                sessao.add(agendamento)
                marcado = True
                break
            if marcado:
                break
        if not marcado:
            print(f"- Não achei horário pro atendimento {i + 1}, pulei.")

    sessao.commit()
    print(f"+ Atendimentos de exemplo gravados ({QUANTOS_CONCLUIDOS} concluídos e {QUANTAS_FALTAS} faltas).")


def main():
    Base.metadata.create_all(bind=engine)
    sessao = SessaoLocal()

    try:
        for exemplo in EXEMPLOS:
            dados = ClienteCriar(**exemplo)
            # se eu rodar o script duas vezes, pulo quem já está lá em vez de estourar erro
            if crud.buscar_por_telefone(sessao, dados.telefone):
                print(f"- {dados.nome} já estava cadastrado, pulei.")
                continue

            crud.criar(sessao, dados)
            print(f"+ {dados.nome} cadastrado.")

        for exemplo in EQUIPE:
            dados = BarbeiroCriar(**exemplo)
            _, ja_tem = crud_barbeiro.listar(sessao, busca=dados.telefone)
            if ja_tem:
                print(f"- {dados.nome} (barbeiro) já estava cadastrado, pulei.")
                continue

            crud_barbeiro.criar(sessao, dados)
            print(f"+ {dados.nome} (barbeiro) cadastrado.")

        for exemplo in CARDAPIO:
            dados = ServicoCriar(**exemplo)
            _, ja_tem = crud_servico.listar(sessao, busca=dados.nome)
            if any(servico.nome == dados.nome for servico in ja_tem):
                print(f"- {dados.nome} (serviço) já estava cadastrado, pulei.")
                continue

            crud_servico.criar(sessao, dados)
            print(f"+ {dados.nome} (serviço) cadastrado.")

        _atendimentos_de_exemplo(sessao)
    finally:
        sessao.close()

    print("\nPronto! Abre http://localhost:3020 pra ver.")


if __name__ == "__main__":
    main()
