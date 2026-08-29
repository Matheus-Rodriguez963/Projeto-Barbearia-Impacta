"""Funções que conversam com o banco. Deixei separado das rotas pra poder testar sozinho."""

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.erros import RegistroDuplicado
from app.core.validadores import so_numeros
from app.models.cliente import Cliente
from app.schemas.cliente import ClienteAtualizar, ClienteCriar


def _conferir_duplicados(sessao: Session, dados, ignorar_id: int | None = None) -> None:
    """Antes de gravar eu olho se telefone/CPF/e-mail já são de outra pessoa.

    ignorar_id serve na edição: o próprio cliente não pode brigar com ele mesmo.
    """
    campos = {"telefone": dados.telefone, "cpf": dados.cpf, "email": dados.email}

    for campo, valor in campos.items():
        if not valor:  # na atualização vem None quando o campo não foi mandado
            continue

        consulta = select(Cliente).where(getattr(Cliente, campo) == valor)
        if ignorar_id is not None:
            consulta = consulta.where(Cliente.id != ignorar_id)

        if sessao.scalars(consulta).first():
            raise RegistroDuplicado(campo, valor)


def criar(sessao: Session, dados: ClienteCriar) -> Cliente:
    _conferir_duplicados(sessao, dados)

    cliente = Cliente(**dados.model_dump())
    sessao.add(cliente)
    sessao.commit()
    sessao.refresh(cliente)  # busca de volta o id e a data que o banco preencheu
    return cliente


def buscar_por_id(sessao: Session, cliente_id: int) -> Cliente | None:
    return sessao.get(Cliente, cliente_id)


def buscar_por_telefone(sessao: Session, telefone: str) -> Cliente | None:
    # aceito o telefone com máscara e limpo aqui mesmo
    return sessao.scalars(select(Cliente).where(Cliente.telefone == so_numeros(telefone))).first()


def listar(sessao: Session, busca: str | None = None, pagina: int = 1, tamanho: int = 20) -> tuple[int, list[Cliente]]:
    """Devolve (total de clientes, página pedida). O total é pro contador da tela."""
    consulta = select(Cliente)

    if busca:
        termo = busca.strip()
        numeros = so_numeros(termo)

        # procuro por nome (sem ligar pra maiúscula) ou pelos números do telefone/CPF
        filtros = [Cliente.nome.ilike(f"%{termo}%"), Cliente.apelido.ilike(f"%{termo}%")]
        if numeros:
            filtros.append(Cliente.telefone.like(f"%{numeros}%"))
            filtros.append(Cliente.cpf.like(f"%{numeros}%"))

        consulta = consulta.where(or_(*filtros))

    total = sessao.scalar(select(func.count()).select_from(consulta.subquery())) or 0

    # mais novos primeiro, que é o que interessa no balcão
    consulta = consulta.order_by(Cliente.criado_em.desc(), Cliente.id.desc())
    consulta = consulta.offset((pagina - 1) * tamanho).limit(tamanho)

    return total, list(sessao.scalars(consulta))


def atualizar(sessao: Session, cliente: Cliente, dados: ClienteAtualizar) -> Cliente:
    _conferir_duplicados(sessao, dados, ignorar_id=cliente.id)

    # exclude_unset: só mexe no que veio no corpo da requisição
    for campo, valor in dados.model_dump(exclude_unset=True).items():
        setattr(cliente, campo, valor)

    sessao.commit()
    sessao.refresh(cliente)
    return cliente


def remover(sessao: Session, cliente: Cliente) -> None:
    sessao.delete(cliente)
    sessao.commit()
