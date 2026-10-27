# 0002. MongoDB em replica set com transações

Status: aceito

## Contexto
Um lance mexe em três documentos ao mesmo tempo: o lote (lance atual, líder, fim), a carteira do novo líder (comprometido) e a carteira do líder anterior (liberação). A liquidação também mexe em três: lote, vencedor e leiloeiro. Se uma dessas escritas falhar no meio, o saldo fica errado. Dois lances simultâneos no mesmo lote não podem ser aceitos com base no mesmo "lance atual".

## Decisão
- MongoDB 7 com replica set de 1 nó (local e Compose) ou MongoDB Atlas (deploy), porque transações multi-documento exigem replica set.
- Toda mutação que mexe em mais de um documento (lance, cancelamento com estorno e liquidação) roda em `session.withTransaction`. O depósito é um único `$inc` num único documento, que o MongoDB já faz de forma atômica; por isso dispensa transação.
- O lote é atualizado com condição sobre o `bidCount` lido. Se outro lance entrou antes, a atualização não casa, a transação é refeita e o lance é revalidado contra o novo estado.
- A carteira fica dentro do documento do usuário (`wallet.balance`, `wallet.committed`), porque é sempre lida e alterada junto com ele.
- Dinheiro em centavos inteiros, nunca float.

## Alternativas descartadas
- **Sem transação, com operações atômicas isoladas**: cada `$inc` sozinho é atômico, mas não há como garantir que lote e duas carteiras mudem juntos.
- **PostgreSQL**: também resolveria, mas a stack já está definida com MongoDB e o replica set de 1 nó atende.
- **Coleção separada de carteira ou extrato (ledger)**: o PDF pede total, comprometido e disponível; o "total recebido" sai da soma dos lotes liquidados.

## Consequências
- O `docker-compose.yml` sobe o Mongo com `--replSet rs0` e inicia o replica set no healthcheck.
- Quem rodar sem Docker precisa de um Mongo em replica set ou do Atlas; o README explica.
- Os testes de integração usam `mongodb-memory-server` em modo replica set.
