"""Coloca alguns clientes de exemplo no banco, só pra tela não abrir vazia.

Rodar com:  python popular_banco.py
"""

from app.core.database import Base, SessaoLocal, engine
from app.crud import cliente as crud
from app.schemas.cliente import ClienteCriar

EXEMPLOS = [
    {
        "nome": "Rita Camargo", "apelido": "Rita", "telefone": "(11) 98888-7777",
        "cpf": "168.995.350-09", "email": "rita@email.com", "data_nascimento": "1988-03-12",
        "barbeiro_preferido": "Seu Alfredo", "origem": "Indicação",
        "observacoes": "Sempre marca no fim da tarde.",
    },
    {
        "nome": "Marcos Vieira", "telefone": "(11) 97777-6666", "cpf": "111.444.777-35",
        "email": "marcos@email.com", "barbeiro_preferido": "Tião da Navalha",
        "origem": "Instagram",
    },
    {
        "nome": "Joana Prado", "apelido": "Jô", "telefone": "(21) 96666-5555",
        "cpf": "529.982.247-25", "data_nascimento": "1995-11-30",
        "origem": "Passou na porta", "observacoes": "Máquina 2 nas laterais.",
    },
]


def main():
    Base.metadata.create_all(bind=engine)
    sessao = SessaoLocal()

    try:
        for exemplo in EXEMPLOS:
            dados = ClienteCriar(**exemplo)
            # se eu rodar o script duas vezes, pulo quem já está lá em vez de estourar erro
            if crud.buscar_por_telefone(sessao, dados.telefone):
                print(f"- {dados.nome} já estava cadastrado, pulei.")
                continue

            crud.criar(sessao, dados)
            print(f"+ {dados.nome} cadastrado.")
    finally:
        sessao.close()

    print("\nPronto! Abre http://localhost:3000/clientes pra ver.")


if __name__ == "__main__":
    main()
