-- DejotaCode: 10 artigos e 10 tutoriais iniciais.
-- Importação idempotente: slugs existentes são preservados.
-- Todo conteúdo entra com status "review" e precisa de aprovação no CMS.

INSERT OR IGNORE INTO posts
  (category_id,author_id,type,slug,title,excerpt,content,status,published_at)
SELECT
  c.id,
  u.id,
  'article',
  'como-comecar-na-tecnologia-sem-se-perder',
  'Como começar na tecnologia sem se perder',
  'Um roteiro simples para escolher uma direção, estudar com constância e transformar teoria em pequenos projetos.',
  '[{"id":"escolha-direcao","title":"Escolha uma direção pequena","paragraphs":["Tecnologia é um campo enorme. Tentar aprender programação, redes, segurança, inteligência artificial e negócios ao mesmo tempo costuma gerar ansiedade e pouca prática. Comece por um objetivo que caiba em uma frase, como criar uma página pessoal ou automatizar uma tarefa do computador.","A direção inicial não é uma decisão para a vida inteira. Ela serve para reduzir opções durante algumas semanas e permitir que você termine algo concreto. Depois do primeiro projeto, ficará mais fácil perceber o que despertou interesse e quais conhecimentos ainda faltam."]},{"id":"ciclo-aprendizado","title":"Use um ciclo de aprendizado","paragraphs":["Um ciclo eficiente combina explicação curta, prática imediata e revisão. Leia ou assista apenas o necessário para executar a próxima ação. Em seguida, repita sem copiar e anote o erro que mais tomou seu tempo.","Reserve um horário realista. Trinta minutos frequentes produzem mais resultado que uma sessão longa seguida de vários dias sem contato com o assunto."],"steps":["Defina uma tarefa pequena","Estude apenas o conceito necessário","Execute sem copiar","Registre o que aprendeu","Melhore o projeto na próxima sessão"]},{"id":"primeiro-marco","title":"Seu primeiro marco","paragraphs":["Considere a primeira fase concluída quando você conseguir mostrar um projeto funcionando e explicar como ele foi construído. Ele não precisa ser original nem perfeito. Precisa apenas demonstrar que você consegue transformar instruções em resultado.","Publique o projeto, escreva um resumo do processo e escolha o próximo desafio com apenas uma dificuldade nova. Assim, seu portfólio cresce junto com sua confiança."]}]',
  'review',
  NULL
FROM categories AS c
CROSS JOIN users AS u
WHERE c.slug = 'programacao'
  AND u.role = 'admin'
  AND u.status = 'active'
ORDER BY u.id
LIMIT 1;

INSERT OR IGNORE INTO posts
  (category_id,author_id,type,slug,title,excerpt,content,status,published_at)
SELECT
  c.id,
  u.id,
  'article',
  'git-e-github-entenda-a-diferenca',
  'Git e GitHub: entenda a diferença antes do primeiro projeto',
  'Git registra a história do projeto; GitHub hospeda e compartilha essa história. Veja como cada peça participa do fluxo.',
  '[{"id":"git","title":"O que o Git resolve","paragraphs":["Git é um sistema de controle de versão instalado no computador. Ele registra estados do projeto por meio de commits e permite comparar mudanças, criar linhas de trabalho e recuperar versões anteriores.","Um commit deve representar uma alteração coerente. Mensagens claras, como corrigir formulário de contato, ajudam você e outras pessoas a entender por que o código mudou."]},{"id":"github","title":"O papel do GitHub","paragraphs":["GitHub é uma plataforma que recebe repositórios Git. Ele adiciona colaboração, revisão de código, acompanhamento de tarefas e integração com serviços de publicação.","É possível usar Git sem GitHub e também escolher outras plataformas. No entanto, o GitHub é uma opção prática para construir portfólio e conectar projetos a ferramentas de deploy."]},{"id":"fluxo","title":"O fluxo mínimo","paragraphs":["No dia a dia, você altera arquivos, confere o estado do repositório, seleciona as mudanças e cria um commit. Quando quiser guardar uma cópia remota, envia os commits para o GitHub.","Antes do primeiro envio, revise o .gitignore. Senhas, tokens, arquivos .env e dados pessoais não devem entrar no histórico."],"steps":["Alterar os arquivos","Conferir com git status","Selecionar com git add","Registrar com git commit","Enviar com git push"]}]',
  'review',
  NULL
FROM categories AS c
CROSS JOIN users AS u
WHERE c.slug = 'programacao'
  AND u.role = 'admin'
  AND u.status = 'active'
ORDER BY u.id
LIMIT 1;

INSERT OR IGNORE INTO posts
  (category_id,author_id,type,slug,title,excerpt,content,status,published_at)
