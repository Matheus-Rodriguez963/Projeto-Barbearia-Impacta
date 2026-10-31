"""Testes da agenda (etapa 3).

A agenda depende da hora: "esse horário já passou" muda conforme o dia em que o teste
roda. Pra não ter teste que passa hoje e quebra semana que vem, eu travo o relógio da
agenda numa segunda-feira de 2029 e marco tudo na semana seguinte.
"""

from datetime import datetime

import pytest

from app.crud import agendamento as crud_agendamento

ROTA = "/api/agendamentos"

SEGUNDA_ANTES = datetime(2029, 12, 31, 8, 0)  # é o "agora" dos testes
TERCA = "2030-01-01"
SABADO = "2030-01-05"
SEGUNDA = "2030-01-07"  # folga do barbeiro do conftest


@pytest.fixture
def relogio(monkeypatch):
    """Trava o agora da agenda. Devolve uma função pra adiantar o relógio no meio do teste."""

    def acertar(momento: datetime):
        monkeypatch.setattr(crud_agendamento, "_agora", lambda: momento)

    acertar(SEGUNDA_ANTES)
    return acertar


@pytest.fixture
def casa(cliente_api, relogio, ficha_valida, barbeiro_valido, servico_valido):
    """Monta o mínimo pra marcar: um cliente, o Tião (ter a sáb, 10 min de limpeza),
    o corte (45 min) e a barba (30 min). Devolve os ids."""
    barbeiro_valido["cpf"] = "853.513.468-93"  # o do conftest é o mesmo do cliente
    cliente = cliente_api.post("/api/clientes", json=ficha_valida).json()
    barbeiro = cliente_api.post("/api/barbeiros", json=barbeiro_valido).json()
    corte = cliente_api.post("/api/servicos", json=servico_valido).json()
    barba = cliente_api.post(
        "/api/servicos", json={"nome": "Barba na navalha", "duracao": 30, "preco": "45.00"}
    ).json()
    return {"cliente": cliente["id"], "barbeiro": barbeiro["id"], "corte": corte["id"], "barba": barba["id"]}


def _pedido(casa, inicio="09:00", data=TERCA, servicos=None, **outros):
    return {
        "cliente_id": casa["cliente"],
        "barbeiro_id": casa["barbeiro"],
        "servicos": servicos if servicos is not None else [casa["corte"]],
        "data": data,
        "inicio": inicio,
        **outros,
    }


def _outro_cliente(cliente_api, nome="Rita Camargo", telefone="(11) 98888-7777", cpf="168.995.350-09"):
    return cliente_api.post("/api/clientes", json={"nome": nome, "telefone": telefone, "cpf": cpf}).json()["id"]


# ---------------------------------------------------------------- marcar

def test_marca_e_calcula_o_fim_e_o_total(cliente_api, casa):
    resposta = cliente_api.post(ROTA, json=_pedido(casa, servicos=[casa["corte"], casa["barba"]]))
    assert resposta.status_code == 201

    dados = resposta.json()
    assert dados["situacao"] == "agendado"
    assert dados["inicio"] == "09:00:00"
    assert dados["fim"] == "10:15:00"  # 45 + 30 min
    assert dados["duracao"] == 75
    assert dados["total"] == 100.0
    assert [s["nome"] for s in dados["servicos"]] == ["Corte clássico", "Barba na navalha"]
    assert dados["cliente"]["telefone_formatado"] == "(11) 99000-1234"
    assert dados["barbeiro"]["nome_de_chamada"] == "Tião da Navalha"


def test_guarda_o_preco_do_dia_em_que_marcou(cliente_api, casa):
    marcado = cliente_api.post(ROTA, json=_pedido(casa)).json()
    cliente_api.put(f"/api/servicos/{casa['corte']}", json={"preco": 70, "duracao": 60})

    dados = cliente_api.get(f"{ROTA}/{marcado['id']}").json()
    assert dados["total"] == 55.0
    assert dados["fim"] == "09:45:00"


def test_servico_repetido_conta_uma_vez(cliente_api, casa):
    dados = cliente_api.post(ROTA, json=_pedido(casa, servicos=[casa["corte"], casa["corte"]])).json()
    assert dados["duracao"] == 45


def test_recusa_sem_servico_e_horario_quebrado(cliente_api, casa):
    assert cliente_api.post(ROTA, json=_pedido(casa, servicos=[])).json()["erros"][0]["campo"] == "servicos"
    assert cliente_api.post(ROTA, json=_pedido(casa, inicio="09:07")).json()["erros"][0]["campo"] == "inicio"


def test_recusa_cliente_que_nao_existe(cliente_api, casa):
    resposta = cliente_api.post(ROTA, json=_pedido(casa, cliente_id=999))
    assert resposta.status_code == 409
    assert resposta.json()["campo"] == "cliente_id"


