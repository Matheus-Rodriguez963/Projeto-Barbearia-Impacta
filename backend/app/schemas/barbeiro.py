"""Schemas do barbeiro: validam o que chega e formatam o que sai da API."""

from datetime import date, datetime, time
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, computed_field, field_validator, model_validator

from app.core.validadores import formatar_cpf, formatar_telefone
from app.schemas import regras

# as mesmas opções que aparecem na tela
Especialidade = Literal["Corte clássico", "Degradê", "Barba na navalha", "Toalha quente", "Pigmentação", "Infantil"]
DiaDaSemana = Literal["seg", "ter", "qua", "qui", "sex", "sab", "dom"]
CorDaAgenda = Literal["terracota", "oliva", "latao", "petroleo"]
Intervalo = Literal[0, 5, 10, 15]  # minutos; 0 é "Nenhum"
DuracaoDoAlmoco = Literal[30, 45, 60, 90]

# uso essas ordens pra guardar sempre do mesmo jeito, não importa a ordem do clique
ORDEM_DOS_DIAS = list(DiaDaSemana.__args__)
ORDEM_DAS_ESPECIALIDADES = list(Especialidade.__args__)

# pra mensagem de erro sair "na terça" e não "na ter"
NOME_DOS_DIAS = {
    "seg": "segunda", "ter": "terça", "qua": "quarta", "qui": "quinta",
    "sex": "sexta", "sab": "sábado", "dom": "domingo",
}


def _admissao(valor: date | None) -> date | None:
    # a barbearia é de 1962 (tá na placa), então ninguém foi contratado antes disso
    if valor is None:
        return None
    if valor > date.today():
        raise ValueError("a data de admissão não pode estar no futuro")
    if valor.year < 1962:
        raise ValueError("data de admissão muito antiga, confira o ano")
    return valor


def _almoco(valor: time | None) -> time | None:
    # a agenda anda de 5 em 5 minutos, então o almoço também
    if valor is not None and (valor.minute % 5 or valor.second):
        raise ValueError("o almoço começa de 5 em 5 minutos (12:00, 12:30...)")
    return valor


def _especialidades(valores: list[str] | None) -> list[str] | None:
    """Tira repetido, põe na ordem da tela e exige pelo menos uma marcada."""
    if valores is None:
        return None
    unicos = sorted(set(valores), key=ORDEM_DAS_ESPECIALIDADES.index)
    if not unicos:
        raise ValueError("marque pelo menos uma especialidade")
    return unicos


def _horarios(valores: list["HorarioDoDia"] | None) -> list["HorarioDoDia"] | None:
    """A semana precisa ter pelo menos um dia de trabalho e nenhum dia repetido."""
    if valores is None:
        return None
    if not valores:
        raise ValueError("marque pelo menos um dia de trabalho")

    dias = [horario.dia for horario in valores]
    repetidos = {dia for dia in dias if dias.count(dia) > 1}
    if repetidos:
        raise ValueError(f"a {NOME_DOS_DIAS[repetidos.pop()]} apareceu duas vezes")

    # gravo sempre de segunda a domingo, aí a tela não precisa reordenar nada
    return sorted(valores, key=lambda horario: ORDEM_DOS_DIAS.index(horario.dia))


# ---------------------------------------------------------------- horário de um dia

class HorarioDoDia(BaseModel):
    """Um dia de trabalho. Dia que não vem na lista é folga."""

    dia: DiaDaSemana
    entrada: time
    saida: time

    @model_validator(mode="after")
    def saida_depois_da_entrada(self):
        if self.saida <= self.entrada:
            raise ValueError(f"na {NOME_DOS_DIAS[self.dia]}, a saída tem que ser depois da entrada")
        return self


class HorarioResposta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    dia: str
    entrada: time
    saida: time


# ---------------------------------------------------------------- entrada

