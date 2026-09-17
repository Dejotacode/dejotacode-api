# Segurança

A API do DejotaCode lida com autenticação, formulários, analytics e operações administrativas.

## Reportando uma vulnerabilidade

Não publique credenciais, tokens, dados pessoais, payloads exploráveis ou passos completos de exploração em issues públicas.

Use Security Advisories do GitHub quando disponível. Se precisar iniciar contato por issue, informe apenas que encontrou um possível problema e aguarde um canal privado.

## Áreas sensíveis

- autenticação, sessão e CSRF;
- D1, R2 e dados operacionais;
- integrações com GitHub;
- secrets do Worker;
- rotas administrativas e ações destrutivas.

Correções devem preservar logs sem secrets, passar por CI e manter migrations/deploy separados da revisão de código.
