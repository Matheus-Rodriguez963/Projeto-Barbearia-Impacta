# Histórico de atendimentos e ranking de serviços do mês — design

## Para que serve
Relatório do mês para quem cuida da casa: ver quem atendeu quem (cliente ↔ barbeiro) e
quais serviços a barbearia mais prestou no mês.

## Objetivos
- Lista dos atendimentos de um mês, com cliente, barbeiro, serviços e total, filtrável.
- Resumo do mês: atendimentos, faturamento, ticket médio.
- Ranking dos serviços do mês (quantidade e faturamento).
- Pares cliente ↔ barbeiro que mais se repetem no mês.

## Fora do escopo
- Caixa, comissão, exportar PDF/planilha, gráficos por dia.
- Nada de tabela nova nem migração: tudo sai de `agendamentos` + `agendamento_servicos`.

## Abordagens consideradas
- **A. Tela nova "Histórico" + roteador `/api/historico` (escolhida).** Separa relatório da
  operação e segue o padrão router + crud + schemas + testes.
- B. Painel do mês dentro da Agenda — pesa a tela que a recepção usa o dia todo.
- C. Front somando a agenda dia a dia — ~30 chamadas, sem filtro, regra fora do back.

## Regras
- Ranking, faturamento, ticket médio e pares contam **só `concluido`**.
- O preço é o de `agendamento_servicos` (o combinado na hora de marcar), não o atual.
- A lista abre filtrada em `concluido`; o filtro de situação deixa ver faltas, cancelados,
  agendados ou todos.
- Ordem da lista: mais recente primeiro (data desc, início desc).

## Back-end
- `app/schemas/historico.py`, `app/crud/historico.py`, `app/routers/historico.py`,
  registrado no `main.py`.
- `GET /api/historico?ano&mes&barbeiro_id&cliente_id&situacao&pagina&tamanho`
  → `{total, itens: AgendamentoResposta[]}` (reaproveita o schema da agenda).
  `situacao` aceita as quatro situações ou `todas`; padrão `concluido`.
- `GET /api/historico/resumo?ano&mes&barbeiro_id`
  → `{atendimentos, faturamento, ticket_medio, faltas, cancelados,
     servicos: [{servico_id, nome, quantidade, faturamento}],  // ordem: quantidade desc, faturamento desc
     pares: [{cliente, barbeiro, atendimentos}]}`               // top 5
  O filtro de barbeiro vale também pro resumo (ver o mês de um barbeiro só).
- Testes em `tests/test_historico.py`: filtro por mês/barbeiro/cliente/situação, só
  concluído no ranking, preço combinado vs. preço atual, ordem do ranking, mês vazio.

## Front-end
- Item "Histórico" no `MenuLateral` (depois de Serviços).
- `app/historico/page.tsx`: topo com `‹ Novembro 2026 ›`; linha de três números;
  à esquerda a tabela (data, cliente, barbeiro, serviços, total, situação) com filtros de
  barbeiro (select), cliente (`BuscaDeCliente`) e situação, e `Paginacao`; à direita o
  ranking com barrinhas e os pares cliente ↔ barbeiro.
- Tipos em `lib/tipos.ts` e funções em `lib/api.ts`, como as outras telas.

## Deixado para quem implementa
- Detalhes visuais seguem os componentes existentes (Topo, Secao, cores latão/mogno).
- `popular_banco.py` ganha alguns atendimentos concluídos no passado para a tela não
  abrir vazia.
- README: endpoints novos e a tela.
