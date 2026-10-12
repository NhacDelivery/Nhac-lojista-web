import { expect, test } from "@playwright/test";
import { apiAutenticada, entrar, identificador, senha } from "./helpers";

test.beforeEach(() => {
  test.skip(process.env.RUN_E2E !== "true", "Execute com backend E2E isolado.");
});

test("usuário anônimo não acessa telas protegidas", async ({ page }) => {
  for (const caminho of [
    "/pedidos",
    "/produtos/novo",
    "/funcionarios",
    "/financeiro",
    "/configuracoes/conta",
  ]) {
    await page.goto(caminho);
    await expect(page).toHaveURL(/\/login$/);
    await expect(
      page.getByRole("button", { name: "Salvar Produto" }),
    ).toHaveCount(0);
  }
});

test("login rejeitado não cria sessão nem mostra dados da loja", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByTestId("e2e.login.email").fill("e2e.lojista@nhac.local");
  await page.getByTestId("e2e.login.password").fill("senha-invalida123");
  await page.getByTestId("e2e.login.submit").click();
  await expect(page.getByRole("alert", { name: "Não conseguimos entrar" })).toContainText("E-mail ou senha não conferem.");
  await expect(page).toHaveURL(/\/login$/);
  expect(
    await page.evaluate(() => localStorage.getItem("@nhac:token")),
  ).toBeNull();
  await expect(page.getByText("Loja E2E", { exact: true })).toHaveCount(0);
});

test("cadastra e edita funcionário, desativa login e reativa a mesma conta", async ({
  page,
}) => {
  const nome = `Equipe ${identificador()}`;
  const email = `e2e-${identificador()}@nhac.local`;
  await entrar(page);
  await page.goto("/funcionarios/novo");
  await page.getByLabel(/Nome Completo/).fill(nome);
  await page.getByLabel(/E-mail/).fill(email);
  await page.getByLabel("Telefone").fill(`119${String(Date.now()).slice(-8)}`);
  await page.getByLabel(/Cargo/).selectOption("Atendente");
  await page.getByLabel(/Senha inicial/).fill(senha);
  const gravacao = page.waitForResponse(
    (r) =>
      r.request().method() === "POST" &&
      r.url().endsWith("/lojista/funcionarios"),
  );
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  const response = await gravacao;
  expect(response.status()).toBe(201);
  const funcionario = await response.json();
  await expect(page).toHaveURL(/\/funcionarios$/);
  const linha = page.getByRole("row").filter({ hasText: email });
  await expect(linha).toContainText("Ativo");
  await linha
    .getByRole("button", { name: `Editar ${nome}`, exact: true })
    .click();
  await expect(page.getByLabel(/E-mail/)).toBeDisabled();
  await expect(page.getByLabel(/Senha inicial/)).toHaveCount(0);
  await page.getByLabel(/Nome Completo/).fill(`${nome} editado`);
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(linha).toContainText(`${nome} editado`);
  await linha
    .getByRole("button", { name: `Desativar ${nome} editado`, exact: true })
    .click();
  await page.getByTestId("confirmation-submit").click();
  await expect(linha).toContainText("Inativo");
  const api = await apiAutenticada();
  try {
    const bloqueado = await api.post("auth/login", { data: { email, senha } });
    expect(bloqueado.ok()).toBe(false);
    await linha
      .getByRole("button", { name: `Reativar ${nome} editado`, exact: true })
      .click();
    await expect(linha).toContainText("Ativo");
    expect(
      (await api.post("auth/login", { data: { email, senha } })).ok(),
    ).toBe(true);
    await page.reload();
    await expect(linha).toContainText(`${nome} editado`);
  } finally {
    await api.delete(`lojista/funcionarios/${funcionario.id}`);
    await api.dispose();
  }
});

