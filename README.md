# Athelie Leilões

Casa de leilões online com obras do acervo do Metropolitan Museum. O leiloeiro cria os lotes, os licitantes dão lances ao vivo, o vencedor recebe um comprovante, e qualquer pessoa audita o histórico de lances, sem login, com detecção de adulteração.

<!-- Links: descomentar depois do deploy
| | |
|---|---|
| Aplicação | **https://SEU-FRONT.vercel.app** |
| API | https://SUA-API.up.railway.app (saúde em `/health`) |
| Repositório | https://github.com/DevPauloV/desafio-leilao |
-->

## Funcionalidades

- **Vitrine** com lotes ao vivo, agendados e encerrados, com busca e filtro.
- **Sala ao vivo** com lances em tempo real, contagem regressiva e anti-sniping.
- **Carteira** com saldo comprometido enquanto o licitante lidera.
- **Painel do leiloeiro** para criar lotes a partir do Met e cancelar com estorno.
- **Comprovante** e **auditoria pública**, sem dados pessoais.

Opcionais feitos: busca e filtro, cancelamento com estorno, Docker Compose, testes automatizados e dark mode.

## Feito com

**Front-end:** [ler sobre o front-end e seu funcionamento](docs/frontend.md)

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-000000?style=for-the-badge&logo=shadcnui&logoColor=white)

**Back-end:** [ler sobre a arquitetura, as regras e os testes](docs/backend.md)

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-010101?style=for-the-badge&logo=socket.io&logoColor=white)
![Zod](https://img.shields.io/badge/Zod-3E67B1?style=for-the-badge&logo=zod&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)

**Infra:** Docker Compose para rodar local; deploy na Vercel (front), no Railway (API) e no MongoDB Atlas ([por quê](docs/adr/0005-deploy.md)).

![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)
![Railway](https://img.shields.io/badge/Railway-0B0D0E?style=for-the-badge&logo=railway&logoColor=white)

**Mais documentação:**
- [Rotas da API](docs/contract.md): rotas REST, eventos Socket.IO e códigos de erro.
- [Auditoria e privacidade](docs/auditoria.md): como a cadeia de hashes HMAC detecta adulteração.
- [Decisões (ADRs)](docs/adr/): por que cada escolha importante foi feita.

## Como rodar

Pré-requisito: Docker.

```bash
cp .env.example .env
docker compose up --build
```

Front em http://localhost:8080 e API em http://localhost:3000. Para resetar o banco: `docker compose down -v`.

Testes (123, sem precisar de Docker): `cd athelie-leiloes-api && npm test`.

Para rodar sem Docker, veja o [back-end](docs/backend.md#rodar-sem-docker).

## Roteiro de demonstração

Senha de todos: **`athelie12345`**

| Papel | E-mail |
|---|---|
| Leiloeiro | `leiloeiro@athelie.dev` |
| Licitante | `licitante01@athelie.dev` |
| Licitante | `licitante02@athelie.dev` |

1. Abra o lote ao vivo com os dois licitantes, em janelas diferentes, e dispute.
2. Tente um lance abaixo do mínimo, sem saldo ou cobrindo o próprio lance.
3. Abra a **Auditoria** do lote.
4. Como leiloeiro, crie um lote no painel e acompanhe até o comprovante.

[Roteiro completo, com o que esperar em cada passo](docs/roteiro.md)

## Comportamentos inesperados

- O Met aposentou o `/v1/search` em 01/10/2026; a busca usa o `/v1.1/search`. Obras sem imagem ou fora do domínio público são puladas, então a busca pode trazer menos de 20.
- O resultado do lote aparece até ~2 s depois do fim ("Apurando resultado…").
- O seed não repõe saldo: depois de muitas reinicializações, deposite pela carteira ou resete o banco.
- Rate limit e salas do socket ficam em memória, então a API roda em uma instância.
- No Windows, o npm 10.8.2 pode quebrar no `npm install`; use `npx npm@11 install`.

## Uso de IA

Usei o Claude Code para agilizar código, testes e documentação; as decisões e a revisão foram minhas. Detalhes em [docs/ai-usage.md](docs/ai-usage.md).
