"""Ponto de entrada da API.

Rodar com:  uvicorn app.main:app --reload
Documentação automática:  http://localhost:8000/docs
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import config
from app.core.database import Base, engine
from app.core.erros import RegistroDuplicado
from app.models import Cliente  # noqa: F401 - precisa importar pro SQLAlchemy enxergar a tabela
from app.routers import clientes


@asynccontextmanager
async def ciclo_de_vida(app: FastAPI):
    """Roda uma vez quando a API sobe: garante que as tabelas existem."""
    try:
        Base.metadata.create_all(bind=engine)
        print("Banco conectado e tabelas prontas.")
    except Exception as erro:  # normalmente é o Postgres que não está de pé
        print("\n[ERRO] Não consegui falar com o banco.")
        print("Sobe o PostgreSQL com 'docker compose up -d' e confere o DATABASE_URL do .env")
        print(f"Detalhe: {erro}\n")
        raise

    yield  # daqui pra baixo seria o desligamento da API, não preciso de nada agora


app = FastAPI(
    title="Barbearia Dom Alfredo — API",
    description="Etapa 1 do trabalho: cadastro de clientes.",
    version="1.0.0",
    lifespan=ciclo_de_vida,
)

# sem isso o navegador barra as chamadas do Next (porta 3000) pra API (porta 8000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.origens_liberadas,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RegistroDuplicado)
async def tratar_duplicado(request: Request, erro: RegistroDuplicado):
    """Telefone/CPF/e-mail repetido vira 409 (conflito) em vez de estourar erro 500."""
    return JSONResponse(
        status_code=status.HTTP_409_CONFLICT,
        content={"detail": str(erro), "campo": erro.campo},
    )


@app.exception_handler(RequestValidationError)
async def tratar_validacao(request: Request, erro: RequestValidationError):
    """Deixo o erro de validação num formato simples pro front conseguir mostrar no campo certo."""
    problemas = []
    for item in erro.errors():
        # item["loc"] vem tipo ("body", "cpf"); eu quero só o nome do campo
        campo = item["loc"][-1] if len(item["loc"]) > 1 else "geral"
        problemas.append({"campo": str(campo), "mensagem": item["msg"].replace("Value error, ", "")})

    return JSONResponse(
        status_code=422,  # campo do formulário inválido
        content={"detail": "Confira os campos do formulário.", "erros": problemas},
    )


app.include_router(clientes.roteador)


@app.get("/", tags=["Status"], summary="Só pra saber se a API está de pé")
def raiz():
    return {"api": "Barbearia Dom Alfredo", "status": "online", "documentacao": "/docs"}
