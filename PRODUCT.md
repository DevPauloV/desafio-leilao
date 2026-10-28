# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Licitante**: deposita saldo, acompanha lotes e dá lances ao vivo, muitas vezes pelo celular, sob pressão de tempo (contagem regressiva e anti-sniping).
- **Leiloeiro**: busca obras na API do Met, cria e gerencia os próprios lotes; não dá lances.
- **Visitante sem login**: navega a vitrine e audita o histórico de lances de qualquer lote.
- **Avaliador técnico (Verzel, Elite Dev)**: abre o deploy, entra com os usuários do seed e percorre o fluxo inteiro; compara com outros candidatos.

## Product Purpose

Casa de leilões online de obras de arte em domínio público do The Met. O leiloeiro cria lotes a partir de obras reais, licitantes disputam ao vivo, o vencedor recebe um comprovante e qualquer pessoa verifica que o histórico de lances não foi adulterado. Sucesso: um fluxo ponta a ponta confiável, claro e rápido de usar.

## Positioning

Lances auditáveis publicamente: o histórico é uma hash chain com HMAC, e a auditoria pública detecta alteração, remoção ou inserção posterior, inclusive direto no banco, sem expor dados pessoais (licitantes aparecem por pseudônimo).

## Operating Context

- Sala ao vivo em tempo real (Socket.IO): lance atual, incremento mínimo, contagem regressiva, extensão anti-sniping de 2 min, saldo disponível e comprometido.
- Recusas com mensagem clara: abaixo do mínimo, saldo insuficiente, já está ganhando, lote não iniciado, lote encerrado.
- Estados de lote: agendado, ao vivo, encerrado, cancelado (cancelados ocultos na vitrine).
- Valores em reais (centavos no back); datas e horas em pt-BR.

## Capabilities and Constraints

- Stack: React + Vite + TypeScript, Tailwind + shadcn/ui (Radix) no repositório, dark mode via classe `dark`.
- Telas: vitrine (com busca/filtro), painel do leiloeiro, sala ao vivo, carteira, meus arremates com comprovante, auditoria pública, login e cadastro.
- Imagens vêm do snapshot salvo no lote (`/api/images/:id`), nunca direto do Met; obras variam muito de proporção e paleta.
- Mudança visual passa por protótipo HTML (`docs/design/prototipo.html`) aprovado pelo usuário antes do React.

## Brand Commitments

- Nome **Athelie Leilões**; logo tipográfico ("Athelie" forte + "LEILÕES" pequeno e espaçado).
- Favicon: martelo sobre bloco, em bordô.
- Cor da marca: bordô `#7b1e2e` (com variante para tema escuro).
- Tema claro e escuro.
- Evitar: cara de template shadcn/IA, visual artístico demais (pouco usável), luxo clichê preto + dourado, frio/corporativo.

## Evidence on Hand

- Obras reais do Met em domínio público (CC0), copiadas para o lote.
- Seed: 1 leiloeiro, 2 licitantes, lote ao vivo com lances.
- Não há depoimentos, clientes ou métricas reais; não inventar.

## Product Principles

1. A obra é a protagonista; a interface serve ao lance.
2. Confiança visível: estado, tempo e valores nunca ambíguos, auditoria ao alcance.
3. Responsivo de verdade: a sala ao vivo funciona com uma mão no celular.
4. Simples e justificado: nada de ornamento que não ajude a decidir ou a confiar.

## Accessibility & Inclusion

Contraste AA nos dois temas, foco visível, contagem regressiva e mudanças de lance anunciadas sem depender só de cor.