def test_recusa_barbeiro_fora_da_agenda(cliente_api, casa):
    cliente_api.put(f"/api/barbeiros/{casa['barbeiro']}", json={"ativo": False})

    resposta = cliente_api.post(ROTA, json=_pedido(casa))
    assert resposta.status_code == 409
    assert resposta.json()["campo"] == "barbeiro_id"


def test_recusa_servico_que_saiu_do_cardapio(cliente_api, casa):
    cliente_api.put(f"/api/servicos/{casa['barba']}", json={"ativo": False})

    resposta = cliente_api.post(ROTA, json=_pedido(casa, servicos=[casa["corte"], casa["barba"]]))
    assert resposta.status_code == 409
    assert resposta.json()["campo"] == "servicos"


def test_recusa_horario_que_ja_passou(cliente_api, casa, relogio):
    relogio(datetime(2030, 1, 1, 9, 30))

    resposta = cliente_api.post(ROTA, json=_pedido(casa, inicio="09:00"))
    assert resposta.status_code == 409
    assert resposta.json()["detail"] == "Esse horário já passou."


def test_recusa_dia_de_folga_e_diz_qual_dia(cliente_api, casa):
    resposta = cliente_api.post(ROTA, json=_pedido(casa, data=SEGUNDA))
    assert resposta.status_code == 409
    assert resposta.json()["campo"] == "data"
    assert "segunda" in resposta.json()["detail"]


def test_recusa_antes_da_entrada_e_servico_que_passa_da_saida(cliente_api, casa):
    assert cliente_api.post(ROTA, json=_pedido(casa, inicio="08:30")).status_code == 409
    # no sábado ele sai às 17h: corte de 45 min às 16:30 não cabe, às 16:15 cabe certinho
    assert cliente_api.post(ROTA, json=_pedido(casa, data=SABADO, inicio="16:30")).status_code == 409
    assert cliente_api.post(ROTA, json=_pedido(casa, data=SABADO, inicio="16:15")).status_code == 201


def test_respeita_o_intervalo_de_limpeza_do_barbeiro(cliente_api, casa):
    cliente_api.post(ROTA, json=_pedido(casa, inicio="09:00"))  # corte até 9:45, limpa até 9:55
    rita = _outro_cliente(cliente_api)

    resposta = cliente_api.post(ROTA, json=_pedido(casa, inicio="09:50", cliente_id=rita))
    assert resposta.status_code == 409
    assert "09:00 às 09:45 (mais 10 min de limpeza)" in resposta.json()["detail"]

    assert cliente_api.post(ROTA, json=_pedido(casa, inicio="09:55", cliente_id=rita)).status_code == 201


def test_nao_deixa_marcar_antes_de_um_cliente_sem_dar_tempo_da_limpeza(cliente_api, casa):
    cliente_api.post(ROTA, json=_pedido(casa, inicio="10:00"))
    rita = _outro_cliente(cliente_api)
    # 9:10 + 45 min = 9:55, mais 10 de limpeza = 10:05: invade o cliente das 10h
    assert cliente_api.post(ROTA, json=_pedido(casa, inicio="09:10", cliente_id=rita)).status_code == 409
    # 9:05 + 45 min = 9:50, mais 10 de limpeza = 10:00: cabe certinho
    assert cliente_api.post(ROTA, json=_pedido(casa, inicio="09:05", cliente_id=rita)).status_code == 201


def test_cliente_nao_fica_em_duas_cadeiras_ao_mesmo_tempo(cliente_api, casa, barbeiro_valido):
    outro = cliente_api.post(
        "/api/barbeiros",
        json={**barbeiro_valido, "nome": "Marcos Antunes", "apelido": None, "email": None,
              "telefone": "(11) 97654-3210", "cpf": "067.425.950-51"},
    ).json()
    cliente_api.post(ROTA, json=_pedido(casa, inicio="09:00"))

    resposta = cliente_api.post(ROTA, json=_pedido(casa, inicio="09:30", barbeiro_id=outro["id"]))
    assert resposta.status_code == 409
    assert "Esse cliente já está marcado às 09:00" in resposta.json()["detail"]


def test_horario_cancelado_fica_livre_de_novo(cliente_api, casa):
    marcado = cliente_api.post(ROTA, json=_pedido(casa)).json()
    cliente_api.put(f"{ROTA}/{marcado['id']}/situacao", json={"situacao": "cancelado"})

    rita = _outro_cliente(cliente_api)
    assert cliente_api.post(ROTA, json=_pedido(casa, cliente_id=rita)).status_code == 201


# ---------------------------------------------------------------- almoço

def _com_almoco(cliente_api, casa, almoco="12:00", duracao=60):
    cliente_api.put(f"/api/barbeiros/{casa['barbeiro']}", json={"almoco": almoco, "almoco_duracao": duracao})


