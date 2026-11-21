"""Testes da gestão de recepcionistas e da proteção das rotas que já existiam."""

import pytest

from tests.conftest import entrar_como

DATA = "2026-11-20"


@pytest.fixture
def maria(cliente_api, cliente_anonimo):
    """A recepcionista 'maria' (só agenda), já logada no cliente anônimo; o admin segue no cliente_api."""
    resposta = cliente_api.post("/api/usuarios", json={"login": "maria", "senha": "abcd", "menus": ["agenda"]})
    assert resposta.status_code == 201, resposta.text
    entrar_como(cliente_anonimo, "maria", "abcd")
    return {"id": resposta.json()["id"], "cliente": cliente_anonimo}


def test_admin_cria_recepcionista_e_ela_entra(cliente_api, cliente_anonimo):
    resposta = cliente_api.post("/api/usuarios", json={"login": "maria", "senha": "abcd", "menus": ["agenda"]})
    assert resposta.status_code == 201
    corpo = resposta.json()
    assert corpo["login"] == "maria" and corpo["menus"] == ["agenda"] and corpo["ativo"] is True
    assert "senha" not in corpo and "senha_hash" not in corpo

    entrar_como(cliente_anonimo, "maria", "abcd")
    eu = cliente_anonimo.get("/api/eu").json()
    assert eu["tipo"] == "recepcionista"
    assert eu["menus"] == ["agenda"]


def test_lista_so_recepcionistas(cliente_api):
    for login in ("zeca", "ana"):
        cliente_api.post("/api/usuarios", json={"login": login, "senha": "abcd", "menus": []})
    logins = [u["login"] for u in cliente_api.get("/api/usuarios").json()]
    assert logins == ["ana", "zeca"]  # sem o admin, em ordem de login


def test_login_repetido_ignora_maiuscula(cliente_api):
    cliente_api.post("/api/usuarios", json={"login": "maria", "senha": "abcd", "menus": []})
    resposta = cliente_api.post("/api/usuarios", json={"login": "Maria", "senha": "abcd", "menus": []})
    assert resposta.status_code == 409
    assert resposta.json()["campo"] == "login"
    assert resposta.json()["detail"] == "Já existe um usuário com esse login."


def test_menu_invalido(cliente_api):
    resposta = cliente_api.post("/api/usuarios", json={"login": "maria", "senha": "abcd", "menus": ["acessos"]})
    assert resposta.status_code == 422


def test_login_e_senha_invalidos(cliente_api):
    assert cliente_api.post("/api/usuarios", json={"login": "Ma ria", "senha": "abcd", "menus": []}).status_code == 422
    assert cliente_api.post("/api/usuarios", json={"login": "maria", "senha": "abc", "menus": []}).status_code == 422


def test_recepcionista_nao_ve_acessos(maria):
    assert maria["cliente"].get("/api/usuarios").status_code == 403
    assert maria["cliente"].post("/api/usuarios", json={"login": "x1", "senha": "abcd", "menus": []}).status_code == 403


def test_anonimo_barrado(cliente_anonimo):
    for rota in ("/api/clientes", f"/api/agendamentos?data={DATA}", "/api/historico", "/api/usuarios"):
        resposta = cliente_anonimo.get(rota)
        assert resposta.status_code == 401, rota
        assert resposta.json()["detail"] == "Faça login para continuar."


def test_sem_menu_403(maria):
    cliente = maria["cliente"]
    resposta = cliente.get("/api/historico")
    assert resposta.status_code == 403
    assert resposta.json()["detail"] == "Você não tem acesso a este menu."
    assert cliente.post("/api/clientes", json={}).status_code == 403  # o menu vem antes da validação
    assert cliente.get("/api/clientes").status_code == 200
    assert cliente.get(f"/api/agendamentos?data={DATA}").status_code == 200


def test_gravar_barbeiro_e_servico_pede_o_menu(maria):
    cliente = maria["cliente"]
    assert cliente.get("/api/barbeiros").status_code == 200
    assert cliente.put("/api/barbeiros/1/foto", files={"foto": ("a.png", b"x", "image/png")}).status_code == 403
    assert cliente.delete("/api/barbeiros/1/foto").status_code == 403
    assert cliente.delete("/api/servicos/1").status_code == 403


