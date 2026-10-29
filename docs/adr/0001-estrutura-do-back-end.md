# 0001. Estrutura do back-end

<details>
  <summary>Sumário</summary>

1. [Contexto](#contexto)
2. [Decisão](#decisão)
3. [Alternativas descartadas](#alternativas-descartadas)
4. [Consequências](#consequências)

</details>

Status: aceito

## Contexto
A API é pequena: autenticação, lotes, lances, carteira, liquidação, auditoria e comprovante. O AGENTS.md define camadas de rotas, controllers, serviços e models. O projeto tem uma diretriz explícita de não criar arquivos, camadas ou abstrações sem motivo.

## Decisão
Usar só essas camadas, com um arquivo por recurso em cada pasta:

```
athelie-leiloes-api/src/
├── config/env.ts        # valida o .env com Zod no boot
├── constants.ts         # papéis, estados, erros, eventos, números de regra
├── errors.ts            # AppError + handler central
├── middlewares/         # auth (JWT + papel), validate (Zod)
├── models/              # User, Lot, Bid, Image
├── schemas/             # schemas Zod de entrada (body, query, params) e seus tipos
├── routes/  controllers/  services/
├── domain/              # bid-rules.ts, audit-chain.ts (funções puras)
├── realtime/socket.ts
├── jobs/settlement.ts
├── seed/
├── scripts/demo-tamper.ts
└── app.ts · server.ts
```

- Controllers só traduzem HTTP. Serviços orquestram transação, models e eventos.
- Os schemas de entrada ficam em `schemas/`, um arquivo por recurso. Rotas os aplicam com `validate()` e controllers e serviços importam os tipos, então o serviço só tem regra de negócio. Schemas de resposta da API externa (`met.ts`), de config (`env.ts`) e de socket ficam junto de quem os usa.
- As duas partes que mais precisam de teste isolado ficam em funções puras, que recebem `now` como parâmetro: as regras do lance e a cadeia de hashes.
- Transações usam `session.withTransaction` do Mongoose, que já repete a operação em caso de conflito.

## Alternativas descartadas
- **Camada de repositório**: os models do Mongoose já são a camada de dados; uma camada a mais só repassaria chamadas.
- **Monorepo com pacote compartilhado de constantes**: exigiria npm workspaces e mudaria os Dockerfiles e o deploy dos dois projetos, só para compartilhar poucas constantes.
- **Organização por módulo** (`modules/lots/{routes,controller,service}`): com 4 coleções e ~8 recursos, a separação por camada do AGENTS.md é mais fácil de navegar.

## Consequências
- Poucos arquivos, cada um com um papel claro.
- O front mantém uma cópia das constantes que usa. O `docs/contract.md` é a referência, e qualquer mudança é feita nos dois lados.
