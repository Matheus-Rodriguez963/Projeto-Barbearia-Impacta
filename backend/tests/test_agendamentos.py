"""Testes da agenda (etapa 3): marcar, as regras de horário, listar e remarcar.

O barbeiro_valido trabalha de terça a sexta das 9 às 19, sábado até as 17, folga
domingo e segunda, e tem 10 minutos de intervalo entre um cliente e outro.
"""

from datetime import date, timedelta

import pytest

ROTA = "/api/agendamentos"
DIAS = ["seg", "ter", "qua", "qui", "sex", "sab", "dom"]


def proxima(dia: str) -> str:
    """A próxima terça (ou o dia pedido) a partir de amanhã, no formato da API."""
    amanha = date.today() + timedelta(days=1)
    falta = (DIAS.index(dia) - amanha.weekday()) % 7
    return (amanha + timedelta(days=falta)).isoformat()


@pytest.fixture
def cenario(cliente_api, ficha_valida, barbeiro_valido, servico_valido):
    """Um cliente, um barbeiro e um serviço de 45 minutos já cadastrados."""
    barbeiro_valido["cpf"] = "168.995.350-09"  # o cliente já usa o 529.982.247-25
    return {
        "cliente_id": cliente_api.post("/api/clientes", json=ficha_valida).json()["id"],
        "barbeiro_id": cliente_api.post("/api/barbeiros", json=barbeiro_valido).json()["id"],
        "servico_id": cliente_api.post("/api/servicos", json=servico_valido).json()["id"],
    }


def marcar(cliente_api, cenario, hora="14:00", dia="ter", **extra):
    return cliente_api.post(ROTA, json={**cenario, "data": proxima(dia), "hora": hora, **extra})


# ---------------------------------------------------------------- marcar

def test_marca_e_liga_cliente_barbeiro_e_servico(cliente_api, cenario):
    resposta = marcar(cliente_api, cenario, observacoes="Quer manter o topete.")
    assert resposta.status_code == 201

    dados = resposta.json()
    assert dados["status"] == "agendado"
    assert dados["cliente"]["nome"] == "Pablo Miguel Dias"
    assert dados["barbeiro"]["nome_de_chamada"] == "Tião da Navalha"
    assert dados["barbeiro"]["cor_agenda"] == "oliva"
    assert dados["servico"]["nome"] == "Corte clássico"
    assert dados["hora"] == "14:00:00"
    assert dados["hora_fim"] == "14:45:00"


def test_guarda_o_preco_do_dia_em_que_marcou(cliente_api, cenario):
    agendamento = marcar(cliente_api, cenario).json()

    # o corte subiu depois de marcado: o que já estava combinado não muda
    cliente_api.put(f"/api/servicos/{cenario['servico_id']}", json={"preco": 70})
    assert cliente_api.get(f"{ROTA}/{agendamento['id']}").json()["preco"] == 50.0


def test_nao_marca_em_data_que_ja_passou(cliente_api, cenario):
    ontem = (date.today() - timedelta(days=1)).isoformat()
    resposta = cliente_api.post(ROTA, json={**cenario, "data": ontem, "hora": "10:00"})

    assert resposta.status_code == 409
    assert resposta.json()["campo"] == "data"


def test_nao_marca_na_folga_do_barbeiro(cliente_api, cenario):
    resposta = marcar(cliente_api, cenario, dia="seg")

    assert resposta.status_code == 409
    assert resposta.json()["campo"] == "data"
    assert "segunda" in resposta.json()["detail"]


def test_servico_tem_que_caber_no_expediente(cliente_api, cenario):
    # no sábado ele sai às 17h; um corte de 45 min às 16:30 passaria do horário
    resposta = marcar(cliente_api, cenario, hora="16:30", dia="sab")

    assert resposta.status_code == 409
    assert resposta.json()["campo"] == "hora"
    assert marcar(cliente_api, cenario, hora="16:15", dia="sab").status_code == 201


def test_nao_marca_antes_do_barbeiro_chegar(cliente_api, cenario):
    assert marcar(cliente_api, cenario, hora="08:30").status_code == 409


