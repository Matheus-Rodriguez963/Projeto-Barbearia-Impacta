"""Rotas de barbeiro — o CRUD completo da etapa 2."""

from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile, status
from sqlalchemy.orm import Session

from app.core.database import pegar_sessao
from app.crud import barbeiro as crud
from app.models.barbeiro import Barbeiro
from app.schemas.barbeiro import BarbeiroAtualizar, BarbeiroCriar, BarbeiroLista, BarbeiroResposta

roteador = APIRouter(prefix="/api/barbeiros", tags=["Barbeiros"])

# o front já reduz a foto pra 480x480 antes de mandar (fica uns 60 KB),
# então 2 MB é folga de sobra e barra alguém mandando a foto crua da câmera
TAMANHO_MAXIMO_DA_FOTO = 2 * 1024 * 1024
TIPOS_DE_FOTO = {"image/jpeg", "image/png", "image/webp"}


def _pegar_barbeiro_ou_404(barbeiro_id: int, sessao: Session) -> Barbeiro:
    barbeiro = crud.buscar_por_id(sessao, barbeiro_id)
    if barbeiro is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Barbeiro não encontrado.")
    return barbeiro


@roteador.post(
    "",
    response_model=BarbeiroResposta,
    status_code=status.HTTP_201_CREATED,
    summary="Cadastrar um barbeiro novo",
)
def cadastrar(dados: BarbeiroCriar, sessao: Session = Depends(pegar_sessao)):
    return crud.criar(sessao, dados)


@roteador.get("", response_model=BarbeiroLista, summary="Listar barbeiros (com busca, filtro e paginação)")
def listar(
    busca: str | None = Query(default=None, description="Nome, apelido, telefone ou CPF"),
    ativo: bool | None = Query(default=None, description="true = só quem está trabalhando"),
    pagina: int = Query(default=1, ge=1),
    tamanho: int = Query(default=20, ge=1, le=100),
    sessao: Session = Depends(pegar_sessao),
):
    total, itens = crud.listar(sessao, busca=busca, ativo=ativo, pagina=pagina, tamanho=tamanho)
    return BarbeiroLista(total=total, itens=itens)


@roteador.get("/{barbeiro_id}", response_model=BarbeiroResposta, summary="Ver a ficha de um barbeiro")
def detalhar(barbeiro_id: int, sessao: Session = Depends(pegar_sessao)):
    return _pegar_barbeiro_ou_404(barbeiro_id, sessao)


@roteador.put("/{barbeiro_id}", response_model=BarbeiroResposta, summary="Editar a ficha do barbeiro")
def editar(barbeiro_id: int, dados: BarbeiroAtualizar, sessao: Session = Depends(pegar_sessao)):
    barbeiro = _pegar_barbeiro_ou_404(barbeiro_id, sessao)
    return crud.atualizar(sessao, barbeiro, dados)


@roteador.put("/{barbeiro_id}/foto", response_model=BarbeiroResposta, summary="Enviar ou trocar a foto de perfil")
async def enviar_foto(barbeiro_id: int, foto: UploadFile = File(...), sessao: Session = Depends(pegar_sessao)):
    barbeiro = _pegar_barbeiro_ou_404(barbeiro_id, sessao)

    if foto.content_type not in TIPOS_DE_FOTO:
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="A foto precisa ser JPG, PNG ou WEBP.")

    # leio um byte a mais que o limite: se vier esse byte, o arquivo passou do tamanho
    conteudo = await foto.read(TAMANHO_MAXIMO_DA_FOTO + 1)
    if len(conteudo) > TAMANHO_MAXIMO_DA_FOTO:
        raise HTTPException(status.HTTP_413_CONTENT_TOO_LARGE, detail="A foto passou de 2 MB.")
    if not conteudo:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, detail="O arquivo da foto veio vazio.")

    return crud.trocar_foto(sessao, barbeiro, conteudo, foto.content_type)


@roteador.get(
    "/{barbeiro_id}/foto",
    response_class=Response,
    responses={200: {"content": {"image/jpeg": {}}}},
    summary="A foto de perfil (é o endereço que vai no <img>)",
)
def ver_foto(barbeiro_id: int, sessao: Session = Depends(pegar_sessao)):
    barbeiro = _pegar_barbeiro_ou_404(barbeiro_id, sessao)
    if barbeiro.foto is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Esse barbeiro ainda não tem foto.")

    # o endereço muda (?v=) quando a foto muda, então o navegador pode guardar por bastante tempo
    return Response(
        content=barbeiro.foto,
        media_type=barbeiro.foto_tipo,
        headers={"Cache-Control": "public, max-age=31536000, immutable"},
    )


@roteador.delete("/{barbeiro_id}/foto", response_model=BarbeiroResposta, summary="Tirar a foto de perfil")
def remover_foto(barbeiro_id: int, sessao: Session = Depends(pegar_sessao)):
    barbeiro = _pegar_barbeiro_ou_404(barbeiro_id, sessao)
    return crud.trocar_foto(sessao, barbeiro, None)


@roteador.delete("/{barbeiro_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Excluir o cadastro")
def excluir(barbeiro_id: int, sessao: Session = Depends(pegar_sessao)):
    barbeiro = _pegar_barbeiro_ou_404(barbeiro_id, sessao)
    crud.remover(sessao, barbeiro)
