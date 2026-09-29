import { expect, test } from '@playwright/test';

const LOJISTA_EMAIL = 'e2e.lojista@nhac.local';
const LOJISTA_PASSWORD = 'NhacE2E#123';
const PEDIDO_ID = 'e2e-pedido-lojista-001';

async function entrar(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.getByTestId('e2e.login.email').fill(LOJISTA_EMAIL);
  await page.getByTestId('e2e.login.password').fill(LOJISTA_PASSWORD);
  await page.getByTestId('e2e.login.submit').click();
  await expect(page).toHaveURL(/\/$/);
}

test('lojista recebe pedido pago e inicia o preparo', async ({ page }) => {
  test.skip(process.env.RUN_E2E !== 'true', 'RUN_E2E=true é obrigatório.');
  await entrar(page);
  await page.goto('/pedidos');
  await expect(page.getByTestId('e2e.orders.root')).toBeVisible();

  const pedido = page.getByTestId(`e2e.order.${PEDIDO_ID}`);
  await expect(pedido).toBeVisible();
  await expect(page.getByTestId(`e2e.order.${PEDIDO_ID}.status`)).toContainText('Pago');
  await pedido.click();

  await expect(page.getByTestId('e2e.order.detail')).toBeVisible();
  await expect(page.getByTestId('e2e.order.status')).toContainText('Pago');
  await page.getByTestId('e2e.order.advance').click();
  await page.getByTestId('confirmation-submit').click();

  await expect(page.getByTestId('e2e.order.status')).toContainText('Em preparo');
  await expect(page.getByTestId('e2e.order.delivery-state')).toContainText(
    'Aguardando um entregador aceitar e coletar',
  );
  await expect(page.getByTestId('e2e.order.advance')).toHaveCount(0);

  await page.getByTestId('e2e.order.redispatch').click();
  await expect(page.getByRole('alert')).toContainText('Nenhum entregador disponível neste momento.');
});

test('cadastro de produto omite estoque e a conta solicita a senha atual', async ({ page }) => {
  test.skip(process.env.RUN_E2E !== 'true', 'RUN_E2E=true é obrigatório.');
  await entrar(page);

  await page.goto('/produtos/novo');
  await expect(page.getByText('Estoque (unidades)')).toHaveCount(0);
  await expect(page.getByText('Adicionais', { exact: true })).toHaveCount(0);

  await page.goto('/configuracoes/conta');
  await page.getByRole('button', { name: 'Alterar', exact: true }).click();
  await expect(page.getByText('Senha atual')).toBeVisible();
  await expect(page.getByText('Nova senha', { exact: true })).toBeVisible();
});
