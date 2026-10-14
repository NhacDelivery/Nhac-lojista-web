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

async function sessaoLojista(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('@nhac:token', 'token-ux-local');
    localStorage.setItem('@nhac:usuario', JSON.stringify({ id: 'dono-ux', nomeCompleto: 'Dono de teste', papel: 'LOJISTA', cargo: 'administrador' }));
  });
  await page.route('**/api/v1/**', async route => {
    const url = route.request().url();
    if (url.endsWith('/usuarios/dono-ux')) return route.fulfill({ json: { id: 'dono-ux', nome: 'Dono de teste', email: 'dono@exemplo.local', telefone: '11999998888', papel: 'LOJISTA' } });
    if (url.endsWith('/lojas/minha-loja')) return route.fulfill({ json: { id: 'loja-ux', nome: 'Loja UX', imagemUrl: '/nhac-logo.png', aberta: true } });
    if (url.includes('/lojista/funcionarios')) return route.fulfill({ json: { content: [] } });
    return route.fulfill({ json: [] });
  });
}

test('funcionário vazio tem avisos por campo, foco e nenhuma criação', async ({ page }) => {
  await sessaoLojista(page);
  await page.setViewportSize({ width: 390, height: 844 });
  let criacoes = 0;
  page.on('request', request => { if (request.method() === 'POST' && request.url().endsWith('/lojista/funcionarios')) criacoes++; });
  await page.goto('/funcionarios/novo');
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveAccessibleName('Revise os campos indicados');
  await expect(page.getByLabel('Nome Completo')).toBeFocused();
  await expect(page.getByLabel('Telefone')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByLabel('Cargo')).toHaveAttribute('aria-invalid', 'true');
  await page.screenshot({ path: 'test-results/equipe-validacao-mobile.png', fullPage: true });
  expect(criacoes).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('funcionário rejeitado pelo backend mantém dados e explica o campo', async ({ page }) => {
  await sessaoLojista(page);
  await page.route('**/lojista/funcionarios', route => route.fulfill({ status: 400, json: { status: 400, message: 'Dados inválidos.', details: { telefone: 'Telefone não disponível.' } } }));
  await page.goto('/funcionarios/novo');
  await page.getByLabel('Nome Completo').fill('Equipe 2');
  await page.getByLabel('E-mail').fill('equipe@exemplo.local');
  await page.getByLabel('Telefone').fill('11977776666');
  await page.getByLabel('Cargo').selectOption('Atendente');
  await page.getByLabel('Senha inicial').fill('Teste12345');
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Telefone não disponível.');
  await expect(page.getByLabel('Telefone')).toBeFocused();
  await expect(page.getByLabel('Nome Completo')).toHaveValue('Equipe 2');
});

test('funcionário inexistente bloqueia salvar', async ({ page }) => {
  await sessaoLojista(page);
  await page.goto('/funcionarios/inexistente');
  await expect(page.getByRole('alert')).toHaveAccessibleName('Não encontramos esse registro');
  await expect(page.getByRole('button', { name: 'Salvar', exact: true })).toBeDisabled();
});

test('telefone vazio não avança para SMS e logo usa superfície neutra', async ({ page }) => {
  await sessaoLojista(page);
  let sms = 0;
  page.on('request', request => { if (request.url().includes('/verificacao-telefone/enviar-codigo')) sms++; });
  await page.goto('/configuracoes/conta');
  await page.getByRole('button', { name: 'Editar', exact: true }).nth(1).click();
  await page.getByLabel('Novo telefone').fill('');
  await page.getByRole('button', { name: 'Enviar código SMS', exact: true }).click();
  await expect(page.getByLabel('Novo telefone')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByLabel('Código SMS')).toHaveCount(0);
  expect(sms).toBe(0);
  const logo = page.getByRole('img', { name: 'Logo de Loja UX' }).first();
  await expect(logo).toBeVisible();
  expect(await logo.evaluate(el => getComputedStyle(el).objectFit)).toBe('contain');
  expect(await logo.evaluate(el => getComputedStyle(el.parentElement!).backgroundColor)).toBe('rgb(255, 255, 255)');
});

for (const orientacao of ['horizontal', 'vertical'] as const) {
  test(`produto recorta foto ${orientacao} com zoom e mantém foto após arquivo corrompido`, async ({ page }) => {
    await sessaoLojista(page);
    let uploads = 0;
    await page.route('**/uploads/imagem', async route => {
      uploads++;
      const corpo = route.request().postDataBuffer()!;
      const inicio = corpo.indexOf(Buffer.from([0xff, 0xd8, 0xff]));
      expect(inicio).toBeGreaterThan(0);
      // O corpo multipart contém a saída JPEG, nunca a imagem de origem.
      expect(corpo.toString('latin1')).toContain('image/jpeg');
      const jpeg = corpo.subarray(inicio, corpo.lastIndexOf(Buffer.from([0xff, 0xd9])) + 2);
      await page.route('**/foto-normalizada.jpg', r => r.fulfill({ body: jpeg, contentType: 'image/jpeg' }));
      await route.fulfill({ json: { url: `${new URL(page.url()).origin}/foto-normalizada.jpg` } });
    });
    await page.goto('/produtos/novo');
    const imagem = await page.evaluate(orientacao => {
      const canvas = document.createElement('canvas');
      canvas.width = orientacao === 'horizontal' ? 400 : 200;
      canvas.height = orientacao === 'horizontal' ? 200 : 400;
      const ctx = canvas.getContext('2d')!;
      // Faixas externas devem sair do recorte; o centro permanece quadrado.
      ctx.fillStyle = '#ff0000'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#0000ff';
      if (orientacao === 'horizontal') ctx.fillRect(300, 0, 100, 200);
      else ctx.fillRect(0, 300, 200, 100);
      ctx.fillStyle = '#00ff00';
      ctx.fillRect((canvas.width - 200) / 2, (canvas.height - 200) / 2, 200, 200);
      ctx.fillStyle = '#ff00ff';
      ctx.fillRect((canvas.width - 40) / 2, (canvas.height - 40) / 2, 40, 40);
      return canvas.toDataURL('image/png').split(',')[1];
    }, orientacao);
    const input = page.locator('input[type=file]');
    await input.setInputFiles({ name: 'retangulo.png', mimeType: 'image/png', buffer: Buffer.from(imagem, 'base64') });
    const foto = page.getByRole('img', { name: 'Imagem do produto', exact: true });
    await expect(foto).toBeVisible();
    await expect.poll(() => foto.evaluate((el: HTMLImageElement) => [el.naturalWidth, el.naturalHeight])).toEqual([800, 800]);
    expect(await foto.evaluate(el => getComputedStyle(el).objectFit)).toBe('contain');
    const cores = await foto.evaluate((el: HTMLImageElement) => {
      const c = document.createElement('canvas'); c.width = c.height = 800;
      const ctx = c.getContext('2d')!; ctx.drawImage(el, 0, 0);
      const pixel = (x: number, y: number) => Array.from(ctx.getImageData(x, y, 1, 1).data);
      return {
        bordas: [[40, 40], [760, 40], [40, 760], [760, 760], [400, 50], [50, 400]].map(([x, y]) => pixel(x, y)),
        marca: [[400, 400], [340, 400], [400, 340], [460, 400], [400, 460]].map(([x, y]) => pixel(x, y)),
        foraDaMarca: [[300, 400], [400, 300], [500, 400], [400, 500]].map(([x, y]) => pixel(x, y)),
      };
    });
    const verde = (pixel: number[]) => {
      // JPEG pode alterar levemente as cores: verificar canais com tolerância.
      expect(pixel[0]).toBeLessThan(10);
      expect(pixel[1]).toBeGreaterThan(245);
      expect(pixel[2]).toBeLessThan(10);
      expect(pixel[3]).toBe(255);
    };
    cores.bordas.forEach(verde); // Preenchimento completo, sem barras nem faixas externas.
    cores.foraDaMarca.forEach(verde);
    for (const pixel of cores.marca) {
      expect(pixel[0]).toBeGreaterThan(245);
      expect(pixel[1]).toBeLessThan(10);
      expect(pixel[2]).toBeGreaterThan(245);
    } // A marca continua central e quadrada, sem esticar a proporção.
    const fotoAnterior = await foto.getAttribute('src');
    await page.screenshot({ path: `test-results/produto-imagem-quadrada-${orientacao}.png`, fullPage: true });
    await input.setInputFiles({ name: 'quebrada.png', mimeType: 'image/png', buffer: Buffer.from('arquivo corrompido') });
    await expect(page.getByRole('alert')).toContainText('Selecione um arquivo JPG, PNG ou WEBP');
    await expect(foto).toBeVisible();
    await expect(foto).toHaveAttribute('src', fotoAnterior!);
    expect(uploads).toBe(1);
    await input.setInputFiles({ name: 'grande.png', mimeType: 'image/png', buffer: Buffer.alloc(5 * 1024 * 1024 + 1) });
    await expect(page.getByRole('alert')).toContainText('5 MB');
    await expect(foto).toHaveAttribute('src', fotoAnterior!);
    expect(uploads).toBe(1);
  });

}

test('desativação tem confirmação acessível, foco e bloqueio enquanto salva', async ({ page }) => {
  await sessaoLojista(page);
  await page.route('**/lojista/funcionarios?**', route => route.fulfill({ json: { content: [{ id: 'equipe-ux', nomeCompleto: 'Equipe UX', email: 'equipe@exemplo.local', cargo: 'Atendente', telefone: '11988887777', ativo: true, dataCadastro: '2026-10-01T12:00:00Z' }] } }));
  let concluir!: () => void;
  const aguardando = new Promise<void>(resolve => { concluir = resolve; });
  let pedidos = 0;
  await page.route('**/lojista/funcionarios/equipe-ux', async route => {
    pedidos++;
    await aguardando;
    await route.fulfill({ status: 204 });
  });
  await page.goto('/funcionarios');
  const desativar = page.getByRole('button', { name: 'Desativar Equipe UX' });
  await desativar.click();
  const modal = page.getByRole('dialog', { name: 'Desativar funcionário' });
  await expect(modal.getByRole('button', { name: 'Cancelar' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(modal.getByRole('button', { name: 'Desativar', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(modal).toHaveCount(0);
  await expect(desativar).toBeFocused();
  await desativar.click();
  await modal.getByRole('button', { name: 'Desativar', exact: true }).click();
  await expect(modal.getByTestId('confirmation-submit')).toBeDisabled();
  await expect(modal.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
  expect(pedidos).toBe(1);
  concluir();
  await expect(modal).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Reativar Equipe UX' })).toBeVisible();
});
