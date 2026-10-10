"""Funções que conversam com o banco. Deixei separado das rotas pra poder testar sozinho."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.validadores import so_numeros
from app.crud.comum import conferir_duplicados, filtrar_pela_busca, paginar, salvar
from app.models.cliente import Cliente
from app.schemas.cliente import ClienteAtualizar, ClienteCriar


def criar(sessao: Session, dados: ClienteCriar) -> Cliente:
    conferir_duplicados(sessao, Cliente, dados, "cliente")
    return salvar(sessao, Cliente(**dados.model_dump()))


def buscar_por_id(sessao: Session, cliente_id: int) -> Cliente | None:
    return sessao.get(Cliente, cliente_id)


def buscar_por_telefone(sessao: Session, telefone: str) -> Cliente | None:
    # aceito o telefone com máscara e limpo aqui mesmo
    return sessao.scalars(select(Cliente).where(Cliente.telefone == so_numeros(telefone))).first()


def listar(sessao: Session, busca: str | None = None, pagina: int = 1, tamanho: int = 20) -> tuple[int, list[Cliente]]:
    consulta = filtrar_pela_busca(select(Cliente), Cliente, busca)
    # mais novos primeiro, que é o que interessa no balcão
    consulta = consulta.order_by(Cliente.criado_em.desc(), Cliente.id.desc())
    return paginar(sessao, consulta, pagina, tamanho)


def atualizar(sessao: Session, cliente: Cliente, dados: ClienteAtualizar) -> Cliente:
    conferir_duplicados(sessao, Cliente, dados, "cliente", ignorar_id=cliente.id)

    # exclude_unset: só mexe no que veio no corpo da requisição
    for campo, valor in dados.model_dump(exclude_unset=True).items():
        setattr(cliente, campo, valor)

    return salvar(sessao, cliente)


def remover(sessao: Session, cliente: Cliente) -> None:
    sessao.delete(cliente)
    sessao.commit()
