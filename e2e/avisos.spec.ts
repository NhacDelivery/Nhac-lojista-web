import { test, expect, Page } from '@playwright/test';

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+yTzUAAAAASUVORK5CYII=', 'base64');
async function interceptar(page: Page, falhaRegistro = 'Este telefone já está em uso.') {
  await page.route('**/api/v1/**', async route => {
    const url = route.request().url();
    if (url.endsWith('/auth/checar-email')) return route.fulfill({ json: { existe: false } });
    if (url.endsWith('/auth/registrar')) return route.fulfill({ status: 400, json: { status: 400, error: 'REGRA_DE_NEGOCIO', message: falhaRegistro, details: {} } });
    if (url.endsWith('/auth/login')) return route.fulfill({ status: 401, json: { status: 401, error: 'CREDENCIAIS_INVALIDAS', message: 'E-mail não encontrado ou senha inválida.' } });
    return route.fulfill({ status: 200, body: '', contentType: 'application/json' });
  });
  await page.route('https://viacep.com.br/**', route => route.fulfill({ json: { cep: '01001-000', logradouro: 'Praça da Sé', bairro: 'Sé', localidade: 'São Paulo', uf: 'SP' } }));
}
async function preencherCadastro(page: Page) {
  await page.goto('/cadastro');
  await page.getByLabel('Nome Completo').fill('Pessoa de Teste');
  await page.getByLabel(/^E-mail/).fill('cadastro@exemplo.local');
  await page.getByRole('textbox', { name: /^Telefone/ }).fill('11988887777');
  await page.getByLabel(/^Senha(\s|$)/).fill('Teste12345');
  await page.getByLabel('Confirmar Senha').fill('Teste12345');
  await page.getByText('Aceito os termos de uso e a política de privacidade (LGPD)', { exact: true }).click();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByLabel('Código de verificação').fill('123456');
  await page.getByLabel('Nome da Loja').fill('Loja preservada');
  await page.getByLabel('Categoria Principal').selectOption({ index: 1 });
  await page.getByPlaceholder('Fale um pouco sobre sua loja e o que você oferece...').fill('Lanches preparados para os testes de cadastro.');
  await page.getByLabel('Logo da Loja').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: png });
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByLabel(/^CEP/).fill('01001000');
  await expect(page.getByLabel(/^Rua/)).toHaveValue('Praça da Sé');
  await page.getByLabel(/^Número/).fill('1');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByText('Dinheiro', { exact: true }).click();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
}
test('telefone já utilizado volta ao campo, mantém loja e mostra recuperação', async ({ page }) => {
  await interceptar(page);
  await preencherCadastro(page);
  await page.getByRole('button', { name: 'Confirmar e Finalizar' }).click();
  await expect(page.getByRole('alert')).toHaveAccessibleName('Telefone já utilizado');
  await expect(page.getByRole('textbox', { name: /^Telefone/ })).toBeFocused();
  await expect(page.getByLabel(/^E-mail/)).toHaveValue('cadastro@exemplo.local');
  await expect(page.getByRole('link', { name: 'Recuperar senha', exact: true })).toHaveAttribute('href', '/recuperar-senha');
  await page.screenshot({ path: 'test-results/avisos-telefone.png', fullPage: true });
  await page.getByRole('textbox', { name: /^Telefone/ }).fill('11977776666');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(page.getByLabel('Código de verificação')).toBeVisible();
  await page.getByLabel('Código de verificação').fill('123456');
  await expect(page.getByLabel('Nome da Loja')).toHaveValue('Loja preservada');
});
test('e-mail existente não redireciona nem perde o preenchimento', async ({ page }) => {
  await interceptar(page);
  await page.route('**/auth/checar-email', route => route.fulfill({ json: { existe: true } }));
  await page.goto('/cadastro');
  await page.getByLabel('Nome Completo').fill('Nome preservado');
  await page.getByLabel(/^E-mail/).fill('existente@exemplo.local');
  await page.getByRole('textbox', { name: /^Telefone/ }).fill('11988887777');
  await page.getByLabel(/^Senha(\s|$)/).fill('Teste12345');
  await page.getByLabel('Confirmar Senha').fill('Teste12345');
  await page.getByText('Aceito os termos de uso e a política de privacidade (LGPD)', { exact: true }).click();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(page).toHaveURL(/cadastro$/);
  await expect(page.getByRole('alert')).toHaveAccessibleName('E-mail já cadastrado');
  await expect(page.getByLabel('Nome Completo')).toHaveValue('Nome preservado');
});
test('login negado é acessível e mantém o e-mail em uma tela estreita', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await interceptar(page);
  await page.goto('/login');
  await page.getByLabel(/^E-mail/).fill('pessoa@exemplo.local');
  await page.getByLabel(/^Senha(\s|$)/).fill('Teste12345');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveAccessibleName('Não conseguimos entrar');
  await expect(page.getByLabel(/^E-mail/)).toHaveValue('pessoa@exemplo.local');
  const largura = await page.evaluate(() => ({ pagina: document.documentElement.scrollWidth, janela: innerWidth }));
  expect(largura.pagina).toBeLessThanOrEqual(largura.janela);
  await page.screenshot({ path: 'test-results/avisos-login-mobile.png', fullPage: true });
});
test('sem conexão explica recuperação e não mostra Failed to fetch', async ({ page }) => {
  await page.route('**/api/v1/**', route => route.abort('failed'));
  await page.goto('/login');
  await page.getByLabel(/^E-mail/).fill('pessoa@exemplo.local');
  await page.getByLabel(/^Senha(\s|$)/).fill('Teste12345');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveAccessibleName('Não conseguimos conectar');
  await expect(page.getByRole('alert')).not.toContainText('Failed to fetch');
});

test('cadastro concluído atualiza papel e abre configurações sem sair da conta', async ({ page }) => {
  await interceptar(page);
  let loja: Record<string, unknown> | null = null;
  await page.route('**/api/v1/**', async route => {
    const url = route.request().url();
    if (url.endsWith('/auth/registrar')) return route.fulfill({ json: { accessToken: 'token-teste', usuarioId: 'novo-dono', nome: 'Pessoa de Teste', papel: 'CLIENTE' } });
    if (url.endsWith('/uploads/imagem')) return route.fulfill({ json: { url: 'https://exemplo.local/logo.png' } });
    if (url.endsWith('/lojas') && route.request().method() === 'POST') {
      loja = { ...route.request().postDataJSON(), id: 'loja-teste' };
      return route.fulfill({ json: { id: 'loja-teste' } });
    }
    if (url.endsWith('/usuarios/novo-dono')) return route.fulfill({ json: { id: 'novo-dono', nome: 'Pessoa de Teste', email: 'cadastro@exemplo.local', telefone: '11988887777', papel: loja ? 'LOJISTA' : 'CLIENTE', cargo: null } });
    if (url.endsWith('/lojas/minha-loja')) return loja ? route.fulfill({ json: loja }) : route.fulfill({ status: 404, json: { status: 404, error: 'LOJA_NAO_ENCONTRADA', message: 'Loja não encontrada.' } });
    return route.fallback();
  });
  await preencherCadastro(page);
  await page.getByRole('button', { name: 'Confirmar e Finalizar' }).click();
  await expect(page.getByRole('button', { name: 'Ir para o painel' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('@nhac:usuario') || '{}').papel)).toBe('LOJISTA');
  await page.goto('/configuracoes');
  await expect(page.getByRole('button', { name: 'Nome, categoria e descrição' })).toBeVisible();
  await expect(page.getByText('Acesso Negado', { exact: true })).toHaveCount(0);
});
