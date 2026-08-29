"""Erros meus, pra separar "deu problema de regra" de "deu problema de HTTP"."""


class RegistroDuplicado(Exception):
    """Já existe um cliente com esse telefone / CPF / e-mail."""

    def __init__(self, campo: str, valor: str):
        self.campo = campo
        self.valor = valor
        super().__init__(f"Já existe um cliente cadastrado com esse {campo}.")
