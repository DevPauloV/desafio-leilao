<a id="topo"></a>

# 0010. Extrato da carteira em coleção própria

<details>
  <summary>Sumário</summary>

1. [Contexto](#contexto)
2. [Decisão](#decisão)
3. [Alternativas descartadas](#alternativas-descartadas)
4. [Consequências](#consequências)

</details>

Status: aceito

## Contexto
A carteira guardava só o par `balance` e `committed` no usuário. O licitante não tinha como ver o que aconteceu com o dinheiro dele: quando depositou, o que ficou reservado, o que voltou ao ser superado e o que foi debitado no arremate.

## Decisão
- Coleção `wallet_entries`, uma linha por movimento: depósito, lance reservado, lance superado, arremate e lote cancelado (estorno).
- A linha é gravada na mesma transação que altera o saldo (depósito, lance, liquidação e cancelamento), então o extrato nunca diverge do saldo.
- Cada linha guarda o saldo total e o comprometido logo depois do movimento, e o título do lote copiado: a tela mostra a evolução sem recalcular e continua certa se o lote mudar.
- `GET /api/wallet/entries` filtra por tipo e período (padrão: 7 dias), pagina de 20 em 20 e só devolve os movimentos de quem pede. O extrato é do licitante; o leiloeiro continua com o total recebido no painel.

## Alternativas descartadas
- **Montar o extrato a partir de lances e lotes:** não cobre depósitos, e liberação por lance superado ou cancelamento teria que ser deduzida.
- **Recalcular o saldo somando as linhas:** mais lento e frágil; o saldo continua sendo o campo do usuário e a linha guarda o resultado.
- **Registrar também o crédito do leiloeiro:** fora do pedido; o painel já mostra o total recebido.

## Consequências
- Cada lance passa a escrever mais uma ou duas linhas na mesma transação; o custo é pequeno e o conflito de escrita continua sendo no lote e no usuário, como antes.
- Movimentos anteriores a esta mudança não existem no extrato; o seed e a base nova já nascem com histórico.
