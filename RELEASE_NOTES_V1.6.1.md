# DejotaCode API v1.6.1 — Operação e Recuperação

## Resumo

A v1.6.1 formaliza ferramentas operacionais seguras adicionadas após a v1.6.0, sem alterar o contrato público do Worker.

O foco é tornar backup D1 e inventário de mídia R2 reproduzíveis e auditáveis, preservando o fluxo editorial e o runtime atual.

## Backup D1

- Novo script `npm run backup:d1:production`.
- Suporte a `--dry-run` para validar destino e comando sem acessar o banco nem criar arquivos.
- Export real mantém confirmação explícita do Wrangler; não usa `--skip-confirmation`.
- Backups ficam em `.backups/`, ignorado pelo Git.
- Cada export gera manifesto local com tamanho, SHA-256 e commit Git.

## Inventário R2

- Novo script `npm run inventory:r2:production` somente leitura.
- O inventário usa metadados do D1 e valida URLs públicas com `HEAD`, sem baixar o corpo dos objetos.
- Snapshot validado: 23 registros de mídia, 27.598.894 bytes, 22 em `images/` e 1 em `posts/`.
- As 23 URLs registradas responderam HTTP 200 no inventário documentado.
- Limitação conhecida: objetos órfãos existentes no bucket sem linha correspondente em `media` não são detectados por este inventário.

## CI operacional

- Workflow passou a validar sintaxe dos scripts operacionais.
- `check:ops` executa validação Node e dry-run do backup D1.
- Nenhuma rota pública, binding, rate limit ou contrato JSON foi alterado por estes scripts.

## Produção e segurança

- Nenhuma migration D1 nova é necessária para esta release.
- Nenhum secret, DNS ou configuração de autenticação é alterado.
- O deploy formal da v1.6.1 deve apontar o Worker para o mesmo commit da tag para manter rastreabilidade.
- Health oficial permanece em `/api/health`.

## Compatibilidade

- Compatível com o frontend DejotaCode v1.11.0.
- Git/Markdown continua sendo a fonte canônica do conteúdo público.
- D1 continua armazenando dados operacionais e metadados; não vira fonte editorial pública.

## Rollback

Rollback de código deve reutilizar a tag v1.6.0 sem restaurar D1/R2 automaticamente. Backups e restauração de dados são operações separadas e explícitas.