def test_nao_marca_no_almoco_do_barbeiro(cliente_api, casa):
    _com_almoco(cliente_api, casa)
    # corte de 45 min às 11:30 invadiria o almoço do meio-dia
    resposta = cliente_api.post(ROTA, json=_pedido(casa, inicio="11:30"))
    assert resposta.status_code == 409
    assert resposta.json()["detail"] == "Tião da Navalha almoça das 12:00 às 13:00."

    assert cliente_api.post(ROTA, json=_pedido(casa, inicio="13:00")).status_code == 201


def test_grade_nao_oferece_o_almoco(cliente_api, casa):
    _com_almoco(cliente_api, casa, "12:00", 30)
    grade = cliente_api.get(
        f"{ROTA}/horarios", params={"barbeiro_id": casa["barbeiro"], "data": TERCA, "duracao": 45}
    ).json()
    ocupados = [h["hora"] for h in grade["horarios"] if not h["livre"]]
    assert ocupados == ["11:30:00", "12:00:00"]


def test_dia_que_fecha_antes_do_fim_do_almoco_fica_sem_almoco(cliente_api, casa):
    # sábado ele sai às 17h; com almoço às 16:30 de 30 min não sobra trabalho depois, então não vale
    _com_almoco(cliente_api, casa, "16:30", 30)
    assert cliente_api.post(ROTA, json=_pedido(casa, data=SABADO, inicio="16:15")).status_code == 201


def test_almoco_sai_da_conta_da_ocupacao(cliente_api, casa):
    _com_almoco(cliente_api, casa)  # 600 min na terça - 60 de almoço = 540
    cliente_api.post(ROTA, json=_pedido(casa, servicos=[casa["corte"]]))  # 45 min = 8,3%
    dias = cliente_api.get(f"{ROTA}/ocupacao", params={"ano": 2030, "mes": 1}).json()
    assert next(d for d in dias if d["data"] == TERCA)["ocupacao"] == 8


# ---------------------------------------------------------------- agenda do dia e horários livres

def test_lista_o_dia_em_ordem_de_horario(cliente_api, casa):
    rita = _outro_cliente(cliente_api)
    cliente_api.post(ROTA, json=_pedido(casa, inicio="14:00"))
    cliente_api.post(ROTA, json=_pedido(casa, inicio="10:00", cliente_id=rita))
    cliente_api.post(ROTA, json=_pedido(casa, inicio="10:00", data=SABADO))

    dia = cliente_api.get(ROTA, params={"data": TERCA}).json()
    assert [a["inicio"] for a in dia] == ["10:00:00", "14:00:00"]


def test_grade_oferece_de_meia_em_meia_hora_dentro_do_expediente(cliente_api, casa):
    grade = cliente_api.get(
        f"{ROTA}/horarios", params={"barbeiro_id": casa["barbeiro"], "data": TERCA, "duracao": 45}
    ).json()

    horas = [h["hora"] for h in grade["horarios"]]
    assert grade["trabalha"] is True
    assert horas[0] == "09:00:00"
    assert horas[-1] == "18:00:00"  # 18:30 + 45 min passaria das 19h
    assert all(h["livre"] for h in grade["horarios"])


def test_grade_marca_ocupado_o_que_bate_com_outro_cliente(cliente_api, casa):
    cliente_api.post(ROTA, json=_pedido(casa, inicio="10:00"))  # 10:00 às 10:45 + 10 de limpeza

    grade = cliente_api.get(
        f"{ROTA}/horarios", params={"barbeiro_id": casa["barbeiro"], "data": TERCA, "duracao": 45}
    ).json()
    ocupados = [h["hora"] for h in grade["horarios"] if not h["livre"]]
    assert ocupados == ["09:30:00", "10:00:00", "10:30:00"]


def test_grade_no_dia_de_folga(cliente_api, casa):
    grade = cliente_api.get(
        f"{ROTA}/horarios", params={"barbeiro_id": casa["barbeiro"], "data": SEGUNDA, "duracao": 45}
    ).json()
    assert grade == {"trabalha": False, "entrada": None, "saida": None, "horarios": []}


def test_grade_de_hoje_nao_oferece_o_que_ja_passou(cliente_api, casa, relogio):
    relogio(datetime(2030, 1, 1, 12, 10))
    grade = cliente_api.get(
        f"{ROTA}/horarios", params={"barbeiro_id": casa["barbeiro"], "data": TERCA, "duracao": 45}
    ).json()
    primeiro_livre = next(h["hora"] for h in grade["horarios"] if h["livre"])
    assert primeiro_livre == "12:30:00"


