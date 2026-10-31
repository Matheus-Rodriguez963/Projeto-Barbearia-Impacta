"""Testes da API de serviços (etapa 3) — mesmo roteiro do cliente e do barbeiro."""

ROTA = "/api/servicos"


# ---------------------------------------------------------------- cadastrar

def test_cadastra_servico(cliente_api, servico_valido):
    resposta = cliente_api.post(ROTA, json=servico_valido)
    assert resposta.status_code == 201

    dados = resposta.json()
    assert dados["id"] > 0
    assert dados["duracao"] == 45
    assert dados["preco"] == 55.0  # sai como número, não como texto
    assert dados["ativo"] is True


def test_aceita_preco_com_centavos(cliente_api, servico_valido):
    servico_valido["preco"] = 47.5
    assert cliente_api.post(ROTA, json=servico_valido).json()["preco"] == 47.5


def test_descricao_e_opcional_e_espaco_vira_vazio(cliente_api, servico_valido):
    servico_valido["descricao"] = "   "
    assert cliente_api.post(ROTA, json=servico_valido).json()["descricao"] is None


def test_recusa_duracao_quebrada_ou_fora_do_limite(cliente_api, servico_valido):
    for duracao in (47, 0, 300):
        servico_valido["duracao"] = duracao
        resposta = cliente_api.post(ROTA, json=servico_valido)
        assert resposta.status_code == 422
        assert resposta.json()["erros"][0]["campo"] == "duracao"


def test_recusa_preco_zero_negativo_ou_com_tres_casas(cliente_api, servico_valido):
    for preco in (0, -10, "10.555"):
        servico_valido["preco"] = preco
        resposta = cliente_api.post(ROTA, json=servico_valido)
        assert resposta.status_code == 422
        assert resposta.json()["erros"][0]["campo"] == "preco"


def test_recusa_nome_curto(cliente_api, servico_valido):
    servico_valido["nome"] = "Ab"
    assert cliente_api.post(ROTA, json=servico_valido).status_code == 422


def test_nao_deixa_repetir_o_nome_nem_mudando_maiuscula(cliente_api, servico_valido):
    cliente_api.post(ROTA, json=servico_valido)
    servico_valido["nome"] = "CORTE CLÁSSICO"

    resposta = cliente_api.post(ROTA, json=servico_valido)
    assert resposta.status_code == 409
    assert resposta.json()["campo"] == "nome"


# ---------------------------------------------------------------- listar e editar

def test_lista_o_cardapio_primeiro_e_em_ordem_alfabetica(cliente_api, servico_valido):
    cliente_api.post(ROTA, json={**servico_valido, "nome": "Pigmentação", "ativo": False})
    cliente_api.post(ROTA, json={**servico_valido, "nome": "Degradê"})
    cliente_api.post(ROTA, json=servico_valido)

    nomes = [s["nome"] for s in cliente_api.get(ROTA).json()["itens"]]
    assert nomes == ["Corte clássico", "Degradê", "Pigmentação"]


def test_filtra_o_que_esta_no_cardapio_e_busca_pelo_nome(cliente_api, servico_valido):
    cliente_api.post(ROTA, json={**servico_valido, "nome": "Barba na navalha", "ativo": False})
    cliente_api.post(ROTA, json=servico_valido)

    assert cliente_api.get(ROTA, params={"ativo": True}).json()["total"] == 1
    assert cliente_api.get(ROTA, params={"busca": "navalha"}).json()["itens"][0]["nome"] == "Barba na navalha"


def test_edita_so_o_que_veio(cliente_api, servico_valido):
    criado = cliente_api.post(ROTA, json=servico_valido).json()

    dados = cliente_api.put(f"{ROTA}/{criado['id']}", json={"preco": 60}).json()
    assert dados["preco"] == 60.0
    assert dados["duracao"] == 45
    assert dados["nome"] == "Corte clássico"


def test_pode_salvar_o_proprio_nome_de_novo(cliente_api, servico_valido):
    criado = cliente_api.post(ROTA, json=servico_valido).json()
    assert cliente_api.put(f"{ROTA}/{criado['id']}", json={"nome": "Corte clássico"}).status_code == 200


def test_id_que_nao_existe_da_404(cliente_api):
    assert cliente_api.get(f"{ROTA}/999").status_code == 404
    assert cliente_api.delete(f"{ROTA}/999").status_code == 404


def test_exclui_servico_que_nunca_foi_usado(cliente_api, servico_valido):
    criado = cliente_api.post(ROTA, json=servico_valido).json()
    assert cliente_api.delete(f"{ROTA}/{criado['id']}").status_code == 204
    assert cliente_api.get(f"{ROTA}/{criado['id']}").status_code == 404