SELECT
  c.id,
  u.id,
  'article',
  'habitos-seguranca-digital-iniciantes',
  'Sete hábitos de segurança digital para quem está começando',
  'Uma rotina prática para proteger e-mail, contas, projetos e arquivos sem transformar segurança em algo complicado.',
  '[{"id":"contas","title":"Proteja primeiro as contas principais","paragraphs":["O e-mail principal merece prioridade porque costuma ser usado para recuperar outras contas. Utilize uma senha exclusiva, ative autenticação em dois fatores e guarde os códigos de recuperação em um local separado do computador.","Um gerenciador de senhas reduz a tentação de repetir combinações. A senha mestra deve ser longa, exclusiva e memorizável para você."]},{"id":"sistema","title":"Mantenha o sistema previsível","paragraphs":["Atualizações corrigem falhas e melhoram compatibilidade. Instale programas a partir de fontes conhecidas e desconfie de comandos copiados sem explicação, principalmente quando usam sudo ou alteram permissões.","Faça backup dos arquivos importantes e teste se consegue restaurá-los. Um backup que nunca foi verificado pode falhar justamente quando for necessário."]},{"id":"rotina","title":"A rotina em sete hábitos","paragraphs":["Segurança não depende de uma ferramenta perfeita. Ela nasce de pequenas decisões repetidas. Comece pelas contas e pelos projetos de maior valor."],"steps":["Usar senhas exclusivas","Ativar autenticação em dois fatores","Guardar códigos de recuperação","Atualizar o sistema","Revisar comandos antes de executar","Evitar segredos no Git","Manter backups testados"]}]',
  'review',
  NULL
FROM categories AS c
CROSS JOIN users AS u
WHERE c.slug = 'linux'
  AND u.role = 'admin'
  AND u.status = 'active'
ORDER BY u.id
LIMIT 1;

INSERT OR IGNORE INTO posts
  (category_id,author_id,type,slug,title,excerpt,content,status,published_at)
SELECT
  c.id,
  u.id,
  'article',
  'cloudflare-pages-workers-d1-r2',
  'Cloudflare Pages, Workers, D1 e R2: qual serviço usar',
  'Entenda como os principais serviços da Cloudflare se combinam em um projeto moderno sem misturar responsabilidades.',
  '[{"id":"site-api","title":"Separe o site da lógica de negócio","paragraphs":["Cloudflare Pages é adequado para entregar sites estáticos gerados durante o build. O navegador recebe HTML, CSS, JavaScript e imagens distribuídos pela rede global.","Cloudflare Workers executa código no servidor. É o lugar para autenticação, validação de formulários, regras de negócio e APIs. Separar essas responsabilidades simplifica o site público e protege operações sensíveis."]},{"id":"dados-arquivos","title":"D1 para dados, R2 para arquivos","paragraphs":["D1 é um banco SQL compatível com o modelo do SQLite. Ele funciona bem para conteúdo editorial, usuários, leads e métricas estruturadas.","R2 armazena objetos, como capas, imagens e materiais para download. Guardar arquivos grandes no banco dificulta consultas e manutenção; por isso, o D1 mantém apenas metadados e chaves dos objetos."]},{"id":"exemplo","title":"Exemplo de arquitetura","paragraphs":["Um blog Astro pode ser publicado estaticamente no Pages. Durante o build, ele consulta uma API Hono em Workers. A API lê artigos do D1 e devolve URLs de mídias armazenadas no R2.","Essa divisão também permite atualizar a API sem reconstruir o layout e evoluir o design sem alterar o banco."]}]',
  'review',
  NULL
FROM categories AS c
CROSS JOIN users AS u
WHERE c.slug = 'cloudflare'
  AND u.role = 'admin'
  AND u.status = 'active'
ORDER BY u.id
LIMIT 1;

INSERT OR IGNORE INTO posts
  (category_id,author_id,type,slug,title,excerpt,content,status,published_at)
SELECT
  c.id,
  u.id,
  'article',
  'criptoativos-para-iniciantes-riscos-cuidados',
  'Criptoativos para iniciantes: tecnologia, riscos e cuidados',
  'Conceitos essenciais para estudar blockchain e ativos digitais sem confundir curiosidade tecnológica com promessa de lucro.',
  '[{"id":"conceito","title":"O que é um criptoativo","paragraphs":["Criptoativo é uma representação digital de valor ou direito registrada por tecnologias criptográficas. Alguns funcionam em redes blockchain, nas quais participantes mantêm um histórico compartilhado de transações.","Nem todo projeto possui a mesma finalidade. Há ativos usados para pagar taxas de rede, representar itens, participar de protocolos ou tentar manter valor estável."]},{"id":"riscos","title":"Risco vem antes de rendimento","paragraphs":["Preços podem variar rapidamente, plataformas podem falhar e contratos inteligentes podem conter vulnerabilidades. Também existem golpes que usam urgência, autoridade falsa e promessas de retorno garantido.","Nunca trate conteúdo educativo como recomendação financeira. Antes de qualquer decisão, entenda como guardar o ativo, quais taxas existem e o que acontece se a senha ou chave de acesso for perdida."]},{"id":"estudo","title":"Uma ordem segura para estudar","paragraphs":["Comece pela tecnologia e pelo vocabulário. Use valores fictícios ou ambientes de teste enquanto aprende. Verifique informações em documentação oficial e compare mais de uma fonte."],"steps":["Entender carteira e chave privada","Estudar como uma transação é validada","Conhecer taxas e volatilidade","Aprender a identificar golpes","Definir limites antes de usar dinheiro real"]}]',
  'review',
  NULL
