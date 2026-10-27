"""Consultas do barbeiro no banco. Mesmo desenho do crud do cliente."""

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.crud.comum import conferir_duplicados, filtrar_pela_busca, impedir_exclusao_com_agenda, paginar, salvar
from app.models.agendamento import Agendamento
from app.models.barbeiro import Barbeiro, HorarioBarbeiro
from app.schemas.barbeiro import BarbeiroAtualizar, BarbeiroCriar, HorarioDoDia

# esses podem ser apagados na edição; os outros, se vierem como null, eu ignoro
CAMPOS_QUE_PODEM_FICAR_VAZIOS = {"apelido", "email", "observacoes"}


def _montar_horarios(horarios: list[HorarioDoDia]) -> list[HorarioBarbeiro]:
    return [HorarioBarbeiro(dia=h.dia, entrada=h.entrada, saida=h.saida) for h in horarios]


def criar(sessao: Session, dados: BarbeiroCriar) -> Barbeiro:
    conferir_duplicados(sessao, Barbeiro, dados, "barbeiro")

    # os horários vão pra outra tabela, então separo eles do resto da ficha
    barbeiro = Barbeiro(**dados.model_dump(exclude={"horarios"}))
    barbeiro.horarios = _montar_horarios(dados.horarios)
    return salvar(sessao, barbeiro)


def buscar_por_id(sessao: Session, barbeiro_id: int) -> Barbeiro | None:
    return sessao.get(Barbeiro, barbeiro_id)


def listar(
    sessao: Session, busca: str | None = None, ativo: bool | None = None, pagina: int = 1, tamanho: int = 20
) -> tuple[int, list[Barbeiro]]:
    consulta = filtrar_pela_busca(select(Barbeiro), Barbeiro, busca)
    if ativo is not None:
        consulta = consulta.where(Barbeiro.ativo == ativo)

    # a equipe é pequena: ordem alfabética, com quem está disponível em cima
    consulta = consulta.order_by(Barbeiro.ativo.desc(), Barbeiro.nome)
    return paginar(sessao, consulta, pagina, tamanho)


def atualizar(sessao: Session, barbeiro: Barbeiro, dados: BarbeiroAtualizar) -> Barbeiro:
    conferir_duplicados(sessao, Barbeiro, dados, "barbeiro", ignorar_id=barbeiro.id)

    # a semana vem inteira: apago as linhas antigas e gravo as novas. O flush no meio é
    # obrigatório — sem ele o SQLAlchemy tenta inserir a terça nova antes de apagar a
    # velha, e o banco recusa por causa da regra de um registro por dia.
    if dados.horarios is not None:
        barbeiro.horarios.clear()
        sessao.flush()
        barbeiro.horarios = _montar_horarios(dados.horarios)

    for campo, valor in dados.model_dump(exclude_unset=True, exclude={"horarios"}).items():
        if valor is None and campo not in CAMPOS_QUE_PODEM_FICAR_VAZIOS:
            continue
        setattr(barbeiro, campo, valor)

    return salvar(sessao, barbeiro)


def trocar_foto(sessao: Session, barbeiro: Barbeiro, conteudo: bytes | None, tipo: str | None = None) -> Barbeiro:
    """Com conteudo grava a foto nova; com None tira a foto."""
    barbeiro.foto = conteudo
    barbeiro.foto_tipo = tipo
    barbeiro.foto_atualizada_em = datetime.now(timezone.utc) if conteudo else None
    return salvar(sessao, barbeiro)


def remover(sessao: Session, barbeiro: Barbeiro) -> None:
    impedir_exclusao_com_agenda(sessao, Agendamento.barbeiro_id == barbeiro.id, "Esse barbeiro")
    sessao.delete(barbeiro)
    sessao.commit()
