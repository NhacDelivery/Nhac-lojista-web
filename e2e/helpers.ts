import { APIRequestContext, expect, Page, request } from "@playwright/test";
import { randomUUID } from "crypto";
import { readFileSync } from "fs";

export const senha = process.env.E2E_PASSWORD || "";
export const apiURL = process.env.E2E_API_URL || "http://127.0.0.1:8080/api/v1";
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/api\/v1$/.test(apiURL)) {
  throw new Error("Os testes só podem usar o backend local isolado.");
}
if (process.env.RUN_E2E === "true" && senha.length < 12) {
  throw new Error(
    "Defina E2E_PASSWORD temporária de pelo menos 12 caracteres.",
  );
}
export const identificador = () => randomUUID();
export async function entrar(
  page: Page,
  email = "e2e.lojista@nhac.local",
  password = senha,
) {
  await page.goto("/login");
  await page.getByTestId("e2e.login.email").fill(email);
  await page.getByTestId("e2e.login.password").fill(password);
  await page.getByTestId("e2e.login.submit").click();
  await expect(page).not.toHaveURL(/\/login$/);
}
export async function apiAutenticada(
  email = "e2e.lojista@nhac.local",
): Promise<APIRequestContext> {
  const auth = await request.newContext({ baseURL: `${apiURL}/` });
  const response = await auth.post("auth/login", { data: { email, senha } });
  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  await auth.dispose();
  return request.newContext({
    baseURL: `${apiURL}/`,
    extraHTTPHeaders: {
      Authorization: `Bearer ${data.accessToken || data.token}`,
    },
  });
}
export async function produto(
  api: APIRequestContext,
  nome = `Produto ${identificador()}`,
) {
  const response = await api.post("produtos", {
    data: {
      nome,
      descricao: "Produto de integração do painel",
      preco: 25,
      categoriaMenu: "Prato Principal",
      ativo: true,
      estoque: 100,
      peso: "300g",
      percentualDesconto: 0,
      adicionais: [],
    },
  });
  expect(response.status()).toBe(201);
  return response.json();
}
export async function novoPedido() {
  const cliente = await apiAutenticada("e2e.pedido@nhac.local");
  try {
    const response = await cliente.post("pedidos", {
      headers: { "Idempotency-Key": identificador() },
      data: {
        lojaId: "e2e-loja-001",
        formaPagamento: "DINHEIRO",
        observacao: "Integração painel",
        enderecoEntrega: {
          rua: "Praça da Sé",
          numero: "100",
          bairro: "Sé",
          cidade: "São Paulo",
          estado: "SP",
          cep: "01001-000",
          latitude: -23.55052,
          longitude: -46.633308,
        },
        itens: [
          { produtoId: "e2e-produto-001", nome: "Produto E2E", quantidade: 1 },
        ],
      },
    });
    expect(response.status()).toBe(201);
    const data = await response.json();
    expect(data.pedidoId).toBeTruthy();
    return { ...data, id: data.pedidoId };
  } finally {
    await cliente.dispose();
  }
}

/** Captura somente a saída do provedor SMS mock no backend E2E isolado. */
export async function codigoSmsMock(telefone: string): Promise<string> {
  let codigo = "";
  await expect
    .poll(() => {
      const log = readFileSync(
        process.env.E2E_BACKEND_LOG || "../backend-nhac/backend-e2e.log",
        "utf8",
      );
      const bloco = log.includes(`Destinatário: ${telefone}`)
        ? log.split(`Destinatário: ${telefone}`).pop() || ""
        : "";
      codigo =
        /Mensagem: .*código de confirmação é (\d{6})/.exec(bloco)?.[1] || "";
      return codigo.length;
    })
    .toBe(6);
  return codigo;
}
