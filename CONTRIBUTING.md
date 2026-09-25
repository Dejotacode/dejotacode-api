# Contribuindo com a DejotaCode API

Obrigado pelo interesse em melhorar a API do DejotaCode.

## Fluxo

1. crie uma branch a partir de `main`;
2. mantenha a alteração focada e auditável;
3. execute as validações locais;
4. abra um Pull Request com impacto e riscos;
5. aguarde CI aprovado antes do merge.

## Validação local

```bash
npm ci
npm run check
npm run check:ops
```

Migrations, deploy e secrets são etapas separadas. Nunca aplique migration remota ou deploy como efeito colateral de um teste local. Não versione `.dev.vars`, tokens, backups ou dados operacionais.