FROM categories AS c
CROSS JOIN users AS u
WHERE c.slug = 'criptoativos'
  AND u.role = 'admin'
  AND u.status = 'active'
ORDER BY u.id
LIMIT 1;

INSERT OR IGNORE INTO posts
  (category_id,author_id,type,slug,title,excerpt,content,status,published_at)
SELECT
  c.id,
  u.id,
  'article',
  'caminhos-realistas-renda-digital',
  'Cinco caminhos realistas para construir renda digital',
  'Serviços, conteúdo, afiliados e produtos digitais vistos como modelos de trabalho, não como promessas de dinheiro rápido.',
  '[{"id":"fundamento","title":"Renda começa com valor entregue","paragraphs":["Na internet, a receita aparece quando alguém percebe valor suficiente para contratar, comprar ou prestar atenção. O primeiro passo é escolher um problema específico e uma forma simples de resolvê-lo.","Resultados sustentáveis exigem habilidade, divulgação, confiança e melhoria contínua. Desconfie de modelos apresentados como automáticos, imediatos ou sem risco."]},{"id":"modelos","title":"Cinco modelos possíveis","paragraphs":["Serviços costumam permitir validação mais rápida porque você vende uma entrega direta. Conteúdo e afiliados dependem de audiência e confiança. Produtos digitais exigem domínio do problema, suporte e uma oferta clara. Pequenos sistemas podem gerar receita recorrente, mas pedem manutenção.","Você pode combinar modelos, porém deve validar um deles antes de aumentar a complexidade."],"steps":["Freelancing e serviços","Conteúdo educativo","Afiliados com transparência","Produtos digitais próprios","Ferramentas e sistemas pequenos"]},{"id":"primeiro-teste","title":"Faça um teste de trinta dias","paragraphs":["Escolha uma oferta pequena, converse com pessoas do público desejado e acompanhe respostas reais. Registre contatos, propostas, entregas e aprendizados.","Ao final, avalie se houve interesse, qual etapa travou e que habilidade precisa ser desenvolvida. O objetivo inicial é encontrar sinais de demanda, não abandonar a renda principal precipitadamente."]}]',
  'review',
  NULL
FROM categories AS c
CROSS JOIN users AS u
WHERE c.slug = 'renda-digital'
  AND u.role = 'admin'
  AND u.status = 'active'
ORDER BY u.id
LIMIT 1;

INSERT OR IGNORE INTO posts
  (category_id,author_id,type,slug,title,excerpt,content,status,published_at)
SELECT
  c.id,
  u.id,
  'article',
  'usar-inteligencia-artificial-no-trabalho',
  'Como usar inteligência artificial no trabalho com responsabilidade',
  'Um método para aproveitar IA em tarefas reais sem enviar dados sensíveis, aceitar erros ou perder o controle do processo.',
  '[{"id":"assistente","title":"Trate a IA como assistente","paragraphs":["Ferramentas de IA podem organizar ideias, explicar conceitos, revisar clareza e sugerir alternativas. Elas não conhecem automaticamente todo o contexto do seu trabalho e podem produzir informações incorretas com aparência convincente.","Defina o objetivo, forneça apenas o contexto necessário e indique o formato esperado. Depois, revise cada afirmação importante."]},{"id":"privacidade","title":"Proteja dados e decisões","paragraphs":["Não envie senhas, documentos pessoais, dados de clientes, contratos confidenciais ou código privado sem autorização. Antes de usar uma ferramenta no trabalho, conheça as regras da empresa e as opções de retenção de dados.","Decisões médicas, jurídicas, financeiras ou que afetam pessoas precisam de revisão humana qualificada. A IA pode apoiar a preparação, mas não substitui responsabilidade."]},{"id":"processo","title":"Um processo simples","paragraphs":["Comece em uma tarefa de baixo risco e compare tempo e qualidade antes e depois. Salve os prompts úteis e registre quais verificações foram necessárias."],"steps":["Escolher uma tarefa de baixo risco","Remover dados sensíveis","Explicar objetivo e formato","Revisar fatos e cálculos","Registrar o resultado aprovado"]}]',
  'review',
  NULL
FROM categories AS c
CROSS JOIN users AS u
WHERE c.slug = 'ia'
  AND u.role = 'admin'
  AND u.status = 'active'
ORDER BY u.id
LIMIT 1;

INSERT OR IGNORE INTO posts
  (category_id,author_id,type,slug,title,excerpt,content,status,published_at)
