# Sonhando Alto — Página de Captura de Leads

Landing page de divulgação do projeto **Sonhando Alto** (25 anos) com um
formulário de captura de leads e um painel administrativo protegido por
login para visualizar e exportar os dados recebidos.

Domínio oficial: **sonhandoalto.mpi.org.br**.

## Como funciona (site 100% estático, sem servidor)

Este site não tem backend: é só HTML/CSS/JS estático, e tudo o que precisa
de "inteligência" (salvar os leads, fazer login, decidir quem pode ver os
dados) é feito **direto no navegador**, falando com o **Firebase**:

- **Firestore**: banco de dados onde os leads ficam salvos.
- **Firebase Authentication**: login do painel admin ("Entrar com Google").
- **Regras de segurança do Firestore**: decidem quem pode ler os dados —
  configuradas dentro do próprio Firebase Console, não no Vercel.

Por isso **não é necessário configurar nenhuma variável de ambiente no
Vercel**. Toda a configuração acontece no Firebase Console.

## Plataforma de aulas (`/aulas/`)

Área de membros para a formação de colportores (login, módulos, aulas em
vídeo, progresso e painel do administrador). Veja
[`public/aulas/README.md`](public/aulas/README.md). As regras completas do
Firestore (leads + plataforma) estão em [`firestore.rules`](firestore.rules).

## O que tem aqui

- **Página pública** (`/`): apresenta a campanha "Play no Futuro!" com um
  formulário que coleta **Nome, Telefone, Idade, Curso de interesse, Cidade
  e Distrito** e grava direto numa coleção `leads` no Firestore.
- **Painel administrativo** (`/admin/`): botão **"Entrar com Google"**. Lista
  os leads (lidos direto do Firestore), permite buscar e baixar os dados em
  **Excel (.xlsx)** ou **PDF** — os arquivos são gerados no próprio
  navegador (bibliotecas SheetJS e jsPDF), sem passar por nenhum servidor.

## Configuração no Firebase Console (única configuração necessária)

Acesse [console.firebase.google.com](https://console.firebase.google.com) →
seu projeto (`promocional-sonhando-alto`):

1. **Authentication → Sign-in method** → ative o provedor **"Google"**
   (se ainda não tiver ativado).
2. **Authentication → Settings → Authorized domains** → adicione o(s)
   domínio(s) onde o site fica publicado (ex:
   `promocional-sonhando-alto.vercel.app` e `sonhandoalto.mpi.org.br`).
3. **Firestore Database** → crie o banco, se ainda não existir (modo
   produção).
4. **Firestore Database → Rules** → cole as regras abaixo, trocando o
   e-mail de exemplo pelo(s) e-mail(s) de quem deve ter acesso ao painel
   (pode listar mais de um, separado por vírgula):

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /leads/{leadId} {
         allow create: if request.resource.data.keys().hasOnly(
                           ['nome', 'telefone', 'idade', 'curso', 'cidade', 'distrito', 'created_at']
                         )
                       && request.resource.data.nome is string
                       && request.resource.data.nome.size() > 0
                       && request.resource.data.nome.size() <= 150
                       && request.resource.data.telefone is string
                       && request.resource.data.telefone.size() > 0
                       && request.resource.data.telefone.size() <= 30
                       && request.resource.data.idade is number
                       && request.resource.data.idade >= 10
                       && request.resource.data.idade <= 100
                       && request.resource.data.curso is string
                       && request.resource.data.cidade is string
                       && request.resource.data.cidade.size() <= 100
                       && request.resource.data.distrito is string
                       && request.resource.data.distrito.size() <= 100
                       && request.resource.data.created_at == request.time;

         allow read: if request.auth != null
                     && request.auth.token.email in ['seu-email@gmail.com'];

         allow update, delete: if false;
       }
     }
   }
   ```

   Clique em **"Publicar"** depois de colar.

   - A primeira parte (`allow create`) deixa qualquer pessoa cadastrar um
     lead pelo formulário público, mas só aceita documentos com exatamente
     os campos esperados e dentro de limites razoáveis de tamanho — uma
     proteção básica contra spam/abuso.
   - A segunda parte (`allow read`) só deixa **quem estiver na lista de
     e-mails** ler os dados — é isso que protege o painel admin.
   - Ninguém pode editar ou apagar um lead depois de criado
     (`allow update, delete: if false`).

Pronto — sem isso configurado, o formulário público não consegue salvar
nada, e ninguém (nem você) consegue ver os dados no painel.

## Implantação no Vercel

Como é um site estático, a implantação é só:

1. No [dashboard do Vercel](https://vercel.com/new), "Add New… → Project",
   selecione este repositório do GitHub
   (`wallefffariasadventistas-dot/Promocional-Sonhando-Alto`) e conecte o
   branch desejado.
2. Não precisa configurar build command, output directory nem nenhuma
   variável de ambiente — o Vercel detecta que é estático e serve a pasta
   `public/` diretamente.
3. Em **Settings → Domains**, adicione `sonhandoalto.mpi.org.br` e siga as
   instruções de DNS que o Vercel mostra. Lembre-se de adicionar esse
   domínio também em Authorized domains no Firebase (passo 2 acima).

## Como testar localmente

Não precisa de Node, `npm install` nem nada parecido — é só abrir os
arquivos com qualquer servidor estático simples. Por exemplo:

```bash
cd public
python3 -m http.server 8000
```

E acessar http://localhost:8000. Para o login funcionar, adicione
`localhost` em Authorized domains no Firebase também.

## Segurança do painel administrativo

- O login é feito com **Google** (Firebase Authentication) — nenhuma senha
  passa por este site.
- Quem pode **ler** os leads é decidido pelas regras do Firestore (acima),
  não pelo código do site — mesmo que alguém copie o código-fonte da
  página, não consegue ler os dados sem estar na lista de e-mails
  autorizados.
- O `apiKey` do Firebase que aparece em `public/js/firebase-config.js` não
  é secreto — é a configuração pública normal de qualquer app Firebase; a
  segurança de verdade está nas regras do Firestore, não em escondê-lo.
- Para adicionar ou remover quem tem acesso ao painel, edite a lista de
  e-mails na regra `allow read` no Firebase Console e publique de novo —
  não precisa mexer no código nem fazer novo deploy.

## Estrutura do projeto

```
public/
  index.html               Página pública de captura de leads
  admin/
    index.html               Login do admin ("Entrar com Google")
    dashboard.html             Painel com a lista de leads
  css/, images/                Estilos e imagens da campanha
  js/
    firebase-config.js          Configuração pública do app Firebase
    main.js                      Formulário público -> grava no Firestore
    admin-login.js                Login com Google (Firebase Authentication)
    admin.js                       Lista os leads e gera os exports (Excel/PDF)
```