def test_ocupacao_do_mes_para_o_calendario(cliente_api, casa):
    # o Tião trabalha 10h na terça (600 min). A barba (30 min) ocupa 5% disso
    cliente_api.post(ROTA, json=_pedido(casa, servicos=[casa["barba"]]))
    cancelado = cliente_api.post(ROTA, json=_pedido(casa, inicio="15:00")).json()
    cliente_api.put(f"{ROTA}/{cancelado['id']}/situacao", json={"situacao": "cancelado"})

    dias = cliente_api.get(f"{ROTA}/ocupacao", params={"ano": 2030, "mes": 1}).json()
    assert len(dias) == 31
    terca = next(d for d in dias if d["data"] == TERCA)
    segunda = next(d for d in dias if d["data"] == SEGUNDA)
    assert terca == {"data": TERCA, "trabalha": True, "ocupacao": 5}  # o cancelado não conta
    assert segunda == {"data": SEGUNDA, "trabalha": False, "ocupacao": 0}


def test_ocupacao_recusa_mes_que_nao_existe(cliente_api):
    assert cliente_api.get(f"{ROTA}/ocupacao", params={"ano": 2030, "mes": 13}).status_code == 422


# ---------------------------------------------------------------- remarcar

def test_remarca_trocando_horario_e_servicos(cliente_api, casa):
    marcado = cliente_api.post(ROTA, json=_pedido(casa, inicio="09:00")).json()

    resposta = cliente_api.put(
        f"{ROTA}/{marcado['id']}", json=_pedido(casa, inicio="15:00", servicos=[casa["barba"]])
    )
    assert resposta.status_code == 200
    assert resposta.json()["fim"] == "15:30:00"
    assert resposta.json()["total"] == 45.0


def test_remarcar_no_mesmo_horario_nao_bate_com_ele_mesmo(cliente_api, casa):
    marcado = cliente_api.post(ROTA, json=_pedido(casa, inicio="09:00")).json()

    resposta = cliente_api.put(f"{ROTA}/{marcado['id']}", json=_pedido(casa, inicio="09:00", servicos=[casa["corte"], casa["barba"]]))
    assert resposta.status_code == 200

    grade = cliente_api.get(
        f"{ROTA}/horarios",
        params={"barbeiro_id": casa["barbeiro"], "data": TERCA, "duracao": 45, "ignorar": marcado["id"]},
    ).json()
    assert all(h["livre"] for h in grade["horarios"])


# ---------------------------------------------------------------- situação

def test_nao_conclui_antes_do_horario_mas_cancela(cliente_api, casa):
    marcado = cliente_api.post(ROTA, json=_pedido(casa)).json()
    rota = f"{ROTA}/{marcado['id']}/situacao"

    resposta = cliente_api.put(rota, json={"situacao": "concluido"})
    assert resposta.status_code == 409
    assert resposta.json()["detail"] == "Esse atendimento ainda não começou."

    assert cliente_api.put(rota, json={"situacao": "cancelado"}).json()["situacao"] == "cancelado"


def test_conclui_depois_que_o_horario_chegou(cliente_api, casa, relogio):
    marcado = cliente_api.post(ROTA, json=_pedido(casa, inicio="09:00")).json()
    relogio(datetime(2030, 1, 1, 9, 50))

    resposta = cliente_api.put(f"{ROTA}/{marcado['id']}/situacao", json={"situacao": "concluido"})
    assert resposta.status_code == 200
    assert resposta.json()["situacao"] == "concluido"


def test_agendamento_fechado_nao_muda_mais(cliente_api, casa):
    marcado = cliente_api.post(ROTA, json=_pedido(casa)).json()
    cliente_api.put(f"{ROTA}/{marcado['id']}/situacao", json={"situacao": "cancelado"})

    assert cliente_api.put(f"{ROTA}/{marcado['id']}/situacao", json={"situacao": "faltou"}).status_code == 409
    assert cliente_api.put(f"{ROTA}/{marcado['id']}", json=_pedido(casa, inicio="11:00")).status_code == 409


def test_situacao_fora_das_opcoes_e_id_inexistente(cliente_api, casa):
    marcado = cliente_api.post(ROTA, json=_pedido(casa)).json()
    assert cliente_api.put(f"{ROTA}/{marcado['id']}/situacao", json={"situacao": "agendado"}).status_code == 422
    assert cliente_api.get(f"{ROTA}/999").status_code == 404


# ---------------------------------------------------------------- ligação com as outras etapas

def test_nao_apaga_cliente_barbeiro_nem_servico_que_tem_agendamento(cliente_api, casa):
    cliente_api.post(ROTA, json=_pedido(casa))

    for rota in (f"/api/clientes/{casa['cliente']}", f"/api/barbeiros/{casa['barbeiro']}", f"/api/servicos/{casa['corte']}"):
        resposta = cliente_api.delete(rota)
        assert resposta.status_code == 409
        assert resposta.json()["detail"]

    # a barba não foi usada, então essa pode sair
    assert cliente_api.delete(f"/api/servicos/{casa['barba']}").status_code == 204
