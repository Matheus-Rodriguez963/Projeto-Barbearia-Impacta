"""Testes do histórico e do resumo do mês.

Mesmo truque da agenda: o relógio fica travado em 2029, as marcações caem em janeiro de
2030 e, pra concluir um atendimento (que só pode acontecer depois da hora dele), eu
adianto o relógio logo depois de marcar.
"""

from datetime import datetime

import pytest

from app.crud import agendamento as crud_agendamento

ROTA = "/api/historico"
JANEIRO = {"ano": 2030, "mes": 1}

ANTES_DE_TUDO = datetime(2029, 12, 31, 8, 0)  # o "agora" na hora de marcar
DEPOIS_DE_TUDO = datetime(2030, 3, 1, 8, 0)  # todo atendimento de jan/fev já passou


@pytest.fixture
def relogio(monkeypatch):
    def acertar(momento: datetime):
        monkeypatch.setattr(crud_agendamento, "_agora", lambda: momento)

    acertar(ANTES_DE_TUDO)
    return acertar


@pytest.fixture
def casa(cliente_api, relogio, ficha_valida, barbeiro_valido, servico_valido):
    """Dois clientes, dois barbeiros (os dois de ter a sáb), corte (55) e barba (45)."""
    barbeiro_valido["cpf"] = "853.513.468-93"  # o do conftest é o mesmo do cliente
    cliente1 = cliente_api.post("/api/clientes", json=ficha_valida).json()
    cliente2 = cliente_api.post(
        "/api/clientes", json={"nome": "Rita Camargo", "telefone": "(11) 98888-7777", "cpf": "168.995.350-09"}
    ).json()
    barbeiro1 = cliente_api.post("/api/barbeiros", json=barbeiro_valido).json()
    barbeiro2 = cliente_api.post(
        "/api/barbeiros",
        json={
            **barbeiro_valido,
            "nome": "Alfredo Prado",
            "apelido": "Seu Alfredo",
            "telefone": "(11) 97777-6666",
            "cpf": "111.444.777-35",
            "email": "alfredo@domalfredo.com",
        },
    ).json()
    corte = cliente_api.post("/api/servicos", json=servico_valido).json()
    barba = cliente_api.post(
        "/api/servicos", json={"nome": "Barba na navalha", "duracao": 30, "preco": "45.00"}
    ).json()
    return {
        "cliente": cliente1["id"],
        "cliente2": cliente2["id"],
        "barbeiro": barbeiro1["id"],
        "barbeiro2": barbeiro2["id"],
        "corte": corte["id"],
        "barba": barba["id"],
    }


def _atendido(cliente_api, relogio, casa, data, inicio, servicos, situacao="concluido", **ids):
    """Marca o horário e, se não for 'agendado', fecha com a situação pedida."""
    pedido = {
        "cliente_id": ids.get("cliente_id", casa["cliente"]),
        "barbeiro_id": ids.get("barbeiro_id", casa["barbeiro"]),
        "servicos": servicos,
        "data": data,
        "inicio": inicio,
    }
    marcado = cliente_api.post("/api/agendamentos", json=pedido)
    assert marcado.status_code == 201, marcado.text
    id_ = marcado.json()["id"]

    if situacao != "agendado":
        relogio(DEPOIS_DE_TUDO)
        fechado = cliente_api.put(f"/api/agendamentos/{id_}/situacao", json={"situacao": situacao})
        assert fechado.status_code == 200, fechado.text
        relogio(ANTES_DE_TUDO)  # volta, pra próxima marcação não cair no passado
    return id_


def _lista(cliente_api, **params):
    return cliente_api.get(ROTA, params={**JANEIRO, **params})


def _resumo(cliente_api, **params):
    resposta = cliente_api.get(f"{ROTA}/resumo", params={**JANEIRO, **params})
    assert resposta.status_code == 200, resposta.text
    return resposta.json()


# ---------------------------------------------------------------- lista

def _tres_situacoes(cliente_api, relogio, casa):
    _atendido(cliente_api, relogio, casa, "2030-01-01", "09:00", [casa["corte"]])
    _atendido(cliente_api, relogio, casa, "2030-01-01", "11:00", [casa["corte"]], situacao="faltou")
    _atendido(cliente_api, relogio, casa, "2030-01-01", "14:00", [casa["corte"]], situacao="cancelado")


def test_lista_so_concluidos_por_padrao(cliente_api, relogio, casa):
    _tres_situacoes(cliente_api, relogio, casa)
    dados = _lista(cliente_api).json()
    assert dados["total"] == 1
    assert dados["itens"][0]["situacao"] == "concluido"


def test_lista_todas_as_situacoes(cliente_api, relogio, casa):
    _tres_situacoes(cliente_api, relogio, casa)
    assert _lista(cliente_api, situacao="todas").json()["total"] == 3
    assert _lista(cliente_api, situacao="faltou").json()["total"] == 1


def test_situacao_invalida_da_422(cliente_api, casa):
    assert _lista(cliente_api, situacao="xyz").status_code == 422


def test_lista_mais_recente_primeiro(cliente_api, relogio, casa):
    _atendido(cliente_api, relogio, casa, "2030-01-01", "09:00", [casa["corte"]])
    _atendido(cliente_api, relogio, casa, "2030-01-03", "09:00", [casa["corte"]])
    itens = _lista(cliente_api).json()["itens"]
    assert [i["data"] for i in itens] == ["2030-01-03", "2030-01-01"]


