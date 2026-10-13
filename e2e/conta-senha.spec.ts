import { expect, test } from '@playwright/test';
import { apiAutenticada, entrar, senha } from './helpers';

test.beforeEach(() => {
  test.skip(process.env.RUN_E2E !== 'true', 'Execute com backend E2E isolado.');
});

test('troca senha pela tela, rejeita a anterior e permite novo login preservando o acesso do dono', async ({ page }) => {
  const api = await apiAutenticada();
  const novaSenha = `${senha}Nova1`;
  let alterada = false;
  try {
    await entrar(page);
    await page.goto('/configuracoes/conta');
    await page.getByRole('button', { name: 'Alterar', exact: true }).click();
    await page.getByLabel('Senha atual', { exact: true }).fill(senha);
    await page.getByLabel('Nova senha', { exact: true }).fill(novaSenha);
    await page.getByLabel('Confirmar nova senha', { exact: true }).fill(novaSenha);
    const gravacao = page.waitForResponse(r => r.request().method() === 'PUT' && r.url().endsWith('/auth/alterar-senha'));
    await page.getByRole('button', { name: 'Salvar', exact: true }).click();
    expect((await gravacao).status()).toBe(200);
    alterada = true;
    await expect(page.getByText('Senha alterada com sucesso.', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Senha atual', { exact: true })).toHaveCount(0);

    await page.getByRole('button', { name: 'Voltar', exact: true }).click();
    await page.getByRole('button', { name: 'Sair da conta', exact: true }).click();
    await page.getByTestId('confirmation-submit').click();
    await expect(page).toHaveURL(/\/login$/);
    expect(await page.evaluate(() => localStorage.getItem('@nhac:token'))).toBeNull();

    await page.getByTestId('e2e.login.email').fill('e2e.lojista@nhac.local');
    await page.getByTestId('e2e.login.password').fill(senha);
    await page.getByTestId('e2e.login.submit').click();
    await expect(page.getByRole('alert', { name: 'Não conseguimos entrar' })).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('@nhac:token'))).toBeNull();

    await entrar(page, 'e2e.lojista@nhac.local', novaSenha);
    await page.goto('/configuracoes');
    await expect(page.getByRole('button', { name: 'Nome, categoria e descrição', exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('button', { name: 'Nome, categoria e descrição', exact: true })).toBeVisible();
    await expect(page.getByText('Acesso Negado', { exact: true })).toHaveCount(0);
  } finally {
    if (alterada) {
      const restauracao = await api.put('auth/alterar-senha', { data: { senhaAtual: novaSenha, novaSenha: senha } });
      expect(restauracao.status()).toBe(200);
    }
    await api.dispose();
  }
});
