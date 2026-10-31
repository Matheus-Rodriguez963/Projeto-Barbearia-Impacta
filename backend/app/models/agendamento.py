"""Tabelas do agendamento — a segunda parte da etapa 3.

São duas: o agendamento em si (quem, com quem, que dia e que horas) e os serviços
de cada agendamento, já que o cliente pode marcar corte e barba juntos.
"""

from datetime import date, datetime, time
from decimal import Decimal

from sqlalchemy import Date, DateTime, ForeignKey, Index, Integer, Numeric, String, Time, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.barbeiro import Barbeiro
from app.models.cliente import Cliente
from app.models.servico import Servico


class Agendamento(Base):
    __tablename__ = "agendamentos"
    # a pergunta que a agenda mais faz é "o que o Tião tem na quinta?", então indexo o par
    __table_args__ = (Index("ix_agendamentos_barbeiro_data", "barbeiro_id", "data"),)

    id: Mapped[int] = mapped_column(primary_key=True)

    # sem ondelete: o banco não deixa apagar cliente ou barbeiro que tem agendamento.
    # A API confere antes e devolve uma mensagem legível (ver routers).
    cliente_id: Mapped[int] = mapped_column(ForeignKey("clientes.id"), nullable=False, index=True)
    barbeiro_id: Mapped[int] = mapped_column(ForeignKey("barbeiros.id"), nullable=False)

    data: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    inicio: Mapped[time] = mapped_column(Time, nullable=False)
    # guardo o fim já calculado (início + duração dos serviços) pra não refazer a conta
    # toda vez que a agenda é desenhada, e pra duração não mudar se o serviço for editado
    fim: Mapped[time] = mapped_column(Time, nullable=False)

    # agendado -> concluido / faltou / cancelado. Só "agendado" ainda pode mudar.
    situacao: Mapped[str] = mapped_column(String(10), nullable=False, default="agendado")

    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    atualizado_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), onupdate=func.now())

    # selectin: a agenda do dia busca clientes, barbeiros e serviços numa consulta cada,
    # em vez de uma consulta por agendamento
    cliente: Mapped[Cliente] = relationship(lazy="selectin")
    barbeiro: Mapped[Barbeiro] = relationship(lazy="selectin")
    itens: Mapped[list["ItemDoAgendamento"]] = relationship(
        back_populates="agendamento",
        cascade="all, delete-orphan",
        order_by="ItemDoAgendamento.id",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<Agendamento {self.id} {self.data} {self.inicio:%H:%M}>"


class ItemDoAgendamento(Base):
    """Um serviço dentro do agendamento, com o preço e a duração do dia em que foi marcado."""

    __tablename__ = "agendamento_servicos"
    __table_args__ = (UniqueConstraint("agendamento_id", "servico_id", name="uq_agendamento_servico"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    agendamento_id: Mapped[int] = mapped_column(
        ForeignKey("agendamentos.id", ondelete="CASCADE"), nullable=False, index=True
    )
    servico_id: Mapped[int] = mapped_column(ForeignKey("servicos.id"), nullable=False)

    # copio do serviço na hora de marcar: se o preço subir amanhã, quem já marcou
    # paga o que foi combinado, e o caixa da próxima etapa lê daqui
    duracao: Mapped[int] = mapped_column(Integer, nullable=False)
    preco: Mapped[Decimal] = mapped_column(Numeric(8, 2), nullable=False)

    agendamento: Mapped[Agendamento] = relationship(back_populates="itens")
    servico: Mapped[Servico] = relationship(lazy="selectin")

    @property
    def nome(self) -> str:
        # o nome eu não copio: serviço usado não pode ser apagado, então ele sempre existe
        return self.servico.nome
