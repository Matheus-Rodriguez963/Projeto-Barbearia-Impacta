"""Testes da API de barbeiros (etapa 2) — mesmo roteiro que eu usei no cliente."""

from sqlalchemy import func, select

from app.models import HorarioBarbeiro

ROTA = "/api/barbeiros"


def _um_dia(dia="seg", entrada="09:00", saida="18:00"):
    return [{"dia": dia, "entrada": entrada, "saida": saida}]


# ---------------------------------------------------------------- cadastrar

def test_almoco_e_opcional_e_pode_ser_tirado(cliente_api, barbeiro_valido):
    sem = cliente_api.post(ROTA, json=barbeiro_valido).json()
    assert sem["almoco"] is None
    assert sem["almoco_duracao"] == 60

    com = cliente_api.put(f"{ROTA}/{sem['id']}", json={"almoco": "12:30", "almoco_duracao": 45}).json()
    assert com["almoco"] == "12:30:00"
    assert com["almoco_duracao"] == 45

    tirado = cliente_api.put(f"{ROTA}/{sem['id']}", json={"almoco": None}).json()
    assert tirado["almoco"] is None


def test_recusa_almoco_quebrado_ou_duracao_fora_das_opcoes(cliente_api, barbeiro_valido):
    assert cliente_api.post(ROTA, json={**barbeiro_valido, "almoco": "12:07"}).status_code == 422
    assert cliente_api.post(ROTA, json={**barbeiro_valido, "almoco": "12:00", "almoco_duracao": 20}).status_code == 422


def test_cadastra_barbeiro_completo(cliente_api, barbeiro_valido):
    resposta = cliente_api.post(ROTA, json=barbeiro_valido)
    assert resposta.status_code == 201

    dados = resposta.json()
    assert dados["id"] > 0
    assert dados["telefone"] == "11981234567"
    assert dados["telefone_formatado"] == "(11) 98123-4567"
    assert dados["cpf_formatado"] == "529.982.247-25"
    assert dados["nome_de_chamada"] == "Tião da Navalha"
    assert dados["ativo"] is True
    assert dados["cor_agenda"] == "oliva"
    assert dados["intervalo"] == 10


def test_cada_dia_guarda_o_proprio_horario(cliente_api, barbeiro_valido):
    dados = cliente_api.post(ROTA, json=barbeiro_valido).json()

    sabado = next(h for h in dados["horarios"] if h["dia"] == "sab")
    terca = next(h for h in dados["horarios"] if h["dia"] == "ter")
    assert sabado["saida"] == "17:00:00"
    assert terca["saida"] == "19:00:00"


def test_horarios_ficam_numa_tabela_propria(cliente_api, barbeiro_valido, sessao):
    # cinco dias de trabalho = cinco linhas em horarios_barbeiro
    cliente_api.post(ROTA, json=barbeiro_valido)
    assert sessao.scalar(select(func.count()).select_from(HorarioBarbeiro)) == 5


def test_guarda_dias_e_especialidades_na_ordem_certa(cliente_api, barbeiro_valido):
    # a tela pode mandar fora de ordem; no banco eu quero sempre de segunda a domingo
    barbeiro_valido["horarios"] = list(reversed(barbeiro_valido["horarios"]))
    barbeiro_valido["especialidades"] = ["Infantil", "Degradê", "Infantil"]
    dados = cliente_api.post(ROTA, json=barbeiro_valido).json()

    assert [h["dia"] for h in dados["horarios"]] == ["ter", "qua", "qui", "sex", "sab"]
    assert dados["especialidades"] == ["Degradê", "Infantil"]


def test_sem_apelido_o_nome_de_chamada_e_o_primeiro_nome(cliente_api, barbeiro_valido):
    barbeiro_valido["apelido"] = "   "
    dados = cliente_api.post(ROTA, json=barbeiro_valido).json()

    assert dados["apelido"] is None
    assert dados["nome_de_chamada"] == "Sebastião"


def test_cadastra_so_com_o_obrigatorio(cliente_api):
    resposta = cliente_api.post(
        ROTA,
        json={
            "nome": "Roberto Lima",
            "telefone": "(11) 97000-1111",
            "cpf": "168.995.350-09",
            "especialidades": ["Corte clássico"],
            "horarios": _um_dia(),
        },
    )
    assert resposta.status_code == 201

    dados = resposta.json()
    assert dados["comissao"] == 40
    assert dados["intervalo"] == 5
    assert dados["cor_agenda"] == "terracota"


