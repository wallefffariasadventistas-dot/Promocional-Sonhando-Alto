# Plataforma de Aulas — Formação de Colportores

Área de membros (estilo Hotmart) para os alunos assistirem às aulas, com
progresso automático, e um painel para o administrador. Roda como site
estático dentro deste mesmo projeto e usa o mesmo Firebase (Authentication
e-mail/senha + Firestore). Não precisa de servidor.

## Modo local (atual, para testes)

Por enquanto a plataforma roda **sem Firebase e sem senha**: `public/aulas/js/modo.js`
está com `AULAS_MODO_LOCAL = true`. Tudo é salvo no `localStorage` do navegador,
começando com dados de demonstração (3 módulos, 7 aulas, 1 cadastro pendente).
Na tela de entrada há os botões **Entrar como aluno** e **Entrar como
administrador**, e "Restaurar dados de demonstração".

Para ir ao modo online depois, mude para `false` e siga a configuração do
Firebase abaixo (o login por e-mail/senha reaparece sozinho).

## Páginas

| Endereço | Quem usa | O que faz |
|---|---|---|
| `/aulas/` | todos | Entrar / criar conta / esqueci a senha |
| `/aulas/pendente.html` | aluno novo | Aguardando aprovação (libera sozinha ao ser aprovado) |
| `/aulas/aluno.html` | aluno | Módulos, aulas, player, "Continuar de onde parei", progresso |
| `/aulas/admin.html` | admin | Painel, módulos, aulas, alunos, configurações |

## Configuração única no Firebase Console

1. **Authentication → Sign-in method** → ative **E-mail/senha**.
2. **Authentication → Settings → Authorized domains** → confirme o domínio do site.
3. **Firestore → Rules** → cole o conteúdo de `firestore.rules` (na raiz do
   repositório) e publique. Ele já inclui as regras dos leads.
4. **Crie a conta do administrador primeiro**: abra `/aulas/`, "Criar conta"
   com o e-mail que está em `ADMIN_EMAILS` (`public/aulas/js/core.js`) e nas
   regras. Esse e-mail vira administrador automaticamente. Faça isso antes de
   divulgar o link. Para trocar/adicionar admins iniciais, edite a lista nos
   dois lugares (código e regras). Depois, qualquer aluno pode ser promovido
   em **Alunos → Tornar admin**.

## Como o administrador trabalha

- **Módulos**: criar, editar, ordenar (▲▼), publicar/ocultar, excluir.
- **Aulas**: título, módulo, descrição, duração, materiais de apoio e o link
  do vídeo (YouTube, Vimeo, Google Drive ou arquivo `.mp4`). Recomendado:
  YouTube "não listado" — a aula é marcada como concluída sozinha quando o
  vídeo termina. Nos outros formatos o aluno usa o botão "Marcar como concluída".
- **Alunos**: aprovar/recusar cadastros pendentes, bloquear/desbloquear,
  cadastrar aluno manualmente, ver o progresso de cada um, promover a admin.
- **Configurações**: nome, subtítulo, cor de destaque, logo, imagem de fundo,
  mensagem de espera, rodapé e abrir/fechar o auto-cadastro.

## Como o aluno usa

Cria a conta → espera a aprovação → vê os módulos com barra de progresso →
assiste às aulas (as concluídas ficam com ✓) → acompanha tudo em "Meu progresso".

## Dados no Firestore

`users/{uid}` (nome, email, telefone, status `pending|approved|blocked`, role
`student|admin`) · `users/{uid}/progresso/{aulaId}` · `modulos/{id}` ·
`aulas/{id}` · `config/plataforma`.

## Limitações conhecidas

- Os vídeos ficam hospedados fora (YouTube etc.); a plataforma não faz upload.
  Um link "não listado" pode ser repassado por quem o vir — para conteúdo
  realmente restrito seria preciso um serviço de vídeo com proteção (Vimeo
  privado, Bunny Stream etc.).
- Excluir um aluno remove o perfil, mas a conta de login continua existindo
  no Firebase Authentication (sem perfil ela não acessa nada).