def test_aparencia_aberta_pra_ler(cliente_anonimo):
    assert cliente_anonimo.get("/api/aparencia").status_code == 200
    assert cliente_anonimo.put("/api/aparencia", json={"nome": "X"}).status_code == 401
    assert cliente_anonimo.delete("/api/aparencia/logo").status_code == 401


def test_aparencia_gravar_pede_o_menu(maria, cliente_api):
    assert maria["cliente"].put("/api/aparencia", json={"nome": "Nova"}).status_code == 403
    cliente_api.put(f"/api/usuarios/{maria['id']}", json={"menus": ["aparencia"]})
    assert maria["cliente"].put("/api/aparencia", json={"nome": "Nova"}).status_code == 200


def test_bloquear_derruba_sessao(maria, cliente_api, cliente_anonimo):
    assert maria["cliente"].get("/api/eu").status_code == 200

    resposta = cliente_api.put(f"/api/usuarios/{maria['id']}", json={"ativo": False})
    assert resposta.status_code == 200 and resposta.json()["ativo"] is False

    assert maria["cliente"].get("/api/eu").status_code == 401
    entrada = cliente_anonimo.post("/api/login", json={"login": "maria", "senha": "abcd"})
    assert entrada.status_code == 403
    assert entrada.json()["detail"] == "Seu acesso está bloqueado. Fale com o administrador."

    cliente_api.put(f"/api/usuarios/{maria['id']}", json={"ativo": True})
    entrar_como(cliente_anonimo, "maria", "abcd")


def test_admin_nao_editavel(cliente_api):
    id_do_admin = cliente_api.get("/api/eu").json()["id"]
    for rota, corpo in (
        (f"/api/usuarios/{id_do_admin}", {"ativo": False}),
        (f"/api/usuarios/{id_do_admin}/senha", {"senha_nova": "9999"}),
    ):
        resposta = cliente_api.put(rota, json=corpo)
        assert resposta.status_code == 404
        assert resposta.json()["detail"] == "Recepcionista não encontrada."
    assert cliente_api.get("/api/eu").status_code == 200


def test_recepcionista_inexistente(cliente_api):
    assert cliente_api.put("/api/usuarios/999", json={"ativo": False}).status_code == 404


def test_trocar_senha_da_recepcionista(maria, cliente_api, cliente_anonimo):
    resposta = cliente_api.put(f"/api/usuarios/{maria['id']}/senha", json={"senha_nova": "nova1"})
    assert resposta.status_code == 204

    assert maria["cliente"].get("/api/eu").status_code == 401  # sessão antiga caiu
    assert cliente_anonimo.post("/api/login", json={"login": "maria", "senha": "abcd"}).status_code == 401
    entrar_como(cliente_anonimo, "maria", "nova1")


def test_mudar_menus_vale_na_hora(maria, cliente_api):
    assert maria["cliente"].get(f"/api/agendamentos?data={DATA}").status_code == 200
    cliente_api.put(f"/api/usuarios/{maria['id']}", json={"menus": ["clientes"]})
    assert maria["cliente"].get(f"/api/agendamentos?data={DATA}").status_code == 403
    assert maria["cliente"].get("/api/eu").json()["menus"] == ["clientes"]


def test_excluir_recepcionista(maria, cliente_api, cliente_anonimo):
    assert cliente_api.delete(f"/api/usuarios/{maria['id']}").status_code == 204

    assert maria["cliente"].get("/api/eu").status_code == 401  # sessão dela caiu junto
    assert cliente_anonimo.post("/api/login", json={"login": "maria", "senha": "abcd"}).status_code == 401
    assert cliente_api.get("/api/usuarios").json() == []
    assert cliente_api.delete(f"/api/usuarios/{maria['id']}").status_code == 404

    # o login fica livre pra ser usado de novo
    assert cliente_api.post("/api/usuarios", json={"login": "maria", "senha": "wxyz", "menus": []}).status_code == 201


def test_admin_nao_excluivel(cliente_api):
    id_do_admin = cliente_api.get("/api/eu").json()["id"]
    resposta = cliente_api.delete(f"/api/usuarios/{id_do_admin}")
    assert resposta.status_code == 404
    assert resposta.json()["detail"] == "Recepcionista não encontrada."
    assert cliente_api.get("/api/eu").status_code == 200


def test_excluir_so_admin(maria):
    assert maria["cliente"].delete(f"/api/usuarios/{maria['id']}").status_code == 403
