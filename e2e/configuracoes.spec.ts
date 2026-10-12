import { expect, test } from "@playwright/test";
import { apiAutenticada, codigoSmsMock, entrar, senha } from "./helpers";

test.beforeEach(async ({ page }) => {
  test.skip(process.env.RUN_E2E !== "true", "Execute com backend E2E isolado.");
  await entrar(page);
});

test("abertura persiste sem sobrescrever o cadastro da loja", async ({
  page,
}) => {
  const api = await apiAutenticada();
  const antes = await (await api.get("lojas/minha-loja")).json();
  try {
    await page.goto("/");
    const controle = page.getByRole("switch", { name: "Loja aberta" });
    await expect(controle).toHaveAttribute(
      "aria-checked",
      String(antes.isAberto),
    );
    await controle.focus();
    await page.keyboard.press("Space");
    await expect(controle).toHaveAttribute(
      "aria-checked",
      String(!antes.isAberto),
    );
    await page.reload();
    await expect(controle).toHaveAttribute(
      "aria-checked",
      String(!antes.isAberto),
    );
    const depois = await (await api.get("lojas/minha-loja")).json();
    expect(depois.endereco).toEqual(antes.endereco);
    expect(depois.formasPagamento).toEqual(antes.formasPagamento);
  } finally {
    await api.patch(`lojas/${antes.id}/abertura`, {
      data: { isAberto: antes.isAberto },
    });
    await api.dispose();
  }
});