SELECT
  c.id,
  u.id,
  'article',
  'acompanhar-tendencias-tecnologia-sem-exageros',
  'Como acompanhar tendências de tecnologia sem cair em exageros',
  'Critérios para separar mudanças importantes de anúncios barulhentos e escolher o que realmente merece seu tempo.',
  '[{"id":"problema","title":"Novidade não significa prioridade","paragraphs":["A indústria de tecnologia publica novas ferramentas, versões e promessas todos os dias. Tentar acompanhar tudo pode reduzir o tempo dedicado aos fundamentos e aos projetos que realmente geram aprendizado.","Antes de adotar uma novidade, pergunte qual problema ela resolve, quem já a utiliza e que custo de migração ou manutenção será criado."]},{"id":"fontes","title":"Construa uma hierarquia de fontes","paragraphs":["Documentação oficial e notas de versão ajudam a confirmar o que mudou. Relatos técnicos mostram experiências reais, enquanto redes sociais são úteis para descobrir assuntos, mas não devem ser a única fonte.","Observe a data da publicação e diferencie recurso estável, beta e experimento. Uma demonstração impressionante não prova que a ferramenta esteja pronta para produção."]},{"id":"rotina","title":"Revise tendências uma vez por semana","paragraphs":["Separe um período curto para ler fontes selecionadas. Salve apenas itens relacionados aos seus objetivos atuais e faça pequenos testes isolados antes de levar algo ao projeto principal.","A habilidade mais valiosa não é conhecer toda novidade, mas avaliar com calma o que merece ser aprendido."]}]',
  'review',
  NULL
FROM categories AS c
CROSS JOIN users AS u
WHERE c.slug = 'tecnologia'
  AND u.role = 'admin'
  AND u.status = 'active'
ORDER BY u.id
LIMIT 1;

INSERT OR IGNORE INTO posts
  (category_id,author_id,type,slug,title,excerpt,content,status,published_at)
SELECT
  c.id,
  u.id,
  'article',
  'escolher-primeiro-projeto-portfolio',
  'Como escolher seu primeiro projeto de portfólio',
  'Escolha um problema pequeno, defina uma entrega demonstrável e transforme o processo em evidência das suas habilidades.',
  '[{"id":"problema","title":"Comece por um problema observável","paragraphs":["Um bom primeiro projeto resolve uma necessidade que você consegue explicar. Pode ser uma página para um profissional, um catálogo simples, um organizador de tarefas ou uma automação pessoal.","Evite copiar uma aplicação enorme. Limite o escopo a uma jornada principal que possa ser concluída e demonstrada."]},{"id":"entrega","title":"Defina o que significa pronto","paragraphs":["Escreva critérios objetivos antes de programar. A página precisa funcionar no celular, possuir navegação por teclado, apresentar conteúdo realista e estar publicada em um endereço acessível.","Itens extras entram em uma lista futura. Essa separação protege o prazo e permite terminar a primeira versão."]},{"id":"apresentacao","title":"Mostre processo e resultado","paragraphs":["No portfólio, explique o contexto, sua responsabilidade, as escolhas técnicas e o que aprendeu. Inclua uma imagem ou demonstração e um link para o código quando ele puder ser público.","Um projeto pequeno bem explicado comunica mais maturidade que vários repositórios sem instruções."],"steps":["Escolher o problema","Definir a jornada principal","Estabelecer critérios de pronto","Publicar uma versão","Documentar decisões e aprendizados"]}]',
  'review',
  NULL
FROM categories AS c
CROSS JOIN users AS u
WHERE c.slug = 'programacao'
  AND u.role = 'admin'
  AND u.status = 'active'
ORDER BY u.id
LIMIT 1;

INSERT OR IGNORE INTO posts
  (category_id,author_id,type,slug,title,excerpt,content,status,published_at)
SELECT
  c.id,
  u.id,
  'article',
  'checklist-conteudo-tecnico-util-confiavel',
  'Checklist para publicar conteúdo técnico útil e confiável',
  'Uma revisão editorial para transformar anotações em textos claros, verificáveis e realmente úteis para iniciantes.',
  '[{"id":"promessa","title":"Faça uma promessa específica","paragraphs":["O título e a introdução devem explicar o que a pessoa conseguirá entender ou executar. Evite promessas absolutas e deixe claros os requisitos, limites e riscos.","Escreva para uma pessoa em um nível definido. Se o público é iniciante, explique termos antes de usá-los e mostre como reconhecer que cada etapa funcionou."]},{"id":"teste","title":"Teste instruções e fontes","paragraphs":["Execute comandos em um ambiente limpo, confirme versões e registre a data da verificação. Use documentação oficial como fonte principal para comportamentos técnicos.","Remova tokens, e-mails, identificadores de conta e caminhos pessoais das capturas e exemplos."]},{"id":"revisao","title":"Revisão antes de publicar","paragraphs":["Leia o texto como alguém que nunca viu o projeto. Procure saltos de raciocínio, comandos perigosos, links quebrados e resultados esperados ausentes."],"steps":["Conferir título e objetivo","Explicar pré-requisitos","Testar todos os passos","Revisar segurança e privacidade","Adicionar fontes e data","Corrigir linguagem e acessibilidade","Planejar uma revisão futura"]}]',
  'review',
  NULL
