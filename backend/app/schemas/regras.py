"""Regras de campo que o cliente e o barbeiro têm em comum.

Cada função recebe o valor do campo e devolve ele limpo, ou levanta ValueError com a
mensagem que vai aparecer na tela. Todas aceitam None porque na edição (PUT) o campo
pode não vir.
"""

from app.core.validadores import cpf_valido, so_numeros, telefone_valido


def limpar_texto(valor: str | None) -> str | None:
    """Tira espaço sobrando; campo só com espaço vira None."""
    if valor is None:
        return None
    return " ".join(valor.split()) or None


def nome_completo(valor: str | None) -> str | None:
    if valor is not None and len(valor.split()) < 2:
        raise ValueError("informe o nome completo (nome e sobrenome)")
    return valor


def telefone(valor: str | None) -> str | None:
    if valor is None:
        return None
    if not telefone_valido(valor):
        raise ValueError("telefone inválido — use DDD + número, ex: (11) 99000-1234")
    return so_numeros(valor)  # no banco guardo só os dígitos


def cpf(valor: str | None) -> str | None:
    if valor is None:
        return None
    if not cpf_valido(valor):
        raise ValueError("CPF inválido — confira os números digitados")
    return so_numeros(valor)
