<a id="topo"></a>

# Uso de IA no projeto

<details>
  <summary>Sumário</summary>

1. [Como dividi o trabalho](#como-dividi-o-trabalho)
2. [Decisões por tema](#decisões-por-tema)
3. [Como revisei](#como-revisei)

</details>

Usei IA (Claude Code, dentro do VS Code) como ferramenta de produtividade, para ganhar velocidade no que é repetitivo ou trabalhoso de digitar. O raciocínio do projeto ficou comigo: entender o desafio, montar a arquitetura, modelar os dados, definir as regras e escolher as técnicas. A IA executava a partir do que eu especificava, e nada entrou sem eu revisar e testar. No deploy, escolhi as plataformas, criei o cluster no Atlas e publiquei o repositório; os comandos da CLI da Vercel foram executados com a IA e conferidos por mim.

## Como dividi o trabalho

**O que ficou comigo**
- Leitura do enunciado e interpretação dos pontos ambíguos: lance mínimo com "maior ou igual", anti-sniping contado a partir do horário do lance, os dois tipos de cancelamento.
- Stack, arquitetura em camadas e a regra de manter o back-end pequeno, sem camadas nem abstrações sem motivo.
- Modelagem do banco, contrato da API e eventos em tempo real.
- Técnicas centrais:
  - transação com saldo comprometido;
  - liquidação por varredura;
  - cadeia de hashes com HMAC para a auditoria;
  - pseudônimo por lote para a privacidade.
- Visual do front, aprovado por mim num protótipo antes de qualquer tela.
- Deploy:
  - escolha das plataformas e a troca do Railway pela Vercel na API;
  - criação do cluster no Atlas;
  - variáveis de produção;
  - publicação do repositório no GitHub.

**Onde a IA ajudou**
- Escrever código a partir das especificações e do contrato que eu definia.
- Escrever testes automatizados, inclusive os cenários de concorrência.
- Rascunhar documentação (README, ADRs e contrato), que eu revisava e ajustava.
- Pesquisar detalhes da API do Met e revisar a segurança como uma segunda opinião.

## Decisões por tema

**Arquitetura**
- Recusei a primeira proposta de estrutura por ser grande demais. Tirei a camada de repositório, o pacote compartilhado, o catálogo local do Met, o GridFS e o extrato da carteira, e fiquei com rotas, controllers, serviços, models e regras puras.
- Cada decisão importante virou um ADR curto, com o motivo e as alternativas descartadas.

**Integração com o Met**
- Decidi copiar a obra **e a imagem** para o banco na criação do lote. Assim vitrine, sala, auditoria e comprovante funcionam com o Met fora do ar, o que é exigência do desafio.
- Quando apareceu que o Met tinha aposentado o `/v1/search`, conferi a migração para o `/v1.1/search`.
- Pedi que uma obra com erro fosse só pulada, sem derrubar a busca inteira.

**Lances e liquidação**
- Lance numa transação, com update condicional para lances simultâneos, e saldo comprometido liberado na mesma operação.
- Tirei um estado intermediário "liquidando" que a primeira versão do plano tinha. Se a API caísse no meio, o lote ficaria preso. A liquidação virou uma transação única, condicionada ao lote ainda estar ativo.
- Depósito sem transação, por ser uma operação atômica num único documento.

**Auditoria e segurança**
- Escolhi HMAC em vez de SHA-256 puro, porque com SHA-256 quem tem o banco recalcularia a cadeia. Documentei também o que a técnica não cobre.
- Defini como a auditoria marca cada lance, para só o lance adulterado aparecer inválido.
- A revisão de segurança apontou que dava para trocar o vencedor de um lote direto no banco sem a auditoria perceber. Fechei isso conferindo líder, lance atual e resultado contra o último lance da cadeia.

**Busca e seed**
- Busca por regex com a entrada escapada, porque o índice de texto do Mongo não acha trechos de palavras ("dega" não acha "Degas").
- Todo lance do seed passa pelas regras reais da API, para os lotes de demonstração terem auditoria íntegra.
- O seed renova o lote ao vivo e o agendado, para quem avaliar dias depois ainda encontrar um leilão aberto.

**Front-end**
- Aprovei o visual num protótipo HTML antes de implementar. Troquei a tipografia proposta pela Manrope.

**Deploy**
- O plano era a API no Railway, que suspendeu os cadastros novos depois de um incidente de segurança. Decidi levar a API também para a Vercel, que passou a aceitar WebSocket em funções, e pesei os impactos antes: conexão que cai a cada 5 min, instância que pausa sem requisição e cota mensal do plano gratuito.
- Para cada impacto, uma solução pequena: adapter do Socket.IO no próprio MongoDB (sem Redis), liquidação também na requisição seguinte ao fim, e socket desconectado com a aba oculta. Exigi que o mesmo código continuasse rodando no Docker e no Railway, sem `if` por plataforma no comportamento.
- O Atlas entrou porque as transações exigem replica set.
- Segredos novos para produção, gerados e enviados direto para a Vercel, e conferência da lista de arquivos antes de publicar o repositório.

## Como revisei

- Li o código gerado antes de aceitar e pedi correções quando não seguia o contrato ou a diretriz de simplicidade.
- Rodei os testes (132 na API) e o build a cada etapa.
- Testei os fluxos no navegador com dois licitantes ao mesmo tempo, e no Docker derrubando e subindo o servidor.
- Rodei o script de adulteração (`npm run demo:tamper`) e conferi a auditoria acusando cada tipo de alteração.
- Quando a IA errou, eu corrigi ou mandei refazer. Exemplos: uma edição automática que corrompeu o contrato da API, e um diagnóstico errado da auditoria para uma cabeça de cadeia adulterada.

<p align="right"><a href="#topo">↑ Voltar ao topo</a></p>