def test_recusa_hora_quebrada(cliente_api, cenario):
    resposta = marcar(cliente_api, cenario, hora="14:07")
    assert resposta.status_code == 422
    assert resposta.json()["erros"][0]["campo"] == "hora"


def test_nao_marca_dois_clientes_no_mesmo_horario(cliente_api, cenario):
    marcar(cliente_api, cenario, hora="14:00")
    outro = cliente_api.post(
        "/api/clientes", json={"nome": "Rita Camargo", "telefone": "(11) 98888-7777", "cpf": "111.444.777-35"}
    ).json()

    resposta = marcar(cliente_api, {**cenario, "cliente_id": outro["id"]}, hora="14:30")
    assert resposta.status_code == 409
    assert "14:00 às 14:45" in resposta.json()["detail"]


def test_respeita_o_intervalo_do_barbeiro(cliente_api, cenario):
    # o corte acaba 14:45 e o Tião tem 10 min de intervalo: 14:50 ainda não dá, 14:55 dá
    marcar(cliente_api, cenario, hora="14:00")
    outro = cliente_api.post(
        "/api/clientes", json={"nome": "Rita Camargo", "telefone": "(11) 98888-7777", "cpf": "111.444.777-35"}
    ).json()
    cenario_outro = {**cenario, "cliente_id": outro["id"]}

    assert marcar(cliente_api, cenario_outro, hora="14:50").status_code == 409
    assert marcar(cliente_api, cenario_outro, hora="14:55").status_code == 201


def test_cliente_nao_fica_em_duas_cadeiras(cliente_api, cenario, barbeiro_valido):
    marcar(cliente_api, cenario, hora="14:00")
    barbeiro_valido.update(nome="Roberto Lima", apelido="Beto", telefone="(11) 96543-2109",
                           cpf="111.444.777-35", email=None)
    outro_barbeiro = cliente_api.post("/api/barbeiros", json=barbeiro_valido).json()

    resposta = marcar(cliente_api, {**cenario, "barbeiro_id": outro_barbeiro["id"]}, hora="14:15")
    assert resposta.status_code == 409
    assert "cliente já tem horário" in resposta.json()["detail"]


def test_cancelado_libera_o_horario(cliente_api, cenario):
    agendamento = marcar(cliente_api, cenario, hora="14:00").json()
    cliente_api.put(f"{ROTA}/{agendamento['id']}", json={"status": "cancelado"})

    assert marcar(cliente_api, cenario, hora="14:00").status_code == 201


def test_nao_marca_com_barbeiro_fora_da_agenda(cliente_api, cenario):
    cliente_api.put(f"/api/barbeiros/{cenario['barbeiro_id']}", json={"ativo": False})

    resposta = marcar(cliente_api, cenario)
    assert resposta.status_code == 409
    assert resposta.json()["campo"] == "barbeiro_id"


def test_nao_marca_servico_fora_do_cardapio(cliente_api, cenario):
    cliente_api.put(f"/api/servicos/{cenario['servico_id']}", json={"ativo": False})

    resposta = marcar(cliente_api, cenario)
    assert resposta.status_code == 409
    assert resposta.json()["campo"] == "servico_id"


def test_cliente_que_nao_existe(cliente_api, cenario):
    resposta = marcar(cliente_api, {**cenario, "cliente_id": 999})
    assert resposta.status_code == 409
    assert resposta.json()["campo"] == "cliente_id"


# ---------------------------------------------------------------- horários livres

def test_horarios_livres_pulam_o_que_esta_ocupado(cliente_api, cenario):
    marcar(cliente_api, cenario, hora="10:00")  # ocupa 10:00–10:45, +10 de intervalo

    resposta = cliente_api.get(
        f"{ROTA}/horarios-livres",
        params={"barbeiro_id": cenario["barbeiro_id"], "servico_id": cenario["servico_id"], "data": proxima("ter")},
    )
    horarios = resposta.json()["horarios"]

    assert "09:00" in horarios
    assert "09:15" not in horarios  # 09:15 + 45 = 10:00, mais 10 de intervalo bateria no das 10h
    assert "10:00" not in horarios and "10:45" not in horarios
    assert "11:00" in horarios
    assert horarios[-1] == "18:15"  # o último corte que ainda acaba até as 19h


