# DejotaCode API v1.11.0 — Snapshot Final de Pré-Exclusão

## Destaques

- adiciona endpoint Admin-only `POST /api/media/cms/:id/delete-snapshot`;
- registra snapshot append-only antes de qualquer exclusão real;
- captura estado da mídia, revisão humana, gate final e dry-run vigente;
- registra checks GitHub/D1/R2, usuário, horário e request ID;
- gera SHA-256 do conteúdo serializado do snapshot;
- vincula cada snapshot ao hash do dry-run que o originou;
- exige `snapshotId` válido no contrato de exclusão.

## Segurança e integridade

- tabela `media_delete_snapshots` protegida contra UPDATE e DELETE por triggers;
- snapshot antigo não pode ser reutilizado em um novo dry-run;
- falha fechada quando a revalidação GitHub/D1/R2 não pode ser concluída;
- nenhuma exclusão automática ou em lote foi adicionada;
- nenhum DELETE real foi executado durante desenvolvimento e validação desta release.

## Rollout validado

- migration `0009_media_delete_snapshots.sql` aplicada em produção após backup do D1;
- backup D1 gerado com SHA-256 antes da migration;
- inventário R2 validado com 23/23 objetos alcançáveis;
- Worker de produção atualizado e health HTTP 200;
- rota de snapshot validada com proteção de autenticação;
- CI da feature e da main aprovado.