FROM categories AS c
CROSS JOIN users AS u
WHERE c.slug = 'tutoriais'
  AND u.role = 'admin'
  AND u.status = 'active'
ORDER BY u.id
LIMIT 1;

INSERT OR IGNORE INTO posts
  (category_id,author_id,type,slug,title,excerpt,content,status,published_at)
SELECT
  c.id,
  u.id,
  'tutorial',
  'preparar-ubuntu-nodejs-vscode',
  'Prepare o Ubuntu para desenvolver com Node.js e VS Code',
  'Configure Git, NVM, Node.js e VS Code sem usar permissões administrativas para instalar pacotes do projeto.',
  '[{"id":"atualizar","title":"1. Atualize os pacotes do Ubuntu","paragraphs":["Abra o terminal e atualize a lista de pacotes. Leia a relação de atualizações antes de confirmar. O sudo será usado apenas para administrar o sistema, não para instalar dependências npm dentro do projeto."],"code":"sudo apt update\nsudo apt upgrade"},{"id":"git","title":"2. Instale e configure o Git","paragraphs":["Instale o Git pelo gerenciador do Ubuntu e confirme a versão. Configure nome e e-mail com os dados que deseja registrar nos commits."],"code":"sudo apt install git\ngit --version\ngit config --global user.name \"Seu Nome\"\ngit config --global user.email \"seu-email@exemplo.com\""},{"id":"node","title":"3. Instale Node.js com um gerenciador de versões","paragraphs":["Use o NVM seguindo a instalação oficial do projeto e reinicie o terminal. Depois instale uma versão LTS do Node.js. Um gerenciador evita problemas de permissão e permite trocar de versão por projeto.","Confirme os executáveis antes de continuar."],"code":"nvm install --lts\nnode --version\nnpm --version"},{"id":"projeto","title":"4. Teste em uma pasta de projeto","paragraphs":["Crie uma pasta dentro do seu diretório de trabalho, inicialize o npm e abra o VS Code. Não execute npm com sudo."],"code":"mkdir meu-projeto\ncd meu-projeto\nnpm init -y\ncode ."}]',
  'review',
  NULL
FROM categories AS c
CROSS JOIN users AS u
WHERE c.slug = 'linux'
  AND u.role = 'admin'
  AND u.status = 'active'
ORDER BY u.id
LIMIT 1;

INSERT OR IGNORE INTO posts
  (category_id,author_id,type,slug,title,excerpt,content,status,published_at)
SELECT
  c.id,
  u.id,
  'tutorial',
  'primeiro-site-estatico-astro',
  'Crie seu primeiro site estático com Astro',
  'Do projeto vazio ao build estático, com estrutura de página, estilos simples e conferência da pasta dist.',
  '[{"id":"criar","title":"1. Crie o projeto","paragraphs":["Use o criador oficial do Astro e responda às perguntas do assistente. Escolha TypeScript e inicialização do Git quando essas opções forem apresentadas."],"code":"npm create astro@latest meu-site\ncd meu-site\nnpm install"},{"id":"pagina","title":"2. Edite a página inicial","paragraphs":["Abra src/pages/index.astro. O bloco entre separadores no topo executa durante o build; abaixo dele fica o HTML do documento. Comece com conteúdo semântico e uma chamada clara."],"code":"---\nconst title = ''Meu primeiro site'';\n---\n<main>\n  <h1>{title}</h1>\n  <p>Construído com Astro.</p>\n</main>"},{"id":"executar","title":"3. Execute localmente","paragraphs":["Inicie o servidor de desenvolvimento e abra o endereço mostrado no terminal. Altere o texto e confirme que a página atualiza."],"code":"npm run dev"},{"id":"build","title":"4. Gere os arquivos estáticos","paragraphs":["O build cria a pasta dist. Confira se existe um index.html e abra a prévia de produção antes de publicar."],"code":"npm run build\nnpm run preview"}]',
  'review',
  NULL
FROM categories AS c
CROSS JOIN users AS u
WHERE c.slug = 'programacao'
  AND u.role = 'admin'
  AND u.status = 'active'
ORDER BY u.id
LIMIT 1;

INSERT OR IGNORE INTO posts
  (category_id,author_id,type,slug,title,excerpt,content,status,published_at)
