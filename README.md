# DejotaCode API

API oficial do DejotaCode, construída com Hono sobre Cloudflare Workers.

## Stack

- Hono
- TypeScript
- Cloudflare Workers
- Cloudflare D1
- Cloudflare R2
- Cloudflare Rate Limiting

## Responsabilidades

A API atende formulários, autenticação administrativa, métricas agregadas e serviços operacionais do DejotaCode.

Principais áreas:

- leads e consentimento;
- contato;
- analytics first-party agregado;
- autenticação e sessão administrativa;
- recursos históricos de CMS e mídia ainda preservados no backend.

## Desenvolvimento

Instalação reproduzível:

```bash
npm ci
npm run check
npm run dev
```

O ambiente local usa os bindings definidos em `wrangler.jsonc`. Secrets locais devem ficar em `.dev.vars` e nunca devem ser versionados.

## Produção

Deploy, migrations e secrets são operações separadas. Não trate `npm run deploy` como autorização para aplicar migrations.

Antes de alterar produção:

1. confirme o commit exato;
2. execute `npm ci` e `npm run check`;
3. revise migrations pendentes;
4. preserve backup quando houver mudança destrutiva;
5. registre a versão Cloudflare implantada.

## Fonte canônica

Este repositório foi criado a partir do histórico da antiga árvore `api/` do monorepo DejotaCode. A linha preservada inclui as correções de consentimento e a ampliação do analytics usada na fase de crescimento da plataforma.
