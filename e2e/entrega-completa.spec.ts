import { APIRequestContext, expect, test } from '@playwright/test';
import { apiAutenticada, entrar, novoPedido } from './helpers';

test.beforeEach(() => {
  test.skip(process.env.RUN_E2E !== 'true', 'Execute com backend E2E isolado.');
});

async function estadoPedido(api: APIRequestContext, id: string) {
  const resposta = await api.get(`lojista/pedidos/${id}`);
  expect(resposta.status()).toBe(200);
  return (await resposta.json()).status;
}

test('pedido percorre cliente, lojista e motoboy até entrega e aparece concluído no painel e financeiro', async ({ page }) => {
  test.setTimeout(90_000);
  const loja = await apiAutenticada();
  const cliente = await apiAutenticada('e2e.pedido@nhac.local');
  const motoboy = await apiAutenticada('e2e.cliente@nhac.local');
  let pedidoId = '';
  try {
    const perfil = await motoboy.get('entregador/perfil');
    if (perfil.status() === 404) {
      const cadastro = await motoboy.post('entregador/cadastro', { data: {
        tipoVeiculo: 'BICICLETA', cpf: '52998224725', modeloVeiculo: 'Bicicleta E2E', corVeiculo: 'Preta',
      } });
      expect(cadastro.status()).toBe(201);
    } else expect(perfil.status()).toBe(200);
    expect((await motoboy.patch('entregador/localizacao', { data: { latitude: -23.55052, longitude: -46.633308 } })).status()).toBe(200);
    expect((await motoboy.patch('entregador/status', { data: { statusOperacional: 'ONLINE' } })).status()).toBe(200);

    const pedido = await novoPedido();
    pedidoId = pedido.id;
    await entrar(page);
    await page.goto(`/pedidos/${pedidoId}`);
    await expect(page.getByTestId('e2e.order.status')).toContainText('Confirmar');
    for (const rotulo of ['Pago', 'Em preparo']) {
      await page.getByTestId('e2e.order.advance').click();
      await page.getByTestId('confirmation-submit').click();
      await expect(page.getByTestId('e2e.order.status')).toContainText(rotulo);
    }
    await expect.poll(() => estadoPedido(loja, pedidoId)).toBe('PREPARANDO');
    expect((await cliente.post(`entregas/despachar/${pedidoId}`)).status()).toBe(403);
    expect((await loja.post(`entregas/${pedidoId}/coletar`)).status()).toBe(403);

    let ofertaId = '';
    await expect.poll(async () => {
      const ofertas = await motoboy.get('entregas/ofertas/pendentes');
      expect(ofertas.status()).toBe(200);
      const lista: { id: string; pedidoId: string }[] = await ofertas.json();
      ofertaId = lista.find(oferta => oferta.pedidoId === pedidoId)?.id || '';
      return !!ofertaId;
    }).toBe(true);
    expect((await motoboy.post(`entregas/ofertas/${ofertaId}/aceitar`)).status()).toBe(200);
    expect(await estadoPedido(loja, pedidoId)).toBe('PREPARANDO');
    expect((await motoboy.post(`entregas/${pedidoId}/coletar`)).status()).toBe(200);
    await expect(page.getByTestId('e2e.order.status')).toContainText('A caminho');
    await expect(page.getByTestId('e2e.order.advance')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Cancelar pedido', exact: true })).toHaveCount(0);
    expect((await loja.post(`entregas/${pedidoId}/concluir`, { data: { codigo: '000000' } })).status()).toBe(403);

    const detalheCliente = await cliente.get(`pedidos/${pedidoId}`);
    expect(detalheCliente.status()).toBe(200);
    const { codigoEntrega } = await detalheCliente.json();
    expect(codigoEntrega).toMatch(/^\d{6}$/);
    const errado = String((Number(codigoEntrega) + 1) % 1_000_000).padStart(6, '0');
    expect((await motoboy.post(`entregas/${pedidoId}/concluir`, { data: { codigo: errado } })).status()).toBe(400);
    expect(await estadoPedido(loja, pedidoId)).toBe('SAIU_ENTREGA');
    expect((await motoboy.post(`entregas/${pedidoId}/concluir`, { data: { codigo: codigoEntrega } })).status()).toBe(204);
    await expect(page.getByTestId('e2e.order.status')).toContainText('Entregue');
    await page.reload();
    await expect(page.getByTestId('e2e.order.status')).toContainText('Entregue');
    await expect(page.getByTestId('e2e.order.advance')).toHaveCount(0);
    await expect(page.getByTestId('e2e.order.redispatch')).toHaveCount(0);
    expect(await estadoPedido(loja, pedidoId)).toBe('ENTREGUE');
    expect((await cliente.get(`pedidos/${pedidoId}`)).ok()).toBe(true);
    // Repetição da baixa não cria nova entrega nem muda o estado final.
    expect((await motoboy.post(`entregas/${pedidoId}/concluir`, { data: { codigo: codigoEntrega } })).status()).toBe(204);

    await page.goto('/pedidos');
    await page.getByRole('button', { name: /^Entregue/ }).click();
    await expect(page.getByTestId(`e2e.order.${pedidoId}`)).toBeVisible();
    const financeiro = await loja.get('lojista/financeiro?periodo=HOJE');
    expect(financeiro.status()).toBe(200);
    const dados = await financeiro.json();
    expect(dados.resumo.numeroPedidos).toBeGreaterThan(0);
    expect(Number(dados.resumo.faturamentoPeriodo)).toBeGreaterThanOrEqual(25);
    await page.goto('/financeiro');
    await page.getByRole('button', { name: 'Hoje', exact: true }).click();
    const total = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dados.resumo.faturamentoPeriodo);
    await expect(page.getByText(total, { exact: true }).first()).toBeVisible();
    const painel = await (await loja.get('lojista/painel')).json();
    expect(painel.pedidosConcluidosHoje).toBeGreaterThan(0);
    await page.goto('/');
    const concluidos = page.getByRole('region', { name: 'Resumo do dia' }).getByText('Concluídos Hoje', { exact: true }).locator('..');
    await expect(concluidos).toHaveText(new RegExp(`Concluídos Hoje\\s*${painel.pedidosConcluidosHoje}\\s*$`, 'i'));
    await expect(page.getByText('Configure a localização da loja', { exact: false })).toHaveCount(0);
  } finally {
    // Mantém a fixture offline para os testes que verificam falta de motoboys.
    const ativa = await motoboy.get('entregas/ativa');
    if (ativa.ok()) {
      const entrega = await ativa.json();
      if (entrega?.pedidoId === pedidoId) {
        await motoboy.post(`entregas/${pedidoId}/coletar`);
        const detalhe = await (await cliente.get(`pedidos/${pedidoId}`)).json();
        if (detalhe.codigoEntrega) await motoboy.post(`entregas/${pedidoId}/concluir`, { data: { codigo: detalhe.codigoEntrega } });
      }
    }
    expect((await motoboy.patch('entregador/status', { data: { statusOperacional: 'OFFLINE' } })).status()).toBe(200);
    await motoboy.dispose();
    await cliente.dispose();
    await loja.dispose();
  }
});
