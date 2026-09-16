# DejotaCode API v1.6.0

## Resumo

A v1.6.0 formaliza a API que sustenta o Admin Editorial e o fluxo de publicação assistida do DejotaCode v1.10.0.

A API mantém versionamento independente do frontend e continua compatível com o site público atual.

## Principais capacidades

- Integração segura com GitHub para criação de branches editoriais e Pull Requests.
- Consulta de estado, conflito e CI de Pull Requests.
- Squash merge assistido pelo Admin somente após CI aprovado.
- Upload de mídia editorial para Cloudflare R2 com metadados no D1.
- Organização de imagens editoriais em `posts/<slug>/YYYY/MM/<uuid>.<ext>`.

## Hardening de publicação

- Merge restrito a Pull Requests com base `main`.
- Merge restrito a branches `content/admin-*`.
- `expectedHeadSha` obrigatório e comparado com o HEAD atual do PR.
- O SHA validado também é enviado ao endpoint de merge do GitHub.
- Sessão Admin, CSRF, CI verde e ausência de conflito continuam obrigatórios.

## Produção e dados

- Nenhuma migration pendente no D1 de produção no momento da release.
- Nenhuma alteração de DNS ou secrets é necessária para esta release.
- R2 continua armazenando os binários; D1 armazena apenas metadados.
- Rate limits e bindings existentes permanecem preservados.

## Compatibilidade

- Frontend compatível: DejotaCode `v1.10.0`.
- Repositório frontend: `Dejotacode/dejotacode`.
- O conteúdo editorial público continua tendo Git/Markdown como fonte canônica.
- D1 não se torna fonte do conteúdo editorial público.

## Gate de release

- `npm ci`: aprovado, 0 vulnerabilidades.
- `npm run check`: aprovado.
- D1 produção: nenhuma migration pendente.
- Fluxo real Admin → PR → CI → merge → Pages validado em produção pelo frontend v1.10.0.

## Rollback

A reversão de código do Worker deve considerar o schema D1 atual. Reversão de dados ou schema é uma operação separada e não faz parte desta release.
