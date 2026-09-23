import { test, expect, Page } from '@playwright/test';

const loja = { id: 'loja-teste', nome: 'Nhac Teste', categoria: 'Lanches', descricao: 'Loja de teste', imagemUrl: '/nhac-logo.png', isAberto: true,
  endereco: { rua: 'Rua Teste', numero: '1', bairro: 'Centro', cidade: 'Osasco', estado: 'SP', cep: '06000000' },
  horarios: Object.fromEntries(['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'].map(d => [d, '11:00 - 23:00'])),
  dadosOperacionais: { taxaEntregaBase: 5, tempoEntregaMin: 30, tempoEntregaMax: 45 },
  formasPagamento: { aceitaDinheiro: true, aceitaCredito: true, aceitaDebito: true, aceitaPix: true, aceitaValeRefeicao: false, aceitaValeAlimentacao: false },
};
const pagina = (content: unknown[], number = 0, totalPages = 1, totalElements = content.length) => ({ content, number, totalPages, totalElements, size: 20 });
const funcionario = { id: 'f1', nomeCompleto: 'Ana Teste', email: 'ana@teste.local', telefone: '11999999999', cargo: 'Gerente', ativo: true, dataCadastro: '2026-09-20T12:00:00Z' };
async function sessao(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('@nhac:token', 'token-de-teste');
    localStorage.setItem('@nhac:usuario', JSON.stringify({ id: 'u1', nomeCompleto: 'Dono Teste', cargo: 'administrador', email: 'teste@teste.local' }));
  });
  await page.route('**/api/v1/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/lojas/minha-loja')) return route.fulfill({ json: loja });
    return route.fulfill({ status: 404, json: { message: `Rota não simulada: ${path}` } });
  });
}

test('edição de funcionário abre pela rota e salva no contrato correto', async ({ page }) => {
  await sessao(page);
  await page.route('**/api/v1/lojista/funcionarios**', async route => {
    if (route.request().method() === 'PUT') {
      expect(route.request().postDataJSON()).toMatchObject({ nome: 'Ana Atualizada', cargo: 'Gerente' });
      return route.fulfill({ json: { ...funcionario, nomeCompleto: 'Ana Atualizada' } });
    }
    return route.fulfill({ json: pagina([funcionario]) });
  });
  await page.goto('/funcionarios/f1');
  await expect(page.getByLabel('Nome Completo')).toHaveValue('Ana Teste');
  await page.getByLabel('Nome Completo').fill('Ana Atualizada');
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page).toHaveURL(/\/funcionarios$/);
  await expect(page.getByRole('alert')).toContainText('Funcionário atualizado');
});

test('lista alcança páginas seguintes e filtra cancelados no servidor', async ({ page }) => {
  await sessao(page);
  await page.route('**/api/v1/lojista/pedidos?**', route => {
    const url = new URL(route.request().url());
    const numero = Number(url.searchParams.get('page'));
    const status = url.searchParams.get('status') || 'PAGO';
    return route.fulfill({ json: pagina([{ id: `p${numero}`, clienteNome: `Cliente página ${numero + 1}`, status, quantidadeItens: 1, valorTotal: 20, criadoEm: '2026-09-23T12:00:00Z' }], numero, 2, 21) });
  });
  await page.goto('/pedidos');
  await page.getByRole('button', { name: 'Próxima' }).click();
  await expect(page.getByText('Cliente página 2')).toBeVisible();
  await page.getByRole('button', { name: 'Cancelado', exact: true }).click();
  await expect(page).toHaveURL(/status=CANCELADO/);
  await expect(page.getByTestId('e2e.order.p0.status')).toHaveText('Cancelado');
});

test('modal impede duplicação, isola foco e restaura cancelamento', async ({ page }) => {
  await sessao(page);
  let chamadas = 0;
  await page.route('**/api/v1/lojista/funcionarios**', async route => {
    if (route.request().method() === 'DELETE') {
      chamadas++;
      await new Promise(resolve => setTimeout(resolve, 400));
      return route.fulfill({ status: 204 });
    }
    return route.fulfill({ json: pagina([funcionario]) });
  });
  await page.goto('/funcionarios');
  await page.getByRole('button', { name: 'Desativar Ana Teste' }).click();
  await expect(page.getByTestId('confirmation-cancel')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Desativar Ana Teste' }).click();
  await page.getByTestId('confirmation-submit').click();
  await expect(page.getByTestId('confirmation-submit')).toBeDisabled();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(chamadas).toBe(1);
});

test('horários e entrega preservam o cadastro completo em tela estreita', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await sessao(page);
  let salvo = false;
  await page.route('**/api/v1/lojas/loja-teste', route => {
    const body = route.request().postDataJSON();
    expect(body).toMatchObject({ nome: loja.nome, endereco: loja.endereco, dadosOperacionais: { taxaEntregaBase: 8.5 }, horarios: { segunda: 'Fechado' } });
    salvo = true;
    return route.fulfill({ json: { ...loja, ...body } });
  });
  await page.goto('/configuracoes/operacao');
  await page.getByLabel('Segunda-feira').fill('Fechado');
  await page.getByLabel('Taxa base de entrega (R$)').fill('8,50');
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page).toHaveURL(/\/configuracoes$/);
  expect(salvo).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('falha de carregamento permite tentar novamente', async ({ page }) => {
  await sessao(page);
  let falha = true;
  await page.route('**/api/v1/lojista/produtos?**', route => falha
    ? route.fulfill({ status: 503, json: { message: 'Serviço temporariamente indisponível' } })
    : route.fulfill({ json: pagina([]) }));
  await page.goto('/produtos');
  await expect(page.getByRole('alert')).toBeVisible();
  falha = false;
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(page.getByText('Nenhum produto encontrado.')).toBeVisible();
});
