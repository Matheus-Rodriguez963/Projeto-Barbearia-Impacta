"""Rotas da aparência — nome, tema e logo da barbearia (etapa 5)."""

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile, status
from sqlalchemy.orm import Session

from app.core.database import pegar_sessao
from app.crud import aparencia as crud
from app.routers.barbeiros import TAMANHO_MAXIMO_DA_FOTO, TIPOS_DE_FOTO  # a logo segue a mesma regra da foto
from app.schemas.aparencia import AparenciaAtualizar, AparenciaResposta

roteador = APIRouter(prefix="/api/aparencia", tags=["Aparência"])


@roteador.get("", response_model=AparenciaResposta, summary="Ver o nome, o tema e a logo")
def ver(sessao: Session = Depends(pegar_sessao)):
    return crud.pegar(sessao)


@roteador.put("", response_model=AparenciaResposta, summary="Mudar o nome ou o tema")
def editar(dados: AparenciaAtualizar, sessao: Session = Depends(pegar_sessao)):
    return crud.atualizar(sessao, dados)


@roteador.put("/logo", response_model=AparenciaResposta, summary="Enviar ou trocar a logo")
async def enviar_logo(logo: UploadFile = File(...), sessao: Session = Depends(pegar_sessao)):
    if logo.content_type not in TIPOS_DE_FOTO:
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="A logo precisa ser JPG, PNG ou WEBP.")

    # leio um byte a mais que o limite: se vier esse byte, o arquivo passou do tamanho
    conteudo = await logo.read(TAMANHO_MAXIMO_DA_FOTO + 1)
    if len(conteudo) > TAMANHO_MAXIMO_DA_FOTO:
        raise HTTPException(status.HTTP_413_CONTENT_TOO_LARGE, detail="A logo passou de 2 MB.")
    if not conteudo:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, detail="O arquivo da logo veio vazio.")

    return crud.trocar_logo(sessao, conteudo, logo.content_type)


@roteador.get(
    "/logo",
    response_class=Response,
    responses={200: {"content": {"image/png": {}}}},
    summary="A logo (é o endereço que vai no <img>)",
)
def ver_logo(sessao: Session = Depends(pegar_sessao)):
    aparencia = crud.pegar(sessao)
    if aparencia.logo is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="A barbearia ainda não tem logo.")

    # o endereço muda (?v=) quando a logo muda, então o navegador pode guardar por bastante tempo.
    # O nosniff faz o navegador acreditar no tipo que mandamos, sem "adivinhar" pelo conteúdo.
    return Response(
        content=aparencia.logo,
        media_type=aparencia.logo_tipo,
        headers={"Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff"},
    )


@roteador.delete("/logo", response_model=AparenciaResposta, summary="Tirar a logo")
def remover_logo(sessao: Session = Depends(pegar_sessao)):
    return crud.trocar_logo(sessao, None)
