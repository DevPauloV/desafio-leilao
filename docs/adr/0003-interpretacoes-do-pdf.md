# 0003. Interpretações do PDF

<details>
  <summary>Sumário</summary>

1. [Contexto](#contexto)
2. [Decisões](#decisões)
3. [Consequências](#consequências)

</details>

Status: aceito

## Contexto
Alguns trechos do PDF admitem mais de uma leitura. A escolha precisa ser única, testada e explicada no README.

## Decisões

**Valor mínimo do lance.** "O primeiro lance deve ser ≥ ao lance inicial. Os seguintes devem ser ≥ ao lance atual + incremento mínimo." Usamos **maior ou igual** nos dois casos; o valor exato é aceito.

**"Valor mínimo" e "lance inicial".** São o mesmo campo, `startingBid`. Não existe preço de reserva.

**Anti-sniping.** "Lance aceito nos últimos 2 minutos estende o fim do lote para +2 minutos." Se o lance for aceito quando faltam menos de 2 minutos, o novo fim é **o horário do lance + 2 minutos**.
- Alternativa descartada: somar 2 minutos ao fim atual. Lances seguidos empurrariam o fim muito além de 2 minutos após o último lance.
- Com a nossa leitura, depois de qualquer lance tardio todos têm exatamente 2 minutos para responder.

**Cancelamento.** O PDF traz duas exigências diferentes:
- Obrigatória ("cancelar um lote que ainda não recebeu lances"): o leiloeiro dono cancela um lote agendado ou ao vivo sem lances.
- Opcional ("cancelamento de lote com estorno automático"): um lote ao vivo com lances também pode ser cancelado, e o valor comprometido do líder volta ao disponível na mesma transação.
- Lote encerrado nunca é cancelado (`LOT_ENDED`).

**Posição do usuário.** Ranking pelo maior lance de cada licitante no lote: "você é o 2º de 4 licitantes".

**Comprovante compartilhável.** Página pública `/r/:code`, sem login, com código aleatório. Mostra a obra, o valor e o pseudônimo do vencedor, nunca dados pessoais.

## Consequências
- Cada decisão tem teste próprio: valor exato aceito, borda dos 2 minutos, cancelamento nos dois casos.
- O README tem uma seção "Regras e interpretações" com este conteúdo.
