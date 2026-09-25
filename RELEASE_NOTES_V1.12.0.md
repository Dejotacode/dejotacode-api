# DejotaCode API v1.12.0 — Funil e Vendas do Linux do Zero

## Destaques

- adiciona resumo dedicado do funil do Linux do Zero em analytics;
- agrega visualizações da página do produto e cliques artigo → produto, trilha → produto e produto → checkout;
- adiciona webhook protegido da Kiwify para contabilizar vendas aprovadas;
- contabiliza somente pedidos pagos do Linux do Zero;
- deduplica reenvios do mesmo pedido;
- não armazena dados pessoais do comprador para essa métrica;
- expõe vendas aprovadas no resumo consumido pelo Admin;
- reforça a configuração de deploy do Worker para preservar configurações remotas e exigir variáveis protegidas.

## Banco de dados

- adiciona `0010_commerce_webhook_events.sql`;
- a migration cria suporte à deduplicação dos eventos de compra;
- migrations continuam sendo operação explícita e separada do deploy.

## Segurança e privacidade

- webhook protegido por token;
- chamadas sem credencial válida são rejeitadas;
- nenhum dado pessoal do comprador é necessário para a métrica agregada;
- secrets não são incorporados ao frontend;
- configuração de Worker mantém o princípio de falha fechada para variáveis protegidas.

## Compatibilidade

- compatível com o frontend DejotaCode v1.22.0;
- mantém compatibilidade com as rotas existentes de Admin, analytics e mídia;
- rollback de código deve considerar o schema D1 após a migration 0010.

## Gate esperado antes da release

- `npm ci` aprovado;
- `npm run check` aprovado;
- migrations de preview e produção reconciliadas;
- health check do Worker aprovado;
- versão do deployment Cloudflare registrada;
- plano de rollback confirmado.
