"""Tabela de serviços — a primeira parte da etapa 3.

É o cardápio da casa: o que se faz, quanto tempo leva e quanto custa. A agenda usa a
duração pra saber até quando a cadeira fica ocupada, e o preço vai pro total do agendamento.
"""

from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, Integer, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Servico(Base):
    __tablename__ = "servicos"

    id: Mapped[int] = mapped_column(primary_key=True)

    # não pode ter dois "Degradê" no cardápio, senão a recepção não sabe qual marcar
    nome: Mapped[str] = mapped_column(String(60), nullable=False, unique=True, index=True)

    # a linha pequena embaixo do nome ("Toalha quente, espuma e loção pós-barba")
    descricao: Mapped[str | None] = mapped_column(String(120))

    # em minutos, só o tempo do serviço. A limpeza da cadeira eu não repito aqui:
    # ela já é o "intervalo" de cada barbeiro, que a agenda soma na hora de conferir choque.
    duracao: Mapped[int] = mapped_column(Integer, nullable=False)

    # Numeric e não float: dinheiro em float dá 54.99999 e no caixa isso vira problema
    preco: Mapped[Decimal] = mapped_column(Numeric(8, 2), nullable=False)

    # serviço que saiu do cardápio fica desligado em vez de apagado, porque os
    # agendamentos antigos continuam apontando pra ele
    ativo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, index=True)

    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    atualizado_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), onupdate=func.now())

    def __repr__(self) -> str:
        return f"<Servico {self.id} - {self.nome}>"