test("salva endereço e coordenadas e rejeita posição inválida na tela", async ({
  page,
}) => {
  const api = await apiAutenticada();
  const antes = await (await api.get("lojas/minha-loja")).json();
  try {
    await page.goto("/configuracoes/endereco");
    await expect(page.getByLabel("Rua")).toHaveValue(antes.endereco.rua);
    await page.getByLabel("Latitude da loja").fill("91");
    await page
      .getByRole("button", { name: "Salvar endereço", exact: true })
      .click();
    await expect(page.getByLabel("Latitude da loja")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await expect(page).toHaveURL(/\/configuracoes\/endereco$/);
    await page.getByLabel("Latitude da loja").fill("-23.5506");
    await page.getByLabel("Longitude da loja").fill("-46.6334");
    await page.getByLabel(/Número/).fill("222");
    await expect(page.getByTitle("Prévia da posição da loja")).toBeVisible();
    await page
      .getByRole("button", { name: "Salvar endereço", exact: true })
      .click();
    await expect(page).toHaveURL(/\/configuracoes$/);
    const depois = await (await api.get("lojas/minha-loja")).json();
    expect(depois.endereco.numero).toBe("222");
    expect(depois.latitude).toBeCloseTo(-23.5506);
    expect(depois.longitude).toBeCloseTo(-46.6334);
    await page.goto("/configuracoes/endereco");
    await expect(page.getByLabel(/Número/)).toHaveValue("222");
  } finally {
    await api.patch(`lojas/${antes.id}/localizacao`, {
      data: {
        endereco: antes.endereco,
        latitude: antes.latitude,
        longitude: antes.longitude,
      },
    });
    await api.dispose();
  }
});

test("preferências são persistidas e reabertas com o estado real", async ({
  page,
}) => {
  const api = await apiAutenticada();
  const path = "usuarios/e2e-lojista-001/preferencias-notificacao";
  const antes = await (await api.get(path)).json();
  try {
    await page.goto("/configuracoes/conta");
    const mensagens = page.getByRole("switch", {
      name: "Mensagens de clientes",
      exact: true,
    });
    await expect(mensagens).toHaveAttribute(
      "aria-checked",
      String(antes.notificarMensagens),
    );
    await expect(mensagens).toHaveAttribute("aria-disabled", "false");
    await mensagens.click();
    await expect
      .poll(async () => (await (await api.get(path)).json()).notificarMensagens)
      .toBe(!antes.notificarMensagens);
    await page.reload();
    await expect(mensagens).toHaveAttribute(
      "aria-checked",
      String(!antes.notificarMensagens),
    );
  } finally {
    await api.put(path, { data: antes });
    await api.dispose();
  }
});

test("senha atual errada mantém sessão e os campos para nova tentativa", async ({
  page,
}) => {
  await page.goto("/configuracoes/conta");
  await page.getByRole("button", { name: "Alterar", exact: true }).click();
  await page.getByLabel("Senha atual", { exact: true }).fill("senha-errada123");
  await page.getByLabel("Nova senha", { exact: true }).fill(`${senha}Nova1`);
  await page
    .getByLabel("Confirmar nova senha", { exact: true })
    .fill(`${senha}Nova1`);
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(
    page.getByText("A senha atual informada está incorreta."),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/configuracoes\/conta$/);
  await expect(page.getByLabel("Nova senha", { exact: true })).toHaveValue(
    `${senha}Nova1`,
  );
  expect(await page.evaluate(() => !!localStorage.getItem("@nhac:token"))).toBe(
    true,
  );
});

test("telefone exige SMS, rejeita código errado e persiste somente após confirmação", async ({
  page,
}) => {
  const api = await apiAutenticada();
  const antes = await (await api.get("usuarios/e2e-lojista-001")).json();
  try {
    await page.goto("/configuracoes/conta");
    await page
      .getByRole("button", { name: "Editar", exact: true })
      .nth(1)
      .click();
    await page.getByLabel("Novo telefone").fill("11999998888");
    await expect(page.getByLabel("Código SMS")).toHaveCount(0);
    const envio = page.waitForResponse((r) =>
      r.url().endsWith("/verificacao-telefone/enviar-codigo"),
    );
    await page.getByRole("button", { name: "Enviar código SMS" }).click();
    expect((await envio).status()).toBe(200);
    await expect(page.getByLabel("Código SMS")).toBeVisible();
    const codigo = await codigoSmsMock("+5511999998888");
    const errado = String((Number(codigo) + 1) % 1000000).padStart(6, "0");
    await page.getByLabel("Código SMS").fill(errado);
    await page.getByRole("button", { name: "Confirmar telefone" }).click();
    await expect(page.getByText(/Código.*inválido/i)).toBeVisible();
    expect(
      (await (await api.get("usuarios/e2e-lojista-001")).json()).telefone,
    ).toBe(antes.telefone);
    await expect(page.getByLabel("Novo telefone")).toHaveValue(
      "(11) 99999-8888",
    );
    await page.getByLabel("Código SMS").fill(codigo);
    await page.getByRole("button", { name: "Confirmar telefone" }).click();
    await expect(page.getByLabel("Código SMS")).toHaveCount(0);
    expect(
      (await (await api.get("usuarios/e2e-lojista-001")).json()).telefone,
    ).toBe("+5511999998888");
    await page.reload();
    await expect(
      page.getByText("(11) 99999-8888", { exact: true }),
    ).toBeVisible();
  } finally {
    const envio = await api.post("verificacao-telefone/enviar-codigo", {
      data: { telefone: antes.telefone },
    });
    expect(envio.ok()).toBe(true);
    const codigo = await codigoSmsMock(antes.telefone);
    expect(
      (
        await api.put("usuarios/me/telefone", {
          data: { telefone: antes.telefone, codigo },
        })
      ).ok(),
    ).toBe(true);
    await api.dispose();
  }
});

test("formas de pagamento salvam flags reais e preservam os outros dados", async ({
  page,
}) => {
  const api = await apiAutenticada();
  const antes = await (await api.get("lojas/minha-loja")).json();
  try {
    await page.goto("/configuracoes/pagamentos");
    const pix = page.getByRole("checkbox", { name: "Pix", exact: true });
    await expect(pix).toBeChecked({ checked: antes.formasPagamento.aceitaPix });
    await pix.focus();
    await page.keyboard.press("Space");
    await page.getByRole("button", { name: "Salvar", exact: true }).click();
    await expect(page).toHaveURL(/\/configuracoes$/);
    const depois = await (await api.get("lojas/minha-loja")).json();
    expect(depois.formasPagamento.aceitaPix).toBe(
      !antes.formasPagamento.aceitaPix,
    );
    expect(depois.endereco).toEqual(antes.endereco);
    expect(depois.dadosOperacionais).toEqual(antes.dadosOperacionais);
    await page.goto("/configuracoes/pagamentos");
    await expect(pix).toBeChecked({
      checked: !antes.formasPagamento.aceitaPix,
    });
  } finally {
    await api.put(`lojas/${antes.id}`, { data: antes });
    await api.dispose();
  }
});

test("informações da loja persistem sem perder endereço e pagamentos", async ({
  page,
}) => {
  const api = await apiAutenticada();
  const antes = await (await api.get("lojas/minha-loja")).json();
  try {
    await page.goto("/configuracoes/editar");
    await page.getByLabel(/Nome da loja/).fill("Loja integração editada");
    await page.getByLabel("Descrição").fill("Descrição salva pela tela");
    await page.getByRole("button", { name: "Salvar", exact: true }).click();
    await expect(page).toHaveURL(/\/configuracoes$/);
    const depois = await (await api.get("lojas/minha-loja")).json();
    expect(depois.nome).toBe("Loja integração editada");
    expect(depois.descricao).toBe("Descrição salva pela tela");
    expect(depois.endereco).toEqual(antes.endereco);
    expect(depois.formasPagamento).toEqual(antes.formasPagamento);
    await page.goto("/configuracoes/editar");
    await expect(page.getByLabel(/Nome da loja/)).toHaveValue(
      "Loja integração editada",
    );
  } finally {
    await api.put(`lojas/${antes.id}`, { data: antes });
    await api.dispose();
  }
});

test("formulário estreito mantém o botão salvar acessível e não corta campos", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/configuracoes/endereco");
  await expect(page.getByLabel("Latitude da loja")).toBeVisible();
  const salvar = page.getByRole("button", {
    name: "Salvar endereço",
    exact: true,
  });
  await salvar.scrollIntoViewIfNeeded();
  await expect(salvar).toBeInViewport();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/endereco-mobile.png",
    fullPage: true,
  });
});
