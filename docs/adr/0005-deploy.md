# 0005. Deploy: front na Vercel, API no Railway, banco no MongoDB Atlas

Status: aceito

## Contexto
O PDF exige um link público. A API não é stateless:
- mantém conexões Socket.IO abertas;
- roda a varredura de liquidação a cada 2 s (ADR 0007);
- usa transações do MongoDB, que só existem em replica set (ADR 0002).

O front é um SPA estático, e o `VITE_API_URL` entra no bundle durante o build. O repositório é um só, com `athelie-leiloes-api/` e `athelie-leiloes-front/`.

## Decisão
- **Front na Vercel**, com Root Directory `athelie-leiloes-front`, build do Vite e `VITE_API_URL` apontando para a API. O `vercel.json` manda toda rota para o `index.html`, como o `try_files` do `nginx.conf` no Docker. Sem isso, abrir `/auditoria/:id` ou `/r/:code` direto dá 404.
- **API no Railway**, com Root Directory `athelie-leiloes-api` e o mesmo `Dockerfile` do Compose:
  - um processo sempre ligado, com Express, Socket.IO e a varredura na mesma porta;
  - healthcheck em `/health`;
  - `SEED_ON_START=true`, para quem avaliar encontrar o lote ao vivo;
  - `TRUST_PROXY=1`, porque o Railway coloca um proxy na frente e, sem isso, o rate limit veria todos os clientes com o mesmo IP.
- **Banco no MongoDB Atlas M0** (gratuito). Ele já é um replica set, e a API conecta por `mongodb+srv://`. Em Network Access fica `0.0.0.0/0`, porque o Railway não tem IP de saída fixo; o acesso é protegido por usuário e senha.
- **CORS** liberado só para o domínio de produção da Vercel. O REST e o Socket.IO leem a mesma variável `CORS_ORIGIN`.
- **Segredos próprios do ambiente:** `JWT_SECRET` e `AUDIT_SECRET` são gerados com `openssl rand -hex 32` e ficam só nas variáveis do Railway. Os do `.env.example` são públicos.

## Alternativas descartadas
- **API em Vercel Functions:** funções serverless não mantêm WebSocket aberto nem um `setInterval` rodando. A sala ao vivo e a liquidação automática deixariam de funcionar.
- **MongoDB do template do Railway:** sobe como nó isolado, sem replica set, e por isso não aceita transações. Montar um replica set à mão no Railway dá mais trabalho e quebra mais fácil que o Atlas.
- **Render ou outro plano gratuito que dorme:** com a API dormindo, a varredura para e os lotes não são liquidados na hora.
- **Tudo num lugar só (front servido pela API ou pelo nginx no Railway):** funcionaria, mas a Vercel já entrega CDN e deploy a cada push sem configuração extra.

## Consequências
- Cada push na `main` dispara o deploy dos dois: a Vercel refaz o front e o Railway refaz a API.
- Mudar o domínio do front exige atualizar o `CORS_ORIGIN` no Railway. Mudar o domínio da API exige atualizar o `VITE_API_URL` na Vercel e fazer um novo build.
- A API roda em **uma instância**. O rate limit em memória e a varredura dependem disso. Para escalar, seria preciso um store compartilhado (Redis) para o rate limit e o adapter do Socket.IO. A varredura já é segura com várias instâncias, porque cada liquidação é uma transação condicionada ao lote estar ativo.
- Trocar o `AUDIT_SECRET` depois que houver lances faz a auditoria acusar adulteração em todos os lotes (ADR 0008). O segredo é fixo por ambiente.
- O plano gratuito do Atlas (512 MB) comporta o volume do teste, incluindo as imagens das obras guardadas no banco (ADR 0004).
