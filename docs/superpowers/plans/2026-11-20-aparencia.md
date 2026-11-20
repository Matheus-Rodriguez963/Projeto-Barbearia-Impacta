# Aparência (white label) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tela `/aparencia` onde a barbearia troca o nome, a logo e escolhe um de 4 temas de cor, gravado no banco e aplicado no sistema inteiro.

**Architecture:** Tabela `aparencia` com uma linha só e roteador `/api/aparencia` (mesmo padrão da foto do barbeiro). No front, os temas são blocos `html[data-tema="…"]` que redefinem as variáveis `--color-*` do `@theme`; o `layout.tsx` (servidor) lê a aparência e põe o `data-tema` no `<html>` antes de desenhar.

**Tech Stack:** FastAPI + SQLAlchemy 2 + Pydantic 2 + pytest · Next.js 16 + TypeScript + Tailwind 4.

**Spec:** `docs/superpowers/specs/2026-11-20-aparencia-design.md`

## Global Constraints

- **As fontes não mudam** (Bodoni, Oswald, Karla). Só cores. Layout e espaçamentos iguais.
- Fundo das telas sempre claro. Sem seletor de cor livre. Uma configuração por instalação.
- Tudo em português (nomes, comentários, mensagens), no tom dos arquivos existentes.
- Temas: `classico` (padrão) | `preto` | `marinho` | `verde`. Sem `data-tema` = Clássico = exatamente como hoje.
- Cores com significado são **fixas** entre temas: `sucesso` (o oliva de hoje #5a6236), `sucesso-texto` (#4c5330), `erro` (#a3341b), `agora` (#b23a1c), e as 4 cores dos barbeiros (`barbeiro-terracota` #7b2e17, `barbeiro-oliva` #5a6236, `barbeiro-latao` #c9a227, `barbeiro-petroleo` #2f3a4a).
- Texto sobre fundo ≥ 4,5:1 em todo tema; se a cor da tabela do spec não passar, ajusta o valor no `temas.css` mantendo o tom.
- Logo: só JPG/PNG/WEBP, até 2 MB (igual à foto). Sem SVG.
- Os testes do back rodam também no SQLite (o conftest cai pra SQLite sem Postgres).

## Review Focus

1. API fora do ar quando o layout desenha → o site abre com o padrão (Clássico, "Barbearia Dom Alfredo"), sem erro na tela. (Task 3, passo de verificação.)
2. Mexer no tema/nome na tela de Aparência e sair sem salvar → o sistema volta ao que está gravado. (Task 4.)
3. Logo larga com fundo transparente (PNG 2000×400) → reduzida mantendo a proporção e a transparência, nada de recorte quadrado nem fundo preto. (Task 4.)
4. `linha_de_cima` vazia → o menu não mostra a linha pequena e o título da aba fica "Agenda — Dom Alfredo", sem espaço sobrando. (Tasks 1 e 3.)
5. Nome com 40 caracteres → quebra em linhas dentro do menu, sem vazar. (Task 3.)

---

### Task 1: Back-end — aparência e logo

**Files:**
- Create: `backend/app/models/aparencia.py`, `backend/app/schemas/aparencia.py`, `backend/app/crud/aparencia.py`, `backend/app/routers/aparencia.py`
- Modify: `backend/app/models/__init__.py` (exporta `Aparencia`), `backend/app/main.py` (import do model e do roteador, `include_router`, versão `5.0.0`, descrição "… · Etapa 5: aparência.")
- Test: `backend/tests/test_aparencia.py`

**Interfaces:**
- Consumes: `pegar_sessao`; o padrão de `routers/barbeiros.py` (`TAMANHO_MAXIMO_DA_FOTO`, `TIPOS_DE_FOTO`, validação 415/413/422 da foto) — reaproveitar as constantes importando de lá ou movendo pra um lugar comum.
- Produces (HTTP):
  - `GET /api/aparencia` → `AparenciaResposta {linha_de_cima: str, nome: str, tema: "classico"|"preto"|"marinho"|"verde", logo_url: str | null, atualizado_em: datetime | null}`. `logo_url = "/api/aparencia/logo?v=<timestamp>"` (mesma ideia do `foto_url`).
  - `PUT /api/aparencia` com `AparenciaAtualizar` (todos opcionais; `linha_de_cima` 0–30 com strip; `nome` 1–40 com strip; `tema` Literal) → `AparenciaResposta`.
  - `PUT /api/aparencia/logo` (multipart, campo `logo`) → `AparenciaResposta`; `GET /api/aparencia/logo` → bytes com o `media_type` gravado (404 sem logo); `DELETE /api/aparencia/logo` → `AparenciaResposta`.
- Crud: `pegar(sessao) -> Aparencia` (cria a linha id 1 com os padrões se não existir), `atualizar(sessao, dados: AparenciaAtualizar) -> Aparencia`, `trocar_logo(sessao, conteudo: bytes | None, tipo: str | None = None) -> Aparencia`.
- Model `Aparencia`, tabela `aparencia`: `id`, `linha_de_cima` String(30) default "Barbearia", `nome` String(40) default "Dom Alfredo", `tema` String(20) default "classico", `logo` LargeBinary deferred, `logo_tipo` String(30), `logo_atualizada_em` DateTime(tz), `atualizado_em` DateTime(tz, onupdate).

- [ ] **Step 1: Escrever os testes** (`cliente_api` do conftest; PNG mínimo válido em bytes num helper)

```python
def test_padrao_na_primeira_leitura(cliente_api):
    r = cliente_api.get("/api/aparencia")
    assert r.status_code == 200
    assert r.json() | {"atualizado_em": None} == {
        "linha_de_cima": "Barbearia", "nome": "Dom Alfredo", "tema": "classico",
        "logo_url": None, "atualizado_em": None}

def test_edita_so_o_que_foi_enviado(cliente_api):
    r = cliente_api.put("/api/aparencia", json={"nome": "  Impacta "})
    assert r.json()["nome"] == "Impacta" and r.json()["linha_de_cima"] == "Barbearia"
    assert cliente_api.get("/api/aparencia").json()["nome"] == "Impacta"

def test_linha_de_cima_pode_ficar_vazia(cliente_api):
    assert cliente_api.put("/api/aparencia", json={"linha_de_cima": ""}).json()["linha_de_cima"] == ""

def test_troca_o_tema(cliente_api):
    assert cliente_api.put("/api/aparencia", json={"tema": "marinho"}).json()["tema"] == "marinho"

def test_tema_invalido_da_422(cliente_api):
    assert cliente_api.put("/api/aparencia", json={"tema": "rosa"}).status_code == 422

def test_nome_vazio_da_422(cliente_api):
    assert cliente_api.put("/api/aparencia", json={"nome": "   "}).status_code == 422

def test_nome_longo_da_422(cliente_api):
    assert cliente_api.put("/api/aparencia", json={"nome": "x" * 41}).status_code == 422

def test_envia_ve_e_tira_a_logo(cliente_api):
    r = cliente_api.put("/api/aparencia/logo", files={"logo": ("logo.png", PNG, "image/png")})
    assert r.status_code == 200 and r.json()["logo_url"].startswith("/api/aparencia/logo?v=")
    img = cliente_api.get("/api/aparencia/logo")
    assert img.status_code == 200 and img.headers["content-type"] == "image/png" and img.content == PNG
    assert cliente_api.delete("/api/aparencia/logo").json()["logo_url"] is None
    assert cliente_api.get("/api/aparencia/logo").status_code == 404

def test_logo_svg_da_415(cliente_api):
    r = cliente_api.put("/api/aparencia/logo", files={"logo": ("l.svg", b"<svg/>", "image/svg+xml")})
    assert r.status_code == 415

def test_logo_grande_da_413(cliente_api):
    r = cliente_api.put("/api/aparencia/logo", files={"logo": ("l.png", b"0" * (2 * 1024 * 1024 + 1), "image/png")})
    assert r.status_code == 413

def test_logo_vazia_da_422(cliente_api):
    assert cliente_api.put("/api/aparencia/logo", files={"logo": ("l.png", b"", "image/png")}).status_code == 422
```

- [ ] **Step 2: Rodar e ver falhar** — `cd backend; .venv\Scripts\python -m pytest tests/test_aparencia.py -q` → FAIL (404).
- [ ] **Step 3: Implementar model, schemas, crud e router; registrar no `main.py`.** As rotas `/logo` vêm antes de qualquer coisa com parâmetro (não há). O `GET` da logo responde com `Cache-Control` igual ao da foto do barbeiro.
- [ ] **Step 4: Rodar tudo** — `cd backend; .venv\Scripts\python -m pytest -q` → todos passam (141 antigos + 11 novos).
- [ ] **Step 5: Commit** — `git commit -m "Cria as rotas da aparencia e da logo"`

### Task 2: Front-end — os 4 temas e as cores fixas

**Files:**
- Create: `frontend/src/app/temas.css` (importado no topo do `globals.css`, depois do `@import "tailwindcss"`)
- Modify: `frontend/src/app/globals.css` (novas variáveis fixas no `@theme`; gradientes `.madeira`, `.moldura-latao`, `.papel-pautado`, barras de rolagem passam a usar variáveis), `frontend/src/lib/tipos.ts` (`CORES_DA_AGENDA.fundo` → `bg-barbeiro-*`), `frontend/src/components/AgendaDoDia.tsx` (`coresDo` → `var(--color-barbeiro-${cor})`; `#b23a1c` → `agora`), e todo `.tsx` com hexadecimal fixo ou `oliva` com sentido de "certo".

**Interfaces:**
- Produces: classes Tailwind novas `*-sucesso`, `*-sucesso-texto`, `*-agora`, `*-barbeiro-terracota|oliva|latao|petroleo`; o atributo `data-tema` no `<html>` com os valores `preto|marinho|verde` muda as cores (Task 3 e 4 só setam o atributo).

- [ ] **Step 1: Variáveis fixas no `@theme`** com os valores das Global Constraints.
- [ ] **Step 2: Trocar os usos de significado.** Todo `oliva` que quer dizer certo/livre/concluído/ligado (Botao, Chave, CalendarioDaAgenda, FichaBarbeiro, FormularioAgendamento, GavetaDeAgendamento, AgendaDoDia, faixa do almoço) vira `sucesso`; o `#4c5330` da gaveta vira `sucesso-texto`; `#b23a1c` vira `agora`. Só o `RankingDeServicos` continua `oliva` (decoração). Cores dos barbeiros → `barbeiro-*`.
- [ ] **Step 3: Trocar os hexadecimais fixos restantes** por variável do tema (direto, com `/opacidade` ou `color-mix`), pela regra do spec: tom da casa → variável do tema.
  Verificação: `grep -rnE "#[0-9a-fA-F]{3,8}\b" frontend/src --include=*.tsx` → nenhuma cor (só o que não é cor, se houver). `globals.css`/`temas.css` são os únicos lugares com hex.
- [ ] **Step 4: Escrever `temas.css`** com os blocos `html[data-tema="preto"]`, `"marinho"`, `"verde"` redefinindo todas as variáveis de tema da tabela do spec, mais as variações (`mogno-escuro`, `mogno-claro`, `terracota-claro`, `latao-claro`, `tinta-forte`, `tinta-media`, `tinta-fraca`, `creme`, `fundo`) e as que o Step 3 passou a usar. Ajustes de contraste já conhecidos: `oliva` do Preto e ouro (≥ 4,5:1 sobre o papel, se continuar sendo usado como texto) e `latao` do Marinho sobre `mogno` (≥ 4,5:1).
- [ ] **Step 5: Conferir** — `cd frontend; npm run lint; npx tsc --noEmit` → sem erros. No navegador: Clássico idêntico ao de antes (comparar com `docs/imagens/historico-do-mes.jpg` e a agenda); depois `document.documentElement.dataset.tema = "preto" | "marinho" | "verde"` nas telas Agenda, Histórico, Marcar horário e Barbeiros: nada com a cor do Clássico sobrando, cores dos barbeiros e o verde de "Cabe certinho" iguais nos 4.
- [ ] **Step 6: Commit** — `git commit -m "Prepara as cores para os temas de aparencia"`

### Task 3: Front-end — o sistema lendo a aparência

**Files:**
- Modify: `frontend/src/lib/tipos.ts` (`Tema`, `Aparencia`, `DadosDaAparencia`, `TEMAS`), `frontend/src/lib/api.ts`, `frontend/src/app/layout.tsx`, `frontend/src/components/MenuLateral.tsx`, `frontend/src/components/FormularioAgendamento.tsx`, as 5 páginas com `metadata.title` fixo (`agenda`, `agenda/novo`, `barbeiros/novo`, `clientes/novo`, `servicos/novo`)
- Create: `frontend/src/components/AparenciaContexto.tsx`

**Interfaces:**
- Consumes: rotas da Task 1; `data-tema` da Task 2.
- Produces:
  - `type Tema = "classico" | "preto" | "marinho" | "verde"`; `interface Aparencia { linha_de_cima: string; nome: string; tema: Tema; logo_url: string | null; atualizado_em: string | null }`; `TEMAS: readonly { chave: Tema; nome: string; descricao: string }[]` com "Clássico / Preto e ouro / Marinho / Verde inglês".
  - `api.ts`: `pegarAparencia(): Promise<Aparencia>`, `salvarAparencia(dados: Partial<Pick<Aparencia,"linha_de_cima"|"nome"|"tema">>): Promise<Aparencia>`, `enviarLogo(logo: Blob): Promise<Aparencia>`, `removerLogo(): Promise<Aparencia>`, `enderecoDaLogo(logo_url: string): string` (prefixa a URL da API, como já é feito com a foto).
  - `AparenciaContexto.tsx` (client): `<ProvedorDeAparencia inicial={Aparencia}>` e `useAparencia(): { aparencia: Aparencia; previa: Partial<Aparencia> | null; mostrarPrevia(p: Partial<Aparencia> | null): void; atualizar(a: Aparencia): void }`. O valor exibido é `{...aparencia, ...previa}`; um `useEffect` mantém `document.documentElement.dataset.tema` igual ao tema exibido (remove o atributo no Clássico).
  - `APARENCIA_PADRAO: Aparencia` (Clássico, "Barbearia", "Dom Alfredo", sem logo) exportado de `tipos.ts`.

- [ ] **Step 1: Tipos e funções de API.**
- [ ] **Step 2: `layout.tsx`** — `async function lerAparencia(): Promise<Aparencia>` faz `fetch(URL_DA_API + "/api/aparencia", { cache: "no-store", signal: AbortSignal.timeout(1500) })` e devolve `APARENCIA_PADRAO` em qualquer falha. `<html data-tema={tema === "classico" ? undefined : tema}>`; envolve o conteúdo no `ProvedorDeAparencia`. `generateMetadata()` devolve `title: { default: marca, template: "%s — " + marca }`, com `marca = [linha_de_cima, nome].filter(Boolean).join(" ")`; as 5 páginas passam a ter só o próprio título (`"Agenda"`, `"Novo agendamento"`…).
- [ ] **Step 3: `MenuLateral`** usa `useAparencia()`: logo (`<img>` com altura máx. ~40px, largura automática) à esquerda do bloco de texto quando `logo_url`; a linha pequena só aparece se não for vazia; o nome quebra linha (`break-words`). Item `{ nome: "Aparência", caminho: "/aparencia" }` no fim. O cartão "A reserva" do `FormularioAgendamento` mostra a `marca`.
- [ ] **Step 4: Conferir** — lint + tsc limpos. `PUT /api/aparencia` com `{"nome":"Impacta","tema":"marinho"}` pelo `/docs` e recarregar: menu, aba e cartão "A reserva" com "Barbearia Impacta", tema marinho já no primeiro desenho (sem piscar). Com `linha_de_cima: ""`: menu sem a linha pequena, aba "Agenda — Impacta". Nome com 40 caracteres: quebra dentro do menu. Parar a API (`preview_stop` do servidor `api`) e recarregar: site abre no Clássico com "Dom Alfredo". Voltar tudo ao padrão no fim.
- [ ] **Step 5: Commit** — `git commit -m "Aplica o nome, a logo e o tema da aparencia no sistema"`

### Task 4: Front-end — tela de Aparência

**Files:**
- Create: `frontend/src/app/aparencia/page.tsx`, `frontend/src/components/EscolherTema.tsx`
- Modify: `frontend/src/lib/foto.ts` (nova `prepararLogo`), `frontend/src/components/EscolherFoto.tsx` (só se precisar parametrizar o hook pra logo)

**Interfaces:**
- Consumes: `useAparencia`, funções de API e `TEMAS` da Task 3.
- Produces: `prepararLogo(arquivo: File): Promise<Blob>` — reduz pra caber em 600×200 **mantendo a proporção**, sem recortar, e devolve PNG (preserva transparência); mesmas mensagens de erro do `prepararFoto`. `EscolherTema` props `{ valor: Tema; aoEscolher(t: Tema): void }`: 4 cartões com miniatura (faixa do menu, papel e botão nas cores do tema — a miniatura usa um wrapper com `data-tema` próprio pra pintar com as variáveis do tema, sem duplicar hex).

- [ ] **Step 1: `prepararLogo`.**
- [ ] **Step 2: Página** no padrão de `app/servicos/novo` / formulário de barbeiro: `Topo migalhas={["Aparência"]}`, título "Aparência", subtítulo curto. Seções: "Nome" (campos "Linha de cima" e "Nome da barbearia", com os limites 30/40 e erro de campo vindo da API), "Logo" (moldura de enviar/trocar/tirar, usando o hook de foto com `prepararLogo`), "Tema" (`EscolherTema`). Rodapé com "Salvar" e "Desfazer".
  - Prévia ao vivo: cada mudança chama `mostrarPrevia({...})` (nome, linha e tema; a logo nova aparece no menu como prévia por `blob:`).
  - Salvar: `salvarAparencia`, depois `enviarLogo`/`removerLogo` se mudou; `atualizar(resultado)`; `mostrarPrevia(null)`; `router.refresh()`; aviso de salvo.
  - Desfazer e desmontar a página (`useEffect` cleanup) chamam `mostrarPrevia(null)`.
- [ ] **Step 3: Conferir** — lint + tsc limpos. No navegador: clicar em cada tema muda o sistema na hora; digitar o nome muda o menu; sair pra Agenda sem salvar → volta ao gravado; salvar e recarregar → continua. Logo PNG larga com transparência (gerar uma 2000×400 no canvas ou com Python/Pillow se tiver) → aparece inteira, proporcional, fundo transparente; tirar a logo → menu só com texto. Erros: nome vazio mostra o erro no campo.
- [ ] **Step 4: Commit** — `git commit -m "Cria a tela de aparencia com previa ao vivo"`

### Task 5: README

- [ ] **Step 1:** Seção "Etapa 5 — aparência (white label)" no padrão da Etapa 4 (o que a tela faz, os 4 temas, as cores que não mudam e por quê, como foi feito); tabela da API com as 5 rotas; tabela `aparencia` na seção do banco; contagem de testes; print `docs/imagens/aparencia.jpg` (1568×778, como os outros) em "As telas"; endereço `/aparencia` na tabela de endereços; arquivos novos na estrutura de pastas. Topo do README: "Esta entrega é a Etapa 5".
- [ ] **Step 2: Commit** — `git commit -m "Documenta a aparencia no README"`