def test_recusa_sem_especialidade_nem_dia(cliente_api, barbeiro_valido):
    barbeiro_valido["especialidades"] = []
    barbeiro_valido["horarios"] = []
    resposta = cliente_api.post(ROTA, json=barbeiro_valido)

    assert resposta.status_code == 422
    campos = {erro["campo"] for erro in resposta.json()["erros"]}
    assert campos == {"especialidades", "horarios"}


def test_recusa_especialidade_que_nao_existe(cliente_api, barbeiro_valido):
    barbeiro_valido["especialidades"] = ["Massagem"]
    resposta = cliente_api.post(ROTA, json=barbeiro_valido)

    erro = resposta.json()["erros"][0]
    assert resposta.status_code == 422
    assert erro["campo"] == "especialidades"
    assert "opção inválida" in erro["mensagem"]


def test_recusa_saida_antes_da_entrada_e_diz_o_dia(cliente_api, barbeiro_valido):
    barbeiro_valido["horarios"][4] = {"dia": "sab", "entrada": "17:00", "saida": "09:00"}
    resposta = cliente_api.post(ROTA, json=barbeiro_valido)

    erro = resposta.json()["erros"][0]
    assert resposta.status_code == 422
    assert erro["campo"] == "horarios"
    assert "sábado" in erro["mensagem"]


def test_recusa_o_mesmo_dia_duas_vezes(cliente_api, barbeiro_valido):
    barbeiro_valido["horarios"].append({"dia": "ter", "entrada": "13:00", "saida": "20:00"})
    resposta = cliente_api.post(ROTA, json=barbeiro_valido)

    assert resposta.status_code == 422
    assert "terça" in resposta.json()["erros"][0]["mensagem"]


def test_recusa_intervalo_e_cor_fora_das_opcoes(cliente_api, barbeiro_valido):
    barbeiro_valido["intervalo"] = 30
    barbeiro_valido["cor_agenda"] = "rosa"
    resposta = cliente_api.post(ROTA, json=barbeiro_valido)

    assert resposta.status_code == 422
    campos = {erro["campo"] for erro in resposta.json()["erros"]}
    assert campos == {"intervalo", "cor_agenda"}


def test_recusa_comissao_fora_de_0_a_100(cliente_api, barbeiro_valido):
    barbeiro_valido["comissao"] = 120
    resposta = cliente_api.post(ROTA, json=barbeiro_valido)

    assert resposta.status_code == 422
    assert resposta.json()["erros"][0]["campo"] == "comissao"


def test_recusa_admissao_no_futuro(cliente_api, barbeiro_valido):
    barbeiro_valido["data_admissao"] = "2999-01-01"
    resposta = cliente_api.post(ROTA, json=barbeiro_valido)

    assert resposta.status_code == 422
    assert resposta.json()["erros"][0]["campo"] == "data_admissao"


def test_recusa_cpf_e_telefone_invalidos(cliente_api, barbeiro_valido):
    barbeiro_valido["cpf"] = "111.111.111-11"
    barbeiro_valido["telefone"] = "(00) 1234-5678"
    resposta = cliente_api.post(ROTA, json=barbeiro_valido)

    assert resposta.status_code == 422
    campos = {erro["campo"] for erro in resposta.json()["erros"]}
    assert {"cpf", "telefone"} <= campos


# ---------------------------------------------------------------- duplicados

def test_nao_deixa_repetir_telefone(cliente_api, barbeiro_valido):
    cliente_api.post(ROTA, json=barbeiro_valido)

    outro = dict(barbeiro_valido, nome="Outro Barbeiro", cpf="168.995.350-09", email="outro@email.com")
    resposta = cliente_api.post(ROTA, json=outro)

    assert resposta.status_code == 409
    assert resposta.json()["campo"] == "telefone"
    assert "barbeiro" in resposta.json()["detail"]


def test_nao_deixa_repetir_cpf(cliente_api, barbeiro_valido):
    cliente_api.post(ROTA, json=barbeiro_valido)

    outro = dict(barbeiro_valido, nome="Outro Barbeiro", telefone="(11) 97000-2222", email="outro@email.com")
    resposta = cliente_api.post(ROTA, json=outro)

    assert resposta.status_code == 409
    assert resposta.json()["campo"] == "cpf"


def test_barbeiro_pode_ser_cliente_tambem(cliente_api, barbeiro_valido, ficha_valida):
    # o Tião corta o cabelo com o Seu Alfredo: o mesmo CPF nas duas tabelas é permitido
    cliente_api.post("/api/clientes", json=ficha_valida)
    resposta = cliente_api.post(ROTA, json=barbeiro_valido)

    assert resposta.status_code == 201


