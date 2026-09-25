# Sonhando Alto — Página de Captura de Leads

Landing page de divulgação do projeto **Sonhando Alto** (25 anos) com um
formulário de captura de leads e um painel administrativo protegido por
login para visualizar e exportar os dados recebidos.

## O que tem aqui

- **Página pública** (`/`): apresenta a campanha "Play no Futuro!" com as
  imagens e a identidade visual enviadas, os benefícios do projeto e um
  formulário que coleta **Nome, Telefone, Idade, Curso de interesse, Cidade
  e Distrito**.
- **Painel administrativo** (`/admin/`): acesso restrito por usuário e
  senha. Lista todos os leads recebidos, permite buscar e baixar os dados
  em **Excel (.xlsx)** ou **PDF**.
- **API** (`/api/leads`, `/api/admin/...`): recebe os cadastros e serve o
  painel administrativo. Os dados ficam salvos em um banco SQLite local
  (`data/leads.db`).

## Como rodar localmente

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Copie o arquivo de variáveis de ambiente e configure o acesso do admin:

   ```bash
   cp .env.example .env
   npm run hash-password -- "SuaSenhaForte123"
   ```

   Copie o hash gerado para `ADMIN_PASSWORD_HASH` dentro do `.env`, e defina
   também `SESSION_SECRET` (por exemplo com `openssl rand -hex 32`).

3. Inicie o servidor:

   ```bash
   npm start
   ```

4. Acesse:
   - Página de captação: http://localhost:3000
   - Painel do administrador: http://localhost:3000/admin/
     (usuário definido em `ADMIN_USERNAME`, senha que você usou no passo 2)

## Segurança do painel administrativo

- Somente quem tiver usuário e senha configurados no `.env` consegue entrar
  no painel — não existe cadastro de novos administradores pela interface.
- A senha nunca fica salva em texto puro: apenas o hash bcrypt vai no
  `.env`.
- As rotas `/api/admin/leads`, `/api/admin/leads/export.xlsx` e
  `/api/admin/leads/export.pdf` exigem sessão de administrador autenticada;
  sem login, a API responde `401`.
- O formulário público tem limite de tentativas (rate limit) e um campo
  "honeypot" invisível para reduzir spam de bots.

## Estrutura do projeto

```
public/
  index.html          Página pública de captura de leads
  admin/
    index.html         Login do admin
    dashboard.html      Painel com a lista de leads
  css/, js/, images/    Estilos, scripts e imagens da campanha
routes/
  leads.js              Rota pública de cadastro
  admin.js               Login, listagem e exportação (xlsx/pdf)
lib/
  db.js                   Conexão e schema do SQLite
  auth.js                 Middleware que exige sessão de admin
  courses.js              Lista de cursos de interesse
scripts/
  hash-password.js        Utilitário para gerar o hash da senha do admin
server.js                  Servidor Express
```

## Implantação (deploy)

O domínio oficial da página é **sonhandoalto.mpi.org.br**. Este é um app
Node.js/Express comum — funciona em qualquer provedor que rode Node
(Render, Railway, um VPS, etc.) apontado para esse domínio. Pontos de
atenção:

- Defina as variáveis de ambiente do `.env.example` no provedor escolhido.
- O banco SQLite (`data/leads.db`) precisa de disco persistente entre
  deploys; em plataformas com sistema de arquivos efêmero, aponte o volume
  de dados para um disco persistente.
- Em produção, `NODE_ENV=production` ativa o cookie de sessão como
  `secure`, então o site precisa estar servido por HTTPS.
