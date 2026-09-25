# DejotaCode API v1.12.1 — Integridade de Backups D1

## Destaques

- adiciona verificação reproduzível dos backups D1 locais já existentes;
- valida existência do SQL associado a cada manifesto;
- compara tamanho real com o manifesto;
- recalcula SHA-256 e confirma integridade do arquivo;
- retorna falha quando encontra arquivo ausente, manifesto inválido ou hash/tamanho divergente;
- adiciona o comando `npm run verify:d1:backups`.

## Segurança

- nenhuma leitura ou mutação do D1 de produção durante a verificação;
- nenhum restore é executado;
- nenhum upload externo é realizado;
- nenhum backup antigo é removido;
- conteúdo SQL não é exibido;
- `.backups/` permanece ignorado pelo Git.

## Validação

- quatro backups D1 locais existentes verificados com sucesso;
- teste negativo em cópia temporária detectou corrupção por tamanho e SHA-256;
- `npm run check`: aprovado;
- `npm run check:ops`: aprovado;
- CI da PR de implementação e da `main`: aprovado.

## Limites

A release melhora a verificação de integridade local, mas não cria redundância externa. Armazenamento externo criptografado dos backups D1 e espelhamento do R2 continuam pendentes até existir destino explicitamente aprovado.
