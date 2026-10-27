# 0005. Deploy: front e API na Vercel, banco no MongoDB Atlas

Status: aceito

## Contexto
O PDF exige um link público. A API não é stateless:
- mantém conexões Socket.IO abertas;
- roda a varredura de liquidação a cada 2 s (ADR 0007);
- usa transações do MongoDB, que só existem em replica set (ADR 0002).

O plano era a API no Railway, como um processo sempre ligado. Mas o Railway suspendeu os cadastros novos depois de um incidente de segurança, sem previsão de reabertura ([relatório do incidente](https://blog.railway.com/p/preliminary-report-october-security-incident)). Ao mesmo tempo, a Vercel passou a servir WebSocket em Functions (Fluid compute), inclusive com Socket.IO, que antes era o motivo para descartá-la.

Na Vercel, a API vira uma função, e isso traz três limitações:
- cada conexão fica presa a uma instância, e pode haver várias;
- a instância pausa quando não há requisição em andamento;
- no plano Hobby, uma conexão dura no máximo 300 s.

## Decisão
- **Front na Vercel**, com Root Directory `athelie-leiloes-front`, build do Vite e `VITE_API_URL` apontando para a API. O `vercel.json` manda toda rota para o `index.html`, como o `try_files` do `nginx.conf` no Docker.
- **API na Vercel**, em outro projeto, com Root Directory `athelie-leiloes-api`:
  - `api/index.js` exporta o mesmo servidor HTTP (Express + Socket.IO) do `dist/server.js`, e o `vercel.json` manda toda rota para ele. O `server.ts` só abre a porta fora da Vercel.
  - A Vercel exige uma pasta estática não vazia; a `public/` só tem um `robots.txt` que impede a indexação da API. Nada do código fica exposto como arquivo estático.
  - **Avisos entre instâncias:** o Socket.IO usa o adapter do MongoDB (`@socket.io/mongo-adapter`). Cada emit vira um documento na coleção `socket_events`, e as outras instâncias o recebem por change stream. Um índice TTL apaga os antigos.
  - **Liquidação sob demanda:** além do `setInterval`, um middleware em `/api` roda a mesma varredura quando a última passou de 2 s. Com a instância pausada, quem chega depois do fim liquida o lote antes de ver a resposta.
  - **Cliente só com WebSocket** (`transports: ['websocket']`): o long-polling mandaria cada requisição para uma instância diferente.
  - **Socket desconectado com a aba oculta**, e carteira relida a cada conexão: conexão aberta conta como uso de memória, e a cota do Hobby é mensal.
  - `TRUST_PROXY=1` (a Vercel é o proxy) e `SEED_ON_START=true` (cada partida a frio renova os lotes de demonstração).
- **Banco no MongoDB Atlas M0** (gratuito), que já é replica set. Network Access fica em `0.0.0.0/0`, porque a Vercel não tem IP de saída fixo; o acesso é protegido por usuário e senha.
- **CORS** liberado só para o domínio de produção do front. O REST e o Socket.IO leem a mesma variável `CORS_ORIGIN`.
- **Segredos próprios do ambiente:** `JWT_SECRET` e `AUDIT_SECRET` gerados com `openssl rand -hex 32`, só nas variáveis da Vercel. Os do `.env.example` são públicos.

## Alternativas descartadas
- **Railway:** continua sendo a opção mais direta, um processo sempre ligado com o mesmo `Dockerfile` do Compose, e funciona sem mudar nada no código. Ficou de fora só porque não aceitava contas novas.
- **Render ou outro plano gratuito que dorme:** com a API dormindo, o primeiro acesso espera o container subir (perto de um minuto), e manter acordado com pings vai contra as regras de uso.
- **MongoDB fora do Atlas (template do Railway, container próprio):** nó isolado, sem replica set, então sem transações nem change streams.
- **Redis para o adapter do Socket.IO:** seria mais um serviço para provisionar; o MongoDB já está lá e já tem change streams.

## Consequências
- **O socket cai a cada ~5 min.** O cliente reconecta em cerca de 1 s, refaz o `lot:join` e recebe `lot:state`, e o cabeçalho relê a carteira. Um aviso pessoal (toast de superado) emitido exatamente nesse intervalo se perde.
- **Lote que acaba sem ninguém conectado é liquidado na primeira requisição seguinte**, não no segundo exato. O vencedor e o valor são os mesmos, porque lance depois do `endsAt` já é recusado. O `settledAt` pode ficar depois do `endsAt`.
- **A primeira requisição depois de um tempo parado** espera a conexão com o Atlas e a checagem do seed.
- **O rate limit em memória vale por instância.** Com várias instâncias, o limite de login fica mais fraco. Um store compartilhado resolveria, mas não se justifica para este volume.
- **As cotas do Hobby** (memória provisionada, CPU e invocações) são mensais. Se estourarem, a Vercel pausa o projeto até o próximo ciclo.
- **O mesmo código roda no Docker e no Railway.** O adapter só exige replica set, que o Compose já sobe, e com uma instância ele não atrapalha. A varredura por `setInterval` continua lá, e o middleware quase nunca encontra o que liquidar. Para voltar ao Railway, basta criar o serviço com o `Dockerfile` e as variáveis.
- **Domínios e variáveis:** mudar o domínio do front exige atualizar o `CORS_ORIGIN` da API. Mudar o da API exige atualizar o `VITE_API_URL` do front e fazer um novo build.
- **Trocar o `AUDIT_SECRET`** depois que houver lances faz a auditoria acusar adulteração em todos os lotes (ADR 0008). O segredo é fixo por ambiente.
- **O Atlas gratuito (512 MB)** comporta o volume do teste, incluindo as imagens das obras guardadas no banco (ADR 0004).
