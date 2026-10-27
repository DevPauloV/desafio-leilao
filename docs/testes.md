# Testes automatizados

A API tem 123 testes automatizados que conferem as regras do leilão sem abrir o navegador. Eles criam usuários, lotes e lances sozinhos, chamam a API como o front chamaria e verificam o resultado. [Voltar ao README](../README.md)

## Como rodar

Pré-requisito: Node.js 20.19 ou mais novo. **Não precisa de Docker nem de MongoDB instalado.**

```bash
cd athelie-leiloes-api
npm ci        # instala as dependências (só na primeira vez)
npm test      # roda todos os testes
```

O resultado esperado no fim é:

```
 Test Files  10 passed (10)
      Tests  123 passed (123)
```

Na primeira execução, o `mongodb-memory-server` baixa um binário do MongoDB (cerca de 100 MB), então demora mais. Das próximas vezes, leva uns 20 segundos.

Outros jeitos de rodar:

| Para | Comando |
|---|---|
| Rodar um arquivo só | `npx vitest run tests/bids.test.ts` |
| Rodar só os testes com um nome | `npx vitest run -t "simultâneos"` |
| Rodar de novo a cada alteração no código | `npx vitest` |
| Conferir tipos e estilo | `npm run lint` |

## Como funcionam

- **Vitest** roda os testes, e o **Supertest** faz as chamadas HTTP direto na aplicação Express, sem abrir porta.
- O **MongoDB roda em memória e em replica set** (`mongodb-memory-server`). Cada arquivo de teste sobe o próprio banco e o descarta no fim. Como é replica set, as transações são testadas de verdade, do mesmo jeito que em produção.
- **O Met é falso nos testes.** As respostas da API do Met são simuladas, então os testes não dependem de internet e conseguem simular o Met fora do ar.
- **O Socket.IO é testado com clientes de verdade** (`socket.io-client`), que entram nas salas e conferem os eventos recebidos.
- Os segredos (`JWT_SECRET` e `AUDIT_SECRET`) são valores só de teste, definidos em [`tests/setup.ts`](../athelie-leiloes-api/tests/setup.ts). O `.env` não é lido.

## O que cada arquivo cobre

| Arquivo | O que cobre |
|---|---|
| `bid-rules.test.ts` | Regras puras, sem banco: estado do lote, lance mínimo, validação do lance e anti-sniping |
| `bids.test.ts` | Carteira, lances pela API, cada mensagem de recusa, estorno no cancelamento e **concorrência** |
| `settlement.test.ts` | Liquidação: débito do vencedor, crédito do leiloeiro, comprovante sem dados pessoais, lote sem lances e duas liquidações ao mesmo tempo |
| `audit-chain.test.ts` | Hash de cada lance, pseudônimo e assinatura da cabeça da cadeia |
| `audit.test.ts` | Auditoria pública detectando cada tipo de adulteração feita direto no banco, e "meus arremates" |
| `lots.test.ts` | Criação de lote, vitrine, busca e filtro, cancelamento, imagens e **vitrine funcionando com o Met fora do ar** |
| `met.test.ts` | Busca no Met: descarte de obras sem imagem ou fora do domínio público, nova tentativa e erro claro quando o Met cai |
| `realtime.test.ts` | Entrada na sala e eventos de lance, prorrogação, cancelamento e liquidação pelo Socket.IO |
| `auth.test.ts` | Cadastro, login, papéis, rate limit do login, CORS e rota inexistente |
| `seed.test.ts` | Seed com 20 lotes de obras diferentes, sem duplicar ao rodar de novo, auditoria íntegra e carteiras fechando |

## Testes de concorrência

São os que mais importam num leilão. Ficam em `bids.test.ts` e `settlement.test.ts`:

- **10 lances ao mesmo tempo, com o mesmo valor:** exatamente 1 é aceito, e os outros 9 são recusados como "abaixo do mínimo".
- **10 lances ao mesmo tempo, com valores diferentes:** a sequência de lances fica sem buracos, e só o líder fica com saldo comprometido.
- **Um licitante com 2 lances simultâneos em lotes diferentes:** o saldo nunca é ultrapassado.
- **Duas liquidações ao mesmo tempo no mesmo lote:** um único débito e um único comprovante.

## E o front-end?

O front não tem testes automatizados. Ele é verificado pelo build (`npm run build`, que inclui a checagem de tipos do TypeScript) e pelo lint (`npm run lint`). Como todas as regras de negócio estão na API, é lá que os testes se concentram.
