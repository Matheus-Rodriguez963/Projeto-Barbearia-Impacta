"""Tabela de clientes — é o que a etapa 1 do trabalho precisa entregar."""

from datetime import date, datetime

from sqlalchemy import Date, DateTime, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Cliente(Base):
    __tablename__ = "clientes"

    id: Mapped[int] = mapped_column(primary_key=True)

    # --- identificação ---
    nome: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    apelido: Mapped[str | None] = mapped_column(String(60))

    # telefone é a chave de busca no balcão, então é obrigatório e não pode repetir.
    # guardo só os números (11990001234) e deixo a formatação pro front.
    telefone: Mapped[str] = mapped_column(String(11), nullable=False, unique=True, index=True)

    # CPF também só com números, único (não pode ter dois cadastros da mesma pessoa)
    cpf: Mapped[str] = mapped_column(String(11), nullable=False, unique=True, index=True)

    # e-mail é opcional, mas se preencher não pode repetir.
    # unique aceita vários NULL no Postgres, então clientes sem e-mail não brigam entre si.
    email: Mapped[str | None] = mapped_column(String(120), unique=True, index=True)

    data_nascimento: Mapped[date | None] = mapped_column(Date)

    # --- preferências ---
    barbeiro_preferido: Mapped[str] = mapped_column(String(60), default="Sem preferência")
    origem: Mapped[str] = mapped_column(String(30), default="Indicação")
    observacoes: Mapped[str | None] = mapped_column(Text)

    # --- controle ---
    # server_default=func.now() faz o próprio Postgres carimbar a data
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    atualizado_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), onupdate=func.now())

    def __repr__(self) -> str:  # só pra ficar legível quando eu printo no terminal
        return f"<Cliente {self.id} - {self.nome}>"
