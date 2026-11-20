"""Testes do login: entrar, sair, sessão vencida e troca da própria senha."""

import hashlib
from typing import get_args
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import select

from app.core import senha
from app.core.acesso import MENUS
from app.crud import usuarios as crud
from app.models.usuario import Sessao, Usuario
from app.schemas.usuario import Menu


def test_admin_padrao_entra(cliente_anonimo, sessao):
    crud.garantir_admin(sessao)
    resposta = cliente_anonimo.post("/api/login", json={"login": "admin", "senha": "123"})
    assert resposta.status_code == 200
    assert "sessao" in resposta.cookies

    eu = cliente_anonimo.get("/api/eu").json()
    assert eu["tipo"] == "admin"
    assert eu["menus"] == list(MENUS)
    assert eu["senha_padrao"] is True


def test_login_ignora_maiuscula_e_espaco(cliente_anonimo, sessao):
    crud.garantir_admin(sessao)
    resposta = cliente_anonimo.post("/api/login", json={"login": "  Admin ", "senha": "123"})
    assert resposta.status_code == 200


def test_senha_errada(cliente_anonimo, sessao):
    crud.garantir_admin(sessao)
    resposta = cliente_anonimo.post("/api/login", json={"login": "admin", "senha": "errada"})
    assert resposta.status_code == 401
    assert resposta.json()["detail"] == "Login ou senha incorretos."


def test_login_inexistente(cliente_anonimo, sessao):
    resposta = cliente_anonimo.post("/api/login", json={"login": "ninguem", "senha": "123"})
    assert resposta.status_code == 401
    assert resposta.json()["detail"] == "Login ou senha incorretos."


def test_eu_sem_login(cliente_anonimo):
    resposta = cliente_anonimo.get("/api/eu")
    assert resposta.status_code == 401
    assert resposta.json()["detail"] == "Faça login para continuar."


def test_cookie_invalido(cliente_anonimo):
    cliente_anonimo.cookies.set("sessao", "lixo")
    assert cliente_anonimo.get("/api/eu").status_code == 401


def test_sessao_vencida(cliente_api, sessao):
    assert cliente_api.get("/api/eu").status_code == 200

    registro = sessao.scalars(select(Sessao)).one()
    registro.expira_em = datetime.now(timezone.utc) - timedelta(hours=1)
    sessao.commit()

    assert cliente_api.get("/api/eu").status_code == 401


def test_bloqueado_perde_a_sessao_na_hora(cliente_api, sessao):
    # usuário inativo com sessão ainda válida no banco não passa
    admin = sessao.scalars(select(Usuario)).one()
    admin.ativo = False
    sessao.commit()
    assert cliente_api.get("/api/eu").status_code == 401


def test_login_de_bloqueado_da_403(cliente_anonimo, sessao):
    crud.garantir_admin(sessao)
    sessao.scalars(select(Usuario)).one().ativo = False
    sessao.commit()
    resposta = cliente_anonimo.post("/api/login", json={"login": "admin", "senha": "123"})
    assert resposta.status_code == 403
    assert resposta.json()["detail"] == "Seu acesso está bloqueado. Fale com o administrador."


def test_logout(cliente_api):
    assert cliente_api.get("/api/eu").status_code == 200
    assert cliente_api.post("/api/logout").status_code == 204
    assert cliente_api.get("/api/eu").status_code == 401


def test_logout_sem_sessao(cliente_anonimo):
    assert cliente_anonimo.post("/api/logout").status_code == 204


def test_token_nao_fica_no_banco(cliente_api, sessao):
    token = cliente_api.cookies.get("sessao")
    registro = sessao.scalars(select(Sessao)).one()
    assert token and registro.token_hash != token and len(registro.token_hash) == 64


def test_trocar_propria_senha(cliente_api, cliente_anonimo):
    errada = cliente_api.put("/api/eu/senha", json={"senha_atual": "xxx", "senha_nova": "novasenha"})
    assert errada.status_code == 422
    assert errada.json()["erros"] == [{"campo": "senha_atual", "mensagem": "Senha atual incorreta."}]

    certa = cliente_api.put("/api/eu/senha", json={"senha_atual": "123", "senha_nova": "novasenha"})
    assert certa.status_code == 204
    assert cliente_api.get("/api/eu").json()["senha_padrao"] is False

    assert cliente_anonimo.post("/api/login", json={"login": "admin", "senha": "novasenha"}).status_code == 200
    assert cliente_anonimo.post("/api/login", json={"login": "admin", "senha": "123"}).status_code == 401


