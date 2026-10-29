# Roteiro de demonstração

<details>
  <summary>Sumário</summary>

1. [1. Disputa ao vivo](#1-disputa-ao-vivo)
2. [2. Recusas](#2-recusas)
3. [3. Auditoria](#3-auditoria)
4. [4. Leiloeiro, liquidação e comprovante](#4-leiloeiro-liquidação-e-comprovante)

</details>

Um passo a passo de uns 5 minutos para ver as principais funcionalidades no app, com o que deve acontecer em cada passo. [Voltar ao README](../README.md)

Os usuários e os lotes são criados pelo seed quando a API sobe. A senha de todos é **`athelie12345`**.

| Papel | E-mail | Para que serve |
|---|---|---|
| Leiloeiro | `leiloeiro@athelie.dev` | Criar e cancelar lotes no painel |
| Licitante | `licitante01@athelie.dev` | Dar lances (começa com R$ 50.000 na carteira) |
| Licitante | `licitante02@athelie.dev` | Disputar com o licitante 01 em outra janela |

**Lotes prontos:** 20 lotes, cada um com uma obra diferente do Met: 10 ao vivo (alguns já com lances, com fins entre 2 horas e 10 dias), 4 agendados, 5 encerrados com comprovante (um sem lances, logo sem vencedor) e 1 cancelado com estorno, que só aparece no painel do leiloeiro. Se não sobrar nenhum lote ao vivo com lances quando a API sobe, o seed cria outro, então sempre há um leilão aberto.

## 1. Disputa ao vivo

Entre como `licitante01` numa janela e como `licitante02` numa janela anônima. Abra o mesmo lote da aba **Ao vivo** nas duas (por exemplo, *Sunflowers*) e dê lances alternados.

→ O lance aparece na hora nas duas janelas. Quem é superado recebe o aviso "Você foi superado" e vê o saldo comprometido voltar na carteira.

## 2. Recusas

Na mesma sala, tente:

| Ação | O que acontece |
|---|---|
| Lance abaixo do mínimo mostrado no campo | "abaixo do mínimo", com o valor aceito em R$ |
| Novo lance de quem já está liderando | "você já está ganhando" |
| Lance maior que o saldo disponível (ex.: R$ 100.000) | "saldo insuficiente" |
| Abrir um lote da aba **Agendados** ou **Encerrados** | a sala não mostra o formulário: "Os lances abrem em …" ou o resultado. Chamando a API direto, ela recusa com "lote ainda não começou" ou "lote encerrado" |

## 3. Auditoria

Na sala, clique em **Auditoria** (ou abra `/auditoria/<id do lote>`, sem login).

→ O selo mostra "Histórico íntegro" e a cadeia de hashes, lance a lance, só com pseudônimos.

Para ver a adulteração ser detectada, copie o id do lote da URL e rode:

```bash
docker compose exec api npm run demo:tamper -- <id do lote> alter    # ou: remove, remove --last, insert
```

→ Ao recarregar a auditoria, o selo muda para "Histórico adulterado" e marca o lance com problema.

## 4. Leiloeiro, liquidação e comprovante

Entre como `leiloeiro`, busque "monet" no **Painel**, escolha uma obra e crie um lote que comece agora e termine em 3 minutos. Volte como licitante e dê um lance no último minuto.

→ O fim é prorrogado para 2 minutos depois do lance (anti-sniping). Ao terminar, o lote é liquidado: o vencedor vê o comprovante em **Meus arremates**, e o painel do leiloeiro mostra o resultado.
