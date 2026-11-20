# Histórico de atendimentos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Relatório do mês com a lista de atendimentos (cliente ↔ barbeiro) e o ranking dos serviços mais prestados.

**Architecture:** Roteador novo `/api/historico` com crud e schemas próprios, lendo só as tabelas
`agendamentos` e `agendamento_servicos` (sem migração). Página Next `/historico` que consome as
duas rotas, no padrão de `app/clientes/page.tsx`.

**Tech Stack:** FastAPI + SQLAlchemy 2 + Pydantic 2 + pytest · Next.js 16 + TypeScript + Tailwind 4.

**Spec:** `docs/superpowers/specs/2026-11-20-historico-design.md`

## Global Constraints

- Tudo em português (nomes de função, variáveis, comentários, mensagens), no tom dos arquivos existentes.
- Ranking, faturamento, ticket médio e pares contam **só `situacao == "concluido"`**.
- Valor de cada serviço = `ItemDoAgendamento.preco` (o combinado), nunca `Servico.preco`.
- Sem tabela nova, sem migração.
- Os testes têm que rodar no SQLite também (o conftest cai pra SQLite sem Postgres): nada de função SQL só do Postgres.
- Mês: `ano` 2000–2100, `mes` 1–12 (mesmas regras do `/api/agendamentos/ocupacao`).

## Review Focus

1. Mês sem nenhum atendimento → resumo com zeros, `ticket_medio == 0` (sem divisão por zero), listas vazias.
2. Atendimento no último dia do mês (31/01) entra; 01/02 não entra em janeiro.
3. Serviço que mudou de preço depois de concluído → faturamento usa o preço antigo.
4. Filtro de barbeiro no resumo não deixa vazar serviço de outro barbeiro no ranking.
5. `situacao=todas` na lista traz as quatro situações; valor inválido → 422.

---

### Task 1: Back-end — lista e resumo do histórico

**Files:**
- Create: `backend/app/schemas/historico.py`
- Create: `backend/app/crud/historico.py`
- Create: `backend/app/routers/historico.py`
- Modify: `backend/app/main.py` (import + `app.include_router(historico.roteador)`, descrição/versão "Etapa 4")
- Test: `backend/tests/test_historico.py`

**Interfaces:**
- Consumes: `AgendamentoResposta`, `ClienteDoAgendamento`, `BarbeiroDoAgendamento` de `app/schemas/agendamento.py`; `paginar` de `app/crud/comum.py`.
- Produces (HTTP):
  - `GET /api/historico?ano&mes&barbeiro_id?&cliente_id?&situacao=concluido&pagina=1&tamanho=20`
    → `HistoricoLista {total: int, itens: AgendamentoResposta[]}`; ordem `data desc, inicio desc, id desc`.
    `situacao: Literal["agendado","concluido","faltou","cancelado","todas"]`.
  - `GET /api/historico/resumo?ano&mes&barbeiro_id?` → `ResumoDoMes`:
    `{atendimentos: int, faturamento: float, ticket_medio: float, faltas: int, cancelados: int,
      servicos: [{servico_id, nome, quantidade, faturamento}], pares: [{cliente: ClienteDoAgendamento, barbeiro: BarbeiroDoAgendamento, atendimentos: int}]}`
    `servicos` ordenado por `quantidade desc, faturamento desc, nome`; `pares` top 5 por `atendimentos desc`.
- Crud: `listar(sessao, ano, mes, *, barbeiro_id, cliente_id, situacao, pagina, tamanho) -> tuple[int, list[Agendamento]]`
  e `resumo_do_mes(sessao, ano, mes, barbeiro_id=None) -> dict`. Helper `_periodo(ano, mes) -> tuple[date, date]` com `calendar.monthrange`.

- [ ] **Step 1: Escrever os testes**

Fixture `casa` igual à de `test_agendamento.py` (relógio travado em `SEGUNDA_ANTES = datetime(2029,12,31,8,0)`), mais um segundo barbeiro e um segundo cliente.
Helper `_atendido(cliente_api, relogio, casa, data, inicio, servicos, situacao="concluido", **ids)`: marca via `POST /api/agendamentos`, adianta o relógio pra depois do horário com `relogio(...)` e chama `PUT /api/agendamentos/{id}/situacao` (pula se `"agendado"`).

Testes (janeiro de 2030 = `ano=2030&mes=1`):
- `test_lista_so_concluidos_por_padrao` — 1 concluído, 1 faltou, 1 cancelado → `total == 1`.
- `test_lista_todas_as_situacoes` — `situacao=todas` → `total == 3`.
- `test_situacao_invalida_da_422` — `situacao=xyz` → 422.
- `test_lista_mais_recente_primeiro` — 01/01 09:00 e 03/01 09:00 → `itens[0]["data"] == "2030-01-03"`.
- `test_lista_filtra_por_barbeiro_e_cliente` — cada filtro só devolve o seu.
- `test_lista_respeita_o_mes` — atendimento em 31/01 entra em `mes=1`; em 01/02 não entra em `mes=1` e entra em `mes=2`.
- `test_lista_pagina` — 3 concluídos, `tamanho=2&pagina=2` → `total == 3`, `len(itens) == 1`.
- `test_resumo_conta_so_concluidos` — concluído corte+barba (55+45), concluído corte (55), faltou corte, cancelado barba →
  `atendimentos == 2`, `faturamento == 155.0`, `ticket_medio == 77.5`, `faltas == 1`, `cancelados == 1`.
