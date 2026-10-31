"""Schemas do agendamento.

Aqui fica só o formato dos dados. As regras que precisam do banco (o barbeiro trabalha
nesse dia? o horário já está ocupado?) ficam no crud/agendamento.py.
"""

from datetime import date, datetime, time
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, computed_field, field_validator

from app.core.validadores import formatar_telefone

# "agendado" é o único que ainda pode mudar; os outros três são o fim da história
Situacao = Literal["agendado", "concluido", "faltou", "cancelado"]


# ---------------------------------------------------------------- entrada

class AgendamentoCriar(BaseModel):
    """POST /agendamentos"""

    cliente_id: int
    barbeiro_id: int
    servicos: list[int] = Field(description="Ids dos serviços, na ordem em que vão ser feitos")
    data: date
    inicio: time = Field(description="Ex: 14:30")

    @field_validator("servicos")
    @classmethod
    def pelo_menos_um_servico(cls, valores: list[int]) -> list[int]:
        # dict.fromkeys tira o repetido sem bagunçar a ordem que a recepção marcou
        unicos = list(dict.fromkeys(valores))
        if not unicos:
            raise ValueError("escolha pelo menos um serviço")
        return unicos

    @field_validator("inicio")
    @classmethod
    def hora_redonda(cls, valor: time) -> time:
        if valor.minute % 5 != 0 or valor.second:
            raise ValueError("o horário anda de 5 em 5 minutos")
        return valor


class AgendamentoRemarcar(AgendamentoCriar):
    """PUT /agendamentos/{id} — manda o agendamento inteiro de novo, igual à tela de marcar.

    Não fiz "só o que mudou" aqui porque trocar um serviço muda o fim, que muda o choque
    com os outros horários: tudo tem que ser conferido junto de qualquer jeito.
    """


class MudarSituacao(BaseModel):
    """PUT /agendamentos/{id}/situacao"""

    situacao: Literal["concluido", "faltou", "cancelado"]


# ---------------------------------------------------------------- saída

class ClienteDoAgendamento(BaseModel):
    """Só o que a agenda precisa mostrar do cliente."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    nome: str
    apelido: str | None
    telefone: str

    @computed_field
    @property
    def telefone_formatado(self) -> str:
        return formatar_telefone(self.telefone)


class BarbeiroDoAgendamento(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nome: str
    apelido: str | None
    cor_agenda: str
    intervalo: int
    almoco: time | None
    almoco_duracao: int

    @computed_field
    @property
    def nome_de_chamada(self) -> str:
        return self.apelido or self.nome.split()[0]


class ServicoDoAgendamento(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    servico_id: int
    nome: str
    duracao: int
    preco: float


class AgendamentoResposta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    data: date
    inicio: time
    fim: time
    situacao: Situacao
    cliente: ClienteDoAgendamento
    barbeiro: BarbeiroDoAgendamento
    # no banco o nome é "itens"; pra fora chamo de servicos, que é o que a tela manda no POST
    servicos: list[ServicoDoAgendamento] = Field(validation_alias="itens")
    criado_em: datetime | None
    atualizado_em: datetime | None

    @computed_field
    @property
    def total(self) -> float:
        return sum(servico.preco for servico in self.servicos)

    @computed_field
    @property
    def duracao(self) -> int:
        return sum(servico.duracao for servico in self.servicos)


class HorarioLivre(BaseModel):
    hora: time
    livre: bool


class GradeDoDia(BaseModel):
    """Os horários que a tela de marcar oferece pra um barbeiro num dia."""

    trabalha: bool
    entrada: time | None = None
    saida: time | None = None
    horarios: list[HorarioLivre] = []


class DiaDoMes(BaseModel):
    """Um quadradinho do calendário da agenda."""

    data: date
    trabalha: bool  # alguém da equipe trabalha nesse dia da semana?
    ocupacao: int  # de 0 a 100 (%)
