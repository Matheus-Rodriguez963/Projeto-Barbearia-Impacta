"""Testes da API de serviços (etapa 3) — o cardápio da casa."""

ROTA = "/api/servicos"


# ---------------------------------------------------------------- cadastrar

def test_cadastra_servico(cliente_api, servico_valido):
    resposta = cliente_api.post(ROTA, json=servico_valido)
    assert resposta.status_code == 201

    dados = resposta.json()
    assert dados["id"] > 0
    assert dados["nome"] == "Corte clássico"
    assert dados["duracao"] == 45
    assert dados["preco"] == 50.0  # sai como número pro front fazer conta
    assert dados["ativo"] is True


def test_preco_com_centavos_nao_perde_precisao(cliente_api, servico_valido):
    servico_valido["preco"] = 37.9
    dados = cliente_api.post(ROTA, json=servico_valido).json()
    assert dados["preco"] == 37.9


def test_recusa_preco_negativo(cliente_api, servico_valido):
    servico_valido["preco"] = -10
    resposta = cliente_api.post(ROTA, json=servico_valido)
    assert resposta.status_code == 422
    assert resposta.json()["erros"][0]["campo"] == "preco"


def test_recusa_duracao_fora_do_passo_de_5_minutos(cliente_api, servico_valido):
    servico_valido["duracao"] = 42
    resposta = cliente_api.post(ROTA, json=servico_valido)
    assert resposta.status_code == 422
    assert resposta.json()["erros"][0]["campo"] == "duracao"


def test_nao_deixa_repetir_o_nome_nem_mudando_maiuscula(cliente_api, servico_valido):
    cliente_api.post(ROTA, json=servico_valido)
    servico_valido["nome"] = "CORTE CLÁSSICO"

    resposta = cliente_api.post(ROTA, json=servico_valido)
    assert resposta.status_code == 409
    assert resposta.json()["campo"] == "nome"


# ---------------------------------------------------------------- listar

def test_lista_ordenada_pelo_preco(cliente_api, servico_valido):
    cliente_api.post(ROTA, json=servico_valido)
    cliente_api.post(ROTA, json={"nome": "Barba", "duracao": 30, "preco": 35})
    cliente_api.post(ROTA, json={"nome": "Corte com barba", "duracao": 75, "preco": 80})

    dados = cliente_api.get(ROTA).json()
    assert dados["total"] == 3
    assert [s["nome"] for s in dados["itens"]] == ["Barba", "Corte clássico", "Corte com barba"]


def test_filtra_so_o_que_esta_no_cardapio(cliente_api, servico_valido):
    cliente_api.post(ROTA, json=servico_valido)
    cliente_api.post(ROTA, json={"nome": "Pigmentação", "duracao": 60, "preco": 70, "ativo": False})

    dados = cliente_api.get(ROTA, params={"ativo": True}).json()
    assert [s["nome"] for s in dados["itens"]] == ["Corte clássico"]


# ---------------------------------------------------------------- editar e excluir

def test_edita_so_o_preco(cliente_api, servico_valido):
    servico = cliente_api.post(ROTA, json=servico_valido).json()

    resposta = cliente_api.put(f"{ROTA}/{servico['id']}", json={"preco": 55})
    assert resposta.status_code == 200
    assert resposta.json()["preco"] == 55.0
    assert resposta.json()["duracao"] == 45  # o resto não mexeu


def test_exclui_servico_sem_agendamento(cliente_api, servico_valido):
    servico = cliente_api.post(ROTA, json=servico_valido).json()

    assert cliente_api.delete(f"{ROTA}/{servico['id']}").status_code == 204
    assert cliente_api.get(f"{ROTA}/{servico['id']}").status_code == 404
