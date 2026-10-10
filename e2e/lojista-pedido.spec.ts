import { expect, test } from "@playwright/test";
import { apiAutenticada, entrar, novoPedido } from "./helpers";

test.beforeEach(() => {
  test.skip(process.env.RUN_E2E !== "true", "Execute com backend E2E isolado.");
});

test("recebe um pedido real, inicia preparo e impede concluir a entrega pelo lojista", async ({
  page,
}) => {
  const lojista = await apiAutenticada();
  let item;
  try {
    const criado = await lojista.post('produtos', { data: {
      nome: 'Produto E2E', preco: 25, categoriaMenu: 'Hambúrgueres', estoque: 10,
      adicionais: [{ nome: 'Molhos', obrigatorio: false, minimo: 0, maximo: 1, itens: [{ nome: 'Barbecue', preco: 2.5 }] }],
    } });
    expect(criado.status()).toBe(201);
    const { id } = await criado.json();
    const salvo = await (await lojista.get(`lojista/produtos/${id}`)).json();
    item = { produtoId: id, nome: 'Produto E2E', adicionais: [salvo.adicionais[0].itens[0].id] };
  } finally { await lojista.dispose(); }
  const pedido = await novoPedido(item);
  await entrar(page);
  await page.goto("/pedidos");
  const cartao = page.getByTestId(`e2e.order.${pedido.id}`);
  await expect(cartao).toBeVisible();
  await expect(page.getByTestId(`e2e.order.${pedido.id}.status`)).toContainText(
    "Confirmar",
  );
  await cartao.click();
  await expect(page.getByText("1x Produto E2E")).toBeVisible();
  await expect(page.getByText("Integração painel")).toBeVisible();
  await expect(page.getByRole('list', { name: 'Adicionais de Produto E2E' })).toContainText('Molhos: Barbecue');
  await page.reload();
  await expect(page.getByRole('list', { name: 'Adicionais de Produto E2E' })).toContainText('Molhos: Barbecue');
  await page.getByTestId("e2e.order.advance").click();
  await page.getByTestId("confirmation-submit").click();
  await expect(page.getByTestId("e2e.order.status")).toContainText("Pago");
  await expect(page.getByTestId("e2e.order.advance")).toHaveText(
    "Iniciar preparo",
  );
  await expect(
    page.getByRole("button", { name: "Cancelar pedido", exact: true }),
  ).toHaveCount(0);
  const confirmado = await apiAutenticada();
  try {
    expect(
      (await (await confirmado.get(`lojista/pedidos/${pedido.id}`)).json())
        .status,
    ).toBe("PAGO");
  } finally {
    await confirmado.dispose();
  }
  await page.getByTestId("e2e.order.advance").click();
  await page.getByTestId("confirmation-submit").click();
  await expect(page.getByTestId("e2e.order.status")).toContainText(
    "Em preparo",
  );
  await expect(page.getByTestId("e2e.order.advance")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Cancelar pedido", exact: true }),
  ).toHaveCount(0);
  const api = await apiAutenticada();
  try {
    expect(
      (await (await api.get(`lojista/pedidos/${pedido.id}`)).json()).status,
    ).toBe("PREPARANDO");
    await page.reload();
    await expect(page.getByTestId("e2e.order.delivery-state")).toContainText(
      "Aguardando um entregador",
    );
    await page.getByTestId("e2e.order.redispatch").click();
    await expect(page.getByRole("alert")).toContainText(
      "Nenhum entregador disponível",
    );
  } finally {
    await api.dispose();
  }
});

test("cancelamento só acontece ao confirmar e persiste após recarregar", async ({
  page,
}) => {
  const pedido = await novoPedido();
  await entrar(page);
  await page.goto(`/pedidos/${pedido.id}`);
  await page
    .getByRole("button", { name: "Cancelar pedido", exact: true })
    .click();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(page.getByTestId("e2e.order.status")).toContainText("Confirmar");
  await page
    .getByRole("button", { name: "Cancelar pedido", exact: true })
    .click();
  await page.getByTestId("confirmation-submit").click();
  await expect(page.getByTestId("e2e.order.status")).toContainText("Cancelado");
  await page.reload();
  await expect(page.getByText("Este pedido foi cancelado.")).toBeVisible();
  await expect(page.getByTestId("e2e.order.advance")).toHaveCount(0);
  await expect(page.getByTestId("e2e.order.redispatch")).toHaveCount(0);
});

test("pedido inexistente mostra recuperação sem controles de alteração", async ({
  page,
}) => {
  await entrar(page);
  await page.goto("/pedidos/inexistente");
  await expect(
    page.getByRole("button", { name: "Voltar para pedidos" }),
  ).toBeVisible();
  await expect(page.getByTestId("e2e.order.advance")).toHaveCount(0);
  await page.getByRole("button", { name: "Voltar para pedidos" }).click();
  await expect(page.getByTestId("e2e.orders.root")).toBeVisible();
});
