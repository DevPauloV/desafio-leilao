<a id="topo"></a>

# 0009. Pseudônimo por lote

<details>
  <summary>Sumário</summary>

1. [Contexto](#contexto)
2. [Decisão](#decisão)
3. [Alternativas descartadas](#alternativas-descartadas)
4. [Consequências](#consequências)

</details>

Status: aceito

## Contexto
Na sala, na auditoria e no comprovante, todos precisam distinguir os licitantes ("quem está ganhando", "quantos disputam"), mas o enunciado proíbe expor dados pessoais nessas telas públicas.

## Decisão
- Pseudônimo = `"Licitante #" + HMAC_SHA256(AUDIT_SECRET, userId + ":" + lotId)`, nos 6 primeiros caracteres hexadecimais, em maiúsculas.
- É calculado e gravado no lance (faz parte do hash da cadeia, ADR 0008) e no resultado do lote.
- Muda de lote para lote: o mesmo licitante aparece com códigos diferentes em leilões diferentes.
- A API devolve ao próprio usuário o pseudônimo dele naquele lote (`me.pseudonym`), e o front mostra "Você" no lugar.
- Rotas públicas nunca devolvem `bidderId`, `leaderId`, `winnerId`, nome nem e-mail.

## Alternativas descartadas
- **Pseudônimo fixo por usuário:** permitiria seguir a mesma pessoa em todos os leilões e montar o histórico de compras dela.
- **Hash simples (sem segredo) do id:** o id do Mongo é previsível, então alguém poderia testar ids e descobrir quem é quem.
- **Número sequencial na sala ("Licitante 1, 2, 3"):** precisaria de um mapeamento salvo à parte, e a ordem de entrada revela informação.

## Consequências
- Com 6 caracteres hexadecimais (16,7 milhões de combinações), dois licitantes do mesmo lote terem o mesmo código é improvável no volume do teste, mas possível. Isso vai no README. A regra de lance usa o `leaderId`, nunca o pseudônimo, então uma colisão só confunde a exibição.
- O leiloeiro também não vê quem venceu. A entrega do item fica fora do escopo do projeto.

<p align="right"><a href="#topo">↑ Voltar ao topo</a></p>
