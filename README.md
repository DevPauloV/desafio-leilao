# Athelie Leilões

Casa de leilões online. O leiloeiro cria lotes a partir de obras do acervo do Metropolitan Museum (The Met Collection API), os licitantes dão lances ao vivo, o vencedor recebe um comprovante público, e qualquer pessoa audita o histórico de lances de um lote, sem login, com detecção de adulteração.

![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-Vite-61DAFB?logo=react&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-Express_5-339933?logo=node.js&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-replica_set-47A248?logo=mongodb&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-tempo_real-010101?logo=socket.io&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)
![Testes](https://img.shields.io/badge/testes-123_passando-2E7D32)

<!-- Links: descomentar depois do deploy
| | |
|---|---|
| Aplicação | **https://SEU-FRONT.vercel.app** |
| API | https://SUA-API.up.railway.app (saúde em `/health`) |
| Repositório | https://github.com/DevPauloV/desafio-leilao |
-->

## Roteiro de demonstração

Um passo a passo de uns 5 minutos para ver as principais funcionalidades no app. Os usuários e os lotes abaixo são criados pelo seed quando a API sobe ([como rodar](#como-rodar)).

**Usuários** (senha de todos: **`athelie12345`**)

| Papel | E-mail | Para que serve |
|---|---|---|
| Leiloeiro | `leiloeiro@athelie.dev` | Criar e cancelar lotes no painel |
| Licitante | `licitante01@athelie.dev` | Dar lances (começa com R$ 50.000 na carteira) |
| Licitante | `licitante02@athelie.dev` | Disputar com o licitante 01 em outra janela |

**Lotes prontos:** um ao vivo com lances, um agendado, um encerrado com comprovante e um cancelado com estorno (este só aparece no painel do leiloeiro). Se não houver lote ao vivo quando a API sobe, o seed cria outro, então sempre há um leilão aberto.

### 1. Disputa ao vivo

Entre como `licitante01` numa janela e como `licitante02` numa janela anônima. Abra o lote da aba **Ao vivo** nas duas e dê lances alternados.

→ O lance aparece na hora nas duas janelas. Quem é superado recebe o aviso "Você foi superado" e vê o saldo comprometido voltar na carteira.

### 2. Recusas

Na mesma sala, tente:

| Ação | Mensagem esperada |
|---|---|
| Lance abaixo do mínimo mostrado no campo | abaixo do mínimo, com o valor aceito em R$ |
| Novo lance de quem já está liderando | você já está ganhando |
| Lance maior que o saldo disponível (ex.: R$ 100.000) | saldo insuficiente |
| Abrir um lote da aba **Agendados** ou **Encerrados** | a sala não mostra o formulário: "Os lances abrem em …" ou o resultado. Se alguém chamar a API direto, ela recusa com "lote ainda não começou" ou "lote encerrado" |

### 3. Auditoria

Na sala, clique em **Auditoria** (ou abra `/auditoria/<id do lote>`, sem login).

→ O selo mostra "Histórico íntegro" e a cadeia de hashes, lance a lance, só com pseudônimos.

Para ver a adulteração ser detectada, copie o id do lote da URL e rode:

```bash
docker compose exec api npm run demo:tamper -- <id do lote> alter
```

→ Ao recarregar a auditoria, o selo muda para "Histórico adulterado" e marca o lance alterado.

### 4. Leiloeiro, liquidação e comprovante

Entre como `leiloeiro`, busque "monet" no **Painel**, escolha uma obra e crie um lote que comece agora e termine em 3 minutos. Volte como licitante e dê um lance no último minuto.

→ O fim é prorrogado para 2 minutos depois do lance (anti-sniping). Ao terminar, o lote é liquidado: o vencedor vê o comprovante em **Meus arremates**, e o painel do leiloeiro mostra o resultado.

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
