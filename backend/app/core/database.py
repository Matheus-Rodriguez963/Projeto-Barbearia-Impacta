"""Conexão com o PostgreSQL usando SQLAlchemy."""

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import config

# o engine é quem realmente fala com o banco
engine = create_engine(config.DATABASE_URL, echo=False, pool_pre_ping=True)

# cada requisição vai abrir uma sessão dessas pra ler/gravar
SessaoLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    """Classe mãe dos modelos — é dela que o SQLAlchemy descobre as tabelas."""


# Colunas que entraram depois que a tabela já existia. O create_all só cria tabela que
# ainda não existe; ele não mexe numa tabela antiga. Como o trabalho não usa ferramenta de
# migração, eu acrescento aqui o que faltar, pra quem já tinha o banco da etapa 2 não perder nada.
COLUNAS_NOVAS = {
    "barbeiros": {
        "almoco": "TIME",
        "almoco_duracao": "INTEGER NOT NULL DEFAULT 60",
    },
}


def acrescentar_colunas_novas(motor) -> None:
    inspetor = inspect(motor)
    with motor.begin() as conexao:
        for tabela, colunas in COLUNAS_NOVAS.items():
            if not inspetor.has_table(tabela):
                continue  # tabela nova: o create_all já cria com tudo
            existentes = {coluna["name"] for coluna in inspetor.get_columns(tabela)}
            for nome, tipo in colunas.items():
                if nome not in existentes:
                    conexao.execute(text(f"ALTER TABLE {tabela} ADD COLUMN {nome} {tipo}"))


def pegar_sessao():
    """Dependência do FastAPI: entrega uma sessão e garante que ela feche no fim."""
    sessao = SessaoLocal()
    try:
        yield sessao
    finally:
        sessao.close()
