# Contrato da API — Athelie Leilões

<details>
  <summary>Sumário</summary>

1. [1. Constantes (`src/constants.ts` na API; espelho em `src/constants.ts` no front)](#1-constantes-srcconstantsts-na-api-espelho-em-srcconstantsts-no-front)
2. [2. Erros](#2-erros)
3. [3. Coleções (MongoDB)](#3-coleções-mongodb)
4. [4. Regras de lance](#4-regras-de-lance)
5. [5. Auditoria e privacidade](#5-auditoria-e-privacidade)
6. [6. REST](#6-rest)
7. [7. Socket.IO](#7-socketio)
8. [8. Seed](#8-seed)
9. [9. Variáveis de ambiente](#9-variáveis-de-ambiente)

</details>

Fonte única para API e front. Mudou aqui, muda nos dois lados. Dinheiro é sempre **inteiro em centavos** (R$ 12,50 = `1250`). Datas em ISO 8601 (UTC).

## 1. Constantes (`src/constants.ts` na API; espelho em `src/constants.ts` no front)

Objetos `as const` com tipos derivados. Nenhum destes valores aparece como string solta no código.

```ts
Role       = { AUCTIONEER: 'auctioneer', BIDDER: 'bidder' }
LotState   = { ACTIVE: 'active', CANCELLED: 'cancelled', SETTLED: 'settled' } // salvo no banco
LotStatus  = { SCHEDULED: 'scheduled', LIVE: 'live', ENDED: 'ended', CANCELLED: 'cancelled' }   // calculado, exibido
MyBidStatus = { WINNING: 'winning', OUTBID: 'outbid', WON: 'won', LOST: 'lost', CANCELLED: 'cancelled' }
AuditProblem = { ALTERED: 'altered', MISSING: 'missing', INSERTED: 'inserted', HEAD_MISMATCH: 'head_mismatch' }
```

Cálculo do `LotStatus` a partir de `state` e do horário do servidor (`now`):

| `state` | condição | `LotStatus` |
|---|---|---|
| `cancelled` | — | `cancelled` |
| `settled` | — | `ended` |
| `active` | `now < startsAt` | `scheduled` |
| `active` | `startsAt ≤ now < endsAt` | `live` |
| `active` | `now ≥ endsAt` | `ended` (aguardando a varredura liquidar) |

Números de regra:

| Constante | Valor | Uso |
|---|---|---|
| `ANTI_SNIPING_WINDOW_MS` | `120_000` | lance com menos que isso para o fim prorroga |
| `ANTI_SNIPING_EXTENSION_MS` | `120_000` | novo fim = horário do lance + isso |
| `SETTLEMENT_SWEEP_INTERVAL_MS` | `2_000` | intervalo da varredura de liquidação |
| `SOCKET_ADAPTER_COLLECTION` | `'socket_events'` | coleção do adapter do Socket.IO |
| `SOCKET_ADAPTER_TTL_SECONDS` | `3_600` | tempo até o TTL apagar um aviso |
| `MET_TIMEOUT_MS` | `5_000` | timeout de cada chamada ao Met |
| `MET_RETRIES` | `1` | novas tentativas após falha |
| `MET_SEARCH_LIMIT` | `20` | obras devolvidas por busca |
| `MET_QUERY_MAX_LENGTH` | `100` | tamanho máximo do texto de busca de obras no painel |
| `MET_SEARCH_CANDIDATES` | `60` | ids pedidos à busca do Met (muitos são descartados) |
| `MET_CONCURRENCY` | `6` | detalhes de obras pedidos ao Met em paralelo |
| `LOT_START_TOLERANCE_MS` | `30_000` | quanto `startsAt` pode estar no passado ao criar o lote |
| `LOTS_PAGE_SIZE` | `12` | lotes por página na vitrine |
| `LOT_SEARCH_MAX_LENGTH` | `80` | tamanho máximo da busca e do filtro de departamento da vitrine |
| `MAX_DEPOSIT` | `10_000_000` | teto por depósito (R$ 100.000,00) |
| `MAX_IMAGE_BYTES` | `2_097_152` | maior imagem aceita (2 MB) |
| `PSEUDONYM_HEX_LENGTH` | `6` | caracteres do pseudônimo ("Licitante #7F3A2C") |
| `GENESIS_HASH` | `'0'.repeat(64)` | `prevHash` do primeiro lance |
| `NAME_MIN_LENGTH` · `NAME_MAX_LENGTH` | `2` · `80` | tamanho do nome no cadastro |
| `PASSWORD_MIN_LENGTH` | `8` | tamanho mínimo da senha (o máximo é 72 bytes, limite do bcrypt) |
| `EMAIL_MAX_LENGTH` | `254` | tamanho máximo do e-mail |
| `LOGIN_RATE_LIMIT_MAX` | `10` | tentativas de login por IP na janela |
| `LOGIN_RATE_LIMIT_WINDOW_MS` | `900_000` | janela do rate limit de login (15 min) |
| `BID_RATE_LIMIT_MAX` | `30` | lances por licitante na janela |
| `BID_RATE_LIMIT_WINDOW_MS` | `60_000` | janela do rate limit de lances (1 min) |
| `LOT_DETAIL_BIDS_LIMIT` | `50` | lances mais recentes no `LotDetail` |
| `LOCALE` · `CURRENCY` | `'pt-BR'` · `'BRL'` | idioma e moeda de toda formatação de data e dinheiro (API e front) |
| `RECEIPT_CODE_BYTES` | `16` | bytes aleatórios do `receiptCode` (22 caracteres em base64url) |

Os nomes dos eventos da seção 7 ficam em `SocketEvent` (`LOT_JOIN: 'lot:join'`, `LOT_LEAVE`, `LOT_STATE`, `BID_NEW`, `LOT_EXTENDED`, `LOT_ENDED`, `LOT_CANCELLED`, `BID_OUTBID`, `WALLET_UPDATE`).

## 2. Erros

Formato único: `{ "error": { "code": ErrorCode, "message": string, "details"?: object } }`. A mensagem já vem pronta em pt-BR e o front a exibe como está.

| `ErrorCode` | HTTP | Mensagem | `details` |
|---|---|---|---|
| `VALIDATION_ERROR` | 400 | Dados inválidos. | `{ fields: { campo: mensagem } }` (mensagem pt-BR pronta para exibir junto ao campo); sem `details` para JSON malformado ou corpo acima de 10 kb |
| `UNAUTHENTICATED` | 401 | Faça login para continuar. | |
| `INVALID_CREDENTIALS` | 401 | E-mail ou senha incorretos. | |
| `FORBIDDEN` | 403 | Você não tem permissão para esta ação. | |
| `AUCTIONEER_CANNOT_BID` | 403 | Leiloeiros não podem dar lances. | |
| `NOT_FOUND` | 404 | Não encontrado. | |
| `EMAIL_TAKEN` | 409 | Este e-mail já está cadastrado. | |
| `LOT_NOT_STARTED` | 409 | Este lote ainda não começou. | `{ startsAt }` |
| `LOT_ENDED` | 409 | Este lote já foi encerrado. | |
| `LOT_CANCELLED` | 409 | Este lote foi cancelado. | |
| `ALREADY_WINNING` | 409 | Você já está ganhando este lote. | |
| `BID_TOO_LOW` | 422 | O lance mínimo aceito é {minimum}. | `{ minimum }` (centavos) |
| `INSUFFICIENT_FUNDS` | 422 | Saldo disponível insuficiente. Você tem {available}. | `{ available }` (centavos) |
| `RATE_LIMITED` | 429 | Muitas tentativas. Aguarde um pouco. | |
| `EXTERNAL_API_UNAVAILABLE` | 503 | O Met está fora do ar. Tente de novo em alguns minutos; os lotes já criados não são afetados. | |
| `INTERNAL_ERROR` | 500 | Erro inesperado. Tente de novo. | |

`{minimum}` e `{available}` são marcadores: a API os troca pelo valor de `details` formatado com `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`. Exemplo: `"O lance mínimo aceito é R$ 1.100,00."` (o espaço depois de `R$` é não separável, U+00A0). O valor em centavos continua em `details` para o front usar, por exemplo, para preencher o campo.

`LOT_ENDED` também é a resposta ao tentar cancelar um lote encerrado, e `LOT_CANCELLED` ao cancelar de novo um lote cancelado. Lote de outro leiloeiro responde `NOT_FOUND` (não revela que existe).

`:id` malformado (não é um ObjectId) responde `NOT_FOUND`, como um id que não existe.

## 3. Coleções (MongoDB)

Detalhe de cada campo, com explicação, na seção "Banco de dados" do plano. Resumo:

**users**: `name`, `email` (único, minúsculas), `passwordHash` (bcrypt, nunca devolvido), `role`, `wallet.balance`, `wallet.committed`, timestamps.

**lots**:
- `auctioneerId`
- `item { metObjectId, title, artist?, date?, medium?, department?, metUrl?, imageId }`
- `startingBid`, `minIncrement`, `startsAt`, `endsAt`
- `state`, `currentBid` (null sem lances), `leaderId` (null sem lances), `bidCount`
- `chainHead { lastHash, signature }`
- `result { winnerId, winnerPseudonym, amount, receiptCode, chainHash, settledAt }` (null até liquidar)
- timestamps
- Índices: `{ state, endsAt }`, `auctioneerId`, `result.receiptCode` único parcial.

**bids** (só inserção): `lotId`, `seq`, `bidderId`, `pseudonym`, `amount`, `createdAt`, `prevHash`, `hash`. Índices: `{ lotId, seq }` único, `{ bidderId, lotId }`.

**images**: `data` (Buffer, ≤ `MAX_IMAGE_BYTES`), `contentType`, `createdAt`.

**socket_events**: avisos do Socket.IO entre instâncias da API (`@socket.io/mongo-adapter`), com TTL de `SOCKET_ADAPTER_TTL_SECONDS` em `createdAt`. Não guarda nada de negócio (ADR 0005).

Calculado, nunca salvo: saldo disponível, `LotStatus`, lance mínimo aceito, posição do usuário, total recebido, veredito da auditoria.

## 4. Regras de lance

`POST /api/lots/:id/bids` valida nesta ordem e para no primeiro erro:

1. Usuário é licitante, senão `AUCTIONEER_CANNOT_BID`.
2. `LotStatus` é `live`, senão `LOT_NOT_STARTED`, `LOT_ENDED` ou `LOT_CANCELLED`.
3. Usuário não é o `leaderId`, senão `ALREADY_WINNING`.
4. `amount ≥ minimumNextBid`, senão `BID_TOO_LOW`. Sem lances, `minimumNextBid = startingBid`; com lances, `currentBid + minIncrement`.
5. `amount ≤ balance − committed`, senão `INSUFFICIENT_FUNDS`.

Na mesma transação:
- atualiza o lote condicionado a `bidCount` não ter mudado desde a leitura;
- faz `committed += amount` no novo líder e `committed −= currentBid` no líder anterior;
- grava o lance na cadeia e a nova `chainHead`;
- se `endsAt − now < ANTI_SNIPING_WINDOW_MS`, define `endsAt = now + ANTI_SNIPING_EXTENSION_MS`.

Os eventos Socket.IO saem depois do commit.

**Cancelamento** (`POST /api/lots/:id/cancel`, só o dono): encerrado → `LOT_ENDED`. Sem lances: `state = cancelled`. Com lances: `state = cancelled` e `committed −= currentBid` do líder, na mesma transação (estorno automático).

**Liquidação** (varredura a cada `SETTLEMENT_SWEEP_INTERVAL_MS`, logo ao subir a API e, no máximo com esse intervalo, antes de uma requisição em `/api`; ver ADR 0007 e 0005). Para cada lote `active` com `endsAt ≤ now`, uma única transação:
- relê o lote e só continua se ele ainda estiver `active` com `endsAt ≤ now`, porque um lance de última hora pode ter prorrogado o fim;
- com vencedor: `balance −= amount` e `committed −= amount` no vencedor, `balance += amount` no leiloeiro;
- preenche `result` e grava `state = settled`, condicionado a `state = active`.

Sem lances: `result` com vencedor `null`, `state = settled`.

Se duas varreduras pegarem o mesmo lote, só uma transação confirma; a outra não casa a condição e não faz nada. Não há estado intermediário.

`receiptCode`: 16 bytes aleatórios (`crypto.randomBytes`) em base64url, com 22 caracteres. Só existe quando há vencedor.

Depois do commit: `lot:ended` na sala do lote e `wallet:update` para o vencedor.

## 5. Auditoria e privacidade

- **Pseudônimo**: `"Licitante #" + HMAC_SHA256(AUDIT_SECRET, userId + ":" + lotId).hex[0..6].toUpperCase()`. Muda de lote para lote.
- **Hash do lance**: `HMAC_SHA256(AUDIT_SECRET, JSON.stringify([lotId, seq, pseudonym, amount, createdAt.toISOString(), prevHash]))` em hex. No primeiro lance, `prevHash = GENESIS_HASH`.
- **Cabeça**: `chainHead.lastHash` = hash do último lance (ou `GENESIS_HASH`); `chainHead.signature = HMAC_SHA256(AUDIT_SECRET, "head:" + lotId + ":" + bidCount + ":" + lastHash)`.
- **Verificação** (recalculada a cada `GET /api/audit/lots/:id`):
  - percorre os lances por `seq`;
  - `seq` fora da sequência 1..N → `missing` ou `inserted`;
  - `prevHash` diferente do hash anterior → `missing`;
  - hash recalculado diferente → `altered`;
  - a assinatura da cabeça é conferida antes de tudo: se não bate, a contagem dela não é confiável e o problema é `head_mismatch`;
  - lance com `seq` maior que `lot.bidCount` ou `seq` repetido → `inserted`;
  - no fim, compara com `chainHead` e a assinatura dela → `head_mismatch`;
  - em lote liquidado com venda, `result.chainHash` e `result.amount` têm de bater com o hash e o valor do último lance → `head_mismatch`;
  - `valid` de cada lance = `seq` esperado, `prevHash` igual ao `hash` gravado no lance anterior e hash recalculado igual ao gravado. Assim só o lance adulterado fica marcado, e não a cadeia inteira dali para a frente;
  - o resultado traz o primeiro `seq` inválido e o problema dele (o primeiro encontrado). Em `head_mismatch` sem lance inválido, `firstInvalidSeq` = `lot.bidCount` (o último lance que a cabeça promete);
  - lote sem lances e com a cabeça íntegra → `intact: true`;
  - os lances são lidos em ordem de `seq` e, no empate, de inserção: com `seq` repetido, o original vem antes e o repetido é o `inserted`;
  - em `missing` por buraco na sequência, `firstInvalidSeq` é o `seq` que sumiu (ex.: lances 1 e 3 → `firstInvalidSeq: 2`);
  - em `head_mismatch` de lote sem lances (`bidCount = 0`), `firstInvalidSeq` não vem, porque não há lance para apontar.
- **Demonstração**: `npm run demo:tamper -- <lotId> <alter|remove|insert> [--last]` (no container: `docker compose exec api npm run demo:tamper -- <lotId> alter`) adultera direto no Mongo e imprime o veredito antes e depois, com o link da página `/auditoria/<lotId>`.
- **Ameaça coberta**: quem altera o banco sem conhecer o `AUDIT_SECRET`. Quem tem o segredo consegue refazer a cadeia; isso vai no README (ADR 0008).
- Rotas públicas (vitrine, sala, auditoria, comprovante) nunca devolvem `bidderId`, `leaderId`, `winnerId`, nome nem e-mail.

## 6. REST

Autenticação: `Authorization: Bearer <jwt>` (payload `{ sub, role }`). Toda entrada é validada com Zod.

Tipos usados nas respostas:

```ts
LotSummary = { id, title, artist, date, medium, imageUrl /* "/api/images/<id>" */, status: LotStatus,
               startsAt, endsAt, startingBid, currentBid, bidCount, department }
BidView    = { seq, pseudonym, amount, createdAt }
Wallet     = { balance, committed, available,
               leading: [{ lotId, title, amount, endsAt }] }  // lotes ativos em que o usuário lidera (= o comprometido)
```

| Método | Rota | Acesso | Entrada | Resposta |
|---|---|---|---|---|
| POST | `/api/auth/register` | público | `{ name (2–80), email, password (≥ 8 caracteres, ≤ 72 bytes), role }` | `201 { token, user: { id, name, email, role } }` |
| POST | `/api/auth/login` | público (rate limit) | `{ email, password }` | `{ token, user }` |
| GET | `/api/auth/me` | logado | | `{ user }` |
| GET | `/api/lots` | público | query `status?`, `page?` (12 por página), `q?` (1–80 caracteres), `department?`, `artist?`, `minPrice?`, `maxPrice?` (centavos), `period?` (`24h`, `7d`, `30d`) | `{ items: LotSummary[], page, total, serverTime, departments: Facet[], artists: Facet[] }` com `Facet = { name, count }` (nunca `cancelled`) |
| GET | `/api/lots/:id` | público (token opcional) | | `LotDetail` |
| POST | `/api/lots` | leiloeiro | `{ metObjectId, startingBid, minIncrement, startsAt, endsAt }` | `201 LotDetail` |
| POST | `/api/lots/:id/cancel` | leiloeiro dono | | `{ id, status: 'cancelled', refunded: boolean }` |
| POST | `/api/lots/:id/bids` | logado (rate limit por usuário); leiloeiro recebe `AUCTIONEER_CANNOT_BID` | `{ amount }` | `201 { bid: BidView, currentBid, minimumNextBid, endsAt, extended: boolean }` |
| GET | `/api/met/search` | leiloeiro | query `q` | `{ items: [{ metObjectId, title, artist, date, medium, department, previewUrl, metUrl }] }` |
| GET | `/api/me/lots` | leiloeiro | | `{ items: (LotSummary & { result: { sold, amount } \| null })[], totalReceived, serverTime }` (inclui os cancelados do próprio leiloeiro) |
| GET | `/api/me/bids` | licitante | | `{ items: [{ lot: LotSummary, myHighestBid, myStatus: MyBidStatus, receiptCode? }] }` |
| GET | `/api/wallet` | licitante | | `Wallet` |
| POST | `/api/wallet/deposit` | licitante | `{ amount (1..MAX_DEPOSIT) }` | `Wallet` |
| GET | `/api/audit/lots/:id` | público | | `AuditView` |
| GET | `/api/receipts/:code` | público | | `ReceiptView`; código inexistente ou fora do formato (22 caracteres base64url) → `NOT_FOUND` |
| GET | `/api/images/:id` | público | | bytes da imagem, `Cache-Control: public, max-age=31536000, immutable` e `Cross-Origin-Resource-Policy: cross-origin` (o front roda em outra origem) |
| GET | `/health` | público | | `{ status: 'ok' }` |

`POST /api/lots`:
- `metObjectId`, `startingBid` e `minIncrement` são inteiros positivos; `startsAt` e `endsAt` em ISO 8601 com fuso (`Z` ou `±hh:mm`);
- `startsAt` pode estar no passado em até `LOT_START_TOLERANCE_MS` (lote que começa "agora"); `endsAt > startsAt`;
- obra inexistente, fora do domínio público, sem imagem ou com imagem recusada (não é JPEG/PNG/WebP/GIF ou passa de `MAX_IMAGE_BYTES`) → `VALIDATION_ERROR` com `fields.metObjectId`;
- Met fora do ar → `EXTERNAL_API_UNAVAILABLE`, sem gravar nada.

`GET /api/me/bids`: um item por lote em que o licitante deu lance, pelo lance mais recente dele primeiro. `myHighestBid` é o maior lance dele no lote. `myStatus`:
- `cancelled`: o lote foi cancelado;
- `won`: liquidado e ele venceu (só aqui vem `receiptCode`);
- `lost`: liquidado e outro venceu;
- `winning`: ainda `active` e ele é o líder (inclui o intervalo entre o fim e a liquidação);
- `outbid`: ainda `active` e outro lidera.

`GET /api/me/lots`: mais recentes primeiro. `result` é `null` até liquidar; liquidado sem lances é `{ sold: false, amount: null }`. `totalReceived` soma `amount` dos vendidos.

Met: a busca usa `/v1.1/search?q=&hasImages=true&limit=` (o `/v1/search` foi aposentado pelo Met em 2026-10-01) e os detalhes, `/v1/objects/:id`. `MET_API_BASE` continua apontando para `.../public/collection/v1`.

Busca e filtro em `GET /api/lots`:
- `q` procura trecho no título ou no artista, sem diferenciar maiúsculas. É uma regex com a entrada escapada, e não um índice de texto: o índice de texto do Mongo não acha trechos ("dega" não acha "Degas"), e o volume de lotes é pequeno;
- `department` e `artist` filtram por igualdade exata com `item.department` e `item.artist`;
- `minPrice` e `maxPrice` comparam com o lance atual, ou com o lance inicial quando ainda não há lances; `maxPrice` menor que `minPrice` → `VALIDATION_ERROR`;
- `period` depende do status do lote: ao vivo termina dentro da janela, agendado começa dentro dela e encerrado terminou dentro dela;
- `departments` e `artists` contam os lotes visíveis da aba (`status`), em ordem alfabética e sem nulos. Os outros filtros não mudam essas contagens: elas preenchem a coluna de filtros da vitrine.

Ordem em `GET /api/lots`: ao vivo pelo fim mais próximo, agendados pelo início mais próximo, encerrados pelo fim mais recente. `artist`, `department` e os campos opcionais da obra podem vir `null`. `imageUrl` é um caminho relativo à API; o front prefixa com `VITE_API_URL`.

```ts
LotDetail = LotSummary & {
  item: { title, artist, date, medium, department, metUrl, imageUrl },
  minIncrement, minimumNextBid, serverTime,
  bids: BidView[],                        // mais recente primeiro, até 50 (a auditoria traz todos)
  me?: {                                  // com token de licitante; position = null enquanto ele não deu lance (o pseudônimo já vem, para o front reconhecer o "Você")
    pseudonym, isLeader, position, totalBidders, receiptCode?   // receiptCode só para o vencedor de lote liquidado
  },
  result?: {                              // só em lote liquidado; público, sem ids
    sold: boolean, winnerPseudonym: string | null, amount: number | null, settledAt
  }
}
AuditView = {
  lot: { id, title, artist, imageUrl, status, startsAt, endsAt },
  bids: (BidView & { prevHash, hash, valid: boolean })[],   // ordem de seq
  verdict: { intact: boolean, firstInvalidSeq?: number, problem?: AuditProblem },
  checkedAt
}
ReceiptView = {
  code, lot: { id, title, artist, date, medium, department, imageUrl, metUrl },
  winnerPseudonym, amount, settledAt, chainHash
}
```

## 7. Socket.IO

- Handshake: `auth: { token? }`. Sem token, o cliente só assiste. Com token, entra também na sala pessoal `user:<id>`.
- Cliente → servidor:
  - `lot:join { lotId }`: responde com `lot:state`. Aceita um callback de confirmação (ack) opcional, que recebe `{ ok: true }` ou o erro no formato da seção 2 (`lotId` malformado ou inexistente → `NOT_FOUND`). Depois de uma reconexão o socket é novo e não está em sala nenhuma: o front precisa mandar `lot:join` de novo no evento `connect`;
  - `lot:leave { lotId }`.
- Servidor → sala `lot:<id>`:
  - `lot:state` = `LotDetail` personalizado para quem entrou;
  - `bid:new { lotId, bid: BidView, currentBid, minimumNextBid, endsAt, bidCount, serverTime }`;
  - `lot:extended { lotId, endsAt, serverTime }`;
  - `lot:ended { lotId, winnerPseudonym \| null, amount \| null }`;
  - `lot:cancelled { lotId }`.
- Servidor → sala `user:<id>`:
  - `bid:outbid { lotId, title, currentBid }`;
  - `wallet:update Wallet`;
  - `lot:ended` (mesmo payload da sala) também vai para o leiloeiro dono do lote, para o painel mostrar o resultado e o total recebido sem recarregar.
- O lance nunca vai pelo socket. O front sabe que é ele comparando `bid.pseudonym` com `me.pseudonym`.

## 8. Seed

Roda ao subir a API quando `SEED_ON_START=true` e também por `npm run seed`. É idempotente: rodar de novo não duplica nada.

- **Contas** (senha única documentada no README, só para demonstração):
  - 1 leiloeiro;
  - 2 licitantes, com saldo depositado.
- **Obras:** dados e imagens versionados no repositório (`athelie-leiloes-api/seed/`), copiados uma vez do Met (obras de domínio público, CC0). O seed nunca chama o Met.
- **Lotes, todos do leiloeiro do seed:**
  - 1 **ao vivo** com lances dos dois licitantes. É renovável: se ao subir não houver nenhum lote do seed ao vivo, o seed cria outro, para quem avaliar depois de dias ainda encontrar um leilão aberto;
  - 1 **agendado**, que começa no futuro;
  - 1 **encerrado e liquidado** com vencedor e comprovante;
  - 1 **cancelado** com lance e estorno (não aparece na vitrine, só no painel);
  - mais 16 do **catálogo** (`SEED_CATALOG`), um por obra, para a vitrine ter variedade: 9 ao vivo com fins entre 2 horas e 10 dias (alguns com lances, outros sem), 3 agendados e 4 encerrados (um sem lances, logo sem vencedor). Cada um é criado uma vez só; quando o lote acaba, ele fica nos encerrados.
  - No total, 20 lotes com 20 obras diferentes: 10 ao vivo, 4 agendados, 5 encerrados e 1 cancelado.
- Todo lance do seed passa pelas mesmas regras e funções da API (cadeia HMAC, saldo comprometido, liquidação). A auditoria de todos os lotes do seed dá `intact: true`, e as carteiras fecham (`committed` = soma dos lances que lideram).
- **Identificação, sem campo novo:** lotes do seed são os do leiloeiro do seed. O ao vivo é renovado só quando nenhum lote do seed está ao vivo com lances; o agendado, quando nenhum lote dele ainda não começou; o encerrado, o cancelado e os do catálogo são reconhecidos pela obra (`item.metObjectId`). O agendado também é renovável, senão vira "ao vivo" depois de um dia e a vitrine fica sem agendado.
- O lote encerrado é criado ao vivo, recebe os lances pelo serviço, tem o fim movido para logo depois do último lance e é liquidado pela varredura real. Falha no seed é logada e não impede a API de subir; o log traz só contagens.

## 9. Variáveis de ambiente

`PORT`, `MONGO_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `AUDIT_SECRET`, `CORS_ORIGIN`, `TRUST_PROXY`, `SEED_ON_START`, `MET_API_BASE`, e `VERCEL`, que a própria Vercel define e faz a API não abrir porta. Validadas com Zod no boot (`src/config/env.ts`); variável inválida impede a API de subir.

`CORS_ORIGIN` aceita uma lista separada por vírgula (ex.: `http://localhost:8080,http://localhost:5173`), para o front em Docker e o front em desenvolvimento.

`TRUST_PROXY` é o número de proxies reversos na frente da API (padrão `0`; `1` na Vercel). Sem ele, atrás de proxy, todo cliente teria o mesmo IP no rate limit.

Front: `VITE_API_URL` (URL da API vista pelo navegador), usada no build.
