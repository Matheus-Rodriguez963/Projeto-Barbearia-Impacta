"""Testes das regras de CPF e telefone (sem banco, é só a conta)."""

import pytest

from app.core.validadores import (
    cpf_valido,
    formatar_cpf,
    formatar_telefone,
    so_numeros,
    telefone_valido,
)


@pytest.mark.parametrize("cpf", ["529.982.247-25", "52998224725", "168.995.350-09"])
def test_aceita_cpf_de_verdade(cpf):
    assert cpf_valido(cpf) is True


@pytest.mark.parametrize(
    "cpf",
    [
        "111.111.111-11",   # todos os dígitos iguais
        "529.982.247-26",   # último dígito trocado
        "1234567890",       # faltou um número
        "529.982.247-2555", # sobrou número
        "abc",
        "",
    ],
)
def test_recusa_cpf_errado(cpf):
    assert cpf_valido(cpf) is False


@pytest.mark.parametrize("telefone", ["(11) 99000-1234", "11990001234", "(11) 3000-1234"])
def test_aceita_telefone_de_verdade(telefone):
    assert telefone_valido(telefone) is True


@pytest.mark.parametrize(
    "telefone",
    [
        "(00) 99000-1234",  # DDD que não existe
        "(11) 89000-1234",  # celular tem que começar com 9
        "999001234",        # sem DDD
        "119900012345",     # dígito a mais
        "",
    ],
)
def test_recusa_telefone_errado(telefone):
    assert telefone_valido(telefone) is False


def test_limpa_a_mascara():
    assert so_numeros("(11) 99000-1234") == "11990001234"
    assert so_numeros("529.982.247-25") == "52998224725"


def test_coloca_a_mascara_de_volta():
    assert formatar_cpf("52998224725") == "529.982.247-25"
    assert formatar_telefone("11990001234") == "(11) 99000-1234"
    assert formatar_telefone("1130001234") == "(11) 3000-1234"
