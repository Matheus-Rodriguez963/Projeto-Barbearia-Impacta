"""Rotas de cliente — o CRUD completo da etapa 1."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import pegar_sessao
from app.core.erros import RegistroEmUso
from app.crud import agendamento as crud_agendamento
from app.crud import cliente as crud
from app.models.cliente import Cliente
from app.schemas.cliente import ClienteAtualizar, ClienteCriar, ClienteLista, ClienteResposta

roteador = APIRouter(prefix="/api/clientes", tags=["Clientes"])


def _pegar_cliente_ou_404(cliente_id: int, sessao: Session) -> Cliente:
    """Uso em toda rota que recebe id, pra não repetir o mesmo if em cada função."""
    cliente = crud.buscar_por_id(sessao, cliente_id)
    if cliente is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Cliente não encontrado.")
    return cliente


@roteador.post(
    "",
    response_model=ClienteResposta,
    status_code=status.HTTP_201_CREATED,
    summary="Cadastrar um cliente novo",
)
def cadastrar(dados: ClienteCriar, sessao: Session = Depends(pegar_sessao)):
    # se o telefone/CPF/e-mail repetir, o crud levanta RegistroDuplicado
    # e o tratador lá no main.py transforma isso em 409
    return crud.criar(sessao, dados)


@roteador.get("", response_model=ClienteLista, summary="Listar clientes (com busca e paginação)")
def listar(
    busca: str | None = Query(default=None, description="Nome, apelido, telefone ou CPF"),
    pagina: int = Query(default=1, ge=1),
    tamanho: int = Query(default=20, ge=1, le=100),
    sessao: Session = Depends(pegar_sessao),
):
    total, itens = crud.listar(sessao, busca=busca, pagina=pagina, tamanho=tamanho)
    return ClienteLista(total=total, itens=itens)


@roteador.get("/telefone/{telefone}", response_model=ClienteResposta, summary="Buscar pelo telefone")
def buscar_por_telefone(telefone: str, sessao: Session = Depends(pegar_sessao)):
    # no balcão a recepção pergunta o telefone primeiro, então essa rota existe pra isso
    cliente = crud.buscar_por_telefone(sessao, telefone)
    if cliente is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Nenhum cliente com esse telefone.")
    return cliente


@roteador.get("/{cliente_id}", response_model=ClienteResposta, summary="Ver a ficha de um cliente")
def detalhar(cliente_id: int, sessao: Session = Depends(pegar_sessao)):
    return _pegar_cliente_ou_404(cliente_id, sessao)


@roteador.put("/{cliente_id}", response_model=ClienteResposta, summary="Editar a ficha do cliente")
def editar(cliente_id: int, dados: ClienteAtualizar, sessao: Session = Depends(pegar_sessao)):
    cliente = _pegar_cliente_ou_404(cliente_id, sessao)
    return crud.atualizar(sessao, cliente, dados)


@roteador.delete("/{cliente_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Excluir o cadastro")
def excluir(cliente_id: int, sessao: Session = Depends(pegar_sessao)):
    cliente = _pegar_cliente_ou_404(cliente_id, sessao)
    # etapa 3: cliente com horário marcado (ou já atendido) não some, senão a agenda fica órfã
    if crud_agendamento.tem_agendamentos(sessao, cliente_id=cliente.id):
        raise RegistroEmUso("Esse cliente tem agendamentos. Cancele os horários dele antes, ou mantenha a ficha.")
    crud.remover(sessao, cliente)
    # 204 não devolve corpo nenhum
