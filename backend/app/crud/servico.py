"""Consultas do serviço no banco. Mesmo desenho do crud do barbeiro."""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.erros import RegistroDuplicado
from app.crud.comum import impedir_exclusao_com_agenda, paginar, salvar
from app.models.agendamento import Agendamento
from app.models.servico import Servico
from app.schemas.servico import ServicoAtualizar, ServicoCriar

CAMPOS_QUE_PODEM_FICAR_VAZIOS = {"descricao"}


def _conferir_nome(sessao: Session, nome: str | None, ignorar_id: int | None = None) -> None:
    """"Barba" e "barba" são o mesmo serviço, então comparo sem ligar pra maiúscula."""
    if not nome:
        return
    consulta = select(Servico).where(func.lower(Servico.nome) == nome.lower())
    if ignorar_id is not None:
        consulta = consulta.where(Servico.id != ignorar_id)
    if sessao.scalars(consulta).first():
        raise RegistroDuplicado("nome", nome, "serviço")


def criar(sessao: Session, dados: ServicoCriar) -> Servico:
    _conferir_nome(sessao, dados.nome)
    return salvar(sessao, Servico(**dados.model_dump()))


def buscar_por_id(sessao: Session, servico_id: int) -> Servico | None:
    return sessao.get(Servico, servico_id)


def listar(
    sessao: Session, busca: str | None = None, ativo: bool | None = None, pagina: int = 1, tamanho: int = 50
) -> tuple[int, list[Servico]]:
    consulta = select(Servico)
    if busca and busca.strip():
        consulta = consulta.where(Servico.nome.ilike(f"%{busca.strip()}%"))
    if ativo is not None:
        consulta = consulta.where(Servico.ativo == ativo)

    # o cardápio fica na ordem do preço, que é como a tabela da parede é lida
    consulta = consulta.order_by(Servico.ativo.desc(), Servico.preco, Servico.nome)
    return paginar(sessao, consulta, pagina, tamanho)


def atualizar(sessao: Session, servico: Servico, dados: ServicoAtualizar) -> Servico:
    _conferir_nome(sessao, dados.nome, ignorar_id=servico.id)

    for campo, valor in dados.model_dump(exclude_unset=True).items():
        if valor is None and campo not in CAMPOS_QUE_PODEM_FICAR_VAZIOS:
            continue
        setattr(servico, campo, valor)

    return salvar(sessao, servico)


def remover(sessao: Session, servico: Servico) -> None:
    impedir_exclusao_com_agenda(sessao, Agendamento.servico_id == servico.id, "Esse serviço")
    sessao.delete(servico)
    sessao.commit()
