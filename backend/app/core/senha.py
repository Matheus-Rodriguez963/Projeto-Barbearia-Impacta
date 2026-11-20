"""Senha guardada como hash (nunca o texto puro), só com a biblioteca padrão do Python."""

import hashlib
import hmac
import secrets

# parâmetros do scrypt: pesado o bastante pra dificultar adivinhação, leve pra uma barbearia
_N, _R, _P, _TAMANHO = 2**14, 8, 1, 32


def _derivar(senha: str, sal: bytes) -> bytes:
    return hashlib.scrypt(senha.encode("utf-8"), salt=sal, n=_N, r=_R, p=_P, dklen=_TAMANHO)


def gerar_hash(senha: str) -> str:
    """Devolve 'scrypt$<sal em hex>$<hash em hex>'; cada senha ganha um sal próprio."""
    sal = secrets.token_bytes(16)
    return f"scrypt${sal.hex()}${_derivar(senha, sal).hex()}"


def conferir(senha: str, hash_guardado: str) -> bool:
    """Confere a senha digitada com o hash guardado (comparação em tempo constante)."""
    try:
        formato, sal_hex, hash_hex = hash_guardado.split("$")
        if formato != "scrypt":
            return False
        esperado = bytes.fromhex(hash_hex)
        calculado = _derivar(senha, bytes.fromhex(sal_hex))
    except ValueError:
        return False
    return hmac.compare_digest(calculado, esperado)
