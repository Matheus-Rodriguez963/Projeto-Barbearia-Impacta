"""Tabela de agendamentos — o que liga o cliente ao barbeiro num dia e hora (etapa 3)."""

from datetime import date, datetime, time
from decimal import Decimal

from sqlalchemy import Date, DateTime, ForeignKey, Integer, Numeric, String, Text, Time, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.barbeiro import Barbeiro
from app.models.cliente import Cliente
from app.models.servico import Servico


class Agendamento(Base):
    __tablename__ = "agendamentos"

    id: Mapped[int] = mapped_column(primary_key=True)

    # quem, com quem e o quê. RESTRICT: o banco não deixa apagar um cliente, barbeiro ou
    # serviço que tem agendamento — o crud avisa antes com uma mensagem melhor
    cliente_id: Mapped[int] = mapped_column(ForeignKey("clientes.id", ondelete="RESTRICT"), nullable=False, index=True)
    barbeiro_id: Mapped[int] = mapped_column(
        ForeignKey("barbeiros.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    servico_id: Mapped[int] = mapped_column(ForeignKey("servicos.id", ondelete="RESTRICT"), nullable=False)

    # data e hora separadas: a tela da agenda filtra pelo dia, e a hora é a da cadeira (sem fuso)
    data: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    hora: Mapped[time] = mapped_column(Time, nullable=False)

    # copio a duração e o preço do serviço no momento em que marca. Se o preço do corte subir
    # mês que vem, o que já foi marcado (ou feito) continua com o valor combinado.
    duracao: Mapped[int] = mapped_column(Integer, nullable=False)
    preco: Mapped[Decimal] = mapped_column(Numeric(8, 2), nullable=False)

    # agendado -> concluido / cancelado / faltou
    status: Mapped[str] = mapped_column(String(12), nullable=False, default="agendado", index=True)
    observacoes: Mapped[str | None] = mapped_column(Text)

    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    atualizado_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), onupdate=func.now())

    # joined: a tela da agenda sempre mostra os três nomes, então já vem tudo numa consulta
    cliente: Mapped[Cliente] = relationship(lazy="joined")
    barbeiro: Mapped[Barbeiro] = relationship(lazy="joined")
    servico: Mapped[Servico] = relationship(lazy="joined")

    def __repr__(self) -> str:
        return f"<Agendamento {self.id} - {self.data} {self.hora:%H:%M}>"
