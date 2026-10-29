# Front-end

<details>
  <summary>Sumário</summary>

1. [Telas](#telas)
2. [Fluxo de cada papel](#fluxo-de-cada-papel)
3. [Tempo real](#tempo-real)
4. [Estrutura](#estrutura)

</details>

React + Vite + TypeScript, com shadcn/ui + Tailwind. Tema claro e escuro: segue o sistema até a pessoa escolher, e a escolha fica guardada no navegador. [Voltar ao README](../README.md)

## Telas

| Rota | Quem acessa | O que faz |
|---|---|---|
| `/` | todos | Vitrine em abas (ao vivo, agendados, encerrados), com busca por título ou artista, filtro por departamento e paginação. Cancelados não aparecem |
| `/lotes/:id` | todos (lance só para licitante) | Sala do lote: obra, lance atual, contagem regressiva, histórico e formulário de lance |
| `/painel` | leiloeiro | Busca obras no Met, cria lotes, cancela com estorno e acompanha os próprios lotes |
| `/carteira` | licitante | Saldo total, comprometido e disponível; depósito |
| `/arremates` | licitante | Lotes em que deu lance, em abas: em disputa, arrematados e encerrados |
| `/r/:code` | todos, sem login | Comprovante do arremate, com botão para copiar o link |
| `/auditoria/:id` | todos, sem login | Selo "íntegro" ou "adulterado" e a cadeia de hashes do lote |
| `/entrar`, `/criar-conta` | todos | Login e cadastro (escolhendo o papel) |

Rotas de um papel só (`/painel`, `/carteira`, `/arremates`) mandam para o login quem não está logado e, depois de entrar, voltam para onde a pessoa estava.

## Fluxo de cada papel

**Visitante (sem login).** Vê a vitrine, entra nas salas e acompanha os lances ao vivo, abre comprovantes e auditorias. Para dar lance, precisa entrar.

**Licitante.**
1. Confere o saldo em `/carteira` e deposita se precisar.
2. Na sala, dá um lance. O campo mostra o valor mínimo aceito e tem atalhos para o mínimo e para valores acima dele. A recusa aparece com a mensagem da regra (abaixo do mínimo, saldo insuficiente, já está ganhando, lote não iniciado ou encerrado).
3. Se for superado, recebe um aviso em qualquer página, com o botão "Ir para a sala".
4. Em `/arremates`, vê cada lote como ganhando, superado, arrematado, não arrematado ou cancelado. Os arrematados levam ao comprovante.

**Leiloeiro.**
1. No `/painel`, busca obras no Met (por exemplo, "monet" ou "vase") e escolhe uma.
2. Define lance inicial, incremento mínimo, início e fim, e publica.
3. Acompanha os próprios lotes. Pode cancelar um lote agendado ou ao vivo; se houver lances, o valor do líder é estornado.
4. Quando um lote dele é liquidado, a lista se atualiza sozinha.

## Tempo real

Existe uma única conexão Socket.IO para o app inteiro ([`lib/socket.ts`](../athelie-leiloes-front/src/lib/socket.ts)). Sem login, ela só assiste às salas; com login, recebe também os avisos pessoais.

| Evento | Efeito na tela |
|---|---|
| `bid:new` | a sala atualiza lance atual, líder e histórico |
| `lot:extended` | a contagem ganha o novo fim e aparece "Prorrogado: novo fim às …" |
| `lot:ended` | a sala mostra "Apurando resultado…" e depois o vencedor |
| `lot:cancelled` | a sala avisa que o leiloeiro cancelou o lote |
| `bid:outbid` | aviso de superado em qualquer página |
| `wallet:update` | o saldo do cabeçalho e da carteira muda na hora |

O lance em si vai pela API REST. O socket só avisa ([ADR 0006](adr/0006-lance-via-rest.md)). Ao reconectar, a sala entra de novo e recarrega o estado.

A contagem regressiva usa a hora do servidor (`serverTime`, que vem em cada resposta), então um relógio errado no computador não adianta nem atrasa o fim.

## Estrutura

```
athelie-leiloes-front/src/
├── App.tsx            splash e rotas
├── constants.ts       rotas, papéis, estados e eventos (espelho da API)
├── types.ts           tipos das respostas da API
├── pages/             uma página por rota (vitrine, sala, painel, carteira, arremates, comprovante, auditoria, login, cadastro, 404)
│                      as telas grandes viram pasta: index.tsx é a página, os outros arquivos são as partes dela
│                      (ex.: lot-room/bid-area.tsx, auctioneer-panel/new-lot-form.tsx, showcase/lot-card.tsx)
├── components/        peças reaproveitadas (cabeçalho em app-header/, obra, status do lote, formulários, filtros em tela cheia, proteção por papel)
│   └── ui/            componentes do shadcn/ui
├── hooks/
│   ├── use-page-data.ts       busca com cache por página
│   ├── use-lot-room.ts        estado da sala ao vivo (REST + eventos do socket)
│   ├── use-socket-event.ts    assina um evento do socket enquanto o componente existe
│   ├── use-personal-events.ts avisos pessoais (superado, carteira)
│   ├── use-submit.ts          envio de formulário: carregando, erro e erros por campo
│   ├── use-server-now.ts      relógio com a hora do servidor
│   └── use-loader-visible.ts  splash sem piscar
└── lib/
    ├── api.ts         cliente HTTP e mensagens de erro
    ├── auth.ts        sessão e token
    ├── socket.ts      conexão Socket.IO
    ├── lot-room.ts    regras puras da sala (lance novo, resposta atrasada, aviso de prorrogação)
    ├── wallet.ts      saldo compartilhado entre cabeçalho e carteira
    ├── money.ts       centavos ↔ R$
    ├── time.ts        formatação de datas e contagem regressiva
    └── theme.ts       tema claro e escuro
```
