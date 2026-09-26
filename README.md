# Sonhando Alto — Página de Captura de Leads

Landing page de divulgação do projeto **Sonhando Alto** (25 anos) com um
formulário de captura de leads e um painel administrativo protegido por
login para visualizar e exportar os dados recebidos.

Domínio oficial: **sonhandoalto.mpi.org.br**. Projeto pensado para rodar
no **Vercel** (funções serverless em `/api` + Postgres gerenciado).

## O que tem aqui

- **Página pública** (`/`): apresenta a campanha "Play no Futuro!" com as
  imagens e a identidade visual da campanha, os benefícios do projeto e um
  formulário que coleta **Nome, Telefone, Idade, Curso de interesse, Cidade
  e Distrito**.
- **Painel administrativo** (`/admin/`): acesso restrito por usuário e
  senha. Lista todos os leads recebidos, permite buscar e baixar os dados
  em **Excel (.xlsx)** ou **PDF**.
- **API** (`/api/leads`, `/api/admin/...`): funções serverless que recebem
  os cadastros e servem o painel administrativo. Os dados ficam salvos em
  um banco **Postgres** (compatível com o Vercel Postgres).

## Implantação no Vercel (passo a passo)

1. **Importar o projeto**
   No [dashboard do Vercel](https://vercel.com/new), clique em "Add New… →
   Project", selecione este repositório do GitHub
   (`wallefffariasadventistas-dot/Promocional-Sonhando-Alto`) e conecte o
   branch desejado. O Vercel detecta o projeto automaticamente (pasta
   `/api` vira funções serverless, `/public` vira o site estático) — não é
   preciso configurar build command nem output directory.

2. **Criar e conectar o banco Postgres**
   Dentro do projeto no Vercel, vá em **Storage → Create Database →
   Postgres** e conecte ao projeto. Isso preenche automaticamente a
   variável `POSTGRES_URL` (e outras relacionadas) nas Environment
   Variables do projeto — não precisa copiar nada manualmente.

3. **Configurar o acesso do admin**
   Gere o hash da senha localmente:

   ```bash
   npm install
   npm run hash-password -- "SuaSenhaForte123"
   ```

   Em **Settings → Environment Variables**, adicione:
   - `SESSION_SECRET` — valor aleatório forte (ex: `openssl rand -hex 32`)
   - `ADMIN_USERNAME` — usuário do painel (ex: `admin`)
   - `ADMIN_PASSWORD_HASH` — o hash gerado no passo anterior

4. **Redeploy**
   Depois de salvar as variáveis, dispare um novo deploy (Vercel →
   Deployments → "Redeploy") para que as funções passem a enxergá-las.

5. **Domínio próprio**
   Em **Settings → Domains**, adicione `sonhandoalto.mpi.org.br` e siga as
   instruções de DNS que o Vercel mostra (registro `CNAME` ou `A`,
   dependendo do provedor de DNS do domínio `.mpi.org.br`).

A tabela `leads` é criada automaticamente (`CREATE TABLE IF NOT EXISTS`) na
primeira requisição à API — não é necessário rodar migração manual.

## Como rodar localmente

Não é necessário ter um Postgres configurado para testar localmente: se
nenhuma variável de conexão for encontrada, o backend salva os leads
automaticamente em um arquivo temporário (`lib/db.js`), só para
desenvolvimento. Assim que o Postgres estiver conectado (local ou em
produção), ele passa a ser usado no lugar do arquivo, sem precisar mudar
nada no código.

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Crie um `.env.local` mínimo (sem `POSTGRES_URL`/`DATABASE_URL` — o
   fallback local cuida disso por enquanto):

   ```bash
   cp .env.example .env.local
   npm run hash-password -- "SuaSenhaForte123"
   ```

   Copie o hash gerado para `ADMIN_PASSWORD_HASH` no `.env.local`, defina
   `SESSION_SECRET` (ex: `openssl rand -hex 32`) e apague a linha
   `DATABASE_URL=` (ou deixe em branco).

3. Suba o ambiente de desenvolvimento (emula as funções serverless
   localmente):

   ```bash
   npm run dev
   ```

4. Acesse:
   - Página de captação: http://localhost:3000
   - Painel do administrador: http://localhost:3000/admin/
     (usuário/senha configurados no `.env.local`), ou clique em
     "Área administrativa" no rodapé da página pública
   - Diagnóstico: http://localhost:3000/api/health — mostra se está usando
     o arquivo local ou o Postgres, e se a conexão está OK

Quando o projeto já estiver conectado ao Postgres no Vercel, rode
`npx vercel link && npx vercel env pull .env.local` para puxar a
`POSTGRES_URL` de verdade em vez do fallback local.

## Segurança do painel administrativo

- Somente quem tiver usuário e senha configurados nas variáveis de
  ambiente consegue entrar no painel — não existe cadastro de novos
  administradores pela interface.
- A senha nunca fica salva em texto puro: apenas o hash bcrypt vai na
  variável de ambiente.
- A sessão do admin é um cookie assinado (JWT), `httpOnly` e válido por 4
  horas — não depende de estado em memória, então funciona corretamente em
  ambiente serverless (múltiplas instâncias/regiões).
- As rotas `/api/admin/leads`, `/api/admin/export-xlsx` e
  `/api/admin/export-pdf` exigem esse cookie válido; sem login, a API
  responde `401`.
- O formulário público tem um campo "honeypot" invisível para reduzir spam
  de bots simples. Para um filtro mais robusto contra abuso (rate limit
  real), considere ativar o **Vercel Firewall / Attack Challenge Mode** no
  dashboard, ou um limitador com estado externo (ex: Upstash Redis).

## Estrutura do projeto

```
public/
  index.html            Página pública de captura de leads
  admin/
    index.html           Login do admin
    dashboard.html         Painel com a lista de leads
  css/, js/, images/       Estilos, scripts e imagens da campanha
api/
  leads.js                 POST /api/leads — cadastro público
  admin/
    login.js                POST /api/admin/login
    logout.js               POST /api/admin/logout
    session.js               GET /api/admin/session
    leads.js                  GET /api/admin/leads (protegido)
    export-xlsx.js             GET /api/admin/export-xlsx (protegido)
    export-pdf.js               GET /api/admin/export-pdf (protegido)
lib/
  db.js                     Conexão e schema do Postgres (@vercel/postgres)
  auth.js                   Cookie JWT de sessão do admin
  validate-lead.js            Validação dos campos do formulário
  courses.js                  Lista de cursos de interesse
scripts/
  hash-password.js            Utilitário para gerar o hash da senha do admin
  init-db.js                   Cria a tabela "leads" manualmente, se preciso
```
