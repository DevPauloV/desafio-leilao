# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Licitante**: deposita saldo, acompanha lotes e dá lances ao vivo, muitas vezes pelo celular, sob pressão de tempo (contagem regressiva e anti-sniping).
- **Leiloeiro**: busca obras na API do Met, cria e gerencia os próprios lotes; não dá lances.
- **Visitante sem login**: navega pela vitrine e audita o histórico de lances de qualquer lote.
- **Avaliador técnico**: acessa o deploy com as contas do seed e percorre o fluxo completo.

## Product Purpose

Casa de leilões online de obras de arte em domínio público do The Met. O leiloeiro cria lotes a partir de obras reais, os licitantes disputam ao vivo, o vencedor recebe um comprovante e qualquer pessoa pode verificar que o histórico de lances não foi adulterado.

## Positioning

Lances auditáveis publicamente. O histórico é uma cadeia de hashes com HMAC, e a auditoria pública detecta alteração, remoção ou inserção posterior, inclusive direto no banco, sem expor dados pessoais: os licitantes aparecem por pseudônimo.

## Operating Context

- Sala ao vivo em tempo real (Socket.IO): lance atual, incremento mínimo, contagem regressiva, extensão anti-sniping de 2 minutos, saldo disponível e comprometido.
- Recusas com mensagem clara: abaixo do mínimo, saldo insuficiente, já está ganhando, lote não iniciado, lote encerrado.
- Estados do lote: agendado, ao vivo, encerrado e cancelado (cancelados ficam ocultos na vitrine).
- Valores em reais (centavos no back-end); datas e horas em pt-BR.

## Capabilities and Constraints

- Front-end em React, Vite e TypeScript, com Tailwind e shadcn/ui; tema claro e escuro.
- Telas: vitrine (com busca e filtro), painel do leiloeiro, sala ao vivo, carteira, meus arremates com comprovante, auditoria pública, login e cadastro.
- As imagens vêm da cópia salva no lote (`/api/images/:id`), nunca direto do Met. As obras variam muito de proporção e paleta.
- Vitrine, sala, auditoria e comprovante continuam funcionando mesmo com a API do Met fora do ar.

## Brand

- Nome: **Athelie Leilões**, com logo tipográfico ("Athelie" em destaque e "LEILÕES" pequeno e espaçado).
- Favicon: martelo sobre bloco, em bordô.
- Cor da marca: bordô `#7b1e2e`, com variante para o tema escuro.
- Tom visual: acolhedor e confiável, sem frieza corporativa, sem luxo clichê (preto e dourado) e sem exagero artístico que prejudique o uso.

## Product Principles

1. A obra é a protagonista; a interface serve ao lance.
2. Confiança visível: estado, tempo e valores nunca ambíguos, com a auditoria ao alcance.
3. Responsivo de verdade: a sala ao vivo funciona com uma mão no celular.
4. Simples e justificado: nada de ornamento que não ajude a decidir ou a confiar.

## Accessibility & Inclusion

Contraste AA nos dois temas, foco visível, e contagem regressiva e mudanças de lance anunciadas sem depender só de cor.
