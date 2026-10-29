<a id="topo"></a>

# 0007. Liquidação por varredura periódica, em uma transação

<details>
  <summary>Sumário</summary>

1. [Contexto](#contexto)
2. [Decisão](#decisão)
3. [Alternativas descartadas](#alternativas-descartadas)
4. [Consequências](#consequências)

</details>

Status: aceito

## Contexto
Quando o lote chega ao fim, o vencedor é debitado, o leiloeiro é creditado e o comprovante é gerado. Isso precisa acontecer:
- mesmo sem ninguém na sala;
- depois de um reinício da API, inclusive para lotes que venceram com ela desligada;
- uma única vez, mesmo com duas varreduras pegando o mesmo lote;
- sem atropelar um lance de último segundo que prorrogou o fim.

## Decisão
- Um único `setInterval` (`SETTLEMENT_SWEEP_INTERVAL_MS`, 2 s) em `jobs/settlement.ts`, que também roda logo que a API sobe. Ele busca lotes `active` com `endsAt ≤ now` (índice `{ state, endsAt }`).
- Cada lote é liquidado numa única transação, que relê o lote e só grava se ele ainda estiver `active` e vencido, mudando para `settled` na mesma escrita.
- A tela não depende da varredura para mostrar "encerrado": o status exibido é calculado pelo horário (ADR 0003 e contrato). A varredura só faz o dinheiro e o comprovante.
- Depois do commit, o servidor avisa a sala (`lot:ended`) e o vencedor (`wallet:update`).

## Alternativas descartadas
- **Timer por lote (`setTimeout` no `endsAt`):** precisaria ser recriado a cada prorrogação e a cada reinício, e mesmo assim exigiria a varredura para os lotes que venceram com a API desligada. A varredura sozinha cobre todos os casos.
- **Estado intermediário `settling` (claim e depois transação):** se a API caísse entre as duas etapas, o lote ficaria preso. Fazer tudo numa transação condicionada ao estado `active` resolve a duplicidade sem esse risco.
- **Fila ou agendador externo (Agenda, BullMQ, cron):** mais uma dependência para um volume que um `setInterval` atende.

## Consequências
- O comprovante pode demorar até cerca de 2 s depois do fim para existir. A tela mostra "Apurando resultado…" nesse intervalo.
- Com a instância pausada (função na Vercel, ADR 0005), o `setInterval` para. Um middleware em `/api` roda a mesma varredura no máximo a cada 2 s, então o lote vencido é liquidado na primeira requisição seguinte.
- Com várias instâncias, a transação condicional continua impedindo liquidação dupla; só há trabalho repetido.

<p align="right"><a href="#topo">↑ Voltar ao topo</a></p>