def test_horarios_livres_explicam_a_folga(cliente_api, cenario):
    dados = cliente_api.get(
        f"{ROTA}/horarios-livres",
        params={"barbeiro_id": cenario["barbeiro_id"], "servico_id": cenario["servico_id"], "data": proxima("dom")},
    ).json()

    assert dados["horarios"] == []
    assert "domingo" in dados["motivo"]


# ---------------------------------------------------------------- agenda

def test_lista_a_agenda_do_dia_na_ordem_da_hora(cliente_api, cenario):
    marcar(cliente_api, cenario, hora="16:00")
    marcar(cliente_api, cenario, hora="09:00")
    marcar(cliente_api, cenario, hora="12:00", dia="qua")

    dados = cliente_api.get(ROTA, params={"de": proxima("ter"), "ate": proxima("ter")}).json()
    assert dados["total"] == 2
    assert [a["hora"] for a in dados["itens"]] == ["09:00:00", "16:00:00"]


def test_filtra_a_agenda_pelo_barbeiro_e_pelo_status(cliente_api, cenario):
    agendamento = marcar(cliente_api, cenario, hora="09:00").json()
    marcar(cliente_api, cenario, hora="11:00")
    cliente_api.put(f"{ROTA}/{agendamento['id']}", json={"status": "concluido"})

    dados = cliente_api.get(ROTA, params={"barbeiro_id": cenario["barbeiro_id"], "status": "agendado"}).json()
    assert [a["hora"] for a in dados["itens"]] == ["11:00:00"]
    assert cliente_api.get(ROTA, params={"barbeiro_id": 999}).json()["total"] == 0


# ---------------------------------------------------------------- remarcar e status

def test_remarca_pra_outro_horario(cliente_api, cenario):
    agendamento = marcar(cliente_api, cenario, hora="14:00").json()

    # 14:15 batia com ele mesmo, mas na remarcação o próprio horário não conta
    resposta = cliente_api.put(f"{ROTA}/{agendamento['id']}", json={"hora": "14:15"})
    assert resposta.status_code == 200
    assert resposta.json()["hora"] == "14:15:00"


def test_remarcar_pra_folga_e_recusado(cliente_api, cenario):
    agendamento = marcar(cliente_api, cenario).json()

    resposta = cliente_api.put(f"{ROTA}/{agendamento['id']}", json={"data": proxima("seg")})
    assert resposta.status_code == 409


def test_trocar_o_servico_atualiza_tempo_e_preco(cliente_api, cenario):
    agendamento = marcar(cliente_api, cenario).json()
    barba = cliente_api.post("/api/servicos", json={"nome": "Barba", "duracao": 30, "preco": 35}).json()

    dados = cliente_api.put(f"{ROTA}/{agendamento['id']}", json={"servico_id": barba["id"]}).json()
    assert dados["servico"]["nome"] == "Barba"
    assert dados["duracao"] == 30
    assert dados["preco"] == 35.0


def test_recusa_status_que_nao_existe(cliente_api, cenario):
    agendamento = marcar(cliente_api, cenario).json()
    resposta = cliente_api.put(f"{ROTA}/{agendamento['id']}", json={"status": "sumiu"})
    assert resposta.status_code == 422


# ---------------------------------------------------------------- excluir

def test_nao_exclui_cliente_barbeiro_ou_servico_com_agendamento(cliente_api, cenario):
    marcar(cliente_api, cenario)

    for rota, chave in [("clientes", "cliente_id"), ("barbeiros", "barbeiro_id"), ("servicos", "servico_id")]:
        resposta = cliente_api.delete(f"/api/{rota}/{cenario[chave]}")
        assert resposta.status_code == 409
        assert "agendamentos" in resposta.json()["detail"]


def test_exclui_o_agendamento(cliente_api, cenario):
    agendamento = marcar(cliente_api, cenario).json()

    assert cliente_api.delete(f"{ROTA}/{agendamento['id']}").status_code == 204
    assert cliente_api.get(f"{ROTA}/{agendamento['id']}").status_code == 404
    # sem agendamento, o cliente já pode ser excluído
    assert cliente_api.delete(f"/api/clientes/{cenario['cliente_id']}").status_code == 204
