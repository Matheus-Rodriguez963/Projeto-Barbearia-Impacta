# Aparência (white label) — design

## Para que serve
Deixar o sistema "white label": cada barbearia instala o seu e, numa tela **Aparência**, coloca
a própria logo, troca o nome que aparece ("Barbearia Dom Alfredo" → "Barbearia Impacta") e
escolhe um entre 4 temas de cor prontos. Temas prontos em vez de cor livre pra ninguém montar
uma combinação ilegível.

## Objetivos
- Tela `/aparencia` no menu lateral (último item, depois de Histórico).
- Campos editáveis: **linha de cima** (hoje "Barbearia") e **nome** (hoje "Dom Alfredo").
- **Logo** opcional: enviar, trocar e tirar.
- **Tema**: Clássico (o atual), Preto e ouro, Marinho, Verde inglês.
- Vale pra todos os computadores da barbearia (fica no banco) e o tema já abre certo, sem
  piscar a cor antiga.

## Fora do escopo / o que não pode acontecer
- **As fontes não mudam** (Bodoni, Oswald, Karla). O usuário pediu explicitamente: só cores.
- Layout, espaçamentos e componentes não mudam. Nenhuma tela muda de estrutura.
- Sem cor livre (seletor de cor), sem tema escuro na área de trabalho: o fundo das telas é
  sempre claro (papel).
- Sem várias barbearias no mesmo sistema (multi-empresa): é uma configuração por instalação.
- Sem login/permissão pra tela de Aparência (o sistema ainda não tem login nenhum).

## Abordagens consideradas
- **A. No banco, com tela própria (escolhida).** Tabela `aparencia` com uma linha só, rotas
  `/api/aparencia`, layout do Next lê no servidor e já desenha com o tema. Vale pra todo mundo.
- B. Só no navegador (localStorage) — cada computador com uma aparência; logo não cabe bem.
- C. Arquivo de configuração — exige mexer em arquivo e reiniciar; não é pro cliente usar.

## Os 4 temas
Cada tema só redefine as variáveis de cor que já existem no `@theme` do `globals.css`. Os nomes
das variáveis continuam os mesmos (`mogno`, `latao`, `terracota`…), então nenhum componente
precisa mudar de classe. Valores aprovados na prévia:

| Variável (papel na tela) | Clássico | Preto e ouro | Marinho | Verde inglês |
|---|---|---|---|---|
| `mogno` (menu lateral) | #4a1b10 | #161514 | #14213d | #1f3a2d |
| `latao` (destaque: item ativo, rótulo do menu) | #c9a227 | #d4af37 | #d6283a | #c9a227 |
| `terracota` (botão principal, situação) | #7b2e17 | #1f1e1c | #b3122b | #2f5a43 |
| `oliva` (barras do ranking) | #5a6236 | #b8962e | #14213d | #2f5a43 |
| `papel` (fundo da área de trabalho) | #f2eadc | #f3f1ec | #eef1f5 | #f1ece0 |
| `papel-claro` (cartões, tabelas) | #fffdf7 | #fffefb | #ffffff | #fffdf7 |
| `tinta` (texto) | #3a1409 | #1c1b19 | #14213d | #1d2a22 |
| `rotulo` (rótulos pequenos) | #8a6a4f | #7d7668 | #5f6d86 | #6c7a68 |

As variações (`mogno-escuro`, `mogno-claro`, `terracota-claro`, `latao-claro`, `tinta-forte`,
`tinta-media`, `tinta-fraca`, `creme`, `fundo`) ficam a cargo de quem implementa, derivadas de
cada tema no mesmo sentido do Clássico (mais escuro/mais claro). `erro` não muda entre temas.
Quem implementa confere o contraste do texto sobre o fundo em cada tema (mínimo 4,5:1 pro
texto normal).

Os temas ficam como blocos `html[data-tema="preto"] { --color-mogno: …; }` num arquivo
`frontend/src/app/temas.css` importado pelo `globals.css`. O Clássico é o padrão (`:root`),
então sem `data-tema` o sistema fica exatamente como hoje.

