# Barbearia Dom Alfredo — Sistema de Gestão

Trabalho de faculdade desenvolvido por etapas. **Esta entrega é a Etapa 3: os serviços e a
agenda**, somando com a Etapa 1 (cadastro de clientes) e a Etapa 2 (cadastro de barbeiros) — as
três completas com front-end, back-end, banco de dados e testes automatizados.

O sistema simula o balcão de uma barbearia: a recepcionista cadastra o cliente perguntando
primeiro o telefone (que é a chave de busca da agenda) e o resto da ficha pode ser
completado depois.

**Next.js 16 + TypeScript + Tailwind 4** no front · **FastAPI + SQLAlchemy 2** no back ·
**PostgreSQL 16** no banco · **113 testes** no pytest

---

## As telas

**Lista de clientes** — busca por nome, telefone ou CPF, com paginação:

![Lista de clientes](docs/imagens/lista-de-clientes.jpg)

**Cadastro de cliente** — a ficha da direita vai se preenchendo enquanto se digita:

![Cadastro de cliente](docs/imagens/cadastro-de-cliente.jpg)

**Validação** — o CPF é conferido pelos dígitos verificadores, então `111.111.111-11`
não passa:

![Validação do CPF](docs/imagens/validacao-do-cpf.jpg)

**Equipe de barbeiros** — com a foto, a cor de cada um na agenda e o horário da semana
(quando um dia foge do padrão, ele aparece embaixo):

![Lista de barbeiros](docs/imagens/lista-de-barbeiros.jpg)

**Cadastro de barbeiro** — cada dia tem o próprio horário, e o cartão da direita mostra como
o cliente vai ver o barbeiro:

![Cadastro de barbeiro](docs/imagens/cadastro-de-barbeiro.jpg)

**Agenda** — a tela inicial: quem vem, com qual barbeiro (a faixa à esquerda é a cor dele) e
pra fazer o quê, com Concluir e Cancelar direto na linha:

![Agenda do dia](docs/imagens/agenda-do-dia.jpg)

**Marcar horário** — escolhidos o cliente, o serviço, o barbeiro e o dia, aparecem só os
horários livres (o Beto trabalha até as 18h, então o último corte de 45 min é às 17:15):

![Marcar horário](docs/imagens/marcar-horario.jpg)

**Cardápio de serviços** — cada serviço com o tempo de cadeira e o preço:

![Cardápio de serviços](docs/imagens/cardapio-de-servicos.jpg)

**Cadastro de serviço** — o cartão da direita mostra como o serviço aparece na hora de marcar:

![Cadastro de serviço](docs/imagens/cadastro-de-servico.jpg)

---

## Índice