SELECT
  c.id,
  u.id,
  'tutorial',
  'enviar-primeiro-projeto-github',
  'Envie seu primeiro projeto para o GitHub',
  'Inicialize o Git, proteja arquivos locais, crie o primeiro commit e conecte o repositório remoto com segurança.',
  '[{"id":"ignorar","title":"1. Prepare o .gitignore","paragraphs":["Antes do primeiro commit, crie um .gitignore. Em projetos Node, dependências, builds locais, logs e arquivos de ambiente normalmente não entram no repositório."],"code":"node_modules/\ndist/\n.env\n.env.*\n*.log"},{"id":"commit","title":"2. Crie o repositório local","paragraphs":["Inicialize o Git, confira os arquivos e crie um commit que represente a primeira versão funcional."],"code":"git init\ngit status\ngit add .\ngit commit -m \"feat: cria estrutura inicial\""},{"id":"remoto","title":"3. Conecte ao GitHub","paragraphs":["Crie um repositório vazio no GitHub, sem gerar arquivos adicionais. Copie a URL indicada pela plataforma e use-a como origin."],"code":"git branch -M main\ngit remote add origin URL_DO_REPOSITORIO\ngit push -u origin main"},{"id":"conferir","title":"4. Confira o resultado","paragraphs":["Atualize a página do repositório e confirme se README, código e histórico aparecem. Verifique novamente se nenhum segredo foi enviado."]}]',
  'review',
  NULL
FROM categories AS c
CROSS JOIN users AS u
WHERE c.slug = 'programacao'
  AND u.role = 'admin'
  AND u.status = 'active'
ORDER BY u.id
LIMIT 1;

INSERT OR IGNORE INTO posts
  (category_id,author_id,type,slug,title,excerpt,content,status,published_at)
SELECT
  c.id,
  u.id,
  'tutorial',
  'publicar-astro-cloudflare-pages',
  'Publique um site Astro no Cloudflare Pages',
  'Conecte o repositório, configure o comando de build e valide o endereço público entregue pela Cloudflare.',
  '[{"id":"preparar","title":"1. Confirme o build local","paragraphs":["Antes de conectar a Cloudflare, instale as dependências a partir do lockfile e gere o site. O Astro estático deve produzir a pasta dist sem erros."],"code":"npm ci\nnpm run build"},{"id":"conectar","title":"2. Conecte o repositório","paragraphs":["No painel da Cloudflare, crie uma aplicação Pages e conecte o provedor Git. Selecione o repositório e a branch principal. Autorize somente o acesso necessário."],"steps":["Escolher Workers & Pages","Criar uma aplicação Pages","Conectar o GitHub","Selecionar repositório e branch"]},{"id":"build","title":"3. Configure o build","paragraphs":["Use npm run build como comando e dist como diretório de saída. Se o projeto estiver em um monorepo, defina também o diretório raiz correto.","Variáveis públicas necessárias durante o build devem ser cadastradas por ambiente. Nunca coloque secrets no código Astro enviado ao navegador."]},{"id":"validar","title":"4. Valide a publicação","paragraphs":["Abra o endereço pages.dev, teste as rotas e confira redirecionamentos, sitemap e formulário. Depois conecte o domínio e aguarde a emissão do certificado."]}]',
  'review',
  NULL
FROM categories AS c
CROSS JOIN users AS u
WHERE c.slug = 'cloudflare'
  AND u.role = 'admin'
  AND u.status = 'active'
ORDER BY u.id
LIMIT 1;

INSERT OR IGNORE INTO posts
  (category_id,author_id,type,slug,title,excerpt,content,status,published_at)
SELECT
  c.id,
  u.id,
  'tutorial',
  'api-hono-cloudflare-workers',
  'Crie uma API Hono no Cloudflare Workers',
  'Monte uma API TypeScript pequena, valide a resposta localmente e publique no runtime da Cloudflare.',
  '[{"id":"projeto","title":"1. Prepare o Worker","paragraphs":["Crie um projeto Cloudflare Worker em TypeScript e instale Hono. Preserve a configuração Wrangler gerada e confirme o arquivo de entrada."],"code":"npm create cloudflare@latest minha-api\ncd minha-api\nnpm install hono"},{"id":"rota","title":"2. Adicione a primeira rota","paragraphs":["Crie a aplicação, registre uma rota e exporte o objeto Hono. Respostas JSON devem manter um formato previsível."],"code":"import { Hono } from ''hono'';\n\nconst app = new Hono();\n\napp.get(''/api/health'', (c) => {\n  return c.json({ success: true, status: ''healthy'' });\n});\n\nexport default app;"},{"id":"local","title":"3. Teste localmente","paragraphs":["Inicie o Wrangler em modo de desenvolvimento e faça uma requisição para a rota. Teste também um caminho inexistente."],"code":"npm run dev\ncurl http://localhost:8787/api/health"},{"id":"deploy","title":"4. Publique com Wrangler","paragraphs":["Faça o typecheck, revise bindings e variáveis e publique. Guarde secrets com wrangler secret put, nunca no arquivo de configuração."],"code":"npm run check\nnpx wrangler deploy"}]',
  'review',
  NULL
FROM categories AS c
CROSS JOIN users AS u
WHERE c.slug = 'cloudflare'
  AND u.role = 'admin'
  AND u.status = 'active'