- `test_ranking_ordena_por_quantidade` — corte 2x, barba 1x → `servicos[0] == {"servico_id": corte, "nome": "Corte clássico", "quantidade": 2, "faturamento": 110.0}`.
- `test_ranking_usa_preco_combinado` — concluir corte, depois `PUT /api/servicos/{corte}` com `preco: 70` → faturamento do corte `== 55.0`.
- `test_resumo_filtra_por_barbeiro` — barba só com o barbeiro 2 → resumo do barbeiro 1 não tem barba em `servicos`.
- `test_pares_cliente_barbeiro` — cliente 1 com barbeiro 1 duas vezes, cliente 2 com barbeiro 2 uma vez →
  `pares[0]["atendimentos"] == 2`, `pares[0]["cliente"]["id"] == cliente1`, `pares[0]["barbeiro"]["id"] == barbeiro1`.
- `test_resumo_de_mes_vazio` — `ano=2030&mes=6` → zeros, `ticket_medio == 0`, `servicos == []`, `pares == []`.
- `test_mes_invalido_da_422` — `mes=13` → 422.

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd backend; .venv\Scripts\python -m pytest tests/test_historico.py -q`
Expected: FAIL (404 nas rotas).

- [ ] **Step 3: Implementar schemas, crud e router; registrar no `main.py`**

Agregação do ranking: `select(ItemDoAgendamento.servico_id, Servico.nome, func.count(), func.sum(ItemDoAgendamento.preco))` com join em `Agendamento` e `Servico`, `group_by`, filtrado por período/situação/barbeiro. Pares: `group_by(cliente_id, barbeiro_id)` com `func.count()`, `limit(5)`, depois `sessao.get` de cliente/barbeiro. Converter `Decimal` → `float` com `round(..., 2)`.
A rota `/resumo` vem antes de qualquer rota com parâmetro de caminho.

- [ ] **Step 4: Rodar tudo**

Run: `cd backend; .venv\Scripts\python -m pytest -q`
Expected: todos passam (127 antigos + os novos).

- [ ] **Step 5: Commit**

```bash
git add backend/app/schemas/historico.py backend/app/crud/historico.py backend/app/routers/historico.py backend/app/main.py backend/tests/test_historico.py
git commit -m "Cria as rotas do historico de atendimentos e do resumo do mes"
```

### Task 2: Dados de exemplo

**Files:**
- Modify: `backend/popular_banco.py`

- [ ] **Step 1:** Função `_atendimentos_de_exemplo(sessao)`: se ainda não existe nenhum agendamento `concluido`, grava direto com o modelo `Agendamento` + `ItemDoAgendamento` (o `crud.criar` recusa horário passado) uns 15 atendimentos concluídos e 2 faltas espalhados nos dias úteis do mês corrente e do anterior, anteriores a hoje, combinando os clientes, barbeiros e serviços já cadastrados; `fim` = início + soma das durações; preço/duração copiados do serviço.
- [ ] **Step 2:** Run: `cd backend; .venv\Scripts\python popular_banco.py` duas vezes → a segunda diz que pulou.
- [ ] **Step 3: Commit** `git commit -m "Coloca atendimentos de exemplo no popular_banco"`

### Task 3: Front-end — tela Histórico

**Files:**
- Modify: `frontend/src/lib/tipos.ts` — `ListaDeHistorico {total; itens: Agendamento[]}`, `ServicoDoRanking {servico_id; nome; quantidade; faturamento}`, `ParClienteBarbeiro {cliente: Agendamento["cliente"]; barbeiro: Agendamento["barbeiro"]; atendimentos}`, `ResumoDoMes {...}`, `FiltroDeSituacao = Situacao | "todas"`.
- Modify: `frontend/src/lib/api.ts` — `listarHistorico(ano, mes, filtros: {barbeiroId?, clienteId?, situacao?}, pagina = 1, tamanho = 20)` e `resumoDoMes(ano, mes, barbeiroId?)`.
- Modify: `frontend/src/components/MenuLateral.tsx` — `{ nome: "Histórico", caminho: "/historico" }` depois de Serviços; atualizar o comentário das etapas.
- Create: `frontend/src/app/historico/page.tsx`
- Create: `frontend/src/components/RankingDeServicos.tsx` — props `{servicos: ServicoDoRanking[]}`; barra proporcional à maior quantidade, quantidade e `reais(faturamento)`.

- [ ] **Step 1:** Tipos e funções de API.
- [ ] **Step 2:** Página: `Topo migalhas={["Histórico", "Atendimentos"]}`; título "Histórico"; navegação `‹ Novembro 2026 ›` (começa no mês de hoje); três números (Atendimentos, Faturamento, Ticket médio) + faltas/cancelados em texto menor; filtros: select de barbeiro (`listarBarbeiros("",1,100)`), `BuscaDeCliente`, select de situação (Concluídos / Faltas / Cancelados / Agendados / Todos, padrão Concluídos); tabela Data · Cliente · Barbeiro (bolinha da cor) · Serviços · Total · Situação (`NOME_DA_SITUACAO`); `Paginacao`; coluna direita com `Secao titulo="Mais pedidos"` + `RankingDeServicos` e `Secao titulo="Cliente e barbeiro"` com os pares. Mudar mês ou filtro volta pra página 1. Vazio: "Nenhum atendimento nesse mês." Erro: mesmo aviso de `clientes/page.tsx`.
- [ ] **Step 3:** Run: `cd frontend; npm run lint; npx tsc --noEmit` → sem erros.
- [ ] **Step 4:** Abrir `http://localhost:3020/historico` no navegador, trocar de mês e filtros, conferir com os números da API.
- [ ] **Step 5: Commit** `git commit -m "Cria a tela de historico com o ranking de servicos do mes"`

### Task 4: README

- [ ] **Step 1:** Seção "O que já está pronto" + tabela da API com as duas rotas; contagem de testes atualizada; print novo `docs/imagens/historico-do-mes.jpg` na seção "As telas".
- [ ] **Step 2: Commit** `git commit -m "Documenta o historico no README"`
