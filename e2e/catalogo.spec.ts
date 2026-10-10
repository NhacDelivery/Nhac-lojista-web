import { expect, test } from "@playwright/test";
import { apiAutenticada, entrar, identificador, produto } from "./helpers";
import { pngTeste } from "./setup";

test.beforeEach(async ({ page }) => {
  test.skip(process.env.RUN_E2E !== "true", "Execute com backend E2E isolado.");
  await entrar(page);
});

test("valida campos na tela e não envia um produto inválido", async ({
  page,
}) => {
  let gravacoes = 0;
  page.on("request", (r) => {
    if (r.method() === "POST" && r.url().endsWith("/produtos")) gravacoes++;
  });
  await page.goto("/produtos/novo");
  await expect(page.getByLabel("Estoque (unidades)")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Adicionais" })).toBeVisible();
  await page.getByRole("button", { name: "Salvar Produto" }).click();
  await expect(page.getByLabel(/Nome do Produto/)).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(page.getByLabel(/Preço/)).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  expect(gravacoes).toBe(0);
  await page.getByLabel(/Nome do Produto/).fill("Rascunho preservado");
  await page.getByRole("button", { name: "Novo Grupo" }).click();
  await page.getByRole("button", { name: "Salvar Produto" }).click();
  await expect(page.getByText("Adicione ao menos uma opção.")).toBeVisible();
  await expect(page.getByLabel(/Nome do Produto/)).toHaveValue(
    "Rascunho preservado",
  );
});

test("cria produto com estoque e adicional, persiste e reabre para edição", async ({
  page,
}) => {
  const nome = `Lanche ${identificador()}`;
  await page.goto("/produtos/novo");
  await page.getByLabel(/Nome do Produto/).fill(nome);
  await page.getByLabel(/Categoria/).selectOption("Hambúrgueres");
  await page.getByLabel(/^Preço/).fill("32,50");
  await page.getByLabel("Descrição").fill("Produto criado pela tela");
  await page.getByLabel("Estoque (unidades)").fill("7");
  const envioImagem = page.waitForResponse((r) =>
    r.url().endsWith("/uploads/imagem"),
  );
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "produto.png",
      mimeType: "image/png",
      buffer: pngTeste,
    });
  const upload = await envioImagem;
  expect(upload.status()).toBe(201);
  const imagemUrl = (await upload.json()).url;
  await expect(
    page.getByRole("button", { name: "Salvar Produto" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Novo Grupo" }).click();
  await page.getByLabel("Nome do grupo").fill("Molhos");
  await page.getByRole("button", { name: "Adicionar opção" }).click();
  await page.getByLabel("Opção", { exact: true }).fill("Barbecue");
  await page.getByLabel("Preço adicional (R$)").fill("2.5");
  const gravacao = page.waitForResponse(
    (r) => r.request().method() === "POST" && r.url().endsWith("/produtos"),
  );
  await page.getByRole("button", { name: "Salvar Produto" }).click();
  const response = await gravacao;
  expect(response.status()).toBe(201);
  const { id } = await response.json();
  await expect(page).toHaveURL(/\/produtos$/);
  await expect(
    page.getByRole("heading", { name: nome, exact: true }),
  ).toBeVisible();
  const api = await apiAutenticada();
  try {
    const salvo = await (await api.get(`lojista/produtos/${id}`)).json();
    expect(salvo).toMatchObject({ nome, preco: 32.5, estoque: 7, imagemUrl });
    expect(salvo.adicionais[0]).toMatchObject({
      nome: "Molhos",
      itens: [expect.objectContaining({ nome: "Barbecue", preco: 2.5 })],
    });
    await page
      .getByRole("button", { name: `Editar ${nome}`, exact: true })
      .click();
    await expect(page.getByLabel(/Nome do Produto/)).toHaveValue(nome);
    await expect(page.getByLabel("Estoque (unidades)")).toHaveValue("7");
    await expect(page.getByLabel("Opção", { exact: true })).toHaveValue(
      "Barbecue",
    );
    await page.getByLabel(/Nome do Produto/).fill(`${nome} editado`);
    await page.getByRole("button", { name: "Salvar Produto" }).click();
    await expect(page).toHaveURL(/\/produtos$/);
    const editado = await (await api.get(`lojista/produtos/${id}`)).json();
    expect(editado.nome).toBe(`${nome} editado`);
    expect(editado.estoque).toBe(7);
    expect(editado.adicionais[0].itens[0].preco).toBe(2.5);
  } finally {
    await api.dispose();
  }
});

test("desativação é reversível e esconde o produto do catálogo público", async ({
  page,
}) => {
  const api = await apiAutenticada();
  try {
    const p = await produto(api);
    await page.goto(`/produtos/${p.id}`);
    await expect(page.getByLabel(/Nome do Produto/)).toHaveValue(p.nome);
    await page
      .getByRole("button", { name: "Excluir produto", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Cancelar", exact: true })
      .last()
      .click();
    expect(
      (await (await api.get(`lojista/produtos/${p.id}`)).json()).ativo,
    ).toBe(true);
    await page
      .getByRole("button", { name: "Excluir produto", exact: true })
      .click();
    await page.getByTestId("confirmation-submit").click();
    await expect(page).toHaveURL(/\/produtos$/);
    expect(
      (await (await api.get(`lojista/produtos/${p.id}`)).json()).ativo,
    ).toBe(false);
    expect((await api.get(`produtos/${p.id}`)).status()).toBe(404);
    const cartao = page
      .locator("div")
      .filter({ has: page.getByRole("heading", { name: p.nome, exact: true }) })
      .filter({ has: page.getByRole("switch") })
      .last();
    await cartao.getByRole("switch", { name: "Inativo", exact: true }).click();
    await expect(
      cartao.getByRole("switch", { name: "Ativo", exact: true }),
    ).toHaveAttribute("aria-checked", "true");
    expect(
      (await (await api.get(`lojista/produtos/${p.id}`)).json()).ativo,
    ).toBe(true);
  } finally {
    await api.dispose();
  }
});

test("upload inválido informa erro e preserva o formulário", async ({
  page,
}) => {
  await page.goto("/produtos/novo");
  await page.getByLabel(/Nome do Produto/).fill("Rascunho com foto");
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "arquivo.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("invalido"),
    });
  await expect(page.getByRole("alert")).toContainText(/JPG|PNG|WEBP/i);
  await expect(page.getByLabel(/Nome do Produto/)).toHaveValue(
    "Rascunho com foto",
  );
  await expect(
    page.getByRole("button", { name: "Salvar Produto" }),
  ).toBeEnabled();
});

test("edição inexistente não permite sobrescrever dados de um produto", async ({
  page,
}) => {
  await page.goto("/produtos/inexistente");
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Salvar Produto" }),
  ).toBeDisabled();
});

test("catálogo carrega a próxima página e a busca mostra estado sem resultados", async ({
  page,
}) => {
  const api = await apiAutenticada();
  try {
    for (let i = 0; i < 51; i++)
      await produto(api, `Paginação ${i} ${identificador()}`);
    const primeira = await (
      await api.get("lojista/produtos?page=0&size=50")
    ).json();
    const segunda = await (
      await api.get("lojista/produtos?page=1&size=50")
    ).json();
    const alvo = segunda.content[0];
    expect(primeira.content.some((p: { id: string }) => p.id === alvo.id)).toBe(
      false,
    );
    await page.goto("/produtos");
    await expect(
      page.getByRole("heading", { name: alvo.nome, exact: true }),
    ).toHaveCount(0);
    await page.getByRole("button", { name: "Carregar mais produtos" }).click();
    await expect(
      page.getByRole("heading", { name: alvo.nome, exact: true }),
    ).toBeVisible();
    await page
      .getByPlaceholder("Buscar produtos...")
      .fill("nome-que-nao-existe-no-catalogo");
    await expect(page.getByText("Nenhum produto encontrado.")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: alvo.nome, exact: true }),
    ).toHaveCount(0);
    await page.getByPlaceholder("Buscar produtos...").fill("");
    await expect(
      page.getByRole("heading", { name: alvo.nome, exact: true }),
    ).toBeVisible();
  } finally {
    await api.dispose();
  }
});
