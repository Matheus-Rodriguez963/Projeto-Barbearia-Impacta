"""Testes da API de cadastro de cliente — o caminho feliz e os erros que eu previ."""


# ---------------------------------------------------------------- cadastrar

def test_cadastra_cliente_completo(cliente_api, ficha_valida):
    resposta = cliente_api.post("/api/clientes", json=ficha_valida)
    assert resposta.status_code == 201

    dados = resposta.json()
    assert dados["id"] > 0
    assert dados["nome"] == "Pablo Miguel Dias"
    # no banco eu guardo só os números, mas devolvo formatado junto
    assert dados["telefone"] == "11990001234"
    assert dados["telefone_formatado"] == "(11) 99000-1234"
    assert dados["cpf"] == "52998224725"
    assert dados["cpf_formatado"] == "529.982.247-25"
    assert dados["criado_em"] is not None


def test_cadastra_so_com_o_obrigatorio(cliente_api):
    # nome, telefone e CPF são o mínimo; o resto o cliente completa depois
    resposta = cliente_api.post(
        "/api/clientes",
        json={"nome": "Rita Camargo", "telefone": "(11) 98888-7777", "cpf": "168.995.350-09"},
    )
    assert resposta.status_code == 201

    dados = resposta.json()
    assert dados["email"] is None
    assert dados["barbeiro_preferido"] == "Sem preferência"
    assert dados["origem"] == "Indicação"


def test_recusa_cadastro_sem_os_campos_obrigatorios(cliente_api):
    resposta = cliente_api.post("/api/clientes", json={"nome": "Só o nome Aqui"})
    assert resposta.status_code == 422

    campos_com_erro = {erro["campo"] for erro in resposta.json()["erros"]}
    assert {"telefone", "cpf"} <= campos_com_erro


def test_recusa_cpf_invalido(cliente_api, ficha_valida):
    ficha_valida["cpf"] = "111.111.111-11"
    resposta = cliente_api.post("/api/clientes", json=ficha_valida)

    assert resposta.status_code == 422
    assert resposta.json()["erros"][0]["campo"] == "cpf"


def test_recusa_telefone_invalido(cliente_api, ficha_valida):
    ficha_valida["telefone"] = "(00) 1234-5678"
    resposta = cliente_api.post("/api/clientes", json=ficha_valida)

    assert resposta.status_code == 422
    assert resposta.json()["erros"][0]["campo"] == "telefone"


def test_recusa_nome_sem_sobrenome(cliente_api, ficha_valida):
    ficha_valida["nome"] = "Pablo"
    resposta = cliente_api.post("/api/clientes", json=ficha_valida)

    assert resposta.status_code == 422
    assert resposta.json()["erros"][0]["campo"] == "nome"


def test_recusa_email_escrito_errado(cliente_api, ficha_valida):
    ficha_valida["email"] = "pablo-arroba-email"
    resposta = cliente_api.post("/api/clientes", json=ficha_valida)

    assert resposta.status_code == 422
    assert resposta.json()["erros"][0]["campo"] == "email"


def test_recusa_nascimento_no_futuro(cliente_api, ficha_valida):
    ficha_valida["data_nascimento"] = "2999-01-01"
    resposta = cliente_api.post("/api/clientes", json=ficha_valida)

    assert resposta.status_code == 422
    assert resposta.json()["erros"][0]["campo"] == "data_nascimento"


# ---------------------------------------------------------------- duplicados

def test_nao_deixa_repetir_telefone(cliente_api, ficha_valida):
    cliente_api.post("/api/clientes", json=ficha_valida)

    outro = dict(ficha_valida, nome="Outra Pessoa", cpf="168.995.350-09", email="outra@email.com")
    resposta = cliente_api.post("/api/clientes", json=outro)

    assert resposta.status_code == 409
    assert resposta.json()["campo"] == "telefone"


def test_nao_deixa_repetir_cpf(cliente_api, ficha_valida):
    cliente_api.post("/api/clientes", json=ficha_valida)

    outro = dict(ficha_valida, nome="Outra Pessoa", telefone="(11) 97777-6666", email="outra@email.com")
    resposta = cliente_api.post("/api/clientes", json=outro)

    assert resposta.status_code == 409
    assert resposta.json()["campo"] == "cpf"


def test_nao_deixa_repetir_email(cliente_api, ficha_valida):
    cliente_api.post("/api/clientes", json=ficha_valida)

    outro = dict(ficha_valida, nome="Outra Pessoa", telefone="(11) 97777-6666", cpf="168.995.350-09")
    resposta = cliente_api.post("/api/clientes", json=outro)

    assert resposta.status_code == 409
    assert resposta.json()["campo"] == "email"


def test_varios_clientes_podem_ficar_sem_email(cliente_api):
    # e-mail é único, mas quem não informou não pode brigar com quem também não informou
    primeiro = cliente_api.post(
        "/api/clientes",
        json={"nome": "Rita Camargo", "telefone": "(11) 98888-7777", "cpf": "168.995.350-09"},
    )
    segundo = cliente_api.post(
        "/api/clientes",
        json={"nome": "Marcos Vieira", "telefone": "(11) 97777-6666", "cpf": "529.982.247-25"},
    )

    assert primeiro.status_code == 201
    assert segundo.status_code == 201


# ---------------------------------------------------------------- consultar

