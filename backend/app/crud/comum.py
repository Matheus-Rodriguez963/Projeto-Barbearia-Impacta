"""O que o crud do cliente e o do barbeiro fazem igual."""

from sqlalchemy import Select, func, or_, select
from sqlalchemy.orm import Session

from app.core.erros import RegistroDuplicado
from app.core.validadores import so_numeros


def conferir_duplicados(sessao: Session, modelo, dados, dono: str, ignorar_id: int | None = None) -> None:
    """Antes de gravar, olho se telefone/CPF/e-mail já são de outra pessoa da mesma tabela.

    ignorar_id serve na edição: o próprio cadastro não pode brigar com ele mesmo.
    """
    for campo in ("telefone", "cpf", "email"):
        valor = getattr(dados, campo)
        if not valor:  # na edição vem None quando o campo não foi mandado
            continue

        consulta = select(modelo).where(getattr(modelo, campo) == valor)
        if ignorar_id is not None:
            consulta = consulta.where(modelo.id != ignorar_id)

        if sessao.scalars(consulta).first():
            raise RegistroDuplicado(campo, valor, dono)


def filtrar_pela_busca(consulta: Select, modelo, busca: str | None) -> Select:
    """Procura por nome/apelido (sem ligar pra maiúscula) ou pelos números do telefone/CPF."""
    if not busca or not busca.strip():
        return consulta

    termo = busca.strip()
    filtros = [modelo.nome.ilike(f"%{termo}%"), modelo.apelido.ilike(f"%{termo}%")]

    numeros = so_numeros(termo)
    if numeros:
        filtros += [modelo.telefone.like(f"%{numeros}%"), modelo.cpf.like(f"%{numeros}%")]

    return consulta.where(or_(*filtros))


def paginar(sessao: Session, consulta: Select, pagina: int, tamanho: int) -> tuple[int, list]:
    """Devolve (total, itens da página). O total é pro contador e a paginação da tela."""
    total = sessao.scalar(select(func.count()).select_from(consulta.subquery())) or 0
    itens = sessao.scalars(consulta.offset((pagina - 1) * tamanho).limit(tamanho))
    return total, list(itens)


def salvar(sessao: Session, registro):
    """Grava e busca de volta o que o banco preencheu (id, datas)."""
    sessao.add(registro)
    sessao.commit()
    sessao.refresh(registro)
    return registro
