# Contrato de experiência — Nhac Lojas

## Fontes de negócio
- PRODUCT.md: público, marca, rotas e cenário operacional. A restrição histórica de redesign apenas visual foi superada pelo pedido atual de completar funcionalidades.
- Backend `domain/lojista/LojistaController.java`: paginação de pedidos e produtos, filtros no servidor.
- Backend `domain/usuario/FuncionarioService.java`: equipe vinculada à loja, desativação lógica, mutações restritas ao dono; cargo é rótulo e não RBAC.
- Backend `domain/loja/dto/LojaCreateDTO.java`: atualização completa de cadastro, horários e operação.
- Backend `domain/chat/ChatController.java`, `dto/ChatDTOs.java`: histórico paginado, clientes/entregadores e limite de 4000 caracteres.
- `src/validators/statusPedido.ts` e E2E existente: lojista confirma pagamento/inicia preparo; coleta e conclusão pelo entregador.

## Canonical UI Map
| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
|---|---|---|---|---|
| Select/Listbox | src/components/ui/Seletor.tsx | DESIGN.md | native | label, teclado |
| Form | InputTexto, validators, services/api.ts | DTOs backend | criar/editar | lint e testes |
| Scrollbar | src/styles/global.css | tema.css | global | inspeção visual |
| Toast | src/contexts/ToastContext.tsx | este contrato | aviso de resultado | temporizador substituível |
| CRUD | App.tsx, services/api.ts | controllers backend | criar/editar/desativar/reativar | testes de API e navegador |
| Pagination | Paginacao.tsx, usePagina.ts | Page Spring | pedidos/produtos/equipe | filtros e páginas |
| Dialog | ModalConfirmacao.tsx | este contrato | confirmação de ação | foco e clique duplicado |

## Fluxos
Criar/editar retorna à lista proprietária e anuncia sucesso. Erro preserva campos e permite correção. Confirmações aguardam a promessa para impedir cliques duplicados. Desativar funcionário bloqueia acesso, reativar usa endpoint próprio.

Listas persistem página e filtros em URL. Busca remota aguarda 300 ms e composição de texto; limpar é imediato. Respostas antigas não substituem o filtro atual. Mudanças de filtro reiniciam a página. Nenhum contador representa o total se foi calculado apenas sobre uma página.

Pedidos atualizam a cada 15 segundos enquanto a aba está visível. A API continua responsável pela transição; conflitos refazem a leitura. Sem emissão automática de estorno ou conclusão de entrega pelo painel.

Chat preserva rascunho quando não conectado, restaura assinaturas e recarrega histórico ao reconectar; troca de conversa invalida resposta anterior. Histórico tem carregamento explícito de páginas anteriores. Preferir feedback honesto: publicar no socket não é comprovação de persistência no backend.

## Permissões e pendências de contrato
O backend atual retorna papel, mas não cargo no login e não implementa RBAC por cargo de funcionário. A UI histórica mapeia todos para administrador. Isso não pode ser tratado como controle de segurança; exige evolução coordenada do contrato antes de prometer permissões por cargo. O backend continua validando ownership e operações exclusivas do dono. Não inventar permissão ou estorno para contornar essas limitações.

## Locale e acessibilidade
pt-BR, BRL, datas formatadas no fuso do navegador como no produto existente. Inputs e seletores com label associado e erro descrito; controles nativos com foco visível. Formulários mantêm rolagem natural, tabelas rolam horizontalmente quando necessário. Popup do select e foco/inert do dialog são propriedade do navegador. Testar desktop, celular e teclado antes de entrega.
