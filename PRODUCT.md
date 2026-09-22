# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Lojistas (dono da loja) e sua equipe — cargos `administrador`, `gerente` e `atendente` — que operam uma loja/restaurant dentro da plataforma Nhac. Situação de uso: trabalho diário durante o serviço, com foco em desktop e uso real também em navegador mobile (atendente no balcão). Job: rodar a loja de ponta a ponta sem sair do painel. *(Papel, cargos e situações inferidos do código: rotas por cargo em `src/App.tsx`, navegação em `src/components/layout/BarraLateral.tsx`; escopo de uso confirmado pelo usuário na rodada de init.)*

## Product Purpose

Painel do lojista ( Nhac Lojas ) do app de delivery Nhac: o painel operacional onde a loja é gerida — pedidos em tempo real, catálogo de produtos, chat com clientes, equipe, financeiro e configurações da loja. Sucesso = o lojista conclui a operação do dia inteiro (receber, preparar e entregar pedidos; atualizar cardápio; responder clientes; ver o financeiro) em uma única tela de trabalho. *(Inferido das rotas e páginas existentes; escopo e preservação de funcionalidade confirmados pelo usuário.)*

## Positioning

É o lado operacional da mesma marca Nhac: enquanto o app Flutter (`/workspaces/Nhac`) é a face do cliente pedindo comida, este web é a face da loja atendendo — mesma marca, mesma verdade de produto, funções espelhadas (pedidos, chat, cardápio). Um painel genérico de delivery não tem essa dupla-consumidor/loja sob uma identidade só. *(Inferido dos dois repositórios e da solicitação do usuário de alinhar o painel ao app.)*

## Operating Context

- Uso repetido e denso durante horário de serviço: o painel fica aberto o dia todo, escaneado de relance e operado com poucos cliques.
- Dois ambientes de tela: desktop largo (sidebar fixa) e navegador mobile (barra inferior), com o mesmo conteúdo.
- Backend REST (`src/services/api.ts`, base em `.env`) e chat em tempo real via STOMP/SockJS (`src/services/chatSocket.ts`); parte das telas ainda consome dados locais de demonstração em `src/dados/` (pedidos, produtos, financeiro, funcionários, conversas, loja, categorias).
- Idioma e cópia: português do Brasil em toda a interface.
- Time de desenvolvimento pequeno; ferramentas: CRA (react-scripts 5), lint via `tsc --noEmit && eslint .`, testes unitários Jest/Testing Library e e2e Playwright (`npm run test:e2e`).

## Capabilities and Constraints

- Rotas e funções preservadas tal como estão: login/cadastro/recuperação de senha, onboarding de loja, painel, pedidos (lista + detalhe), produtos (lista + formulário), chat, funcionários (lista + formulário), financeiro, configurações (informações, edição, conta, endereço, formas de pagamento), com controle de acesso por cargo.
- Confirmação do usuário (rodada de init): o redesign é de escopo total — todas as páginas e o shell — e **não altera funcionalidade, rotas, cópias nem dados**; a mudança é visual.
- Perfis por cargo restringem navegação e acesso; `administrador` vê tudo, `gerente` opera painel/pedidos/produtos/chat, `atendente` opera pedidos/chat.
- Limitação técnica: nenhum gerador de imagem disponível no ambiente; construir direto em código (code-led).
- Decisão em aberto registrada: nenhuma além das já marcadas acima.

## Brand Commitments

- Nome: **Nhac**; no painel, a marca aparece hoje como "Nhac Lojas" (`src/components/layout/BarraLateral.tsx`).
- Ativos de marca confirmados em `public/`: `nhac-logo.png` (logo oficial, usado em favicon, sidebar e autenticação) e `favicon.ico`.
- Referência de identidade explícita e vinculante do usuário: o painel deve ter o **mesmo design do app Nhac** (`/workspaces/Nhac`), ser **único** e **não parecer feito por IA**. Manual da marca e projeto Figma do Nhac: https://www.figma.com/design/VEpDtQ9u5xsytcx7K7M0sU/Projeto-Nhac (linkado no README do app).
- Personalidade da marca (evidência do app): nome/símbolo em letra bolha com garfo, delivery de comida próximo e descomplicado ("O Nhac que sua fome pedia"). *(Personalidade inferida do logo e da copy do app.)*

## Evidence on Hand

- App consumidor Flutter em `/workspaces/Nhac`: tema em `lib/globals/themes.dart`, componentes de marca em `lib/components/` (logo, botões, menu, cards), ativos em `assets/` (logo, ilustrações, animações Lottie), capturas em `readme/` (`banner.jpg`, GIFs dos fluxos), README com link do Figma.
- Painel atual em `src/`: sistema de tokens em `src/styles/tema.css`, componentes UI em `src/components/ui/`, layouts em `src/components/layout/`, 6 páginas de domínio + autenticação, dados de demonstração em `src/dados/`.
- E2E Playwright em `e2e/`, config em `playwright.config.ts`; histórico de rodadas em `src/CHANGES_ROUND_20*.md`.
- Ausências que trabalho futuro não deve inventar: não existe DESIGN.md nem PRODUCT.md antes desta rodada; não há métricas de uso, depoimentos, preços ou números de negócio no repositório.

## Product Principles

1. A operação vem primeiro: toda mudança preserva a capacidade de escanear e agir rápido durante o serviço.
2. Uma marca, dois lados: o painel pertence ao mesmo Nhac que o app do cliente — identidade não se diverge entre eles.
3. Função é verdade de produto: rotas, regras de cargo, cópias e dados não mudam por decisões de design.
4. Três cargos, uma ferramenta: o que cada tela mostra é governado pelo papel de quem está logado.
5. Mobile browser é uso real (atendente no balcão), não um afterthought.