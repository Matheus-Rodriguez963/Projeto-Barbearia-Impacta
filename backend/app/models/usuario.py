"""Tabelas do login: quem pode entrar (usuarios) e as sessões abertas (sessoes)."""

from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Usuario(Base):
    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(primary_key=True)
    # sempre em minúsculas (quem normaliza é o crud/schema)
    login: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    senha_hash: Mapped[str] = mapped_column(String(200), nullable=False)
    # admin ou recepcionista
    tipo: Mapped[str] = mapped_column(String(20), nullable=False)
    # menus liberados pra recepcionista; o admin enxerga todos sem precisar listar
    menus: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    ativo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    # true enquanto a senha ainda é a que o sistema criou (o front pede pra trocar)
    senha_padrao: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self) -> str:
        return f"<Usuario {self.login} ({self.tipo})>"


class Sessao(Base):
    __tablename__ = "sessoes"

    id: Mapped[int] = mapped_column(primary_key=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False)
    # no banco fica só o sha256 do token; o token de verdade só existe no cookie
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    criada_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    expira_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
