# Sonhando Alto — Página de Captura de Leads

Landing page de divulgação do projeto **Sonhando Alto** (25 anos) com um
formulário de captura de leads e um painel administrativo protegido por
login para visualizar e exportar os dados recebidos.

Domínio oficial: **sonhandoalto.mpi.org.br**. Projeto pensado para rodar
no **Vercel** (funções serverless em `/api` + Firestore como banco de dados).

## O que tem aqui

- **Página pública** (`/`): apresenta a campanha "Play no Futuro!" com as
  imagens e a identidade visual da campanha, os benefícios do projeto e um
  formulário que coleta **Nome, Telefone, Idade, Curso de interesse, Cidade
  e Distrito**.
- **Painel administrativo** (`/admin/`): acesso restrito por usuário e
  senha. Lista todos os leads recebidos, permite buscar e baixar os dados
  em **Excel (.xlsx)** ou **PDF**. Link discreto no rodapé da página pública.
- **API** (`/api/leads`, `/api/admin/...`): funções serverless que recebem
  os cadastros e servem o painel administrativo. Os dados ficam salvos no
  **Firestore** (Firebase), acessado pelo backend via `firebase-admin`.

> ⚠️ **Estado atual (temporário):** enquanto `ADMIN_PASSWORD_HASH` não é
> configurado, o login do admin aceita usuário `admin` e senha `12345`
> (fixos no código). Isso é só para destravar o acesso rapidamente — veja
> "Segurança do painel administrativo" abaixo para trocar por uma senha de
> verdade quando quiser.

## Implantação no Vercel (passo a passo)

1. **Importar o projeto**
   No [dashboard do Vercel](https://vercel.com/new), clique em "Add New… →
   Project", selecione este repositório do GitHub
   (`wallefffariasadventistas-dot/Promocional-Sonhando-Alto`) e conecte o
   branch desejado. O Vercel detecta o projeto automaticamente (pasta
   `/api` vira funções serverless, `/public` vira o site estático) — não é
   preciso configurar build command nem output directory.

2. **Criar o projeto Firebase e gerar a credencial**
   - Acesse [console.firebase.google.com](https://console.firebase.google.com)
     e crie um projeto (ou use um existente).
   - Ative o **Firestore Database** (modo produção) em Build → Firestore
     Database → Create database.
   - Vá em **Configurações do projeto** (ícone de engrenagem) → **Contas de
     serviço** → **Gerar nova chave privada**. Isso baixa um arquivo `.json`.
   - Converta esse arquivo em uma linha base64:
     ```bash
     npm run encode-firebase-key -- caminho/para/o-arquivo-baixado.json
     ```
   - Copie o valor gerado.

3. **Configurar as variáveis de ambiente**
   Gere também o hash da senha do admin:

   ```bash
   npm install
   npm run hash-password -- "SuaSenhaForte123"
   ```

   Em **Settings → Environment Variables** no Vercel, adicione:
   - `FIREBASE_SERVICE_ACCOUNT_BASE64` — valor gerado no passo 2
   - `SESSION_SECRET` — valor aleatório forte (ex: `openssl rand -hex 32`)
   - `ADMIN_USERNAME` — usuário do painel (ex: `admin`)
   - `ADMIN_PASSWORD_HASH` — o hash gerado acima

4. **Redeploy**
   Depois de salvar as variáveis, dispare um novo deploy (Vercel →
   Deployments → "Redeploy") para que as funções passem a enxergá-las.

5. **Domínio próprio**
   Em **Settings → Domains**, adicione `sonhandoalto.mpi.org.br` e siga as
   instruções de DNS que o Vercel mostra (registro `CNAME` ou `A`,
   dependendo do provedor de DNS do domínio `.mpi.org.br`).

O Firestore não exige criação de tabelas/coleções antecipadamente — a
coleção `leads` é criada automaticamente no primeiro cadastro.

## Como rodar localmente

Não é necessário ter o Firebase configurado para testar localmente: se
`FIREBASE_SERVICE_ACCOUNT_BASE64` não estiver definida, o backend salva os
leads automaticamente em um arquivo temporário (`lib/db.js`), só para
desenvolvimento. Assim que a variável existir (local ou em produção), o
Firestore passa a ser usado no lugar do arquivo, sem precisar mudar nada no
código.

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Crie um `.env.local` mínimo (sem `FIREBASE_SERVICE_ACCOUNT_BASE64` — o
   fallback local cuida disso por enquanto):

   ```bash
   cp .env.example .env.local
   npm run hash-password -- "SuaSenhaForte123"
   ```

   Copie o hash gerado para `ADMIN_PASSWORD_HASH` no `.env.local` e defina
   `SESSION_SECRET` (ex: `openssl rand -hex 32`).

3. Suba o ambiente de desenvolvimento (emula as funções serverless
   localmente):

   ```bash
   npm run dev
   ```

4. Acesse:
   - Página de captação: http://localhost:3000
   - Painel do administrador: http://localhost:3000/admin/, ou clique em
     "Área administrativa" no rodapé da página pública
   - Diagnóstico: http://localhost:3000/api/health — mostra se está usando
     o arquivo local ou o Firestore, e se a conexão está OK

Quando quiser testar com o Firestore de verdade localmente, rode
`npx vercel link && npx vercel env pull .env.local` para puxar a variável
já configurada no Vercel.

## Segurança do painel administrativo

- Somente quem tiver usuário e senha configurados nas variáveis de
  ambiente consegue entrar no painel — não existe cadastro de novos
  administradores pela interface.
- **Estado atual**: sem `ADMIN_PASSWORD_HASH` configurado, o login aceita
  a senha fixa `12345` (usuário `admin`) — ver aviso no topo deste arquivo.
  Para usar uma senha de verdade: gere o hash (`npm run hash-password --
  "suaSenha"`) e defina `ADMIN_PASSWORD_HASH` no Vercel — a checagem forte
  passa a valer automaticamente, sem mexer em código.
- A senha real (quando configurada) nunca fica salva em texto puro: apenas
  o hash bcrypt vai na variável de ambiente.
- A sessão do admin é um cookie assinado (JWT), `httpOnly` e válido por 4
  horas — não depende de estado em memória, então funciona corretamente em
  ambiente serverless (múltiplas instâncias/regiões).
- As rotas `/api/admin/leads`, `/api/admin/export-xlsx` e
  `/api/admin/export-pdf` exigem esse cookie válido; sem login, a API
  responde `401`.
- O formulário público tem um campo "honeypot" invisível para reduzir spam
  de bots simples. Para um filtro mais robusto contra abuso (rate limit
  real), considere ativar o **Vercel Firewall / Attack Challenge Mode** no
  dashboard.

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
  health.js                  GET /api/health — diagnóstico de configuração
lib/
  db.js                     Acesso ao Firestore (firebase-admin) + fallback local
  auth.js                   Cookie JWT de sessão do admin
  validate-lead.js            Validação dos campos do formulário
  courses.js                  Lista de cursos de interesse
scripts/
  hash-password.js            Utilitário para gerar o hash da senha do admin
  encode-firebase-key.js        Converte o .json da conta de serviço em base64
  init-db.js                    Testa a conexão com o Firestore
```
