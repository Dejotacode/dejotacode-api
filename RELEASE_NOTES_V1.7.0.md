# DejotaCode API v1.7.0 — Revisão Manual de Mídia

## Resumo

A v1.7.0 adiciona revisão humana persistente para mídias editoriais, sem alterar nem excluir objetos no R2.

## API e dados

- Novo PATCH autenticado: `/api/media/cms/:id/review`.
- Estados persistentes: `pending`, `keep` e `candidate`.
- Nota opcional, autor e data da revisão.
- GET `/api/media/cms` passa a expor os metadados de revisão.
- CSRF obrigatório para a mutação.
- Auditoria existente cobre o novo PATCH.

## Migration

- `0006_media_review.sql` adiciona `review_status`, `review_note`, `reviewed_at` e `reviewed_by` à tabela `media`.
- Migration aplicada em produção após backup real do D1.
- Após a aplicação, 23 registros iniciaram em `pending`.

## Rollout verificado

- Commit funcional: `ed1bf890ee747a3b1c372bf8f40503895116880a`.
- Worker Version ID: `60e579cf-e13a-4d4c-9dab-67fe7b27d6fd`.
- `/api/health`: HTTP 200, `healthy`, ambiente `production`.
- `/api/media/cms` anônimo: HTTP 401.
- Objeto revisado permaneceu acessível no R2 após a marcação humana.

## Backup e segurança

Antes da migration foi gerado backup real do D1 de produção com manifesto e SHA-256 registrados localmente.

A marcação `candidate` não executa exclusão e não autoriza remoção automática. Qualquer limpeza futura exige etapa separada.

## Compatibilidade

- Frontend compatível: DejotaCode v1.16.0.
- Mudança compatível de API; sem quebra de contratos públicos existentes.
