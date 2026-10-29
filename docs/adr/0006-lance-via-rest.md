<a id="topo"></a>

# 0006. Lance pela API REST; Socket.IO só para avisos

<details>
  <summary>Sumário</summary>

1. [Contexto](#contexto)
2. [Decisão](#decisão)
3. [Alternativas descartadas](#alternativas-descartadas)
4. [Consequências](#consequências)

</details>

Status: aceito

## Contexto
A sala ao vivo precisa de duas coisas diferentes:
- **enviar um lance**, que precisa de validação, transação e uma resposta clara de aceito ou recusado;
- **receber as mudanças dos outros**: lances novos, prorrogação e encerramento.

## Decisão
- **O lance vai por `POST /api/lots/:id/bids`.** Passa pelo mesmo caminho de todas as rotas (autenticação, papel, Zod, rate limit e handler de erro) e responde com o lance aceito ou com `{ error: { code, message } }`.
- **O Socket.IO só transmite**, e só depois que a transação confirma: `bid:new`, `lot:extended`, `lot:ended`, `bid:outbid` e `wallet:update`. O servidor nunca recebe lance pelo socket.
- **O pseudônimo e a cadeia de hashes** de cada lance são gravados na mesma transação do lance. A verificação pública fica na rota de auditoria (ADR 0008).

## Alternativas descartadas
- **Lance pelo socket** (`socket.emit('bid', …)`): duplicaria autenticação, validação, limite de tentativas e formato de erro num segundo caminho, e o teste de integração ficaria mais difícil.
- **Atualização da sala por polling:** desperdiça requisições e atrasa o "você foi superado". O socket só para avisos é simples e resolve.

## Consequências
- As regras de lance são testadas com supertest, sem cliente de socket.
- Se o socket cair, o lance continua funcionando. Ao reconectar, o front recebe o estado completo (`lot:state`).
- Quem deu o lance recebe a resposta HTTP e também o `bid:new`. O front trata isso sem duplicar a linha no histórico.

<p align="right"><a href="#topo">↑ Voltar ao topo</a></p>
