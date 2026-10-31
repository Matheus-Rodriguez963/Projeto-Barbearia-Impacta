"""Tabelas do barbeiro — o que a etapa 2 do trabalho entrega.

São duas: a ficha do barbeiro e os horários dele, um registro por dia trabalhado.
Separei porque cada dia pode ter um horário diferente (no sábado a casa fecha mais cedo),
e assim a agenda da próxima etapa consegue perguntar direto pro banco quem trabalha
na quinta às 15h, sem eu ter que abrir um JSON.
"""

from datetime import date, datetime, time

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    LargeBinary,
    String,
    Text,
    Time,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Barbeiro(Base):
    __tablename__ = "barbeiros"

    id: Mapped[int] = mapped_column(primary_key=True)

    # --- identificação ---
    nome: Mapped[str] = mapped_column(String(120), nullable=False, index=True)

    # "nome na cadeira": é o que aparece pro cliente escolher ("Seu Alfredo", "Tião da Navalha").
    # se ficar em branco, a tela usa o nome.
    apelido: Mapped[str | None] = mapped_column(String(60))

    # mesma regra do cliente: só números e sem repetir
    telefone: Mapped[str] = mapped_column(String(11), nullable=False, unique=True, index=True)
    cpf: Mapped[str] = mapped_column(String(11), nullable=False, unique=True, index=True)
    email: Mapped[str | None] = mapped_column(String(120), unique=True, index=True)

    # a tela pede só mês e ano ("na casa desde ago/2019"), então gravo o dia 1 do mês
    data_admissao: Mapped[date] = mapped_column(Date, nullable=False)

    # --- foto de perfil ---
    # guardo a imagem no próprio banco em vez de numa pasta: assim o backup do Postgres
    # leva as fotos junto e não tem pasta de upload pra configurar em cada máquina.
    # deferred: a listagem não carrega os bytes de todo mundo, só quando alguém pede a foto.
    foto: Mapped[bytes | None] = mapped_column(LargeBinary, deferred=True)
    foto_tipo: Mapped[str | None] = mapped_column(String(30))  # image/jpeg, image/png...
    # serve pra saber se tem foto sem abrir os bytes, e pro navegador não mostrar a foto velha
    foto_atualizada_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # --- ofício ---
    # especialidades são uma lista curta e fixa, então guardo como JSON em vez de criar
    # mais uma tabela. O JSON também funciona no SQLite dos testes.
    especialidades: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)

    # porcentagem de cada serviço que fica com o barbeiro — vai ser usada no caixa
    comissao: Mapped[int] = mapped_column(Integer, nullable=False, default=40)

    # minutos de folga entre um cliente e outro (limpar a cadeira, trocar a capa)
    intervalo: Mapped[int] = mapped_column(Integer, nullable=False, default=5)

    # a cor que vai pintar os horários dele na agenda
    cor_agenda: Mapped[str] = mapped_column(String(20), nullable=False, default="terracota")

    # etapa 3: o almoço. Um horário só pra semana toda (é assim que a casa combina), e a
    # agenda não deixa marcar cliente nesse intervalo. Sem horário = não para pra almoçar.
    almoco: Mapped[time | None] = mapped_column(Time)
    almoco_duracao: Mapped[int] = mapped_column(Integer, nullable=False, default=60, server_default="60")

    # "disponível para agendamento": desliga em férias ou afastamento.
    # barbeiro que saiu também fica desligado em vez de apagado.
    ativo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, index=True)

    observacoes: Mapped[str | None] = mapped_column(Text)

    # --- controle ---
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    atualizado_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), onupdate=func.now())

    # delete-orphan: quando eu troco a lista de horários na edição, os antigos somem do banco.
    # selectin: na listagem ele busca os horários de todos os barbeiros numa consulta só.
    horarios: Mapped[list["HorarioBarbeiro"]] = relationship(
        back_populates="barbeiro",
        cascade="all, delete-orphan",
        order_by="HorarioBarbeiro.id",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<Barbeiro {self.id} - {self.nome}>"


class HorarioBarbeiro(Base):
    """Um dia de trabalho do barbeiro. Dia sem registro aqui é folga."""

    __tablename__ = "horarios_barbeiro"
    # o mesmo barbeiro não pode ter duas linhas pra terça
    __table_args__ = (UniqueConstraint("barbeiro_id", "dia", name="uq_horario_barbeiro_dia"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    barbeiro_id: Mapped[int] = mapped_column(
        ForeignKey("barbeiros.id", ondelete="CASCADE"), nullable=False, index=True
    )
    dia: Mapped[str] = mapped_column(String(3), nullable=False)  # seg, ter, qua...
    entrada: Mapped[time] = mapped_column(Time, nullable=False)
    saida: Mapped[time] = mapped_column(Time, nullable=False)

    barbeiro: Mapped[Barbeiro] = relationship(back_populates="horarios")

    def __repr__(self) -> str:
        return f"<Horario {self.dia} {self.entrada:%H:%M}-{self.saida:%H:%M}>"
