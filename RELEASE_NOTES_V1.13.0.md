# DejotaCode API v1.13.0 — Analytics da DejotaStore

## Destaques

- adiciona eventos compatíveis para a DejotaStore: `store_view`, `store_category_view`, `store_product_view`, `store_guide_view`, `store_related_article_click` e `store_setup_click`;
- reutiliza `affiliate_click` para mensurar cliques em parceiros da Store;
- adiciona `storeFunnel` ao resumo autenticado de analytics dos últimos 30 dias;
- preserva o modelo atual de `daily_metrics`, sem migration D1.

## Compatibilidade

- compatível com DejotaCode frontend v1.23.0;
- rollout seguro: API primeiro, frontend depois;
- nenhuma quebra de contrato público existente;
- nenhum secret novo e nenhuma mudança de DNS.

## Validação

- `npm run check`: aprovado;
- CI do PR e da `main`: aprovado;
- QA ponta a ponta local confirmou Blog → Store → clique afiliado no D1;
- Worker de produção publicado em `api.dejotacode.com.br`;
- health check de produção: HTTP 200, `status=healthy`, `environment=production`;
- Cloudflare Worker Version ID: `4cb93d7f-4a07-422d-826f-1439facab9df`;
- nenhuma migration aplicada nesta release.
