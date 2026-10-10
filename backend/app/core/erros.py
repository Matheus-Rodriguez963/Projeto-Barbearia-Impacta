"""Erros meus, pra separar "deu problema de regra" de "deu problema de HTTP"."""


class RegistroDuplicado(Exception):
    """Já existe um cadastro com esse telefone / CPF / e-mail na mesma tabela."""

    def __init__(self, campo: str, valor: str, dono: str):
        self.campo = campo
        self.valor = valor
        super().__init__(f"Já existe um {dono} cadastrado com esse {campo}.")
