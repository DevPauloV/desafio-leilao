# 0004. Independência da API do Met

Status: aceito

## Contexto
O PDF exige que vitrine, salas, auditoria e comprovante continuem funcionando se a API externa cair ou limitar as chamadas. Guardar só a URL da imagem do Met não basta: com o Met fora, a vitrine abriria sem imagens.

## Decisão
- O Met é chamado **só** pelo painel do leiloeiro: na busca e na criação do lote.
- **Busca:**
  - `GET /v1.1/search?q=&hasImages=true&limit=60` (o `/v1/search` foi aposentado pelo Met em 2026-10-01); detalhes em `GET /v1/objects/:id`;
  - detalhes de alguns ids por vez, até juntar 20 obras válidas;
  - timeout de 5 s e uma nova tentativa por chamada;
  - a resposta passa pelo Zod e descarta obras sem `primaryImageSmall` ou com `isPublicDomain = false`. As de domínio público têm imagem CC0, que pode ser copiada.
- **Criação do lote:** o servidor busca a obra de novo pelo id (não confia nos dados enviados pelo navegador), copia título, artista, data, técnica, departamento e link para `lot.item`, baixa a imagem e a grava na coleção `images` (até 2 MB, só `image/*`).
- **Leitura:** vitrine, sala, auditoria e comprovante leem só do Mongo. A imagem é servida por `GET /api/images/:id`, com cache longo.
- **Met fora do ar:** a busca e a criação respondem `503 EXTERNAL_API_UNAVAILABLE` com mensagem clara. Nada mais é afetado.

## Alternativas descartadas
- **Guardar só a URL da imagem:** a vitrine perderia as imagens com o Met fora.
- **Catálogo local de obras e disjuntor (circuit breaker):** o PDF não exige que a busca funcione com o Met fora; seria complexidade para um problema que não temos.
- **GridFS ou armazenamento de arquivos externo:** a versão web da imagem tem poucas centenas de KB e cabe num documento comum.

## Consequências
- Cada lote ocupa algumas centenas de KB no banco, o que cabe com folga no Atlas gratuito.
- O seed traz as próprias imagens no repositório, para subir sem depender do Met.
- Teste automatizado: com o `fetch` do Met falhando, vitrine e imagem continuam respondendo.