**Contraste manda na tabela** (decisão de quem escreveu, depois da revisão): se uma cor da
tabela for usada como texto e não passar de 4,5:1 sobre o fundo onde aparece, o valor é
escurecido/clareado no `temas.css` até passar, mantendo o tom. Casos já conhecidos:
`oliva` do Preto e ouro (#b8962e sobre papel ≈ 2,5:1, usado em "Agendado", botão oliva e
`FichaBarbeiro`) e `latao` do Marinho (#d6283a sobre o menu ≈ 3,2:1, rótulo "linha de cima").
Não se criam variáveis "só pra texto": o ajuste é no valor.

### Cores com significado ficam fixas (decisão de quem escreveu)
Algumas cores querem dizer alguma coisa, não "a cara da casa", e por isso **não seguem o tema**:
- **sucesso / livre** — hoje é o `oliva`: "Cabe certinho", etiqueta "Agendado", botão
  "Concluído", chave ligada (`Chave.tsx`), faixa do almoço. Ganham `--color-sucesso` (e
  `--color-sucesso-texto` pro #4c5330 da gaveta) com os valores de hoje, fixos.
- **erro** (`--color-erro`, "Faltou/Cancelado", avisos de não cabe) — já fixo, continua.
- **linha do horário atual** (#b23a1c escrito no `AgendaDoDia`) — vira `--color-agora`, fixo.
O `oliva` do tema passa a ser só decoração (barras do ranking e afins). Com isso o "certo"
não vira dourado no Preto e ouro nem azul no Marinho. No Marinho o botão principal é vermelho
(aprovado na prévia) e o erro continua o tijolo de hoje; as etiquetas de falta usam o `erro`,
o botão usa `terracota`, então não se misturam.

### Cores que hoje estão escritas direto nos componentes
Há ~37 cores em hexadecimal fixas nos `.tsx` (ex.: `text-[#b49b80]`, `bg-[#f5eee2]`) e
gradientes fixos no `globals.css` (`.madeira`, `.moldura-latao`, `.papel-pautado`, barra de
rolagem). Elas passam a usar as variáveis do tema (direto ou com `color-mix`/opacidade), senão
ficariam com a cor do Clássico nos outros temas. Regra pra cada uma: se é um tom da casa
(madeira, papel, texto, borda), vira variável do tema; se tem significado (sucesso, erro,
agora, cor do barbeiro), vira uma das variáveis fixas acima.

### As cores dos barbeiros na agenda não mudam com o tema
Hoje a cor do barbeiro (`cor_agenda`: latão, oliva, terracota, petróleo) usa as mesmas classes
do tema (`bg-latao`…). Se o tema trocasse `latao` por vermelho, o barbeiro mudaria de cor.
Elas ganham variáveis próprias e fixas (`--color-barbeiro-latao` etc., com os valores de hoje)
e `CORES_DA_AGENDA` / `coresDo` passam a usá-las. A cor identifica o barbeiro, não a casa.

## Back-end
- Model `Aparencia` (`app/models/aparencia.py`), tabela `aparencia`, **uma linha só** (id 1,
  criada com os valores padrão na primeira leitura se não existir):
  - `linha_de_cima` texto(30), padrão "Barbearia" (pode ficar vazio)
  - `nome` texto(40), obrigatório, padrão "Dom Alfredo"
  - `tema` texto(20): `classico` | `preto` | `marinho` | `verde`, padrão `classico`
  - `logo` binário (deferred), `logo_tipo`, `logo_atualizada_em` — igual à foto do barbeiro
  - `atualizado_em`
- Schemas em `app/schemas/aparencia.py`; crud em `app/crud/aparencia.py`; router em
  `app/routers/aparencia.py`, registrado no `main.py` (versão 5.0.0, "Etapa 5: aparência").
- Rotas:
  - `GET /api/aparencia` → `{linha_de_cima, nome, tema, tem_logo, logo_url, atualizado_em}`
  - `PUT /api/aparencia` → edita só os campos enviados; tema fora da lista → 422; nome vazio → 422
  - `PUT /api/aparencia/logo` (multipart, campo `logo`, JPG/PNG/WEBP/SVG? ver abaixo, até 2 MB)
  - `GET /api/aparencia/logo` → a imagem (404 se não tem)
  - `DELETE /api/aparencia/logo`
- Testes `tests/test_aparencia.py`: padrão na primeira leitura, editar parcial, tema inválido,
  nome vazio, enviar/ver/tirar logo, tipo e tamanho inválidos.

## Front-end
- `layout.tsx` (componente de servidor) busca `GET /api/aparencia` antes de desenhar e põe
  `data-tema` no `<html>`; passa nome/linha/logo pro `MenuLateral`. Se a API não responder,
  usa o padrão (Clássico, "Barbearia Dom Alfredo") e o site abre do mesmo jeito.
- Título da aba: `generateMetadata` no layout com `template: "%s — {linha} {nome}"`; as páginas
  trocam o `"… — Barbearia Dom Alfredo"` fixo por só o próprio título.
- `MenuLateral`: com logo, a imagem aparece à esquerda do nome; sem logo, fica só o texto,
  como hoje. Item "Aparência" no fim da lista.
- O cartão "A reserva" (`FormularioAgendamento`) mostra linha + nome da aparência em vez do
  "Barbearia Dom Alfredo" fixo.
- Página `app/aparencia/page.tsx`, no padrão das outras (Topo, Secao, Campo, Botao):
  - campos "Linha de cima" e "Nome da barbearia";
  - logo com o mesmo componente de enviar foto do barbeiro (`EscolherFoto`, adaptado se
    precisar), com botão de tirar;
  - os 4 temas em cartões com uma miniatura (menu + papel + botão nas cores do tema);
  - **prévia ao vivo**: ao clicar num tema ou digitar o nome, o próprio sistema já muda na
    tela (troca o `data-tema` e o texto do menu); "Salvar" grava; sair sem salvar volta ao
    que estava gravado;
  - depois de salvar, `router.refresh()` pra o layout reler do servidor.
- Tipos em `lib/tipos.ts` e funções em `lib/api.ts`, como as outras telas.

## Deixado para quem implementa
- Os valores exatos das variações de cor de cada tema e os gradientes, respeitando a tabela.
- Se a logo aceita SVG (decisão: **não**, só JPG/PNG/WEBP, igual à foto — SVG pode carregar
  script). O front reduz a logo antes de mandar, como faz com a foto, mas sem cortar em
  quadrado (logo costuma ser larga).
- README: seção da Etapa 5, rotas novas, print da tela de Aparência.
