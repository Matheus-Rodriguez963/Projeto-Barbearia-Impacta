"""Conexão com o PostgreSQL usando SQLAlchemy."""

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import config

# o engine é quem realmente fala com o banco
engine = create_engine(config.DATABASE_URL, echo=False, pool_pre_ping=True)

# cada requisição vai abrir uma sessão dessas pra ler/gravar
SessaoLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    """Classe mãe dos modelos — é dela que o SQLAlchemy descobre as tabelas."""


def pegar_sessao():
    """Dependência do FastAPI: entrega uma sessão e garante que ela feche no fim."""
    sessao = SessaoLocal()
    try:
        yield sessao
    finally:
        sessao.close()
