"""Aparência da barbearia (white label): nome, tema e logo."""

import base64

from sqlalchemy import func, select

from app.crud import aparencia as crud
from app.models.aparencia import Aparencia

# um PNG de 1x1 pixel, o menor que ainda é uma imagem válida
PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAfbLI3wAAAABJRU5ErkJggg=="
)


def test_padrao_na_primeira_leitura(cliente_api):
    r = cliente_api.get("/api/aparencia")
    assert r.status_code == 200
    assert r.json() | {"atualizado_em": None} == {
        "linha_de_cima": "Barbearia", "nome": "Dom Alfredo", "tema": "classico",
        "logo_url": None, "atualizado_em": None}


def test_pegar_cria_a_linha_uma_vez_so(sessao):
    primeira = crud.pegar(sessao)
    segunda = crud.pegar(sessao)
    assert primeira.id == segunda.id == crud.ID_UNICO
    assert sessao.scalar(select(func.count()).select_from(Aparencia)) == 1


def test_edita_so_o_que_foi_enviado(cliente_api):
    r = cliente_api.put("/api/aparencia", json={"nome": "  Impacta "})
    assert r.json()["nome"] == "Impacta" and r.json()["linha_de_cima"] == "Barbearia"
    assert cliente_api.get("/api/aparencia").json()["nome"] == "Impacta"


def test_linha_de_cima_pode_ficar_vazia(cliente_api):
    assert cliente_api.put("/api/aparencia", json={"linha_de_cima": ""}).json()["linha_de_cima"] == ""


def test_troca_o_tema(cliente_api):
    assert cliente_api.put("/api/aparencia", json={"tema": "marinho"}).json()["tema"] == "marinho"


def test_tema_invalido_da_422(cliente_api):
    assert cliente_api.put("/api/aparencia", json={"tema": "rosa"}).status_code == 422


def test_nome_vazio_da_422(cliente_api):
    assert cliente_api.put("/api/aparencia", json={"nome": "   "}).status_code == 422


def test_nome_longo_da_422(cliente_api):
    assert cliente_api.put("/api/aparencia", json={"nome": "x" * 41}).status_code == 422


def test_envia_ve_e_tira_a_logo(cliente_api):
    r = cliente_api.put("/api/aparencia/logo", files={"logo": ("logo.png", PNG, "image/png")})
    assert r.status_code == 200 and r.json()["logo_url"].startswith("/api/aparencia/logo?v=")
    img = cliente_api.get("/api/aparencia/logo")
    assert img.status_code == 200 and img.headers["content-type"] == "image/png" and img.content == PNG
    assert img.headers["x-content-type-options"] == "nosniff"
    assert cliente_api.delete("/api/aparencia/logo").json()["logo_url"] is None
    assert cliente_api.get("/api/aparencia/logo").status_code == 404


def test_logo_svg_da_415(cliente_api):
    r = cliente_api.put("/api/aparencia/logo", files={"logo": ("l.svg", b"<svg/>", "image/svg+xml")})
    assert r.status_code == 415


def test_logo_grande_da_413(cliente_api):
    r = cliente_api.put("/api/aparencia/logo", files={"logo": ("l.png", b"0" * (2 * 1024 * 1024 + 1), "image/png")})
    assert r.status_code == 413


def test_logo_vazia_da_422(cliente_api):
    assert cliente_api.put("/api/aparencia/logo", files={"logo": ("l.png", b"", "image/png")}).status_code == 422