def test_senha_nova_curta(cliente_api):
    resposta = cliente_api.put("/api/eu/senha", json={"senha_atual": "123", "senha_nova": "12"})
    assert resposta.status_code == 422
    assert resposta.json()["erros"] == [{"campo": "senha_nova", "mensagem": "use pelo menos 4 caracteres"}]


def test_senha_nova_longa_demais(cliente_api):
    resposta = cliente_api.put("/api/eu/senha", json={"senha_atual": "123", "senha_nova": "x" * 73})
    assert resposta.json()["erros"] == [{"campo": "senha_nova", "mensagem": "use no máximo 72 caracteres"}]


def test_login_sem_senha_diz_campo_obrigatorio(cliente_anonimo):
    resposta = cliente_anonimo.post("/api/login", json={"login": "x"})
    assert resposta.status_code == 422
    assert resposta.json()["erros"] == [{"campo": "senha", "mensagem": "campo obrigatório"}]


def test_menus_do_schema_e_do_acesso_sao_os_mesmos():
    assert set(get_args(Menu)) == set(MENUS)


def test_novo_login_apaga_sessoes_vencidas(cliente_anonimo, sessao):
    crud.garantir_admin(sessao)
    admin = sessao.scalars(select(Usuario)).one()
    sessao.add(Sessao(usuario_id=admin.id, token_hash="velha", expira_em=datetime.now(timezone.utc) - timedelta(hours=1)))
    sessao.commit()

    assert cliente_anonimo.post("/api/login", json={"login": "admin", "senha": "123"}).status_code == 200
    hashes = [registro.token_hash for registro in sessao.scalars(select(Sessao))]
    assert "velha" not in hashes and len(hashes) == 1


def test_entrar_de_novo_fecha_a_sessao_do_cookie_antigo(cliente_anonimo, sessao):
    crud.garantir_admin(sessao)
    cliente_anonimo.post("/api/login", json={"login": "admin", "senha": "123"})
    antigo = sessao.scalars(select(Sessao)).one().token_hash

    cliente_anonimo.post("/api/login", json={"login": "admin", "senha": "123"})  # o cookie antigo vai junto
    hashes = [registro.token_hash for registro in sessao.scalars(select(Sessao))]
    assert antigo not in hashes and len(hashes) == 1


def test_garantir_admin_nao_duplica(sessao):
    crud.garantir_admin(sessao)
    crud.garantir_admin(sessao)
    assert len(sessao.scalars(select(Usuario)).all()) == 1


def test_hash_nao_guarda_senha():
    guardado = senha.gerar_hash("123")
    assert guardado.startswith("scrypt$")
    assert not guardado.endswith("123")
    assert senha.conferir("123", guardado) is True
    assert senha.conferir("124", guardado) is False
    assert senha.conferir("123", "lixo") is False


def test_hash_usa_os_parametros_de_producao(monkeypatch):
    # o conftest baixa o custo nos testes; aqui volto ao valor real e confiro contra o scrypt puro
    monkeypatch.undo()
    guardado = senha.gerar_hash("123")
    formato, sal_hex, hash_hex = guardado.split("$")
    assert formato == "scrypt" and len(bytes.fromhex(sal_hex)) == 16
    esperado = hashlib.scrypt(b"123", salt=bytes.fromhex(sal_hex), n=2**14, r=8, p=1, dklen=32)
    assert bytes.fromhex(hash_hex) == esperado


def test_login_inexistente_confere_uma_vez_so(sessao, monkeypatch):
    chamadas = []
    original = senha.conferir
    monkeypatch.setattr(senha, "conferir", lambda *a: chamadas.append(a) or original(*a))
    monkeypatch.setattr(senha, "gerar_hash", lambda *a: pytest.fail("não deve gerar hash no login"))
    assert crud.autenticar(sessao, "ninguem", "x") is None
    assert len(chamadas) == 1