def test_lista_clientes_com_o_total(cliente_api, ficha_valida):
    cliente_api.post("/api/clientes", json=ficha_valida)
    cliente_api.post(
        "/api/clientes",
        json={"nome": "Rita Camargo", "telefone": "(11) 98888-7777", "cpf": "168.995.350-09"},
    )

    resposta = cliente_api.get("/api/clientes")
    assert resposta.status_code == 200
    assert resposta.json()["total"] == 2
    assert len(resposta.json()["itens"]) == 2


def test_busca_por_parte_do_nome(cliente_api, ficha_valida):
    cliente_api.post("/api/clientes", json=ficha_valida)
    cliente_api.post(
        "/api/clientes",
        json={"nome": "Rita Camargo", "telefone": "(11) 98888-7777", "cpf": "168.995.350-09"},
    )

    resposta = cliente_api.get("/api/clientes", params={"busca": "rita"})
    assert resposta.json()["total"] == 1
    assert resposta.json()["itens"][0]["nome"] == "Rita Camargo"


def test_busca_pelos_numeros_do_telefone(cliente_api, ficha_valida):
    cliente_api.post("/api/clientes", json=ficha_valida)

    resposta = cliente_api.get("/api/clientes", params={"busca": "99000"})
    assert resposta.json()["total"] == 1


def test_pagina_a_listagem(cliente_api):
    fichas = [
        {"nome": "Pablo Miguel Dias", "telefone": "(11) 99000-1234", "cpf": "529.982.247-25"},
        {"nome": "Rita Camargo", "telefone": "(11) 98888-7777", "cpf": "168.995.350-09"},
        {"nome": "Marcos Vieira", "telefone": "(11) 97777-6666", "cpf": "111.444.777-35"},
    ]
    for ficha in fichas:
        cliente_api.post("/api/clientes", json=ficha)

    resposta = cliente_api.get("/api/clientes", params={"pagina": 2, "tamanho": 2})
    assert resposta.json()["total"] == 3          # total é de todo mundo
    assert len(resposta.json()["itens"]) == 1     # mas a página 2 só tem o que sobrou


def test_abre_a_ficha_pelo_id(cliente_api, ficha_valida):
    novo_id = cliente_api.post("/api/clientes", json=ficha_valida).json()["id"]

    resposta = cliente_api.get(f"/api/clientes/{novo_id}")
    assert resposta.status_code == 200
    assert resposta.json()["apelido"] == "Pablinho"


def test_id_que_nao_existe_da_404(cliente_api):
    resposta = cliente_api.get("/api/clientes/9999")
    assert resposta.status_code == 404


def test_busca_pelo_telefone_com_mascara(cliente_api, ficha_valida):
    cliente_api.post("/api/clientes", json=ficha_valida)

    # a recepção digita o telefone com máscara, a API tem que achar mesmo assim
    resposta = cliente_api.get("/api/clientes/telefone/(11) 99000-1234")
    assert resposta.status_code == 200
    assert resposta.json()["nome"] == "Pablo Miguel Dias"


def test_telefone_nao_cadastrado_da_404(cliente_api):
    resposta = cliente_api.get("/api/clientes/telefone/11912345678")
    assert resposta.status_code == 404


# ---------------------------------------------------------------- editar e excluir

def test_edita_so_o_campo_que_mandei(cliente_api, ficha_valida):
    novo_id = cliente_api.post("/api/clientes", json=ficha_valida).json()["id"]

    resposta = cliente_api.put(
        f"/api/clientes/{novo_id}",
        json={"barbeiro_preferido": "Tião da Navalha", "apelido": "Pablão"},
    )

    assert resposta.status_code == 200
    assert resposta.json()["barbeiro_preferido"] == "Tião da Navalha"
    assert resposta.json()["apelido"] == "Pablão"
    assert resposta.json()["nome"] == "Pablo Miguel Dias"  # o resto ficou igual


def test_edicao_nao_pode_roubar_o_telefone_de_outro(cliente_api, ficha_valida):
    cliente_api.post("/api/clientes", json=ficha_valida)
    outro_id = cliente_api.post(
        "/api/clientes",
        json={"nome": "Rita Camargo", "telefone": "(11) 98888-7777", "cpf": "168.995.350-09"},
    ).json()["id"]

    resposta = cliente_api.put(f"/api/clientes/{outro_id}", json={"telefone": "(11) 99000-1234"})
    assert resposta.status_code == 409


def test_cliente_pode_salvar_o_proprio_telefone_de_novo(cliente_api, ficha_valida):
    # detalhe chato: ao editar, o cliente não pode dar conflito com ele mesmo
    novo_id = cliente_api.post("/api/clientes", json=ficha_valida).json()["id"]

    resposta = cliente_api.put(
        f"/api/clientes/{novo_id}",
        json={"telefone": "(11) 99000-1234", "nome": "Pablo Miguel Dias"},
    )
    assert resposta.status_code == 200


def test_editar_id_inexistente_da_404(cliente_api):
    resposta = cliente_api.put("/api/clientes/9999", json={"apelido": "Zé"})
    assert resposta.status_code == 404


def test_exclui_o_cadastro(cliente_api, ficha_valida):
    novo_id = cliente_api.post("/api/clientes", json=ficha_valida).json()["id"]

    assert cliente_api.delete(f"/api/clientes/{novo_id}").status_code == 204
    assert cliente_api.get(f"/api/clientes/{novo_id}").status_code == 404


def test_excluir_id_inexistente_da_404(cliente_api):
    assert cliente_api.delete("/api/clientes/9999").status_code == 404