class _RegrasDoBarbeiro(BaseModel):
    """As validações ficam aqui uma vez só e o criar e o atualizar herdam."""

    _valida_texto = field_validator("nome", "apelido", "observacoes", check_fields=False)(regras.limpar_texto)
    _valida_nome = field_validator("nome", check_fields=False)(regras.nome_completo)
    _valida_telefone = field_validator("telefone", check_fields=False)(regras.telefone)
    _valida_cpf = field_validator("cpf", check_fields=False)(regras.cpf)
    _valida_admissao = field_validator("data_admissao", check_fields=False)(_admissao)
    _valida_especialidades = field_validator("especialidades", check_fields=False)(_especialidades)
    _valida_almoco = field_validator("almoco", check_fields=False)(_almoco)
    _valida_horarios = field_validator("horarios", check_fields=False)(_horarios)


class BarbeiroCriar(_RegrasDoBarbeiro):
    """POST /barbeiros"""

    nome: Annotated[str, Field(min_length=3, max_length=120)]
    apelido: Annotated[str | None, Field(default=None, max_length=60, description="Nome na cadeira")]
    telefone: Annotated[str, Field(description="Com ou sem máscara: (11) 99000-1234")]
    cpf: Annotated[str, Field(description="Com ou sem máscara: 529.982.247-25")]
    email: EmailStr | None = None
    data_admissao: date = Field(default_factory=date.today)
    especialidades: list[Especialidade]
    comissao: Annotated[int, Field(default=40, ge=0, le=100, description="Porcentagem que fica com o barbeiro")]
    intervalo: Intervalo = 5
    cor_agenda: CorDaAgenda = "terracota"
    almoco: time | None = Field(default=None, description="Ex: 12:00. Vazio = sem almoço")
    almoco_duracao: DuracaoDoAlmoco = 60
    horarios: list[HorarioDoDia]
    ativo: bool = True
    observacoes: str | None = None


class BarbeiroAtualizar(_RegrasDoBarbeiro):
    """PUT /barbeiros/{id} — só o que mudou. Se vierem horários, a semana nova substitui a antiga."""

    nome: Annotated[str | None, Field(default=None, min_length=3, max_length=120)]
    apelido: Annotated[str | None, Field(default=None, max_length=60)]
    telefone: str | None = None
    cpf: str | None = None
    email: EmailStr | None = None
    data_admissao: date | None = None
    especialidades: list[Especialidade] | None = None
    comissao: Annotated[int | None, Field(default=None, ge=0, le=100)]
    intervalo: Intervalo | None = None
    cor_agenda: CorDaAgenda | None = None
    almoco: time | None = None
    almoco_duracao: DuracaoDoAlmoco | None = None
    horarios: list[HorarioDoDia] | None = None
    ativo: bool | None = None
    observacoes: str | None = None


# ---------------------------------------------------------------- saída

class BarbeiroResposta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nome: str
    apelido: str | None
    telefone: str
    cpf: str
    email: str | None
    data_admissao: date
    especialidades: list[str]
    comissao: int
    intervalo: int
    cor_agenda: str
    almoco: time | None
    almoco_duracao: int
    horarios: list[HorarioResposta]
    ativo: bool
    observacoes: str | None
    criado_em: datetime | None
    atualizado_em: datetime | None
    # só pra montar o foto_url; os bytes da foto nunca vão no JSON
    foto_atualizada_em: datetime | None = Field(default=None, exclude=True)

    @computed_field
    @property
    def telefone_formatado(self) -> str:
        return formatar_telefone(self.telefone)

    @computed_field
    @property
    def cpf_formatado(self) -> str:
        return formatar_cpf(self.cpf)

    @computed_field
    @property
    def foto_url(self) -> str | None:
        # o ?v= muda toda vez que a foto é trocada, senão o navegador mostra a antiga do cache
        if self.foto_atualizada_em is None:
            return None
        return f"/api/barbeiros/{self.id}/foto?v={int(self.foto_atualizada_em.timestamp())}"

    @computed_field
    @property
    def nome_de_chamada(self) -> str:
        # é esse que vai pro "barbeiro preferido" da ficha do cliente
        return self.apelido or self.nome.split()[0]


class BarbeiroLista(BaseModel):
    total: int
    itens: list[BarbeiroResposta]
