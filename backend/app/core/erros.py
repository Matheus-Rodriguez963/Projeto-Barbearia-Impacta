"""Erros meus, pra separar "deu problema de regra" de "deu problema de HTTP"."""


class RegistroDuplicado(Exception):
    """Já existe um cadastro com esse telefone / CPF / e-mail na mesma tabela."""

    def __init__(self, campo: str, valor: str, dono: str):
        self.campo = campo
        self.valor = valor
        super().__init__(f"Já existe um {dono} cadastrado com esse {campo}.")


class RegraDaAgenda(Exception):
    """O agendamento bate em alguma regra: barbeiro de folga, horário ocupado, data passada...

    campo diz qual parte da tela pintar de vermelho (data, hora, barbeiro_id...).
    """

    def __init__(self, campo: str, mensagem: str):
        self.campo = campo
        super().__init__(mensagem)


class RegistroEmUso(Exception):
    """Tentou apagar um cliente, barbeiro ou serviço que tem agendamento ligado a ele."""
