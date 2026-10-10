import { expect, test } from "@playwright/test";
import { apiAutenticada, entrar, identificador } from "./helpers";

test.beforeEach(async ({ page }) => {
  test.skip(process.env.RUN_E2E !== "true", "Execute com backend E2E isolado.");
  await entrar(page);
});

test("chat recebe mensagem do cliente, envia via WebSocket e recupera o histórico", async ({
  page,
}) => {
  const cliente = await apiAutenticada("e2e.pedido@nhac.local");
  const lojista = await apiAutenticada();
  try {
    const conversa = await (
      await cliente.post("conversas/lojas/e2e-loja-001")
    ).json();
    const pergunta = `Pergunta ${identificador()}`;
    const resposta = `Resposta ${identificador()}`;
    const envioCliente = await cliente.post(
      `conversas/${conversa.id}/mensagens`,
      { data: { conteudo: pergunta, clientMessageId: identificador() } },
    );
    expect(envioCliente.status()).toBe(200);
    await page.goto("/chat");
    await expect(
      page.getByText("Selecione uma conversa para começar a falar"),
    ).toBeVisible();
    await page
      .getByRole("button")
      .filter({ hasText: "Cliente do Pedido E2E" })
      .click();
    await expect(
      page.getByText(pergunta, { exact: true }).last(),
    ).toBeVisible();
    await expect
      .poll(async () => {
        const lista = await (await lojista.get("lojista/conversas")).json();
        return lista.content.find((c: { id: string }) => c.id === conversa.id)
          .naoLidas;
      })
      .toBe(0);
    await page.getByPlaceholder("Digite sua mensagem...").fill(resposta);
    await page.getByRole("button", { name: "Enviar", exact: true }).click();
    await expect(
      page.getByText(resposta, { exact: true }).last(),
    ).toBeVisible();
    await expect(page.getByPlaceholder("Digite sua mensagem...")).toHaveValue(
      "",
    );
    await expect
      .poll(async () => {
        const historico = await (
          await cliente.get(`conversas/${conversa.id}/mensagens`)
        ).json();
        return historico.content.filter(
          (m: { conteudo: string }) => m.conteudo === resposta,
        ).length;
      })
      .toBe(1);
    await page.reload();
    await page
      .getByRole("button")
      .filter({ hasText: "Cliente do Pedido E2E" })
      .click();
    await expect(
      page.getByText(resposta, { exact: true }).last(),
    ).toBeVisible();
    await expect(
      page.getByText(pergunta, { exact: true }).last(),
    ).toBeVisible();
  } finally {
    await cliente.dispose();
    await lojista.dispose();
  }
});

test("financeiro respeita o período solicitado e mostra valores da API", async ({
  page,
}) => {
  const api = await apiAutenticada();
  try {
    await page.goto("/financeiro");
    for (const [rotulo, periodo] of [
      ["Hoje", "HOJE"],
      ["30 dias", "TRINTA_DIAS"],
      ["7 dias", "SETE_DIAS"],
    ]) {
      const consulta = page.waitForResponse((r) =>
        r.url().endsWith(`/lojista/financeiro?periodo=${periodo}`),
      );
      await page.getByRole("button", { name: rotulo, exact: true }).click();
      const response = await consulta;
      expect(response.status()).toBe(200);
      const dados = await response.json();
      expect(dados.periodo).toBe(periodo);
      const valor = new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(dados.resumo.faturamentoPeriodo);
      await expect(
        page.getByText(valor, { exact: true }).first(),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Atualizar dados" }),
      ).toBeEnabled();
    }
  } finally {
    await api.dispose();
  }
});

test("falha transitória no painel mostra erro e permite recuperar dados reais", async ({
  page,
}) => {
  let falhar = true;
  await page.route("**/api/v1/lojista/painel", async (route) => {
    if (falhar) {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          status: 503,
          error: "SERVICO_INDISPONIVEL",
          message: "Painel temporariamente indisponível",
        }),
      });
    } else await route.continue();
  });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Tentar novamente" }),
  ).toBeVisible();
  falhar = false;
  await page.getByRole("button", { name: "Tentar novamente" }).click();
  await expect(page.getByRole("switch", { name: "Loja aberta" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Tentar novamente" }),
  ).toHaveCount(0);
});
