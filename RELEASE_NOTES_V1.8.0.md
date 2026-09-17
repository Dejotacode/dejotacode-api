# DejotaCode API v1.8.0 — Gate Final de Limpeza de Mídia

## Resumo
A v1.8.0 adiciona uma segunda aprovação persistente para mídias já marcadas como candidatas, sem executar qualquer exclusão no R2.

## Entregas
- Migration `0007_media_cleanup_gate.sql`.
- Campos `cleanup_status`, `cleanup_note`, `cleanup_approved_at` e `cleanup_approved_by`.
- Endpoint autenticado/CSRF para aprovar ou reabrir o gate.
- Regra: apenas `review_status=candidate` pode receber `cleanup_status=approved`.
- Ao reabrir a revisão inicial para `pending`/`keep`, a aprovação de limpeza é resetada.

## Evidência de produção
- Backup D1 realizado antes da migration 0007.
- Migration 0007 aplicada com sucesso.
- 23 registros iniciaram com `cleanup_status=pending`.
- Mídia ID 2 aprovada no segundo gate com nota e responsável registrados.
- Objeto permanece intacto no R2 e responde HTTP 200.

## Segurança
Esta versão não adiciona endpoint de exclusão automática. `approved` apenas habilita inclusão em um plano de remoção no frontend.

## Rollout
- Worker funcional anterior: `a1e689c9-e188-43cb-9e89-3980f64795f5`.
- Health após rollout funcional: HTTP 200 / healthy / production.
- Nenhuma migration pendente após 0007.
