# 0008. Histórico de lances em cadeia de hashes com HMAC

Status: aceito

## Contexto
O PDF pede que qualquer alteração, remoção ou inserção posterior no histórico de lances seja detectada pela auditoria, inclusive quando feita direto no banco. A auditoria é pública e não pode expor dados pessoais.

## Decisão
- Cada lance guarda `prevHash` e `hash = HMAC_SHA256(AUDIT_SECRET, [lotId, seq, pseudônimo, valor, horário, prevHash])`. O primeiro lance aponta para `GENESIS_HASH` (64 zeros).
- O lote guarda a cabeça da cadeia: `chainHead.lastHash` e `chainHead.signature = HMAC(AUDIT_SECRET, lotId + bidCount + lastHash)`. Ela é gravada na mesma transação do lance.
- O comprovante guarda o último hash (`result.chainHash`) e o valor (`result.amount`) no momento da liquidação.
- `GET /api/audit/lots/:id` recalcula tudo a cada consulta e devolve o veredito, o primeiro `seq` inválido e o tipo do problema:
  - alterar um campo de um lance muda o hash recalculado (`altered`);
  - remover um lance do meio quebra a sequência e o `prevHash` do seguinte (`missing`);
  - remover o último lance faz a contagem e o hash final divergirem da cabeça assinada (`head_mismatch`);
  - inserir um lance, no fim ou com `seq` repetido, não bate com a contagem assinada (`inserted`);
  - mexer na cabeça sem o segredo invalida a assinatura (`head_mismatch`);
  - trocar o líder, o lance atual ou o resultado do lote (vencedor, valor, hash final) faz eles divergirem do último lance da cadeia (`head_mismatch`). O pseudônimo do líder e do vencedor é recalculado a partir do id gravado e comparado com o do último lance.
- `npm run demo:tamper` aplica os três tipos de adulteração direto no Mongo, para demonstrar a detecção.

## Alternativas descartadas
- **SHA-256 sem segredo:** quem tem acesso ao banco recalcularia a cadeia inteira depois de adulterar. Com HMAC, recalcular exige o `AUDIT_SECRET`, que fica só no ambiente da API.
- **Assinatura assimétrica (Ed25519) com chave pública publicada:** deixaria terceiros verificarem sem confiar na API, mas pede gestão de chaves. O PDF pede detecção pela auditoria do próprio sistema, e o HMAC atende.
- **Ancoragem externa (blockchain, carimbo de tempo):** custo e dependência desproporcionais para o teste.
- **Coleção só de inserção, protegida por permissão do Mongo:** impede a aplicação de alterar, mas não detecta quem tem acesso de administrador ao banco.

## Consequências
- Detecta adulteração feita por quem tem o banco mas não o segredo. Quem tem o `AUDIT_SECRET` e o banco consegue forjar uma cadeia válida. Essa limitação vai no README.
- **Volta a um estado antigo.** Uma cabeça assinada antiga continua válida. Quem tem acesso ao banco pode achá-la no oplog do replica set ou num backup, apagar os últimos lances e regravar essa cabeça. A auditoria vê uma cadeia mais curta, mas íntegra. Impedir isso exigiria ancoragem externa, descartada acima. Num lote liquidado, a âncora externa é o hash final do comprovante (`chainHash`), que fica com o vencedor: se ele não aparece mais na cadeia, houve adulteração. Isso vai no README.
- O `AUDIT_SECRET` precisa ser gerado para cada ambiente (`openssl rand -hex 32`). Com o valor do `.env.example`, que é público, qualquer pessoa recalcula a cadeia.
- Trocar o `AUDIT_SECRET` invalida a verificação de todos os lances antigos. O segredo é fixo por ambiente.
- Apagar o lote inteiro (com os lances) não é detectado pela auditoria daquele lote, porque não sobra nada para verificar. O comprovante do vencedor deixa de abrir.
- O custo da verificação é linear no número de lances do lote, o que é aceitável no volume do teste.