ORDER BY u.id
LIMIT 1;

INSERT OR IGNORE INTO posts
  (category_id,author_id,type,slug,title,excerpt,content,status,published_at)
SELECT
  c.id,
  u.id,
  'tutorial',
  'criar-migrar-banco-cloudflare-d1',
  'Crie e migre um banco Cloudflare D1',
  'Crie o banco, configure o binding, versione o schema e aplique migrações com conferência antes do ambiente remoto.',
  '[{"id":"criar","title":"1. Crie o banco","paragraphs":["Use um nome que identifique o projeto e o ambiente. O Wrangler retorna um ID que deve ser colocado no binding da configuração do Worker."],"code":"npx wrangler d1 create minha-api-preview"},{"id":"binding","title":"2. Configure o binding","paragraphs":["Defina DB como nome do binding e use o nome e o ID retornados. O código acessará o banco por env.DB. Mantenha bancos diferentes para preview e produção."],"code":"{\n  \"binding\": \"DB\",\n  \"database_name\": \"minha-api-preview\",\n  \"database_id\": \"ID_DO_BANCO\"\n}"},{"id":"migracao","title":"3. Crie uma migração","paragraphs":["Migrações guardam a evolução do schema em arquivos SQL numerados. Use restrições para proteger a integridade dos dados."],"code":"npx wrangler d1 migrations create minha-api-preview criar_posts"},{"id":"aplicar","title":"4. Teste e aplique","paragraphs":["Aplique primeiro no banco local, execute consultas de verificação e só então use o ambiente remoto. Liste migrações pendentes antes e depois."],"code":"npx wrangler d1 migrations apply minha-api-preview --local\nnpx wrangler d1 migrations list minha-api-preview --remote\nnpx wrangler d1 migrations apply minha-api-preview --remote"}]',
  'review',
  NULL
FROM categories AS c
CROSS JOIN users AS u
WHERE c.slug = 'cloudflare'
  AND u.role = 'admin'
  AND u.status = 'active'
ORDER BY u.id
LIMIT 1;

INSERT OR IGNORE INTO posts
  (category_id,author_id,type,slug,title,excerpt,content,status,published_at)
SELECT
  c.id,
  u.id,
  'tutorial',
  'organizar-imagens-downloads-cloudflare-r2',
  'Organize imagens e downloads no Cloudflare R2',
  'Crie um bucket, defina uma estrutura de chaves e conecte uploads autenticados sem expor credenciais no navegador.',
  '[{"id":"bucket","title":"1. Crie o bucket","paragraphs":["Use um bucket separado por ambiente. Nomes de bucket são globais dentro da conta e devem permanecer estáveis depois que o código começar a gravar objetos."],"code":"npx wrangler r2 bucket create meu-projeto-media-preview"},{"id":"binding","title":"2. Adicione o binding","paragraphs":["Configure um binding chamado MEDIA no Worker. O upload deve passar pela API autenticada, que valida tipo, tamanho e permissão antes de chamar env.MEDIA.put."]},{"id":"chaves","title":"3. Organize as chaves","paragraphs":["Uma chave previsível facilita cache e manutenção. Use tipo de conteúdo, ano, mês e um identificador aleatório. Não use o nome enviado pelo usuário como caminho direto."],"code":"posts/2026/09/identificador-capa.webp\ndownloads/2026/09/identificador-checklist.pdf"},{"id":"metadados","title":"4. Grave metadados no D1","paragraphs":["Depois do upload, registre no D1 a chave, tipo MIME, tamanho, texto alternativo e autor. O banco ajuda o CMS a localizar arquivos; os bytes permanecem no R2.","Defina uma política para objetos sem referência e nunca permita upload anônimo na rota administrativa."]}]',
  'review',
  NULL
FROM categories AS c
CROSS JOIN users AS u
WHERE c.slug = 'cloudflare'
  AND u.role = 'admin'
  AND u.status = 'active'
ORDER BY u.id
LIMIT 1;

INSERT OR IGNORE INTO posts
  (category_id,author_id,type,slug,title,excerpt,content,status,published_at)
SELECT
  c.id,
  u.id,
  'tutorial',
  'permissoes-arquivos-linux-iniciantes',
  'Aprenda permissões de arquivos no Linux sem decorar tudo',
  'Leia as permissões, entenda usuário e grupo e pratique mudanças seguras em uma pasta de teste.',
  '[{"id":"ler","title":"1. Leia as permissões","paragraphs":["Use ls -l em uma pasta de teste. O primeiro caractere indica o tipo; os nove seguintes representam leitura, escrita e execução para usuário, grupo e outras pessoas."],"code":"mkdir permissoes-teste\ncd permissoes-teste\ntouch exemplo.txt\nls -l"},{"id":"chmod","title":"2. Altere de forma simbólica","paragraphs":["A notação simbólica deixa a intenção clara. Adicione escrita para o usuário ou remova escrita de outras pessoas e confira o resultado."],"code":"chmod u+w exemplo.txt\nchmod o-w exemplo.txt\nls -l exemplo.txt"},{"id":"diretorios","title":"3. Entenda execução em diretórios","paragraphs":["Em diretórios, a permissão de execução permite atravessar o caminho. Alterações recursivas podem atingir muitos arquivos, por isso evite -R enquanto estiver praticando."]},{"id":"cuidados","title":"4. Evite atalhos perigosos","paragraphs":["Não use chmod 777 como solução genérica. Descubra qual usuário executa o processo e conceda apenas o acesso necessário. Não altere permissões do sistema ou da pasta pessoal inteira para resolver um erro isolado."]}]',
  'review',
  NULL
