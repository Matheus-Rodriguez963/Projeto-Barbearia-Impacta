"""Tabela de serviços — o cardápio da casa (etapa 3).

Corte clássico, barba, corte com barba... Cada serviço tem o tempo que ocupa a cadeira
e o preço. A agenda usa a duração pra saber até que horas o barbeiro fica ocupado.
"""

from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Servico(Base):
    __tablename__ = "servicos"

    id: Mapped[int] = mapped_column(primary_key=True)

    # o nome é o que aparece no botão da agenda, então não pode ter dois iguais
    nome: Mapped[str] = mapped_column(String(60), nullable=False, unique=True, index=True)
    descricao: Mapped[str | None] = mapped_column(Text)

    # minutos de cadeira (sem contar o intervalo do barbeiro, que é dele e não do serviço)
    duracao: Mapped[int] = mapped_column(Integer, nullable=False, default=30)

    # Numeric e não float: dinheiro em float dá 49.99999 na hora de somar o caixa
    preco: Mapped[Decimal] = mapped_column(Numeric(8, 2), nullable=False)

    # mesma ideia do barbeiro: serviço que saiu do cardápio fica desligado em vez de apagado,
    # senão os agendamentos antigos perdem a referência
    ativo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, index=True)

    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    atualizado_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), onupdate=func.now())

    def __repr__(self) -> str:
        return f"<Servico {self.id} - {self.nome}>"
