# Integridade de backups D1 — v1.12.1

## Objetivo

Adicionar uma verificação reproduzível dos exports D1 já gerados, sem criar, excluir, restaurar ou enviar backups para qualquer serviço externo.

## Comando

```bash
npm run verify:d1:backups
```

O comando usa `.backups/d1/` por padrão. Para um diretório alternativo, use `DEJOTACODE_BACKUP_DIR`.

## Verificações

Para cada manifesto `*.sql.json`, o verificador confirma:

- existência do arquivo SQL correspondente;
- campos mínimos do manifesto;
- tamanho real do arquivo;
- SHA-256 real do arquivo;
- correspondência entre tamanho/hash e o manifesto.

Qualquer divergência retorna código de saída diferente de zero.

## Segurança

- não acessa produção;
- não executa restore;
- não remove backups antigos;
- não envia arquivos para rede;
- não imprime conteúdo SQL;
- `.backups/` permanece ignorado pelo Git.

## Limites

Esta etapa valida integridade local, não durabilidade. Os backups continuam sujeitos à perda do computador local enquanto não existir um destino externo controlado, criptografado e com política de retenção.

O espelhamento R2 também permanece pendente até existir um destino externo explicitamente aprovado.
