"""Schemas do agendamento: o que a tela manda pra marcar e o que a agenda recebe pra mostrar."""

from datetime import date, datetime, time, timedelta
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, computed_field, field_validator

from app.core.validadores import formatar_telefone
from app.schemas import regras
from app.schemas.barbeiro import BarbeiroResumo

# agendado é o único que ocupa a cadeira; os outros três são o fim da história
Status = Literal["agendado", "concluido", "cancelado", "faltou"]


def _hora_cheia(valor: time | None) -> time | None:
    """A agenda anda de 5 em 5 minutos e não tem segundos — 09:07 não existe."""
    if valor is None:
        return None
    if valor.minute % 5 != 0:
        raise ValueError("escolha um horário de 5 em 5 minutos")
    return valor.replace(second=0, microsecond=0, tzinfo=None)


class _RegrasDoAgendamento(BaseModel):
    _valida_texto = field_validator("observacoes", check_fields=False)(regras.limpar_texto)
    _valida_hora = field_validator("hora", check_fields=False)(_hora_cheia)


class AgendamentoCriar(_RegrasDoAgendamento):
    """POST /agendamentos — duração e preço vêm do serviço, não da tela."""

    cliente_id: int
    barbeiro_id: int
    servico_id: int
    data: date
    hora: Annotated[time, Field(description="Hora de início: 14:30")]
    observacoes: Annotated[str | None, Field(default=None, max_length=300)]


class AgendamentoAtualizar(_RegrasDoAgendamento):
    """PUT /agendamentos/{id} — remarcar (data, hora, barbeiro, serviço) ou mudar o status."""

    barbeiro_id: int | None = None
    servico_id: int | None = None
    data: date | None = None
    hora: time | None = None
    status: Status | None = None
    observacoes: Annotated[str | None, Field(default=None, max_length=300)]


# ---------------------------------------------------------------- saída

class ClienteResumo(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nome: str
    apelido: str | None
    telefone: str

    @computed_field
    @property
    def telefone_formatado(self) -> str:
        return formatar_telefone(self.telefone)


class ServicoResumo(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nome: str


class AgendamentoResposta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    data: date
    hora: time
    duracao: int
    preco: float
    status: str
    observacoes: str | None
    cliente: ClienteResumo
    barbeiro: BarbeiroResumo
    servico: ServicoResumo
    criado_em: datetime | None
    atualizado_em: datetime | None

    @computed_field
    @property
    def hora_fim(self) -> time:
        # a tela mostra "14:30 – 15:15"; a conta passa pelo datetime porque time não soma minutos
        return (datetime.combine(self.data, self.hora) + timedelta(minutes=self.duracao)).time()


class AgendamentoLista(BaseModel):
    total: int
    itens: list[AgendamentoResposta]


class HorariosLivres(BaseModel):
    """GET /agendamentos/horarios-livres — os botões de hora da tela de marcar."""

    data: date
    horarios: list[str]  # "09:00", "09:15"...
    motivo: str | None = None  # quando a lista vem vazia, explica o porquê (folga, fora da agenda...)
