# DejotaCode API v1.10.0 — Histórico e Auditoria de Mídia

## Destaques

- adiciona endpoint Admin-only `GET /api/media/cms/:id/history`;
- retorna marcos confiáveis da mídia: upload, revisão humana, gate final e último dry-run;
- retorna responsável e data/hora quando disponíveis;
- retorna trilha técnica de `audit_logs` para a mídia selecionada;
- inclui método, rota, request ID e usuário da mutação;
- não retorna hash nem token de dry-run;
- endpoint é somente leitura e usa apenas SELECTs.

## Segurança e compatibilidade

- nenhuma migration nesta release;
- nenhuma mudança no contrato destrutivo de exclusão;
- nenhuma exclusão automática ou em lote;
- endpoint de histórico exige Admin;
- `audit_logs` existente continua sendo a fonte técnica da auditoria.

## Rollout validado

- endpoint funcional incorporado à main antes da formalização;
- Worker funcional validado em produção com health 200;
- nenhuma migration pendente;
- histórico da mídia ID 2 conferido contra D1: 4 marcos e 3 eventos técnicos.
