"""Tabela da aparência — o "white label" da etapa 5.

É uma linha só (id 1): o nome, o tema e a logo que a barbearia escolheu pro sistema.
Quem cria essa linha é o crud, na primeira vez que alguém pergunta.
"""

from datetime import datetime

from sqlalchemy import DateTime, LargeBinary, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Aparencia(Base):
    __tablename__ = "aparencia"

    id: Mapped[int] = mapped_column(primary_key=True)

    # o texto pequeno em cima do nome ("Barbearia"); pode ficar vazio
    linha_de_cima: Mapped[str] = mapped_column(String(30), nullable=False, default="Barbearia")
    nome: Mapped[str] = mapped_column(String(40), nullable=False, default="Dom Alfredo")
    # classico, preto, marinho ou verde (quem confere é o schema)
    tema: Mapped[str] = mapped_column(String(20), nullable=False, default="classico")

    # mesma ideia da foto do barbeiro: os bytes ficam no banco e só carregam quando alguém pede
    logo: Mapped[bytes | None] = mapped_column(LargeBinary, deferred=True)
    logo_tipo: Mapped[str | None] = mapped_column(String(30))
    logo_atualizada_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    atualizado_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), onupdate=func.now())

    def __repr__(self) -> str:
        return f"<Aparencia {self.nome} ({self.tema})>"
