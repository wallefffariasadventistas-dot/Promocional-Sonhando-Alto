# Sonhando Alto — Página de Captura de Leads

Landing page de divulgação do projeto **Sonhando Alto** (25 anos) com um
formulário de captura de leads e um painel administrativo protegido por
login para visualizar e exportar os dados recebidos.

Domínio oficial: **sonhandoalto.mpi.org.br**. Projeto pensado para rodar
no **Vercel** (funções serverless em `/api` + Firestore como banco de dados
+ Firebase Authentication para o login do admin).

## O que tem aqui

- **Página pública** (`/`): apresenta a campanha "Play no Futuro!" com as
  imagens e a identidade visual da campanha, os benefícios do projeto e um
  formulário que coleta **Nome, Telefone, Idade, Curso de interesse, Cidade
  e Distrito**.
- **Painel administrativo** (`/admin/`): login por **e-mail e senha**,
  autenticado pelo **Firebase Authentication**. Lista todos os leads
  recebidos, permite buscar e baixar os dados em **Excel (.xlsx)** ou
  **PDF**. Link discreto no rodapé da página pública.
- **API** (`/api/leads`, `/api/admin/...`): funções serverless que recebem
  os cadastros e servem o painel administrativo. Os dados ficam salvos no
  **Firestore** (Firebase), acessado pelo backend via `firebase-admin`.

## Implantação no Vercel (passo a passo)

1. **Importar o projeto**
   No [dashboard do Vercel](https://vercel.com/new), clique em "Add New… →
   Project", selecione este repositório do GitHub
   (`wallefffariasadventistas-dot/Promocional-Sonhando-Alto`) e conecte o
   branch desejado. O Vercel detecta o projeto automaticamente (pasta
   `/api` vira funções serverless, `/public` vira o site estático) — não é
   preciso configurar build command nem output directory.

2. **Criar o projeto Firebase**
   - Acesse [console.firebase.google.com](https://console.firebase.google.com)
     e crie um projeto (ou use um existente).
   - Ative o **Firestore Database** (modo produção) em Build → Firestore
     Database → Create database.
   - Ative o **login por e-mail/senha**: Build → Authentication → Sign-in
     method → ative o provedor **"E-mail/senha"**.
   - Crie a conta do admin: Authentication → Users → **Add user**, com o
     e-mail e senha que a pessoa vai usar para entrar no painel. Repita
     para cada pessoa que precisar de acesso.
   - Gere a credencial do backend: **Configurações do projeto** (ícone de
     engrenagem) → **Contas de serviço** → **Gerar nova chave privada**.
     Isso baixa um arquivo `.json` — guarde-o, ele não pode ser baixado de
     novo (só gerar outro).

3. **Configurar as variáveis de ambiente**
   Em **Settings → Environment Variables** no Vercel, adicione, usando
   **uma** das duas opções abaixo para a credencial do Firebase:

   - **Opção A — sem rodar comando nenhum:** abra o arquivo `.json` baixado
     (em qualquer editor de texto ou app de notas) e copie três campos dele
     para três variáveis separadas:
     - `FIREBASE_PROJECT_ID` = valor do campo `project_id`
     - `FIREBASE_CLIENT_EMAIL` = valor do campo `client_email`
     - `FIREBASE_PRIVATE_KEY` = valor do campo `private_key` (cole exatamente
       como está, incluindo os `\n`)
   - **Opção B — se tiver como rodar um comando** (`npm run encode-firebase-key
     -- caminho/do/arquivo.json`): cole o resultado em uma única variável,
     `FIREBASE_SERVICE_ACCOUNT_BASE64`.

   E sempre adicione também:
   - `SESSION_SECRET` — valor aleatório forte (ex: `openssl rand -hex 32`)
   - `ADMIN_EMAILS` (opcional) — lista separada por vírgula dos e-mails que
     podem acessar o painel (ex: `pessoa1@gmail.com,pessoa2@gmail.com`). Se
     deixar em branco, qualquer usuário cadastrado no Firebase Authentication
     do projeto pode entrar.

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

Não é necessário ter o Firebase configurado para testar o formulário e o
armazenamento localmente: se nenhuma credencial de backend for encontrada, o
backend salva os leads automaticamente em um arquivo temporário (`lib/db.js`),
só para desenvolvimento. **O login do admin, porém, sempre depende do
Firebase Authentication de verdade** (não tem fallback local), então para
testar a tela de login é preciso ter o Firebase configurado como no passo 2
acima.

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Crie um `.env.local` com pelo menos `SESSION_SECRET`:

   ```bash
   cp .env.example .env.local
   ```

   Defina `SESSION_SECRET` (ex: `openssl rand -hex 32`) e, se quiser testar
   o login, preencha também as variáveis do Firebase (ver passo 3 acima).

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
     o arquivo local ou o Firestore para os leads, e se a conexão está OK

Quando quiser testar com as credenciais de verdade localmente, rode
`npx vercel link && npx vercel env pull .env.local` para puxar as variáveis
já configuradas no Vercel.

## Segurança do painel administrativo

- O login é feito com e-mail e senha reais, verificados pelo **Firebase
  Authentication** — a senha nunca passa pelo nosso servidor nem é
  armazenada por nós; quem cuida disso é o Firebase.
- Só existem contas para quem foi cadastrado manualmente em Firebase Console
  → Authentication → Users. Não há tela de cadastro público — ninguém cria
  conta sozinho.
- `ADMIN_EMAILS` (opcional) adiciona uma segunda trava: mesmo alguém com
  conta no Firebase Authentication do projeto só entra no painel se o
  e-mail estiver nessa lista. Útil se o mesmo projeto Firebase for usado
  para outra coisa também.
- Depois que o Firebase confirma o login, nosso backend verifica o token
  (`firebase-admin`) e então emite seu próprio cookie de sessão (JWT,
  `httpOnly`, válido por 4 horas) — as rotas `/api/admin/leads`,
  `/api/admin/export-xlsx` e `/api/admin/export-pdf` exigem esse cookie;
  sem ele, a API responde `401`.
- O formulário público tem um campo "honeypot" invisível para reduzir spam
  de bots simples. Para um filtro mais robusto contra abuso (rate limit
  real), considere ativar o **Vercel Firewall / Attack Challenge Mode** no
  dashboard.

## Estrutura do projeto

```
public/
  index.html            Página pública de captura de leads
  admin/
    index.html           Login do admin (e-mail/senha via Firebase Auth)
    dashboard.html         Painel com a lista de leads
  css/, js/, images/       Estilos, scripts e imagens da campanha
  js/firebase-config.js    Configuração pública do app Firebase (client-side)
api/
  leads.js                 POST /api/leads — cadastro público
  admin/
    login.js                POST /api/admin/login — verifica o token do Firebase
    logout.js               POST /api/admin/logout
    session.js               GET /api/admin/session
    leads.js                  GET /api/admin/leads (protegido)
    export-xlsx.js             GET /api/admin/export-xlsx (protegido)
    export-pdf.js               GET /api/admin/export-pdf (protegido)
  health.js                  GET /api/health — diagnóstico de configuração
lib/
  firebase.js               Inicialização compartilhada do firebase-admin
  db.js                      Acesso ao Firestore (leads) + fallback local
  firebase-auth.js            Verifica o ID token do Firebase Authentication
  auth.js                      Cookie JWT de sessão do admin
  validate-lead.js               Validação dos campos do formulário
  courses.js                     Lista de cursos de interesse
scripts/
  encode-firebase-key.js       Converte o .json da conta de serviço em base64
  init-db.js                    Testa a conexão com o Firestore
```