# ---------------------------------------------------------------- listar

def _cadastrar_equipe(cliente_api, barbeiro_valido):
    cliente_api.post(ROTA, json=barbeiro_valido)
    cliente_api.post(
        ROTA,
        json={
            "nome": "Alfredo Bastos",
            "apelido": "Seu Alfredo",
            "telefone": "(11) 3333-4444",
            "cpf": "168.995.350-09",
            "especialidades": ["Corte clássico"],
            "horarios": _um_dia("ter"),
        },
    )
    cliente_api.post(
        ROTA,
        json={
            "nome": "Roberto Lima",
            "telefone": "(11) 97000-1111",
            "cpf": "111.444.777-35",
            "especialidades": ["Degradê"],
            "horarios": _um_dia("sex"),
            "ativo": False,
        },
    )


def test_lista_com_ativos_primeiro_e_em_ordem_alfabetica(cliente_api, barbeiro_valido):
    _cadastrar_equipe(cliente_api, barbeiro_valido)
    dados = cliente_api.get(ROTA).json()

    assert dados["total"] == 3
    assert [b["nome"] for b in dados["itens"]] == ["Alfredo Bastos", "Sebastião Ramos", "Roberto Lima"]


def test_filtra_so_os_disponiveis(cliente_api, barbeiro_valido):
    _cadastrar_equipe(cliente_api, barbeiro_valido)
    dados = cliente_api.get(ROTA, params={"ativo": "true"}).json()

    assert dados["total"] == 2
    assert all(b["ativo"] for b in dados["itens"])


def test_busca_pelo_apelido(cliente_api, barbeiro_valido):
    _cadastrar_equipe(cliente_api, barbeiro_valido)
    dados = cliente_api.get(ROTA, params={"busca": "navalha"}).json()

    assert dados["total"] == 1
    assert dados["itens"][0]["nome"] == "Sebastião Ramos"


def test_busca_pelo_telefone_com_mascara(cliente_api, barbeiro_valido):
    _cadastrar_equipe(cliente_api, barbeiro_valido)
    dados = cliente_api.get(ROTA, params={"busca": "(11) 3333"}).json()

    assert dados["total"] == 1
    assert dados["itens"][0]["apelido"] == "Seu Alfredo"


# ---------------------------------------------------------------- detalhar / editar / excluir

def test_abre_a_ficha_pelo_id(cliente_api, barbeiro_valido):
    criado = cliente_api.post(ROTA, json=barbeiro_valido).json()
    resposta = cliente_api.get(f"{ROTA}/{criado['id']}")

    assert resposta.status_code == 200
    assert resposta.json()["email"] == "tiao@domalfredo.com"
    assert len(resposta.json()["horarios"]) == 5


def test_id_que_nao_existe_da_404(cliente_api):
    resposta = cliente_api.get(f"{ROTA}/999")
    assert resposta.status_code == 404
    assert resposta.json()["detail"] == "Barbeiro não encontrado."


def test_desliga_a_agenda_sem_mexer_no_resto(cliente_api, barbeiro_valido):
    criado = cliente_api.post(ROTA, json=barbeiro_valido).json()
    resposta = cliente_api.put(f"{ROTA}/{criado['id']}", json={"ativo": False})

    assert resposta.status_code == 200
    dados = resposta.json()
    assert dados["ativo"] is False
    assert dados["horarios"] == criado["horarios"]
    assert dados["atualizado_em"] is not None


def test_edicao_troca_a_semana_inteira(cliente_api, barbeiro_valido, sessao):
    # de 5 dias pra só segunda: as 4 linhas que sobraram têm que sumir do banco
    criado = cliente_api.post(ROTA, json=barbeiro_valido).json()
    resposta = cliente_api.put(f"{ROTA}/{criado['id']}", json={"horarios": _um_dia("seg", "10:00", "16:00")})

    assert resposta.status_code == 200
    assert resposta.json()["horarios"] == [{"dia": "seg", "entrada": "10:00:00", "saida": "16:00:00"}]
    assert sessao.scalar(select(func.count()).select_from(HorarioBarbeiro)) == 1


