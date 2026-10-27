# Athelie Leilões

Casa de leilões online. O leiloeiro cria lotes a partir de obras do acervo do Metropolitan Museum (The Met Collection API), os licitantes dão lances ao vivo, o vencedor recebe um comprovante público, e qualquer pessoa audita o histórico de lances de um lote, sem login, com detecção de adulteração.

![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-Vite-61DAFB?logo=react&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-Express_5-339933?logo=node.js&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-replica_set-47A248?logo=mongodb&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-tempo_real-010101?logo=socket.io&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)
![Testes](https://img.shields.io/badge/testes-123_passando-2E7D32)

| | |
|---|---|
| Aplicação | **https://SEU-FRONT.vercel.app** |
| API | https://SUA-API.up.railway.app (saúde em `/health`) |
| Repositório | https://github.com/DevPauloV/desafio-leilao |

## Testar em 2 minutos

Senha de todos: **`athelie12345`**

| Papel | E-mail |
|---|---|
| Leiloeiro | `leiloeiro@athelie.dev` |
| Licitante | `licitante01@athelie.dev` (R$ 50.000 na carteira) |
| Licitante | `licitante02@athelie.dev` (R$ 50.000 na carteira) |

1. Entre como `licitante01` numa janela e como `licitante02` numa janela anônima, abra o lote **ao vivo** e dê lances alternados. Os dois veem o lance na hora, e quem é superado recebe um aviso.
2. Force as recusas: abaixo do mínimo, cobrir o próprio lance, sem saldo, lote agendado ou encerrado.
3. Abra **Auditoria** na sala: o selo mostra "íntegro" e a cadeia de hashes.
4. Como leiloeiro, busque "monet" no painel, crie um lote curto e acompanhe a liquidação e o comprovante.

O seed também cria um lote agendado, um encerrado com comprovante e um cancelado com estorno. Se não houver lote ao vivo quando a API sobe, ele cria outro, então sempre há um leilão aberto para testar.

## O que tem

Detalhes de cada tela e do fluxo de cada papel no [documento do front-end](docs/frontend.md).

| Tela | O que faz |
|---|---|
| Vitrine `/` | Lotes ao vivo, agendados e encerrados (cancelados ficam ocultos), com busca e filtro |
| Sala `/lotes/:id` | Lance atual, contagem regressiva, histórico e lance em tempo real |
| Painel `/painel` | Leiloeiro busca obras no Met, cria lotes, cancela com estorno e vê resultados |
| Carteira `/carteira` | Saldo total, comprometido e disponível; depósito |
| Meus arremates `/arremates` | Ganhando, superado, arrematado ou perdido, com link do comprovante |
| Comprovante `/r/:code` | Público, sem dados pessoais |
| Auditoria `/auditoria/:id` | Pública, sem login: verifica a integridade dos lances |

**Opcionais, todos feitos:** busca e filtro de lotes, cancelamento com estorno, Docker Compose, testes automatizados e dark mode.

## Como rodar

**Com Docker** (só precisa do Docker):

```bash
cp .env.example .env
docker compose up --build
```

Front em http://localhost:8080 e API em http://localhost:3000. O seed roda sozinho e não duplica nada se subir de novo.

| Para | Comando |
|---|---|
| Parar (mantém os dados) | `docker compose down` |
| Resetar o banco | `docker compose down -v && docker compose up --build` |
| Rodar os testes | `cd athelie-leiloes-api && npm test` (123 testes, Mongo em memória, sem Docker) |

**Sem Docker:** Node 20.19+ e um MongoDB **em replica set** (por exemplo, `mongod --replSet rs0` e `mongosh --eval "rs.initiate()"` uma vez, ou um Atlas gratuito). Depois, `npm ci && npm run dev` em `athelie-leiloes-api` e em `athelie-leiloes-front` (front em http://localhost:5173).

As variáveis estão explicadas no próprio [`.env.example`](.env.example). A API valida todas com Zod e não sobe se alguma estiver errada. Fora da sua máquina, troque `JWT_SECRET` e `AUDIT_SECRET` (`openssl rand -hex 32`).

## Documentação

| Documento | O que tem |
|---|---|
| [Front-end](docs/frontend.md) | Telas, fluxo de cada papel, eventos em tempo real e estrutura de pastas |
| [Back-end](docs/backend.md) | Arquitetura, caminho de um lance, regras de negócio, segurança, testes e estrutura de pastas |
| [Rotas da API](docs/contract.md) | Rotas REST, eventos Socket.IO, modelos, códigos de erro e variáveis de ambiente |
| [Auditoria e privacidade](docs/auditoria.md) | Cadeia de hashes HMAC, o que ela detecta, demonstração de adulteração e pseudônimos |
| [Decisões (ADRs)](docs/adr/) | Por que cada escolha importante foi feita e o que foi descartado |
| [Uso de IA](docs/ai-usage.md) | Onde e como a IA foi usada e o que foi revisado |

## Destaques técnicos

- **Lance seguro sob concorrência.** Cada lance é uma transação no MongoDB, com update condicional pelo número de lances do lote. Dois lances simultâneos nunca valem sobre o mesmo estado (os testes disparam 10 ao mesmo tempo). [Mais](docs/backend.md#regras-de-negócio)
- **Histórico à prova de adulteração.** Os lances formam uma cadeia de hashes HMAC-SHA256 com um segredo que não está no banco. Alterar, remover ou inserir um lance, mesmo direto no Mongo, aparece na auditoria pública. [Mais](docs/auditoria.md)
- **Funciona com o Met fora do ar.** Ao criar o lote, a obra e a imagem são copiadas para o banco; só o painel do leiloeiro depende da API externa. [Mais](docs/backend.md#independência-da-api-do-met)
- **Privacidade.** Telas públicas mostram só um pseudônimo por lote, diferente em cada leilão. [Mais](docs/auditoria.md#privacidade)

## Deploy

Front na **Vercel**, API no **Railway** (com o mesmo `Dockerfile` do Compose) e banco no **MongoDB Atlas** (replica set gerenciado). A API não foi para Vercel Functions porque funções serverless não mantêm o WebSocket aberto nem a varredura de liquidação rodando. Configuração completa no [ADR 0005](docs/adr/0005-deploy.md).

## Comportamentos inesperados

- **O Met aposentou o `/v1/search`** em 01/10/2026; a busca usa `/v1.1/search`. Obras sem imagem, fora do domínio público ou com erro são puladas, então uma busca pode trazer menos de 20 resultados.
- **O resultado leva até ~2 s** depois do fim, por causa da varredura. Nesse intervalo, a sala mostra "Apurando resultado…".
- **O seed não repõe saldo.** Cada lote ao vivo recriado compromete mais saldo dos licitantes; deposite pela carteira ou resete o banco.
- **Uma instância da API.** Rate limit e salas do socket ficam em memória; escalar exigiria Redis. A liquidação já é segura com várias instâncias.
- **Reconexão:** o front volta à sala e recarrega o estado; um aviso emitido durante a queda não é reenviado, mas o estado já vem atualizado.
- **A contagem usa a hora do servidor**, então um relógio errado no navegador não muda o fim na tela.
- **npm 10.8.2 no Windows** pode quebrar no `npm install`; use `npx npm@11 install`. O Docker não é afetado.

## Uso de IA

Usei IA (Claude Code) como ferramenta para agilizar a escrita de código, testes e documentação. A arquitetura, a modelagem, as regras e as técnicas (transações, cadeia HMAC, pseudônimos) foram decididas por mim, e todo código passou pela minha revisão e pelos testes antes de entrar. O deploy (Atlas, Railway e Vercel) eu fiz manualmente. Os detalhes estão em [`docs/ai-usage.md`](docs/ai-usage.md).
