"""Preparação dos testes: banco separado, sessão limpa e um cliente de teste da API.

Ele tenta usar o Postgres de teste (TEST_DATABASE_URL do .env). Se esse banco não
existir na máquina, cai automaticamente pro SQLite — assim o professor consegue
rodar o pytest mesmo sem subir o Docker.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.core.config import config
from app.core.database import Base, pegar_sessao
from app.main import app


def _montar_engine():
    """Tenta o Postgres de teste; se não conectar, usa SQLite na memória."""
    try:
        engine = create_engine(config.TEST_DATABASE_URL, pool_pre_ping=True)
        with engine.connect() as conexao:
            conexao.execute(text("SELECT 1"))
        print(f"\n[testes] usando PostgreSQL: {config.TEST_DATABASE_URL}")
        return engine
    except Exception:
        print("\n[testes] Postgres de teste indisponível — rodando no SQLite em memória.")
        # StaticPool mantém o mesmo banco em memória entre as conexões
        from sqlalchemy.pool import StaticPool

        return create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )


engine_teste = _montar_engine()
SessaoTeste = sessionmaker(bind=engine_teste, autoflush=False, autocommit=False)


@pytest.fixture
def sessao():
    """Cada teste começa com as tabelas zeradas, pra um não atrapalhar o outro."""
    Base.metadata.drop_all(bind=engine_teste)
    Base.metadata.create_all(bind=engine_teste)

    sessao = SessaoTeste()
    try:
        yield sessao
    finally:
        sessao.close()
        Base.metadata.drop_all(bind=engine_teste)


@pytest.fixture
def cliente_api(sessao):
    """TestClient já apontando pro banco de teste no lugar do banco de verdade."""

    def sessao_de_teste():
        yield sessao

    app.dependency_overrides[pegar_sessao] = sessao_de_teste

    # sem 'with' o TestClient não dispara o lifespan, ou seja, não encosta no banco real
    yield TestClient(app)

    app.dependency_overrides.clear()


@pytest.fixture
def ficha_valida():
    """Ficha completa que eu reaproveito em vários testes."""
    return {
        "nome": "Pablo Miguel Dias",
        "apelido": "Pablinho",
        "telefone": "(11) 99000-1234",
        "cpf": "529.982.247-25",
        "email": "pablo@email.com",
        "data_nascimento": "2000-05-17",
        "barbeiro_preferido": "Seu Alfredo",
        "origem": "Indicação",
        "observacoes": "Máquina 2 nas laterais.",
    }


@pytest.fixture
def barbeiro_valido():
    """Ficha completa de barbeiro, no mesmo espírito da ficha_valida do cliente."""
    return {
        "nome": "Sebastião Ramos",
        "apelido": "Tião da Navalha",
        "telefone": "(11) 98123-4567",
        "cpf": "529.982.247-25",
        "email": "tiao@domalfredo.com",
        "data_admissao": "2019-03-01",
        "especialidades": ["Barba na navalha", "Toalha quente", "Corte clássico"],
        "comissao": 45,
        "intervalo": 10,
        "cor_agenda": "oliva",
        # terça a sexta das 9 às 19, sábado fecha mais cedo
        "horarios": [
            {"dia": "ter", "entrada": "09:00", "saida": "19:00"},
            {"dia": "qua", "entrada": "09:00", "saida": "19:00"},
            {"dia": "qui", "entrada": "09:00", "saida": "19:00"},
            {"dia": "sex", "entrada": "09:00", "saida": "19:00"},
            {"dia": "sab", "entrada": "09:00", "saida": "17:00"},
        ],
        "observacoes": "Só ele faz a barba na toalha quente.",
    }