def test_edicao_nao_pode_roubar_o_cpf_de_outro(cliente_api, barbeiro_valido):
    _cadastrar_equipe(cliente_api, barbeiro_valido)
    alfredo = cliente_api.get(ROTA, params={"busca": "Alfredo"}).json()["itens"][0]

    resposta = cliente_api.put(f"{ROTA}/{alfredo['id']}", json={"cpf": "529.982.247-25"})
    assert resposta.status_code == 409
    assert resposta.json()["campo"] == "cpf"


def test_barbeiro_pode_salvar_a_propria_ficha_de_novo(cliente_api, barbeiro_valido):
    criado = cliente_api.post(ROTA, json=barbeiro_valido).json()
    resposta = cliente_api.put(f"{ROTA}/{criado['id']}", json=barbeiro_valido)

    assert resposta.status_code == 200


def test_excluir_apaga_os_horarios_junto(cliente_api, barbeiro_valido, sessao):
    criado = cliente_api.post(ROTA, json=barbeiro_valido).json()

    assert cliente_api.delete(f"{ROTA}/{criado['id']}").status_code == 204
    assert cliente_api.get(f"{ROTA}/{criado['id']}").status_code == 404
    assert sessao.scalar(select(func.count()).select_from(HorarioBarbeiro)) == 0


def test_excluir_id_inexistente_da_404(cliente_api):
    assert cliente_api.delete(f"{ROTA}/999").status_code == 404


# ---------------------------------------------------------------- foto de perfil

# um PNG de verdade de 1x1 pixel, pequeno o bastante pra ficar escrito aqui no teste
PNG_1X1 = bytes.fromhex(
    "89504e470d0a1a0a0000000d4948445200000001000000010806000000"
    "1f15c4890000000d49444154789c6360000002000154a24f5d0000000049454e44ae426082"
)


def test_sem_foto_o_endereco_vem_vazio(cliente_api, barbeiro_valido):
    criado = cliente_api.post(ROTA, json=barbeiro_valido).json()

    assert criado["foto_url"] is None
    assert cliente_api.get(f"{ROTA}/{criado['id']}/foto").status_code == 404


def test_envia_e_devolve_a_mesma_foto(cliente_api, barbeiro_valido):
    criado = cliente_api.post(ROTA, json=barbeiro_valido).json()

    resposta = cliente_api.put(f"{ROTA}/{criado['id']}/foto", files={"foto": ("eu.png", PNG_1X1, "image/png")})
    assert resposta.status_code == 200
    assert resposta.json()["foto_url"].startswith(f"/api/barbeiros/{criado['id']}/foto?v=")

    foto = cliente_api.get(resposta.json()["foto_url"])
    assert foto.status_code == 200
    assert foto.headers["content-type"] == "image/png"
    assert foto.content == PNG_1X1


def test_a_lista_mostra_quem_tem_foto_sem_mandar_os_bytes(cliente_api, barbeiro_valido):
    criado = cliente_api.post(ROTA, json=barbeiro_valido).json()
    cliente_api.put(f"{ROTA}/{criado['id']}/foto", files={"foto": ("eu.png", PNG_1X1, "image/png")})

    item = cliente_api.get(ROTA).json()["itens"][0]
    assert item["foto_url"] is not None
    assert "foto" not in item and "foto_atualizada_em" not in item


def test_recusa_arquivo_que_nao_e_imagem(cliente_api, barbeiro_valido):
    criado = cliente_api.post(ROTA, json=barbeiro_valido).json()
    resposta = cliente_api.put(
        f"{ROTA}/{criado['id']}/foto", files={"foto": ("curriculo.pdf", b"%PDF-1.4", "application/pdf")}
    )
    assert resposta.status_code == 415


def test_recusa_foto_maior_que_2_mb(cliente_api, barbeiro_valido):
    criado = cliente_api.post(ROTA, json=barbeiro_valido).json()
    grande = b"\xff" * (2 * 1024 * 1024 + 1)
    resposta = cliente_api.put(f"{ROTA}/{criado['id']}/foto", files={"foto": ("grande.jpg", grande, "image/jpeg")})

    assert resposta.status_code == 413


def test_tira_a_foto(cliente_api, barbeiro_valido):
    criado = cliente_api.post(ROTA, json=barbeiro_valido).json()
    cliente_api.put(f"{ROTA}/{criado['id']}/foto", files={"foto": ("eu.png", PNG_1X1, "image/png")})

    resposta = cliente_api.delete(f"{ROTA}/{criado['id']}/foto")
    assert resposta.status_code == 200
    assert resposta.json()["foto_url"] is None
    assert cliente_api.get(f"{ROTA}/{criado['id']}/foto").status_code == 404
