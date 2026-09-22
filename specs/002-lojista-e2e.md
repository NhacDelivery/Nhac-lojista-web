# Spec 002 — E2E do painel do lojista

Status: EM IMPLEMENTAÇÃO
Escopo: `Nhac-lojista-web`
Dependência: `backend-nhac` com profile `e2e`
Continuação: Spec 003 do `Nhac-Motoboy`

## Objetivo

Validar com Playwright, Spring Boot real e MariaDB isolado que o lojista recebe
um pedido pago e inicia seu preparo. O teste não pode chamar produção nem
substituir o backend por mocks HTTP.

Fluxo deste slice:

`login do lojista -> lista de pedidos -> pedido PAGO -> PREPARANDO -> despacho automático`

## Fixtures

- lojista: `e2e.lojista@nhac.local`
- senha: `NhacE2E#123`
- loja: `e2e-loja-001`
- pedido: `e2e-pedido-lojista-001`
- status inicial: `PAGO`

As fixtures existem apenas no profile Spring `e2e` e o banco deve nascer
limpo em cada execução.

## Responsabilidade dos status

- o lojista pode confirmar `PENDENTE -> PAGO` quando a forma de pagamento exigir;
- o lojista pode iniciar `PAGO -> PREPARANDO`;
- o backend dispara ofertas de entrega ao entrar em `PREPARANDO`;
- somente o entregador coleta (`PREPARANDO -> SAIU_ENTREGA`);
- somente o entregador conclui (`SAIU_ENTREGA -> ENTREGUE`);
- o painel do lojista apenas acompanha as duas últimas mudanças.

## Cenário LOJISTA-E2E-001

Given um lojista autenticável, sua loja e um pedido `PAGO` determinístico.

When o lojista abre o pedido e confirma "Iniciar preparo".

Then o backend persiste `PREPARANDO`, o painel exibe o novo status, não oferece
botão para marcar saída/entrega e informa que aguarda o entregador.

## Guard rails

- `RUN_E2E=true` é obrigatório;
- frontend e backend devem apontar somente para localhost;
- nenhum segredo real deve ser commitado;
- Playwright deve usar `data-testid`, não posição visual ou texto como seletor principal;
- falhas devem preservar trace, screenshot e vídeo no CI.

## Próximos slices

1. notificação e atualização automática de pedido novo;
2. reenvio manual do despacho sem entregador disponível;
3. acompanhamento do aceite e coleta pelo motoboy;
4. E2E multiaplicação cliente -> lojista -> motoboy -> cliente.
