<a id="topo"></a>

# Back-end

<details>
  <summary>Sumário</summary>

1. [Arquitetura](#arquitetura)
2. [Caminho de um lance](#caminho-de-um-lance)
3. [Regras de negócio](#regras-de-negócio)
4. [Independência da API do Met](#independência-da-api-do-met)
5. [Segurança](#segurança)
6. [Rodar sem Docker](#rodar-sem-docker)
7. [Testes](#testes)
8. [Estrutura](#estrutura)
9. [Decisões (ADRs)](#decisões-adrs)

</details>

Node.js + Express 5 + TypeScript, MongoDB com Mongoose, Socket.IO no mesmo servidor HTTP e Zod em toda entrada. [Voltar ao README](../README.md)

As rotas, os eventos e os códigos de erro estão no [contrato da API](contract.md).

## Arquitetura

![Arquitetura: navegador, API com REST, Socket.IO e liquidação, MongoDB e API do Met](img/arquitetura.svg)

- **Camadas simples:** routes → controllers → services → models, sem repositórios nem abstrações extras ([ADR 0001](adr/0001-estrutura-do-back-end.md)).
- **Regras puras em `domain/`:** as regras de lance e a cadeia de hashes não dependem de banco nem de HTTP, então são testadas isoladamente.
- **Nada de string solta:** papéis, estados, códigos de erro, eventos e números das regras vêm de `constants.ts`.
- **MongoDB em replica set,** porque lance, saldo e liquidação precisam de transação ([ADR 0002](adr/0002-mongodb-transacoes.md)).

## Caminho de um lance

O lance entra pela API REST, não pelo socket ([ADR 0006](adr/0006-lance-via-rest.md)). O Socket.IO só avisa depois do commit, então ninguém vê um lance que depois foi desfeito.

![Caminho de um lance: o licitante envia, a API confere as regras, grava tudo numa transação e só então avisa a sala](img/caminho-do-lance.svg)

## Regras de negócio

- **Papéis:** o leiloeiro cria e gerencia os próprios lotes e não dá lances. O licitante deposita saldo e dá lances.
- **Lance mínimo:** o primeiro ≥ lance inicial; os seguintes ≥ lance atual + incremento. O valor exato é aceito. O líder não cobre o próprio lance.
- **Saldo:** disponível = total − comprometido. O valor de quem lidera fica comprometido e é liberado na hora em que essa pessoa é superada. O lance só é aceito se couber no disponível.
- **Anti-sniping:** lance nos últimos 2 minutos muda o fim para **horário do lance + 2 min**. Somar ao fim atual deixaria lances seguidos empurrarem o fim cada vez mais longe ([ADR 0003](adr/0003-interpretacoes-do-projeto.md)).
- **Liquidação:** uma varredura a cada 2 s (e, na Vercel, também na requisição seguinte ao fim) encerra os lotes vencidos. Numa única transação, debita o vencedor, credita o leiloeiro e gera o comprovante. Lote sem lances termina sem vencedor ([ADR 0007](adr/0007-liquidacao-por-varredura.md)).
- **Cancelamento:** lote agendado ou ao vivo. Se houver lances, o valor comprometido do líder volta na mesma transação. Lote encerrado não pode ser cancelado.
- **Concorrência:** cada lance é uma transação com update condicional pelo número de lances do lote, então dois lances simultâneos nunca valem sobre o mesmo estado. Dinheiro sempre em centavos inteiros.
- **Recusas:** "abaixo do mínimo" (com o valor mínimo em R$), "saldo insuficiente", "você já está ganhando", "lote ainda não começou" e "lote encerrado".

## Independência da API do Met

Só o painel do leiloeiro chama o Met: até 20 obras por busca, timeout de 5 s e uma nova tentativa. Obras sem imagem ou fora do domínio público são descartadas.

Ao criar o lote, os dados da obra são copiados para o lote e a imagem é baixada para o banco (servida por `GET /api/images/:id`). Vitrine, sala, auditoria e comprovante funcionam com o Met fora do ar. Com o Met fora, a busca no painel responde com uma mensagem clara ([ADR 0004](adr/0004-independencia-do-met.md)).

## Segurança

- JWT com autorização por papel e por dono em cada rota: o leiloeiro só cancela os próprios lotes, e o licitante só vê a própria carteira.
- Zod em toda entrada (corpo, query, params, socket e variáveis de ambiente). A API não sobe com variável inválida.
- `helmet`, corpo limitado a 10 KB, CORS restrito ao `CORS_ORIGIN` e senhas com bcrypt.
- Rate limit no login (por IP) e nos lances (por usuário).
- Logs sem dados pessoais nem valores de variáveis de ambiente.

A privacidade e a detecção de adulteração estão em [Auditoria e privacidade](auditoria.md).

## Rodar sem Docker

Precisa de Node.js 20.19+ e de um MongoDB **em replica set**, porque as transações exigem isso. Há duas opções.

**MongoDB instalado na máquina:** rode `mongod --replSet rs0` e, uma única vez, `mongosh --eval "rs.initiate()"`. O `MONGO_URI` do `.env.example` já aponta para ele.

**MongoDB Atlas (gratuito, sem instalar nada):** o Atlas já vem em replica set.
1. Crie uma conta em [mongodb.com/atlas](https://www.mongodb.com/atlas) e um cluster **M0 (Free)**.
2. Em **Database Access**, crie um usuário com senha.
3. Em **Network Access**, libere o seu IP (**Add Current IP Address**).
4. No cluster, clique em **Connect → Drivers** e copie a string de conexão.
5. No `.env`, troque a senha e coloque o nome do banco antes do `?`:
   ```
   MONGO_URI=mongodb+srv://usuario:senha@cluster0.xxxxx.mongodb.net/athelie-leiloes?retryWrites=true&w=majority
   ```
   Se a senha tiver caracteres especiais (`@`, `:`, `/`, `#`), escreva-os codificados (por exemplo, `@` vira `%40`).

```bash
cp .env.example .env          # ajuste MONGO_URI se precisar

cd athelie-leiloes-api
npm ci && npm run dev          # http://localhost:3000 (lê ../.env)

cd ../athelie-leiloes-front
npm ci && npm run dev          # http://localhost:5173
```

As variáveis estão explicadas no [`.env.example`](../.env.example), e a API não sobe se alguma estiver inválida. Fora da sua máquina, troque `JWT_SECRET` e `AUDIT_SECRET` (`openssl rand -hex 32`).

## Testes

São 128 testes automatizados na API, com o MongoDB em memória, incluindo os de concorrência. Como rodar e o que cada arquivo cobre: [Testes automatizados](testes.md).

## Estrutura

```
athelie-leiloes-api/src/
├── server.ts            sobe HTTP, Socket.IO, varredura e seed (exporta o servidor para a Vercel)
├── app.ts               Express: middlewares e rotas
├── config/env.ts        variáveis de ambiente validadas com Zod
├── constants.ts         papéis, estados, erros, eventos e números das regras
├── errors.ts            AppError (código + status HTTP) e tratamento central de erros
├── routes/              rotas por recurso, com auth, papel, validação e rate limit
├── middlewares/         autenticação e validação
├── controllers/         traduzem HTTP para chamadas de serviço
├── services/            regras de negócio: lances, carteira, lotes, liquidação, auditoria, Met
├── domain/              funções puras: bid-rules.ts e audit-chain.ts
├── models/              schemas do Mongoose (User, Lot, Bid, Image)
├── realtime/socket.ts   salas por lote e salas pessoais; adapter no MongoDB entre instâncias
├── jobs/settlement.ts   varredura que liquida lotes vencidos (timer e sob demanda)
├── seed/                dados de demonstração
└── scripts/             seed manual e demonstração de adulteração
```

## Decisões (ADRs)

| ADR | Decisão |
|---|---|
| [0001](adr/0001-estrutura-do-back-end.md) | Back-end em camadas, sem repositórios nem abstrações extras |
| [0002](adr/0002-mongodb-transacoes.md) | MongoDB em replica set, com transações para lance, saldo e liquidação |
| [0003](adr/0003-interpretacoes-do-projeto.md) | Interpretações do projeto (lance mínimo, incremento, anti-sniping, cancelamento) |
| [0004](adr/0004-independencia-do-met.md) | Obra e imagem copiadas para o banco |
| [0005](adr/0005-deploy.md) | Deploy de front e API na Vercel, banco no Atlas |
| [0006](adr/0006-lance-via-rest.md) | Lance pela REST; o Socket.IO só avisa |
| [0007](adr/0007-liquidacao-por-varredura.md) | Liquidação por varredura, uma transação por lote |
| [0008](adr/0008-cadeia-de-hashes-hmac.md) | Cadeia de hashes HMAC contra adulteração |
| [0009](adr/0009-pseudonimo-por-lote.md) | Pseudônimo por lote nas telas públicas |

<p align="right"><a href="#topo">↑ Voltar ao topo</a></p>