1. [Rodando em 3 passos](#rodando-em-3-passos)
2. [O que já está pronto](#o-que-já-está-pronto)
3. [Como o sistema é montado](#como-o-sistema-é-montado)
4. [Tecnologias usadas](#tecnologias-usadas)
5. [O que precisa ter instalado](#o-que-precisa-ter-instalado)
6. [Instalação passo a passo](#instalação-passo-a-passo)
7. [Como rodar o projeto](#como-rodar-o-projeto)
8. [Como rodar os testes](#como-rodar-os-testes)
9. [Decisões que eu tomei](#decisões-que-eu-tomei)
10. [Estrutura das pastas](#estrutura-das-pastas)
11. [O banco de dados](#o-banco-de-dados)
12. [A API (endpoints)](#a-api-endpoints)
13. [Regras de validação](#regras-de-validação)
14. [Deu problema? (soluções)](#deu-problema-soluções)

---

## Rodando em 3 passos

Precisa ter **Docker**, **Python 3.11+** e **Node 18+** na máquina. Se faltar algum,
veja [O que precisa ter instalado](#o-que-precisa-ter-instalado).

### 1. Instalar tudo (um comando só)

**Linux / macOS:**

```bash
bash scripts/instalar.sh
```

**Windows (PowerShell):**

```powershell
powershell -ExecutionPolicy Bypass -File scripts\instalar.ps1
```

> O `-ExecutionPolicy Bypass` é necessário porque o Windows bloqueia scripts `.ps1` por
> padrão. Ele vale só para essa execução, não muda a configuração da máquina.

O script sobe o PostgreSQL no Docker, instala as dependências do back e do front, cria os
arquivos `.env` e cadastra 3 clientes, 4 barbeiros, 5 serviços e alguns horários nos próximos
dias pra tela não abrir vazia.

### 2. Ligar os dois servidores

Precisa de **dois terminais abertos ao mesmo tempo**.

| Terminal | Linux / macOS | Windows (PowerShell) |
|---|---|---|
| 1 — a API | `bash scripts/rodar-backend.sh` | `powershell -ExecutionPolicy Bypass -File scripts\rodar-backend.ps1` |
| 2 — o site | `bash scripts/rodar-frontend.sh` | `powershell -ExecutionPolicy Bypass -File scripts\rodar-frontend.ps1` |

### 3. Abrir no navegador

**http://localhost:3020**

> **Por que a 3020 e não a 3000 (o padrão do Next)?** Na minha máquina a 3000 e a 3010 já
> estavam ocupadas por outros projetos, então fixei a 3020 no `package.json`. Se quiser
> trocar, veja [A porta 3020 já está em uso](#a-porta-3020-já-está-em-uso).

Se algo não subir, a seção [Deu problema?](#deu-problema-soluções) tem as falhas mais comuns.

---

## O que já está pronto

| Camada | Entrega |
|---|---|
| **Front-end** | Clientes, barbeiros e serviços: cadastro, listagem, edição e exclusão. Agenda: marcar, ver por dia ou semana, remarcar, concluir e cancelar |
| **Back-end** | API REST com o CRUD de clientes (6 rotas), barbeiros (8 rotas, com a foto), serviços (5 rotas) e agendamentos (6 rotas, com os horários livres), validações e tratamento de erros |
| **Banco** | Tabelas `clientes`, `barbeiros`, `horarios_barbeiro`, `servicos` e `agendamentos` criadas pelo SQLAlchemy |
| **Testes** | 113 testes no pytest cobrindo as validações, as regras da agenda e todas as rotas da API |

### Etapa 3 — serviços e agenda

- **Serviços (menu "Serviços"):** o cardápio da casa — corte clássico, barba, corte com barba,
  barboterapia e limpeza de pele já vêm de exemplo. Cada serviço tem nome, descrição, **duração**
  (o tempo de cadeira) e **preço**. Serviço que saiu do cardápio é desligado, não apagado.
- **Marcar horário (botão "Marcar horário"):** a tela segue a conversa do balcão — busca o
  cliente pelo nome ou telefone, escolhe o serviço, o barbeiro (o preferido do cliente já vem
  marcado) e o dia. Aí aparecem **só os horários livres**: a API confere o expediente do
  barbeiro naquele dia da semana, o tempo do serviço, o intervalo de limpar a cadeira e quem já
  está marcado.
- **Agenda (menu "Agenda"):** a tela que mostra os agendamentos — por dia ou 7 dias, com
  filtro por barbeiro e por situação (agendados, concluídos, cancelados e faltas), o total
  previsto em reais e os botões de **Concluir** e **Cancelar** direto na linha. "Abrir" leva pra
  ficha do agendamento, onde dá pra remarcar ou marcar falta.
- **As regras que a API não deixa passar:** data que já passou, barbeiro de folga ou fora da
  agenda, serviço que não cabe no expediente, dois clientes na mesma cadeira e o mesmo cliente
  em duas cadeiras ao mesmo tempo.
- **Ligação com as etapas 1 e 2:** cliente, barbeiro ou serviço com agendamento não pode ser
  excluído (a tela explica e sugere cancelar ou desativar).

### Etapa 2 — o que o cadastro de barbeiro tem

- **Foto de perfil:** clica na moldura dourada e escolhe a foto. O navegador recorta no
  quadrado e diminui antes de enviar, e a foto fica guardada no próprio banco.
- **Dados pessoais:** nome, nome na cadeira (o nome que o cliente vê), telefone, e-mail, CPF
  e "na casa desde" (mês e ano).
- **Ofício:** especialidades, comissão, intervalo entre atendimentos e a cor dele na agenda.
- **Dias e horários:** cada dia da semana tem o próprio horário (o sábado pode fechar mais
  cedo); dia desmarcado é folga.
- **Como o cliente vê:** o cartão da direita mostra, enquanto se digita, como o barbeiro vai
  aparecer para o cliente.
- **Disponível para agendamento:** chave para desligar em férias ou afastamento, sem apagar
  o cadastro.
- **Ligação com a Etapa 1:** o campo "barbeiro preferido" da ficha do cliente agora lista a
  equipe cadastrada (só quem está disponível), em vez de uma lista fixa no código.

### O que mudou na tela do cliente durante a Etapa 2

- **As fontes voltaram a aparecer.** Os títulos estavam saindo com a fonte do
  sistema em vez da Bodoni. O motivo: o `next/font` declarava as fontes no `<body>`, mas o
  tema do Tailwind é montado no `<html>`, um nível acima, onde elas ainda não existiam. Passei
  as fontes para o `<html>` no `layout.tsx`.
- **Acabamento:** acertei espaçamentos, a altura dos campos (45px) e a ficha da direita.

### Arrumação do código

Antes de fechar a etapa, tirei o que estava repetido entre cliente e barbeiro, pra próxima
etapa (serviços) já nascer em cima de peças prontas:

| Onde | O que era repetido | Virou |
|---|---|---|
| `schemas/` | as validações de nome, telefone, CPF e texto | `schemas/regras.py`, usado pelos dois |
| `crud/` | conferir duplicados, buscar e paginar | `crud/comum.py`, usado pelos dois |
| formulários | rodapé com Excluir/Cancelar/Salvar | `RodapeDoFormulario.tsx` |
| formulários | tela de "deu certo" | `Confirmacao.tsx` |
| formulários | botões de marcar e o select com setinha | `Opcao.tsx` e `Seletor` (em `Campo.tsx`) |
| formulários | dados, erros por campo e aviso do rodapé | `lib/useFormulario.ts` |
| formulários | ler o erro que a API devolve | `lerErroDoFormulario` (em `lib/api.ts`) |
| listas | anterior / próxima | `Paginacao.tsx` |

O formulário do barbeiro, que tinha passado de 700 linhas, foi dividido em partes com uma
responsabilidade cada: a foto (`EscolherFoto.tsx`), a tabela de horários (`JornadaSemanal.tsx`)
e as contas da semana (`lib/semana.ts`).

---

## Como o sistema é montado

São três programas separados conversando entre si:

```mermaid
flowchart LR
    U["Recepcionista<br/>no navegador"] --> F["Next.js<br/>porta 3020<br/>máscara e aviso na hora"]
    F -->|"POST /api/clientes"| A["FastAPI<br/>porta 8000<br/>valida de novo"]
    A -->|"SQLAlchemy"| B[("PostgreSQL<br/>porta 5435<br/>clientes e barbeiros")]
    A -->|"201 com a ficha salva"| F
```

Dentro do back-end, cada arquivo tem uma responsabilidade só. Uma requisição de cadastro
passa por esta fila:

```mermaid
flowchart TD
    R["routers/clientes.py<br/>recebe a requisição HTTP"] --> S["schemas/cliente.py<br/>valida e limpa os dados"]
    S --> C["crud/cliente.py<br/>confere duplicados e grava"]
    C --> M["models/cliente.py<br/>descreve a tabela"]
    M --> D[("PostgreSQL")]
```

Separei assim por dois motivos: dá pra testar o `crud` sem subir a API, e cada etapa nova
é só repetir esses quatro arquivos. O barbeiro (etapa 2), o serviço e o agendamento (etapa 3)
seguiram exatamente esse caminho, e o
que ficou igual nos dois foi pra `schemas/regras.py` e `crud/comum.py`.

---

## Tecnologias usadas

**Front-end**
- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS 4

**Back-end**
- Python 3.11+ (desenvolvido no 3.14)
- FastAPI — framework da API
- SQLAlchemy 2 — ORM que cria as tabelas e faz as consultas
- Pydantic 2 — validação dos dados
- psycopg 3 — driver do PostgreSQL
- pytest — testes automatizados

**Banco de dados**
- PostgreSQL 16 (rodando em Docker)

Todas as versões estão travadas no `backend/requirements.txt` e no
`frontend/package-lock.json`, então a instalação sai igual em qualquer máquina.

---

## O que precisa ter instalado

| Programa | Versão mínima | Como conferir |
|---|---|---|
| **Python** | 3.11 | `python3 --version` |
| **Node.js** | 18 (recomendado 20+) | `node --version` |
| **Docker** + Docker Compose | qualquer versão recente | `docker --version` |

> **Não quer usar Docker?** Dá pra usar um PostgreSQL instalado direto na máquina —
> veja a [Opção B](#opção-b--postgresql-instalado-na-máquina) logo abaixo.

---

## Instalação passo a passo

Só precisa disso se você não quiser usar o `scripts/instalar.sh` do
[Rodando em 3 passos](#rodando-em-3-passos).

### 1. Subir o banco de dados

#### Opção A — Docker (recomendado)

```bash
docker compose up -d
```

Isso sobe um PostgreSQL 16 com:

| Item | Valor |
|---|---|
| Usuário | `barbearia` |
| Senha | `barbearia` |
| Banco | `barbearia` |
| Banco de teste | `barbearia_teste` (criado automaticamente) |
| Porta | **5435** |

> **Por que a porta 5435 e não a 5432?** Porque muita gente já tem um PostgreSQL
> instalado usando a 5432, e aí o container não sobe. A 5435 evita essa briga.
> Se quiser mudar, é só editar o `docker-compose.yml` e o `backend/.env`.

Para conferir se subiu:

```bash
docker compose ps
```

#### Opção B — PostgreSQL instalado na máquina

Crie o usuário e os dois bancos:

```bash
sudo -u postgres psql
```

```sql
CREATE USER barbearia WITH PASSWORD 'barbearia';
CREATE DATABASE barbearia OWNER barbearia;
CREATE DATABASE barbearia_teste OWNER barbearia;
\q
```

Depois, no arquivo `backend/.env`, troque a porta **5435** por **5432**.

### 2. Instalar o back-end

```bash
cd backend

# cria o ambiente virtual do Python
python3 -m venv .venv

# ativa o ambiente virtual
source .venv/bin/activate          # Linux / macOS
# .venv\Scripts\activate           # Windows (PowerShell)

# instala as dependências
pip install -r requirements.txt

# cria o arquivo de configuração
cp .env.example .env               # Linux / macOS
# copy .env.example .env           # Windows
```

Se quiser começar com alguns clientes já cadastrados:

```bash
python popular_banco.py
```

### 3. Instalar o front-end

```bash
cd ../frontend

npm install

cp .env.local.example .env.local      # Linux / macOS
# copy .env.local.example .env.local  # Windows
```

---

## Como rodar o projeto

São **dois terminais** rodando ao mesmo tempo (mais o Docker do banco em segundo plano).

**Terminal 1 — a API:**

```bash
cd backend
source .venv/bin/activate     # no Windows: .venv\Scripts\activate
uvicorn app.main:app --reload
```

**Terminal 2 — o site:**

```bash
cd frontend
npm run dev
```

### Endereços

| O quê | Endereço |
|---|---|
| **O sistema (é aqui que se usa)** | http://localhost:3020 |
| Cadastro de cliente | http://localhost:3020/clientes/novo |
| Equipe de barbeiros | http://localhost:3020/barbeiros |
| Cadastro de barbeiro | http://localhost:3020/barbeiros/novo |
| API | http://localhost:8000 |
| **Documentação da API (Swagger)** | http://localhost:8000/docs |

> O Swagger em `/docs` é gerado sozinho pelo FastAPI: dá pra testar todas as rotas
> por ali, sem precisar do front.

---

## Como rodar os testes

```bash
cd backend
source .venv/bin/activate     # no Windows: .venv\Scripts\activate
pytest
```

Ou pelo atalho: `bash scripts/rodar-testes.sh` (Linux/macOS) ou
`powershell -ExecutionPolicy Bypass -File scripts\rodar-testes.ps1` (Windows).

Saída esperada:

```
tests/test_cadastro_barbeiro.py ...................................  [ 43%]
tests/test_cadastro_cliente.py ..........................           [ 76%]
tests/test_validadores.py ...................                      [100%]

======================== 113 passed in 5.51s =========================
```

Para ver o nome de cada teste, `pytest -v`.

### O que os 113 testes cobrem

| Arquivo | Testes | O que verifica |
|---|---|---|
| `test_validadores.py` | 19 | Os dígitos verificadores do CPF, os DDDs que existem, o nono dígito do celular e as máscaras |
| `test_cadastro_cliente.py` | 26 | As 6 rotas da API, os erros de validação (422), os cadastros duplicados (409) e o cliente inexistente (404) |
| `test_cadastro_barbeiro.py` | 35 | As 8 rotas de barbeiro, o horário de cada dia, as opções de ofício, os duplicados, se os horários somem junto com o barbeiro e o envio da foto (tipo e tamanho) |
| `test_servicos.py` | 9 | O cardápio: preço com centavos, duração de 5 em 5 minutos, nome repetido (sem ligar pra maiúscula), filtro e edição |
| `test_agendamentos.py` | 24 | As regras da agenda (passado, folga, expediente, intervalo, choque de horário do barbeiro e do cliente), os horários livres, os filtros da agenda, remarcar e não excluir quem tem agendamento |

Alguns casos que eu fiz questão de cobrir, porque são os que costumam passar batido:

- CPF `111.111.111-11` tem que ser **recusado** (ele passa na conta dos dígitos, então
  precisa de uma regra à parte).
- Dois clientes **sem e-mail** podem coexistir, mesmo com a coluna sendo única.
- Ao **editar**, o cliente não pode dar conflito com o próprio telefone.
- A busca por telefone tem que funcionar **com e sem máscara**.
- No barbeiro, **saída antes da entrada** é recusada e a mensagem diz em qual dia foi.
- Editar a semana de 5 dias para 1 tem que **apagar as 4 linhas** que sobraram no banco.
- Salvar a ficha do barbeiro **com os mesmos dias de novo** não pode dar conflito — esse
  teste pegou um erro de verdade: o SQLAlchemy tentava gravar a terça nova antes de apagar
  a velha (a correção está comentada em `crud/barbeiro.py`).
- Na agenda, o **intervalo** do barbeiro conta: se o corte acaba 14:45 e ele tem 10 minutos de
  intervalo, 14:50 é recusado e 14:55 passa.
- **Remarcar** 15 minutos pra frente não pode dar conflito com o próprio horário antigo.
- Subir o preço do serviço **não muda** o valor do que já estava marcado.

Os testes usam o banco `barbearia_teste`, separado do banco de verdade — nada do que
está cadastrado é apagado. Se esse banco não existir, os testes rodam sozinhos em
SQLite na memória, então **o pytest funciona mesmo sem o Docker estar rodando**.

---

## Decisões que eu tomei

As escolhas do projeto que não são óbvias olhando só o código:

**Telefone e CPF são guardados só com números.**
A máscara é coisa de tela. Guardando `11990001234` no banco, a busca funciona igual se a
pessoa digitar com ou sem parênteses, e nunca vai existir o mesmo cliente cadastrado de
duas formas diferentes. A API devolve os dois formatos: `telefone` e `telefone_formatado`.

**A validação roda duas vezes, de propósito.**
No navegador para avisar na hora enquanto a pessoa digita, e de novo no servidor porque
validação de front qualquer um burla abrindo o console. A regra do CPF está escrita nos
dois lados (`lib/mascaras.ts` e `core/validadores.py`) com o mesmo cálculo.

**O erro 422 volta com o nome do campo.**
O FastAPI devolve um formato bem detalhado por padrão; eu simplifiquei em `main.py` para
`{campo, mensagem}`, e aí o front consegue pintar de vermelho exatamente o campo errado
em vez de mostrar um alerta genérico.

**O `crud` é separado dos `routers`.**
O router só cuida de HTTP (status, 404, 409) e o crud só cuida de banco. Isso deixa
testar as consultas sem subir a API.

**Os testes caem para SQLite se o Postgres não estiver de pé.**
Assim quem for corrigir o trabalho consegue rodar o `pytest` mesmo sem abrir o Docker.
Quando o banco de teste existe, os testes rodam nele — que é o cenário de verdade.

**Os horários do barbeiro ficam numa tabela própria (`horarios_barbeiro`).**
Cada dia pode ter um horário diferente, então uma linha por dia trabalhado. Pensei em guardar
tudo num campo JSON, mas na etapa da agenda vou precisar perguntar "quem trabalha quinta às
15h?", e com tabela isso é um `SELECT` simples. Dia sem linha é folga.

**Barbeiro não precisa ser apagado pra sair da agenda.**
A chave "Disponível para agendamento" desliga o barbeiro (férias, afastamento ou quem saiu da
casa) sem perder a ficha. Quando a agenda existir, os atendimentos antigos dele continuam
apontando pra um cadastro que existe.

**A foto do barbeiro fica guardada no banco, não numa pasta.**
Com pasta eu teria que configurar o caminho em cada máquina e lembrar de copiar a pasta junto
com o backup. No banco, o backup do Postgres já leva as fotos. Pra não pesar, o navegador
recorta e reduz a foto pra 480x480 antes de enviar (uns 60 KB), e a listagem não carrega os
bytes — só o endereço da foto, que é buscada à parte.

**O "barbeiro preferido" do cliente vem da equipe cadastrada.**
Na etapa 1 era uma lista fixa no código. Agora o select busca os barbeiros disponíveis na API.
Se o cliente tinha um barbeiro que saiu, o nome continua aparecendo na ficha dele, pra
preferência não mudar sem a recepção perceber.

**O agendamento guarda a duração e o preço do dia em que foi marcado.**
Se o corte subir de R$ 50 pra R$ 55 no mês que vem, quem já marcou (ou já cortou) continua com o
valor combinado — senão o caixa do mês passado mudaria sozinho. Trocar o serviço de um
agendamento pega o tempo e o preço do serviço novo.

**As regras da agenda ficam num lugar só (`crud/agendamento.py`).**
Marcar, remarcar e a lista de horários livres passam pela mesma função. Assim a tela nunca
oferece um horário que a API depois recusaria. A lista anda de 15 em 15 minutos.

**Cancelado não é apagado.**
Cancelar e "faltou" liberam o horário, mas o agendamento fica no histórico (dá até pra ver quem
mais falta). Excluir de verdade é só pra quando marcou errado.

**O menu lateral só mostra o que funciona.**
Nada de item desabilitado como prévia das próximas etapas: botão que não faz nada só
engana quem está usando. Cada item entra quando a funcionalidade dele ficar pronta.

---

## Estrutura das pastas

```
projeto-faculdade/
├── README.md
├── docker-compose.yml           # sobe o PostgreSQL
├── docs/imagens/                # as telas que aparecem neste README
├── scripts/                     # atalhos pra instalar e rodar (.sh e .ps1)
│
├── backend/
│   ├── requirements.txt         # dependências do Python
│   ├── .env.example             # modelo das configurações
│   ├── pytest.ini
│   ├── popular_banco.py         # cadastra clientes, barbeiros, serviços e horários de exemplo
│   ├── app/
│   │   ├── main.py              # onde a API começa (CORS, erros, rotas)
│   │   ├── core/
│   │   │   ├── config.py        # lê o .env
│   │   │   ├── database.py      # conexão com o PostgreSQL
│   │   │   ├── validadores.py   # regras de CPF e telefone
│   │   │   └── erros.py
│   │   ├── models/              # as tabelas do banco (SQLAlchemy)
│   │   │   ├── cliente.py
│   │   │   ├── barbeiro.py      # barbeiros + horarios_barbeiro
│   │   │   ├── servico.py       # etapa 3: o cardápio
│   │   │   └── agendamento.py   # etapa 3: cliente + barbeiro + serviço + dia e hora
│   │   ├── schemas/             # o que entra e sai da API (Pydantic)
│   │   │   ├── regras.py        # validações que cliente e barbeiro têm iguais
│   │   │   ├── cliente.py
│   │   │   ├── barbeiro.py
│   │   │   ├── servico.py
│   │   │   └── agendamento.py
│   │   ├── crud/                # as consultas no banco
│   │   │   ├── comum.py         # duplicados, busca, paginação e "tem agendamento?"
│   │   │   ├── cliente.py
│   │   │   ├── barbeiro.py
│   │   │   ├── servico.py
│   │   │   └── agendamento.py   # as regras da agenda e os horários livres
│   │   └── routers/             # as rotas HTTP
│   │       ├── clientes.py
│   │       ├── barbeiros.py
│   │       ├── servicos.py
│   │       └── agendamentos.py
│   └── tests/                   # os testes do pytest
│
└── frontend/
    └── src/
        ├── app/
        │   ├── layout.tsx                    # moldura: menu lateral + área de trabalho
        │   ├── globals.css                   # a paleta da barbearia no Tailwind
        │   ├── clientes/
        │   │   ├── page.tsx                  # lista de clientes
        │   │   ├── novo/page.tsx             # cadastro
        │   │   └── [id]/editar/page.tsx      # edição
        │   ├── barbeiros/
        │   │   ├── page.tsx                  # a equipe (filtro "na agenda / fora da agenda")
        │   │   ├── novo/page.tsx             # cadastro
        │   │   └── [id]/editar/page.tsx      # edição
        │   ├── servicos/
        │   │   ├── page.tsx                  # o cardápio
        │   │   ├── novo/page.tsx             # cadastro
        │   │   └── [id]/editar/page.tsx      # edição
        │   └── agendamentos/
        │       ├── page.tsx                  # a agenda (dia ou 7 dias, concluir e cancelar na linha)
        │       ├── novo/page.tsx             # marcar horário
        │       └── [id]/editar/page.tsx      # remarcar e mudar a situação
        ├── components/
        │   ├── FormularioCliente.tsx         # o formulário do cliente (cria e edita)
        │   ├── FichaResumo.tsx               # o cartão que se preenche enquanto digita
        │   ├── FormularioBarbeiro.tsx        # o formulário do barbeiro (cria e edita)
        │   ├── EscolherFoto.tsx              # a moldura da foto de perfil
        │   ├── JornadaSemanal.tsx            # a tabela de dias e horários
        │   ├── FichaBarbeiro.tsx             # "como o cliente vê" + disponível para agendamento
        │   ├── Retrato.tsx                   # a foto na moldura (cartão e lista)
        │   ├── FormularioServico.tsx         # o formulário do serviço (cria e edita)
        │   ├── FormularioAgendamento.tsx     # marcar e remarcar, com os horários livres
        │   ├── RodapeDoFormulario.tsx / Confirmacao.tsx / Opcao.tsx / Paginacao.tsx
        │   ├── MenuLateral.tsx
        │   └── Topo.tsx / Secao.tsx / Campo.tsx / Botao.tsx
        └── lib/
            ├── api.ts                        # todas as chamadas ao FastAPI
            ├── mascaras.ts                   # máscaras e validações no navegador
            ├── useFormulario.ts              # dados, erros e aviso de um formulário
            ├── semana.ts                     # as contas da semana de trabalho
            ├── foto.ts                       # recorta e reduz a foto do barbeiro antes do envio
            └── tipos.ts                      # os tipos do TypeScript
```

---

## O banco de dados

Tabela **`clientes`** (criada automaticamente pelo SQLAlchemy quando a API sobe):

| Coluna | Tipo | Regra |
|---|---|---|
| `id` | inteiro | chave primária, automático |
| `nome` | texto (120) | obrigatório, com índice |
| `apelido` | texto (60) | opcional |
| `telefone` | texto (11) | **obrigatório e único** — guardado só com números |
| `cpf` | texto (11) | **obrigatório e único** — guardado só com números |
| `email` | texto (120) | opcional, mas único quando preenchido |
| `data_nascimento` | data | opcional |
| `barbeiro_preferido` | texto (60) | padrão: "Sem preferência" |
| `origem` | texto (30) | Indicação / Passou na porta / Instagram / Google |
| `observacoes` | texto longo | opcional |
| `criado_em` | data e hora | preenchido pelo banco |
| `atualizado_em` | data e hora | preenchido quando a ficha é editada |

O e-mail é único, mas aceita vários registros em branco: no PostgreSQL a restrição de
único ignora valores nulos, então clientes sem e-mail não brigam entre si.

Tabela **`barbeiros`** (etapa 2):

| Coluna | Tipo | Regra |
|---|---|---|
| `id` | inteiro | chave primária, automático |
| `nome` | texto (120) | obrigatório, com índice |
| `apelido` | texto (60) | opcional — o "nome na cadeira", que é o que o cliente vê |
| `telefone` | texto (11) | **obrigatório e único** — só números |
| `cpf` | texto (11) | **obrigatório e único** — só números |
| `email` | texto (120) | opcional, mas único quando preenchido |
| `data_admissao` | data | "na casa desde": a tela pede mês e ano e grava o dia 1. Sem valor, a API usa hoje |
| `foto` | binário | a foto de perfil (JPEG já reduzido pelo navegador), opcional |
| `foto_tipo` | texto (30) | image/jpeg, image/png ou image/webp |
| `foto_atualizada_em` | data e hora | quando a foto mudou — também evita o navegador mostrar a foto velha |
| `especialidades` | JSON | lista com pelo menos uma das 6 opções da tela |
| `comissao` | inteiro | de 0 a 100 (%), padrão 40 |
| `intervalo` | inteiro | minutos entre atendimentos: 0 (nenhum), 5, 10 ou 15 |
| `cor_agenda` | texto (20) | terracota / oliva / latao / petroleo |
| `ativo` | sim/não | "disponível para agendamento", com índice |
| `observacoes` | texto longo | opcional |
| `criado_em` / `atualizado_em` | data e hora | preenchidos pelo banco |

Tabela **`horarios_barbeiro`** — uma linha por dia trabalhado:

| Coluna | Tipo | Regra |
|---|---|---|
| `id` | inteiro | chave primária |
| `barbeiro_id` | inteiro | chave estrangeira para `barbeiros` (apaga junto com o barbeiro) |
| `dia` | texto (3) | seg, ter, qua, qui, sex, sab ou dom |
| `entrada` / `saida` | hora | a saída tem que ser depois da entrada |

O par (`barbeiro_id`, `dia`) é único: o mesmo barbeiro não tem duas linhas pra terça.

Tabela **`servicos`** (etapa 3):

| Coluna | Tipo | Regra |
|---|---|---|
| `id` | inteiro | chave primária |
| `nome` | texto (60) | **obrigatório e único** (sem ligar pra maiúscula) |
| `descricao` | texto longo | opcional |
| `duracao` | inteiro | minutos de cadeira, de 5 em 5, até 240 |
| `preco` | decimal (8,2) | em reais — `Numeric` e não `float`, pra conta do caixa não errar centavo |
| `ativo` | sim/não | "no cardápio" |
| `criado_em` / `atualizado_em` | data e hora | preenchidos pelo banco |

Tabela **`agendamentos`** (etapa 3) — o que liga o cliente ao barbeiro num dia e hora:

| Coluna | Tipo | Regra |
|---|---|---|
| `id` | inteiro | chave primária |
| `cliente_id` / `barbeiro_id` / `servico_id` | inteiro | chaves estrangeiras (o banco não deixa apagar quem tem agendamento) |
| `data` | data | com índice — a agenda filtra por dia |
| `hora` | hora | início do atendimento, de 5 em 5 minutos |
| `duracao` / `preco` | inteiro / decimal | copiados do serviço na hora de marcar |
| `status` | texto (12) | agendado / concluido / cancelado / faltou |
| `observacoes` | texto longo | opcional |
| `criado_em` / `atualizado_em` | data e hora | preenchidos pelo banco |

Para espiar o banco por dentro:

```bash
docker exec -it barbearia-postgres psql -U barbearia -d barbearia
```

```sql
\dt                      -- lista as tabelas
SELECT * FROM clientes;  -- mostra os cadastros
SELECT b.nome, h.dia, h.entrada, h.saida
  FROM horarios_barbeiro h JOIN barbeiros b ON b.id = h.barbeiro_id;  -- a escala da equipe
\q                       -- sai
```

---

## A API (endpoints)

Base: `http://localhost:8000`

| Método | Rota | O que faz |
|---|---|---|
| `POST` | `/api/clientes` | Cadastra um cliente novo |
| `GET` | `/api/clientes` | Lista os clientes (`?busca=`, `?pagina=`, `?tamanho=`) |
| `GET` | `/api/clientes/{id}` | Abre a ficha de um cliente |
| `GET` | `/api/clientes/telefone/{telefone}` | Busca pelo telefone (a chave do balcão) |
| `PUT` | `/api/clientes/{id}` | Edita a ficha (só os campos enviados) |
| `DELETE` | `/api/clientes/{id}` | Exclui o cadastro |

| `POST` | `/api/barbeiros` | Cadastra um barbeiro novo |
| `GET` | `/api/barbeiros` | Lista a equipe (`?busca=`, `?ativo=true`, `?pagina=`, `?tamanho=`) |
| `GET` | `/api/barbeiros/{id}` | Abre a ficha do barbeiro, com os horários |
| `PUT` | `/api/barbeiros/{id}` | Edita a ficha (se mandar `horarios`, a semana inteira é trocada) |
| `DELETE` | `/api/barbeiros/{id}` | Exclui o cadastro e os horários dele |
| `PUT` | `/api/barbeiros/{id}/foto` | Envia ou troca a foto (`multipart/form-data`, campo `foto`, até 2 MB) |
| `GET` | `/api/barbeiros/{id}/foto` | Devolve a imagem — é o endereço que vai na tela |
| `DELETE` | `/api/barbeiros/{id}/foto` | Tira a foto |

| `POST` | `/api/servicos` | Cadastra um serviço |
| `GET` | `/api/servicos` | Lista o cardápio (`?busca=`, `?ativo=true`) |
| `GET` | `/api/servicos/{id}` | Abre um serviço |
| `PUT` | `/api/servicos/{id}` | Edita (só os campos enviados) |
| `DELETE` | `/api/servicos/{id}` | Exclui (só se não tiver agendamento) |

| `POST` | `/api/agendamentos` | Marca um horário (`cliente_id`, `barbeiro_id`, `servico_id`, `data`, `hora`) |
| `GET` | `/api/agendamentos` | A agenda (`?de=`, `?ate=`, `?barbeiro_id=`, `?cliente_id=`, `?status=`) |
| `GET` | `/api/agendamentos/horarios-livres` | Horários livres (`?barbeiro_id=&servico_id=&data=`) |
| `GET` | `/api/agendamentos/{id}` | Abre um agendamento |
| `PUT` | `/api/agendamentos/{id}` | Remarca ou muda a situação (`"status": "concluido"`) |
| `DELETE` | `/api/agendamentos/{id}` | Apaga (pra quando marcou errado; no dia a dia, cancele) |

### Exemplo de cadastro

```bash
curl -X POST http://localhost:8000/api/clientes \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Pablo Miguel Dias",
    "telefone": "(11) 99000-1234",
    "cpf": "529.982.247-25",
    "email": "pablo@email.com",
    "barbeiro_preferido": "Seu Alfredo",
    "origem": "Indicação"
  }'
```

Barbeiro:

```bash
curl -X POST http://localhost:8000/api/barbeiros \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Sebastião Ramos",
    "apelido": "Tião da Navalha",
    "telefone": "(11) 98123-4567",
    "cpf": "853.513.468-93",
    "especialidades": ["Barba na navalha", "Toalha quente"],
    "comissao": 45,
    "intervalo": 5,
    "cor_agenda": "oliva",
    "horarios": [
      {"dia": "ter", "entrada": "09:00", "saida": "19:00"},
      {"dia": "sab", "entrada": "09:00", "saida": "17:00"}
    ]
  }'
```

### Códigos de resposta

| Código | Quando acontece |
|---|---|
| `201` | Cliente cadastrado |
| `200` | Consulta ou edição deu certo |
| `204` | Cliente excluído |
| `404` | Não existe cliente com esse id/telefone |
| `409` | Telefone, CPF ou e-mail já cadastrado em outra ficha · horário que bate numa regra da agenda · excluir quem tem agendamento |
| `422` | Algum campo do formulário está inválido |

O erro `422` vem com o campo e o motivo, para o front conseguir marcar o campo certo:

```json
{
  "detail": "Confira os campos do formulário.",
  "erros": [{ "campo": "cpf", "mensagem": "CPF inválido — confira os números digitados" }]
}
```

---

## Regras de validação

| Campo | Regra |
|---|---|
| **Nome** | Obrigatório, mínimo 3 letras e precisa ter nome **e** sobrenome |
| **Telefone** | Obrigatório. 10 dígitos (fixo) ou 11 (celular). DDD tem que existir e celular começa com 9 |
| **CPF** | Obrigatório. Os dois dígitos verificadores são conferidos (o mesmo cálculo da Receita). CPFs como `111.111.111-11` são recusados |
| **E-mail** | Opcional, mas se preencher tem que ser um e-mail válido |
| **Data de nascimento** | Opcional, não pode ser no futuro nem ter mais de 120 anos |
| **Origem** | Só aceita as 4 opções dos botões da tela |

E no barbeiro (nome, telefone, CPF e e-mail seguem as mesmas regras do cliente):

| Campo | Regra |
|---|---|
| **Na casa desde** | Opcional (em branco = mês atual), não pode ser no futuro nem antes de 1962, quando a casa abriu |
| **Foto** | Opcional. JPG, PNG ou WEBP de até 2 MB (o navegador já manda reduzida, com uns 60 KB) |
| **Especialidades** | Pelo menos uma, só as 6 opções da tela. Repetidas são ignoradas |
| **Comissão** | Número inteiro de 0 a 100 |
| **Intervalo / cor** | Só as opções da tela |
| **Dias e horários** | Pelo menos um dia de trabalho, sem dia repetido, e em cada dia a saída depois da entrada |

---

## Deu problema? (soluções)

**"Não consegui falar com a API. Ela está rodando na porta 8000?"**
O front está no ar, mas a API não. Abra o terminal do back-end e rode `uvicorn app.main:app --reload`.

**A API não sobe e mostra erro de conexão com o banco**
O PostgreSQL não está de pé. Rode `docker compose up -d` e tente de novo.
Confira também se a porta do `backend/.env` bate com a do `docker-compose.yml`.

**`port is already allocated` ao subir o Docker**
Já tem outra coisa usando aquela porta na sua máquina. Troque a porta no
`docker-compose.yml` (ex: `"5436:5432"`) e ajuste o `backend/.env` para a mesma porta.

**`ModuleNotFoundError` ao rodar o pytest ou o uvicorn**
O ambiente virtual não está ativo. Rode `source .venv/bin/activate` (ou
`.venv\Scripts\activate` no Windows) antes.

**A porta 3020 já está em uso**
Troque o número nos scripts `dev` e `start` do `frontend/package.json` (ex: `-p 3030`) e
ajuste também o `CORS_ORIGINS` do `backend/.env` para a mesma porta, senão o navegador
bloqueia as chamadas para a API.

**Atualizei do projeto da etapa 1 e as telas dizem que não conseguem falar com a API**
O `backend/.env` é criado uma vez só e não é atualizado sozinho. Troque `3000` por `3020`
no `CORS_ORIGINS` dele (ou apague o `.env` e rode o `instalar` de novo).

**`Form data requires "python-multipart"` ao subir a API**
A etapa 2 ganhou uma dependência nova (pro upload da foto). Com o ambiente virtual ativo,
rode `pip install -r requirements.txt` de novo.

**No Windows, "execução de scripts foi desabilitada neste sistema"**
É o bloqueio padrão do PowerShell. Use `powershell -ExecutionPolicy Bypass -File <script>`,
como está nos comandos acima.

**Cadastrei um cliente e ele não aparece na lista**
A busca pode estar preenchida — limpe o campo de busca. Se continuar, confira no banco
com `docker exec -it barbearia-postgres psql -U barbearia -d barbearia -c "select * from clientes;"`.

**Quero apagar tudo e começar do zero**

```bash
docker compose down -v   # o -v apaga também os dados do banco
docker compose up -d
cd backend && python popular_banco.py
```