for (const cargo of ["Atendente", "Administrador"]) {
  test(`funcionário ${cargo} não recebe controles exclusivos do dono`, async ({
    page,
  }) => {
    const api = await apiAutenticada();
    const email = `e2e-${identificador()}@nhac.local`;
    const response = await api.post("lojista/funcionarios", {
      data: {
        nome: "Funcionário integração",
        email,
        senha,
        cargo,
        telefone: `119${String(Date.now()).slice(-8)}`,
      },
    });
    expect(response.status()).toBe(201);
    const funcionario = await response.json();
    try {
      await entrar(page, email);
      await page.goto("/pedidos");
      await expect(page.getByTestId("e2e.orders.root")).toBeVisible();
      for (const nome of cargo === "Administrador"
        ? ["Funcionários", "Configurações"]
        : ["Funcionários", "Financeiro", "Configurações"]) {
        await expect(
          page.getByRole("link", { name: nome, exact: true }),
        ).toHaveCount(0);
      }
      await page.setViewportSize({ width: 390, height: 844 });
      for (const nome of cargo === "Administrador"
        ? ["Equipe"]
        : ["Equipe", "Caixa"]) {
        await expect(
          page.getByRole("link", { name: nome, exact: true }),
        ).toHaveCount(0);
      }
      for (const caminho of cargo === "Administrador"
        ? ["/funcionarios/novo", "/configuracoes"]
        : ["/funcionarios/novo", "/financeiro", "/configuracoes"]) {
        await page.goto(caminho);
        await expect(
          page.getByRole("heading", { name: "Acesso Negado" }),
        ).toBeVisible();
        await expect(
          page.getByRole("button", { name: "Salvar", exact: true }),
        ).toHaveCount(0);
      }
      const staff = await apiAutenticada(email);
      try {
        expect((await staff.get('lojista/funcionarios')).status()).toBe(403);
        expect((await staff.get('lojista/produtos')).status()).toBe(cargo === 'Administrador' ? 200 : 403);
        expect((await staff.get('lojista/financeiro')).status()).toBe(cargo === 'Administrador' ? 200 : 403);
        expect(
          (
            await staff.post("lojista/funcionarios", {
              data: {
                nome: "Sem permissão",
                email: `e2e-${identificador()}@nhac.local`,
                senha,
                telefone: "11911112222",
                cargo: "Atendente",
              },
            })
          ).status(),
        ).toBe(403);
      } finally {
        await staff.dispose();
      }
    } finally {
      await api.delete(`lojista/funcionarios/${funcionario.id}`);
      await api.dispose();
    }
  });
}

test("cadastro inválido preserva os campos e não cria uma conta", async ({
  page,
}) => {
  let registros = 0;
  page.on("request", (r) => {
    if (r.url().endsWith("/auth/registrar")) registros++;
  });
  await page.goto("/cadastro");
  await page.getByRole("button", { name: /Próximo|Continuar/ }).click();
  await expect(page.getByLabel(/Nome Completo/)).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await page.getByLabel(/Nome Completo/).fill("Nome preservado");
  await page.getByLabel(/^E-mail/).fill("invalido");
  await page.getByRole("button", { name: /Próximo|Continuar/ }).click();
  await expect(page.getByLabel(/^E-mail/)).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(page.getByLabel(/Nome Completo/)).toHaveValue("Nome preservado");
  expect(registros).toBe(0);
  await expect(page.getByLabel("Nome da Loja")).toHaveCount(0);
});

test("recuperação rejeita código incorreto e não anuncia senha redefinida", async ({
  page,
}) => {
  await page.goto("/recuperar-senha");
  await page.getByLabel(/^E-mail/).fill("e2e.lojista@nhac.local");
  const envio = page.waitForResponse((r) =>
    r.url().endsWith("/auth/esqueci-senha/email"),
  );
  await page
    .getByRole("button", { name: "Enviar código", exact: true })
    .click();
  expect((await envio).status()).toBe(200);
  await expect(
    page.getByRole("button", { name: /Reenviar código/ }),
  ).toBeDisabled();
  await page.getByPlaceholder("000000").fill("000000");
  await page.getByLabel(/^Nova senha/).fill("SenhaNova123");
  await page.getByLabel(/Confirmar/).fill("SenhaNova123");
  await page
    .getByRole("button", { name: "Redefinir senha", exact: true })
    .click();
  await expect(page.getByText(/Código.*inválido/i)).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Senha redefinida!" }),
  ).toHaveCount(0);
  const api = await apiAutenticada();
  await api.dispose();
});
