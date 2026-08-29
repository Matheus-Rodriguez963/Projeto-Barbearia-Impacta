"""Validações do Brasil (CPF e telefone) que eu uso tanto no schema quanto nos testes."""

import re

# DDDs que existem de verdade no país — evita cadastrar (00) ou (11111)
DDDS_VALIDOS = {
    11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28,
    31, 32, 33, 34, 35, 37, 38, 41, 42, 43, 44, 45, 46, 47, 48, 49,
    51, 53, 54, 55, 61, 62, 63, 64, 65, 66, 67, 68, 69,
    71, 73, 74, 75, 77, 79, 81, 82, 83, 84, 85, 86, 87, 88, 89,
    91, 92, 93, 94, 95, 96, 97, 98, 99,
}


def so_numeros(valor: str) -> str:
    """Tira ponto, traço, parêntese e espaço — no banco eu guardo só os dígitos."""
    return re.sub(r"\D", "", valor or "")


def cpf_valido(cpf: str) -> bool:
    """Confere os dois dígitos verificadores do CPF (o mesmo cálculo da Receita)."""
    numeros = so_numeros(cpf)

    if len(numeros) != 11:
        return False

    # 111.111.111-11 e afins passam na conta dos dígitos, então corto antes
    if numeros == numeros[0] * 11:
        return False

    # calculo o 1º dígito com os 9 primeiros números e o 2º com os 10 primeiros
    for quantidade in (9, 10):
        soma = sum(int(numeros[i]) * (quantidade + 1 - i) for i in range(quantidade))
        resto = (soma * 10) % 11
        digito = 0 if resto == 10 else resto
        if digito != int(numeros[quantidade]):
            return False

    return True


def telefone_valido(telefone: str) -> bool:
    """Aceita fixo (10 dígitos) e celular (11 dígitos, sempre começando com 9)."""
    numeros = so_numeros(telefone)

    if len(numeros) not in (10, 11):
        return False

    if int(numeros[:2]) not in DDDS_VALIDOS:
        return False

    # celular no Brasil tem o nono dígito e ele é sempre 9
    if len(numeros) == 11 and numeros[2] != "9":
        return False

    return True


def formatar_cpf(cpf: str) -> str:
    """Devolve 12345678909 como 123.456.789-09 (pra mostrar bonito no front)."""
    n = so_numeros(cpf)
    if len(n) != 11:
        return cpf
    return f"{n[:3]}.{n[3:6]}.{n[6:9]}-{n[9:]}"


def formatar_telefone(telefone: str) -> str:
    """Devolve 11990001234 como (11) 99000-1234."""
    n = so_numeros(telefone)
    if len(n) == 11:
        return f"({n[:2]}) {n[2:7]}-{n[7:]}"
    if len(n) == 10:
        return f"({n[:2]}) {n[2:6]}-{n[6:]}"
    return telefone
