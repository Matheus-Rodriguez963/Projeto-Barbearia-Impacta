"""Coloca clientes, barbeiros, serviços e alguns horários de exemplo no banco, só pra tela não abrir vazia.

Rodar com:  python popular_banco.py
"""

from datetime import date, time, timedelta

from app.core.database import Base, SessaoLocal, engine
from app.core.erros import RegraDaAgenda
from app.crud import agendamento as crud_agendamento
from app.crud import barbeiro as crud_barbeiro
from app.crud import cliente as crud
from app.crud import servico as crud_servico
from app.schemas.agendamento import AgendamentoCriar
from app.schemas.barbeiro import BarbeiroCriar
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
        "comissao": 100, "intervalo": 10, "cor_agenda": "terracota",
        "horarios": _semana(["ter", "qua", "qui", "sex", "sab"], "08:00", "17:00", sabado="13:00"),
        "observacoes": "Dono da casa. Não atende depois das 17h.",
    },
    {
        "nome": "Sebastião Ramos", "apelido": "Tião da Navalha", "telefone": "(11) 98123-4567",
        "cpf": "853.513.468-93", "data_admissao": "2019-03-01",
        "especialidades": ["Barba na navalha", "Toalha quente", "Degradê"],
        "comissao": 45, "intervalo": 5, "cor_agenda": "oliva",
        "horarios": _semana(["ter", "qua", "qui", "sex", "sab"], sabado="17:00"),
    },
    {
        "nome": "Marcos Antunes", "telefone": "(11) 97654-3210", "cpf": "067.425.950-51",
        "data_admissao": "2023-08-14", "especialidades": ["Corte clássico", "Degradê", "Pigmentação"],
        "comissao": 40, "intervalo": 5, "cor_agenda": "latao",
        "horarios": _semana(["seg", "ter", "qua", "qui", "sex"], "10:00", "20:00"),
    },
    {
        "nome": "Roberto Lima", "apelido": "Beto", "telefone": "(11) 96543-2109",
        "cpf": "761.729.530-87", "data_admissao": "2021-05-03",
        "especialidades": ["Corte clássico", "Infantil"],
        "comissao": 40, "intervalo": 15, "cor_agenda": "petroleo",
        "horarios": _semana(["qua", "qui", "sex", "sab", "dom"], "09:00", "18:00", sabado="16:00"),
    },
]

# o cardápio da casa (etapa 3)
CARDAPIO = [
    {"nome": "Barba", "duracao": 30, "preco": 35,
     "descricao": "Barba na navalha com toalha quente e balm."},
    {"nome": "Corte clássico", "duracao": 45, "preco": 50,
     "descricao": "Tesoura e máquina, com acabamento na navalha."},
    {"nome": "Limpeza de pele", "duracao": 40, "preco": 55,
     "descricao": "Esfoliação, extração e máscara de argila."},
    {"nome": "Barboterapia", "duracao": 50, "preco": 65,
     "descricao": "Barba com vapor de ozônio, óleos e massagem facial."},
    {"nome": "Corte com barba", "duracao": 75, "preco": 80,
     "descricao": "O corte clássico e a barba completa na mesma cadeira."},
]

# alguns horários nos próximos dias: (dias a partir de hoje, hora, telefone do cliente, telefone do barbeiro, serviço)
HORARIOS = [
    (1, "09:00", "11988887777", "1133331962", "Corte clássico"),
    (1, "10:00", "11977776666", "11981234567", "Corte com barba"),
    (1, "14:30", "21966665555", "11976543210", "Limpeza de pele"),
    (2, "11:00", "11977776666", "11965432109", "Barba"),
    (2, "16:00", "11988887777", "11981234567", "Barboterapia"),
    (3, "15:00", "21966665555", "1133331962", "Corte clássico"),
]


def _marcar_exemplos(sessao):
    """Marca os HORARIOS. Se cair na folga de alguém, tenta o dia seguinte (a semana muda a cada execução)."""
    _, ja_tem = crud_agendamento.listar(sessao, de=date.today(), tamanho=1)
    if ja_tem:
        print("- a agenda já tem horários, pulei os exemplos.")
        return

    servicos = {s.nome: s.id for s in crud_servico.listar(sessao)[1]}
    for dias, hora, tel_cliente, tel_barbeiro, servico in HORARIOS:
        cliente = crud.buscar_por_telefone(sessao, tel_cliente)
        _, barbeiros = crud_barbeiro.listar(sessao, busca=tel_barbeiro)
        if not cliente or not barbeiros:
            continue

        for tentativa in range(7):
            dados = AgendamentoCriar(
                cliente_id=cliente.id, barbeiro_id=barbeiros[0].id, servico_id=servicos[servico],
                data=date.today() + timedelta(days=dias + tentativa), hora=time.fromisoformat(hora),
            )
            try:
                crud_agendamento.criar(sessao, dados)
                print(f"+ {cliente.nome} com {barbeiros[0].nome} em {dados.data:%d/%m} às {hora}.")
                break
            except RegraDaAgenda:
                continue


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
            if any(s.nome.lower() == dados.nome.lower() for s in ja_tem):
                print(f"- {dados.nome} (serviço) já estava cadastrado, pulei.")
                continue

            crud_servico.criar(sessao, dados)
            print(f"+ {dados.nome} (serviço) cadastrado.")

        _marcar_exemplos(sessao)
    finally:
        sessao.close()

    print("\nPronto! Abre http://localhost:3020 pra ver.")


if __name__ == "__main__":
    main()
