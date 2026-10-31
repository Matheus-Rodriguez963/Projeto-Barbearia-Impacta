"""Erros meus, pra separar "deu problema de regra" de "deu problema de HTTP"."""


class RegistroDuplicado(Exception):
    """Já existe um cadastro com esse telefone / CPF / e-mail na mesma tabela."""

    def __init__(self, campo: str, valor: str, dono: str):
        self.campo = campo
        self.valor = valor
        super().__init__(f"Já existe um {dono} cadastrado com esse {campo}.")


class RegistroEmUso(Exception):
    """Tentaram apagar um cadastro que algum agendamento ainda aponta."""


class RegraDaAgenda(Exception):
    """O horário pedido quebra uma regra da agenda (fora do expediente, choque de horário...).

    Guardo o campo pra tela conseguir marcar de vermelho o lugar certo, igual ao duplicado.
    """

    def __init__(self, campo: str, mensagem: str):
        self.campo = campo
        super().__init__(mensagem)