FROM categories AS c
CROSS JOIN users AS u
WHERE c.slug = 'linux'
  AND u.role = 'admin'
  AND u.status = 'active'
ORDER BY u.id
LIMIT 1;

INSERT OR IGNORE INTO posts
  (category_id,author_id,type,slug,title,excerpt,content,status,published_at)
SELECT
  c.id,
  u.id,
  'tutorial',
  'prompts-melhores-estudar-trabalhar',
  'Escreva prompts melhores para estudar e trabalhar',
  'Monte pedidos com contexto, objetivo, limites e formato, depois revise o resultado com uma lista simples.',
  '[{"id":"estrutura","title":"1. Use quatro partes","paragraphs":["Um pedido útil informa contexto, objetivo, restrições e formato da resposta. Não é necessário escrever textos longos; informações específicas são mais importantes que palavras sofisticadas."],"code":"Contexto: estou aprendendo HTML.\nObjetivo: explique formulários.\nLimites: use linguagem iniciante e não use frameworks.\nFormato: exemplo curto seguido de três exercícios."},{"id":"iterar","title":"2. Trabalhe em pequenas rodadas","paragraphs":["Comece pedindo um plano ou diagnóstico. Depois escolha uma parte e solicite detalhes. Isso reduz respostas genéricas e facilita perceber quando o caminho está errado."]},{"id":"verificar","title":"3. Verifique antes de usar","paragraphs":["Peça para a ferramenta indicar suposições, mas confirme fatos importantes em fontes confiáveis. Execute código em ambiente controlado e leia cada comando."],"steps":["Conferir se respondeu ao objetivo","Identificar suposições","Verificar datas e fontes","Testar exemplos","Reescrever com suas próprias palavras"]},{"id":"privacidade","title":"4. Remova informações sensíveis","paragraphs":["Substitua nomes, e-mails, tokens, dados de clientes e documentos por exemplos fictícios. Compartilhe apenas o trecho necessário para resolver o problema."]}]',
  'review',
  NULL
FROM categories AS c
CROSS JOIN users AS u
WHERE c.slug = 'ia'
  AND u.role = 'admin'
  AND u.status = 'active'
ORDER BY u.id
LIMIT 1;

INSERT OR IGNORE INTO posts
  (category_id,author_id,type,slug,title,excerpt,content,status,published_at)
SELECT
  c.id,
  u.id,
  'tutorial',
  'landing-page-primeiro-servico',
  'Monte uma landing page simples para seu primeiro serviço',
  'Defina uma oferta pequena, escreva a página em cinco blocos e publique uma versão pronta para conversar com clientes.',
  '[{"id":"oferta","title":"1. Defina a oferta","paragraphs":["Escolha um público, um problema e uma entrega. Em vez de oferecer qualquer site, descreva algo verificável, como uma página profissional responsiva com formulário e publicação."],"code":"Eu crio [entrega] para [público] conseguir [resultado] em [prazo ou processo]."},{"id":"estrutura","title":"2. Organize cinco blocos","paragraphs":["A primeira tela apresenta resultado e ação. Depois explique o problema, a entrega, seu processo e como entrar em contato. Use linguagem concreta e remova seções que não ajudam a decisão."],"steps":["Promessa principal","Problema atendido","O que será entregue","Processo e confiança","Chamada para contato"]},{"id":"prova","title":"3. Crie uma amostra honesta","paragraphs":["Se ainda não possui clientes, apresente um projeto demonstrativo e identifique-o como estudo. Não invente depoimentos, números ou empresas atendidas.","Explique o que você fez, quais limitações existem e como a solução pode ser adaptada."]},{"id":"publicar","title":"4. Publique e converse","paragraphs":["Teste no celular, revise o formulário e publique. Envie a página para poucas pessoas do público, faça perguntas e anote objeções.","Melhore a oferta com base nas conversas. Tráfego sem uma proposta compreensível raramente resolve o problema."]}]',
  'review',
  NULL
FROM categories AS c
CROSS JOIN users AS u
WHERE c.slug = 'renda-digital'
  AND u.role = 'admin'
  AND u.status = 'active'
ORDER BY u.id
LIMIT 1;

PRAGMA optimize;
