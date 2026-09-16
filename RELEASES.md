# Política de releases da DejotaCode API

## Versionamento

A API usa Semantic Versioning independente do frontend.

- `MAJOR`: quebra de contrato público ou mudança incompatível;
- `MINOR`: capacidade nova compatível ou ampliação funcional relevante;
- `PATCH`: correção compatível de bug, segurança ou documentação operacional.

A versão do `package.json`, a tag Git, a GitHub Release e o deployment Cloudflare são evidências distintas. Em uma release formal, devem convergir para o mesmo commit documentado.

## Gate de release

Antes de criar tag ou release:

1. `main` limpa e CI verde;
2. `npm ci` e `npm run check` aprovados;
3. diff desde a release anterior revisado;
4. migrations pendentes identificadas explicitamente;
5. impacto em D1, R2, secrets, rotas e rate limits registrado;
6. compatibilidade com o frontend atual confirmada;
7. plano de rollback definido.

## Deploy

Release não implica deploy. Um rollout do Worker deve registrar SHA Git, versão do pacote, versão retornada pela Cloudflare, horário, health check e se houve migrations.

Migrations, secrets e DNS nunca são executados implicitamente como efeito de uma tag.

## Rollback

Rollback de código deve considerar o schema D1 atual. Código antigo pode ser incompatível com migrations já aplicadas. Reversão de schema ou dados é operação separada e exige backup e aprovação explícita.

## Relação com o frontend

Frontend e API podem evoluir em versões diferentes. Quando uma mudança exigir coordenação, documentar o par mínimo compatível e a ordem segura de rollout.

## Estado inicial do repositório dedicado

O repositório canônico foi consolidado com versão de pacote `1.5.0`. Isso registra a maturidade funcional herdada da linha de analytics/crescimento, mas não deve ser confundido automaticamente com uma GitHub Release histórica da API dedicada.
