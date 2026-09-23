# Auditoria de integração e conclusão operacional

Data: 23/09/2026. Bases analisadas: backend `ea6984a2c44be405df54993db0c4daf82084290e`; web `94031b1f18990db43f5a0a856b8fd9ea8a8821e3`.

## Contratos verificados no código Java

- LojistaController/LojistaService: consultas de produtos ativos/inativos e pedidos vinculados, Page Spring, filtros categoria/nome/status.
- LojaController/LojaCreateDTO/LojaDetalhesDTO: minha-loja, atualização completa e abertura por PATCH. Horários e operação podem ser editados sem criar endpoints.
- FuncionarioService: criar, atualizar, desativar e reativar; cargo é rótulo e mutações exclusivas do dono. Listagem paginada; sem GET individual.
- ChatController/ChatDTOs: paginação, conversas CLIENTE/ENTREGADOR, mensagem até 4000 caracteres, histórico DESC e marcação de leitura.
- PedidoService: ownership, transições, cancelamento e evento de despacho após iniciar preparo.
- SecurityFilter: usuário desativado não autentica mesmo com token; contexto limpo após request.
- PainelService/FinanceiroService: métricas calculadas pelo servidor. A interface não recalcula dinheiro nem inventa resposta de pagamento.

## Problemas corrigidos

1. Rota de edição de funcionário inexistente; busca apenas na primeira página.
2. Listas truncadas em 100 registros, filtros aplicados só no subconjunto local.
3. Pedidos/painel sem atualização periódica e filtro de cancelados ausente.
4. subscribe/publish STOMP antes de conectar, perda de assinaturas após reconexão e respostas antigas misturadas ao trocar conversas.
5. Sem acesso às mensagens anteriores; ausência de rótulo do entregador.
6. Confirmações repetíveis, sem foco modal nativo; labels de campos desconectados.
7. Campos de operação sem edição após onboarding; formas de pagamento sem operação por teclado.
8. Alteração fictícia de cargo pelo menu; sessão local malformada quebrando inicialização.
9. Erro padronizado errorCode descartado; seleção de período financeiro sujeita a resposta antiga.
10. CI buscando branch homônima inexistente no repositório do backend.

## Riscos de produto encontrados no backend

- O contrato de login não informa cargo, e cargo não implementa autorização no servidor. Não se pode prometer isolamento de gerente/atendente sem mudança coordenada de política, DTOs, autorização e testes. Nenhuma regra de privilégio foi inventada nesta alteração.
- O fluxo de entregador está separado do status genérico de pedido; o painel preserva essa divisão. Entrega própria/retirada não receberam novos estados inventados.
- Cancelamento não representa um estorno externo garantido. A validação de pagamento real depende dos provedores configurados.
- Detalhe lojista não expõe desconto de cupom separado; o valorTotal continua sendo o retornado pelo servidor.
- Painel contabiliza pedidos não cancelados no faturamento, incluindo pendentes. Uma definição alternativa de receita precisa de regra de negócio explícita.

## Verificação

Executar lint, suíte Jest, build e auditoria estática premium. E2E de navegador cobre respostas controladas e o workflow cobre backend real. Resultados efetivamente executados constam no PR; testes escritos ou static audit não equivalem a integração real aprovada.

Não classificar como “100% funcional em produção” antes do E2E com backend/MariaDB e da validação dos serviços externos e permissões por cargo.

## Resultados locais desta implementação

- Frontend: `npm run lint` e `npm run build` aprovados.
- Jest: 4 suítes, 13 testes aprovados (API, socket, controles e transições).
- Auditoria premium em modo strict: zero violações.
- Backend: `mvn -DskipTests package` com Java 25 aprovado.
- 49 testes selecionados do backend interrompidos na inicialização do Mockito/Byte Buddy: mecanismo de agent attachment indisponível neste ambiente. Não são testes aprovados e não demonstram falha de regra de negócio.
- Cinco testes Playwright de interface não chegaram a executar cenários: Chromium encerrou ao abrir socket local com `Operation not permitted`. Nenhuma aprovação visual ou E2E é reivindicada.
- Envio ao GitHub bloqueado pela revisão automática, que exigiu autorização explícita para compartilhar código/configuração no repositório público `NhacDelivery/Nhac-lojista-web`. PR ainda não criado.
