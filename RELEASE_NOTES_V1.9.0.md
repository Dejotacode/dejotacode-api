# DejotaCode API v1.9.0 — Exclusão Controlada de Mídia

Esta release endurece a remoção de mídia editorial e torna o dry-run obrigatório antes de qualquer DELETE.

## Destaques

- migration `0008_media_delete_dry_run.sql`;
- dry-run exclusivo para Admin;
- exige `review_status=candidate` e `cleanup_status=approved`;
- revalida uso como capa no D1;
- revalida referências Markdown diretamente na branch `main` do GitHub;
- verifica existência do objeto no R2;
- emite token temporário de dry-run com validade de 10 minutos;
- armazena somente hash do token no D1;
- DELETE exige token válido, `objectKey` exato e confirmação literal `EXCLUIR`;
- todos os checks são repetidos imediatamente antes da remoção;
- mudança de revisão/gate invalida qualquer dry-run anterior;
- nenhuma exclusão automática ou em lote.

## Rollout validado

- backup D1 realizado antes da migration 0008;
- migration aplicada com sucesso;
- candidata ID 2 validada via dry-run em produção;
- objeto permaneceu HTTP 200 no R2 após o teste;
- nenhuma exclusão foi executada na homologação.
