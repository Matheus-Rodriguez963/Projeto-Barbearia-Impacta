# Login e controle de acesso — design

## Para que serve
Hoje qualquer pessoa que abre o endereço do sistema mexe em tudo. A barbearia quer que só entre
quem tem login e senha, e que a recepcionista veja só os menus que o dono liberar.

## Objetivos
- Tela **/login** com usuário e senha. Sem login ninguém vê nenhuma tela nem chama a API.
- Dois tipos de usuário:
  - **Administrador**: vê todos os menus. Já vem criado: login `admin`, senha `123`.
  - **Recepcionista**: o admin cria só com login e senha (sem e-mail nem outros dados) e marca
    quais menus ela vê.
- Tela **Acessos** (só admin): lista de recepcionistas, menus de cada uma, criar, trocar a
  senha dela e **aprovar / recusar** (decisão do usuário: opção A = liga/desliga; nasce aprovada,
  o admin bloqueia e desbloqueia quando quiser).
- Todo mundo troca a própria senha dentro do sistema (o pedido era o admin; estendi pra
  recepcionista porque não custa nada — minha decisão).

## Fora do escopo / o que não pode acontecer
- Esconder o menu não basta: **a API também recusa** quem não tem o menu (403), senão dava pra
  ver os dados pelo endereço direto.
- Sem e-mail, "esqueci minha senha", cadastro pela própria recepcionista, vários admins,
  limite de tentativas de login. (Apagar usuário ficou de fora no começo; depois o usuário pediu
  a lixeira pra excluir quem saiu da empresa: `DELETE /api/usuarios/{id}`, só recepcionista.)
- Nenhuma tela existente muda de estrutura; fontes e cores seguem a Aparência.

## Abordagens consideradas
- **A. Sessão guardada no banco + cookie httpOnly (escolhida).** No login a API gera um token
  aleatório, guarda o hash dele na tabela `sessoes` e manda num cookie que o JavaScript não lê.
  Bloquear alguém apaga as sessões dele e vale na hora. O layout do Next (servidor) lê o mesmo
  cookie, então a tela já abre com o menu certo, sem piscar.
- B. JWT assinado — não precisa de tabela, mas bloquear só valeria quando o token vencesse (ou
  teria que consultar o banco a cada chamada, e aí volta a ser A).
- C. Token no localStorage — o servidor do Next não enxerga, a tela abriria sem saber quem é e
  o token fica exposto a qualquer script da página.

Cookie entre portas: site (3020) e API (8000) estão no mesmo host (`localhost`); cookie é por
host, não por porta, então o cookie da API vale nos dois. O `fetch` do navegador passa a mandar
`credentials: "include"` (o CORS já tem `allow_credentials=True`).

## Os menus que dá pra liberar
`agenda`, `clientes`, `barbeiros`, `servicos`, `historico`, `aparencia`. **Acessos** nunca é
liberável: é só do admin. O admin tem todos sempre (não guarda lista).

## Back-end
- `usuarios`: id, login (único, 3–30, minúsculas/números/`.`/`_`, guardado em minúsculas),
  senha_hash, tipo (`admin` | `recepcionista`), menus (lista de texto, JSON), ativo (bool,
  padrão true), criado_em.
- `sessoes`: id, usuario_id, token_hash (sha256, único), criada_em, expira_em (12 horas, um dia
  de trabalho).
- Senha com `hashlib.scrypt` + sal aleatório por usuário (biblioteca padrão, sem dependência
  nova). Senha nova: mínimo 4 caracteres (minha decisão: o padrão é `123`, então não dá pra
  exigir muito; o aviso abaixo empurra a troca).
- Na subida da API: se não existe nenhum admin, cria `admin` / `123`.
- Rotas:
  - `POST /api/login` {login, senha} → cookie `sessao` (httpOnly, SameSite=Lax, 12 h) + o
    usuário. Erro genérico "Login ou senha incorretos" (401) pra não dizer qual dos dois errou;
    recepcionista bloqueada → 403 "Seu acesso está bloqueado. Fale com o administrador."
  - `POST /api/logout` → apaga a sessão e o cookie.
  - `GET /api/eu` → `{id, login, tipo, menus, senha_padrao}` (admin: todos os menus;
    `senha_padrao` = admin ainda com `123`). 401 sem sessão válida.
  - `PUT /api/eu/senha` {senha_atual, senha_nova}.
  - `GET/POST /api/usuarios`, `PUT /api/usuarios/{id}` (menus, ativo), `PUT
    /api/usuarios/{id}/senha` {senha_nova} — só admin, só mexe em recepcionista. Login repetido
    → 409 no formato que o front já entende.
  - Bloquear (`ativo=false`) apaga as sessões dela: cai na próxima ação.
- Proteção das rotas que já existem (dependência do FastAPI):
  - **Ler** clientes, barbeiros (e foto) e serviços: qualquer usuário logado — a agenda e a
    ficha do cliente precisam dessas listas mesmo sem o menu delas.
  - **Gravar** neles: precisa do menu (`clientes`, `barbeiros`, `servicos`).
  - Agendamentos: menu `agenda`. Histórico: menu `historico`.
  - Aparência: **ler e a logo ficam abertas** (a tela de login mostra a marca); gravar precisa
    do menu `aparencia`.
  - `/`, `/docs` continuam abertos.
- Testes: os testes atuais passam a rodar logados como admin (fixture no `conftest`), e um
  `tests/test_acesso.py` novo cobre login, senha errada, bloqueado, 401/403, troca de senha,
  admin padrão, recepcionista sem o menu.

## Front-end
- `proxy.ts` (o antigo middleware do Next 16): sem cookie `sessao` → manda pra `/login`; em
  `/login` com cookie → manda pra dentro. É só a primeira barreira; quem decide é a API.
- `layout.tsx` (servidor) busca `/api/eu` repassando o cookie. Sem usuário: desenha só a página
  (a de login), sem menu. Com usuário: menu só com os itens liberados + "Acessos" pro admin.
- Abrir um menu não liberado (pelo endereço) leva pro primeiro menu liberado. A raiz `/` também
  (hoje vai sempre pra agenda). Recepcionista sem nenhum menu vê um aviso "Nenhum menu liberado
  ainda. Fale com o administrador." e o botão Sair.
- `/login`: no estilo da casa (logo, linha de cima e nome da Aparência, cores do tema), campos
  Login e Senha, botão Entrar, mensagem de erro embaixo.
- Rodapé do menu: login de quem está usando, "Trocar senha" (tela `/senha`: atual, nova,
  repetir a nova) e "Sair".
- Tela `/acessos` (só admin):
  - aviso no topo enquanto o admin estiver com a senha `123`, com link pra trocar;
  - "Nova recepcionista": login, senha e as caixinhas dos menus;
  - lista: login, situação (Aprovada / Recusada), caixinhas dos menus (salva ao marcar),
    botão **Recusar** / **Aprovar** e "Trocar senha".
- Qualquer chamada que volte 401 (sessão venceu ou foi bloqueada) leva pra `/login`.

## Deixado para quem implementa
- Nomes de componentes, o visual exato das telas dentro do padrão (Topo, Secao, Campo, Botao,
  Chave).
- README: seção da Etapa 6, rotas novas, usuário padrão, print da tela de Acessos.
