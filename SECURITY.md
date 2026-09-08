# Documentação de Segurança - Gestão Água Cristal Sul

Esta documentação descreve as camadas de segurança implementadas na plataforma.

## Arquitetura de Segurança e Defesa em Profundidade

O sistema implementa **Defesa em Profundidade**, não dependendo apenas de controles do frontend (interface do usuário). A segurança primária reside nas regras rigorosas (RLS - Row Level Security) estabelecidas no **Firebase Firestore**, garantindo que:
- O usuário deve estar **autenticado** para ler ou escrever qualquer dado.
- **Autorização Baseada em Regras (RBAC):** Os dados são protegidos a nível do servidor com base no `role` ('ADMINISTRADOR', 'OPERADOR', 'VISUALIZACAO').
- Não existe uma API isolada sem validação; o frontend apenas se comunica com o Firestore respeitando as regras.

## 1. Mapeamento de Rotas
As rotas antigas baseadas apenas em estado interno foram refatoradas para utilizar uma estrutura de URL padrão e robusta com verificação de autenticação:

- **Autenticação:**
  - Login: `/auth/sign-in`
  - Cadastro: `/auth/register`
  - Recuperação: `/auth/recovery`
  - Nova Senha: `/auth/reset`

- **Sistema (Rotas Protegidas):**
  - `/app/overview`
  - `/app/sales`
  - `/app/deliveries`
  - `/app/customers`
  - `/app/drivers`
  - `/app/expenses`
  - `/app/receivables`
  - `/app/finance`
  - `/app/commissions`
  - `/app/reports`
  - `/app/monthly-closing`
  - `/app/settings`

## 2. Princípio do Menor Privilégio & RBAC

As contas possuem as seguintes restrições:
- **VISUALIZACAO (Consulta):** Possuem permissão apenas de **leitura**. No nível do Firestore, tentativas de gravação por usuários de visualização serão estritamente bloqueadas.
- **OPERADOR:** Pode ler e criar/editar os dados principais operacionais (Vendas, Clientes, Entregas).
- **ADMINISTRADOR:** Acesso total à criação de contas, edição de permissões, fechamento de meses, e alteração de parâmetros comerciais (Configurações e Logs).

## 3. Prevenção a Ataques (OWASP)

- **SQL/NoSQL Injection:** Utilização nativa do SDK do Firestore que previne injeções, impedindo a montagem e concatenação maliciosa de strings nas queries.
- **XSS (Cross-Site Scripting):** O React faz escape nativo de variáveis, impedindo XSS nas renderizações do DOM (Stored e Reflected XSS). Não utilizamos `dangerouslySetInnerHTML` com entradas de usuários.
- **CSRF:** Como o sistema é uma SPA (Single Page Application) baseada em requisições via SDK autenticadas (Token Based Auth), não possui vulnerabilidades CSRF tradicionais baseadas em manipulação de formulários baseados em sessão de Cookies HTTP não-seguros.
- **Mass Assignment e Path Traversal:** Protegido por limites e validação de permissões nos Schemas locais e regras restritivas do Firestore.
- **Brute Force e Rate Limit:** Proteção providenciada pelos serviços do Firebase Auth, controlando número de falhas no acesso.

## 4. Gerenciamento de Credenciais e Segredos

- Nenhuma chave secreta (`API_SECRET`, `PRIVATE_KEY`, etc.) está exposta no bundle client-side (frontend).
- A API do Firebase (Firebase Config) possui apenas tokens públicos desenhados para existirem na web, sua validação depende exclusivamente das **Security Rules** e **JWT Tokens**.
- O sistema possui configuração de `.gitignore` mantendo arquivos locais (`.env*`, `.local`) isolados. 
- Foi adicionado um arquivo `.env.example` sem valores reais como padrão de segurança.
- O Lockfile de dependências é respeitado para varredura e segurança do ciclo (Dependency Scanning).

## 5. Auditoria de Dados

- Existe um `AuditLog` interno que registra ações de usuários. Isso é controlado sem que um usuário normal possa apagar seu histórico. 
- Sessões expiram adequadamente e tokens do usuário (logout) limpam a sessão do App.
