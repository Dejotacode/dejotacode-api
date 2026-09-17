<p align="center">
  <img src="https://raw.githubusercontent.com/Dejotacode/dejotacode/main/public/assets/brand/dejotacode-app-icon.svg" width="64" alt="Símbolo DejotaCode" />
</p>

<h1 align="center">DejotaCode API</h1>

<p align="center">
  API edge oficial do DejotaCode para autenticação, formulários, analytics, mídia editorial e operações administrativas.
</p>

<p align="center">
  <a href="https://api.dejotacode.com.br">API em produção</a> ·
  <a href="https://dejotacode.com.br">Frontend</a> ·
  <a href="https://github.com/Dejotacode/dejotacode">Repositório principal</a>
</p>

<p align="center">
  <a href="https://github.com/Dejotacode/dejotacode-api/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/Dejotacode/dejotacode-api/actions/workflows/ci.yml/badge.svg"></a>
  <a href="https://github.com/Dejotacode/dejotacode-api/releases"><img alt="Release" src="https://img.shields.io/github/v/release/Dejotacode/dejotacode-api?style=flat-square&label=release&color=0A0D12&labelColor=0A0D12"></a>
</p>

<p align="center">
  <img alt="Hono" src="https://img.shields.io/badge/Hono-0A0D12?style=flat-square&logo=hono&logoColor=00E5FF">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-0A0D12?style=flat-square&logo=typescript&logoColor=00E5FF">
  <img alt="Cloudflare Workers" src="https://img.shields.io/badge/Workers-0A0D12?style=flat-square&logo=cloudflareworkers&logoColor=00E5FF">
  <img alt="Cloudflare D1" src="https://img.shields.io/badge/D1-0A0D12?style=flat-square&logo=cloudflare&logoColor=00E5FF">
  <img alt="Cloudflare R2" src="https://img.shields.io/badge/R2-0A0D12?style=flat-square&logo=cloudflare&logoColor=00E5FF">
</p>

## Visão operacional

A API roda em **Cloudflare Workers** e mantém responsabilidades separadas do frontend estático. Alterações passam por Pull Request e CI antes de chegar à `main`; deploy, migrations e secrets continuam sendo operações controladas separadamente.

**Produção:** https://api.dejotacode.com.br

**Release atual:** `v1.11.0`

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
- mídia editorial em R2 e metadados operacionais no D1;
- integração GitHub para Pull Requests editoriais, leitura de CI e merge protegido.

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

## Backup manual do D1

O comando abaixo prepara um export remoto do D1 de produção para `.backups/d1/`, diretório ignorado pelo Git:

```bash
npm run backup:d1:production -- --dry-run
npm run backup:d1:production
```

Use `--dry-run` primeiro para conferir destino e comando sem acessar o banco. A execução real não usa `--skip-confirmation`, não restaura dados e gera um manifesto local com tamanho, SHA-256 e commit Git.

O diretório pode ser sobrescrito com `DEJOTACODE_BACKUP_DIR`. Backups podem conter dados pessoais/operacionais e não devem ser commitados, anexados a issues públicas ou copiados para locais inseguros.

## Inventário read-only de mídia R2

```bash
npm run inventory:r2:production
```

O comando consulta somente metadados da tabela `media` no D1 e valida cada URL pública com `HEAD`. Ele não baixa nem altera os objetos. A saída agrega quantidade, bytes, grupos e tipos, além do total de URLs alcançáveis.

Limitação: como o Wrangler atual não lista o bucket completo, esse inventário não detecta objetos órfãos no R2 que não tenham registro na tabela `media`.

## Fonte canônica

Este repositório foi criado a partir do histórico da antiga árvore `api/` do monorepo DejotaCode. A linha preservada inclui as correções de consentimento e a ampliação do analytics usada na fase de crescimento da plataforma.