def test_lista_filtra_por_barbeiro_e_cliente(cliente_api, relogio, casa):
    um = _atendido(cliente_api, relogio, casa, "2030-01-01", "09:00", [casa["corte"]])
    dois = _atendido(
        cliente_api, relogio, casa, "2030-01-01", "11:00", [casa["corte"]],
        cliente_id=casa["cliente2"], barbeiro_id=casa["barbeiro2"],
    )

    por_barbeiro = _lista(cliente_api, barbeiro_id=casa["barbeiro2"]).json()
    assert [i["id"] for i in por_barbeiro["itens"]] == [dois]

    por_cliente = _lista(cliente_api, cliente_id=casa["cliente"]).json()
    assert [i["id"] for i in por_cliente["itens"]] == [um]


def test_lista_respeita_o_mes(cliente_api, relogio, casa):
    _atendido(cliente_api, relogio, casa, "2030-01-31", "09:00", [casa["corte"]])
    _atendido(cliente_api, relogio, casa, "2030-02-01", "09:00", [casa["corte"]])

    janeiro = _lista(cliente_api).json()
    assert [i["data"] for i in janeiro["itens"]] == ["2030-01-31"]

    fevereiro = cliente_api.get(ROTA, params={"ano": 2030, "mes": 2}).json()
    assert [i["data"] for i in fevereiro["itens"]] == ["2030-02-01"]


def test_lista_pagina(cliente_api, relogio, casa):
    for dia in ("2030-01-01", "2030-01-02", "2030-01-03"):
        _atendido(cliente_api, relogio, casa, dia, "09:00", [casa["corte"]])
    dados = _lista(cliente_api, tamanho=2, pagina=2).json()
    assert dados["total"] == 3
    assert len(dados["itens"]) == 1


def test_mes_invalido_da_422(cliente_api, casa):
    assert _lista(cliente_api, mes=13).status_code == 422
    assert cliente_api.get(f"{ROTA}/resumo", params={"ano": 2030, "mes": 13}).status_code == 422


# ---------------------------------------------------------------- resumo

def test_resumo_conta_so_concluidos(cliente_api, relogio, casa):
    _atendido(cliente_api, relogio, casa, "2030-01-01", "09:00", [casa["corte"], casa["barba"]])
    _atendido(cliente_api, relogio, casa, "2030-01-01", "11:00", [casa["corte"]])
    _atendido(cliente_api, relogio, casa, "2030-01-01", "14:00", [casa["corte"]], situacao="faltou")
    _atendido(cliente_api, relogio, casa, "2030-01-01", "16:00", [casa["barba"]], situacao="cancelado")

    resumo = _resumo(cliente_api)
    assert resumo["atendimentos"] == 2
    assert resumo["faturamento"] == 155.0
    assert resumo["ticket_medio"] == 77.5
    assert resumo["faltas"] == 1
    assert resumo["cancelados"] == 1


def test_ranking_ordena_por_quantidade(cliente_api, relogio, casa):
    _atendido(cliente_api, relogio, casa, "2030-01-01", "09:00", [casa["corte"]])
    _atendido(cliente_api, relogio, casa, "2030-01-01", "11:00", [casa["corte"], casa["barba"]])

    servicos = _resumo(cliente_api)["servicos"]
    assert servicos[0] == {"servico_id": casa["corte"], "nome": "Corte clássico", "quantidade": 2, "faturamento": 110.0}
    assert servicos[1]["servico_id"] == casa["barba"]
    assert servicos[1]["quantidade"] == 1


def test_ranking_usa_preco_combinado(cliente_api, relogio, casa):
    _atendido(cliente_api, relogio, casa, "2030-01-01", "09:00", [casa["corte"]])
    resposta = cliente_api.put(f"/api/servicos/{casa['corte']}", json={"preco": 70})
    assert resposta.status_code == 200

    corte = _resumo(cliente_api)["servicos"][0]
    assert corte["faturamento"] == 55.0


def test_resumo_filtra_por_barbeiro(cliente_api, relogio, casa):
    _atendido(cliente_api, relogio, casa, "2030-01-01", "09:00", [casa["corte"]])
    _atendido(
        cliente_api, relogio, casa, "2030-01-01", "11:00", [casa["barba"]],
        cliente_id=casa["cliente2"], barbeiro_id=casa["barbeiro2"],
    )

    do_primeiro = _resumo(cliente_api, barbeiro_id=casa["barbeiro"])
    assert do_primeiro["atendimentos"] == 1
    assert [s["servico_id"] for s in do_primeiro["servicos"]] == [casa["corte"]]


def test_pares_cliente_barbeiro(cliente_api, relogio, casa):
    _atendido(cliente_api, relogio, casa, "2030-01-01", "09:00", [casa["corte"]])
    _atendido(cliente_api, relogio, casa, "2030-01-02", "09:00", [casa["corte"]])
    _atendido(
        cliente_api, relogio, casa, "2030-01-01", "11:00", [casa["corte"]],
        cliente_id=casa["cliente2"], barbeiro_id=casa["barbeiro2"],
    )

    pares = _resumo(cliente_api)["pares"]
    assert len(pares) == 2
    assert pares[0]["atendimentos"] == 2
    assert pares[0]["cliente"]["id"] == casa["cliente"]
    assert pares[0]["barbeiro"]["id"] == casa["barbeiro"]
    assert pares[1]["atendimentos"] == 1


def test_resumo_de_mes_vazio(cliente_api, casa):
    resumo = _resumo(cliente_api, mes=6)
    assert resumo["atendimentos"] == 0
    assert resumo["faturamento"] == 0
    assert resumo["ticket_medio"] == 0
    assert resumo["faltas"] == 0
    assert resumo["cancelados"] == 0
    assert resumo["servicos"] == []
    assert resumo["pares"] == []
