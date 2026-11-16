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
const emailLojista = "e2e.lojista@nhac.local";
const contasFixture = [
  emailLojista,
  "e2e.pedido@nhac.local",
  "e2e.cliente@nhac.local",
];

type Sessao = { token: string; usuarioId: string; nome: string };
const chaveSessoes = "E2E_SESSOES_FIXTURE";

export const identificador = () => randomUUID();
export async function entrar(
  page: Page,
  email = emailLojista,
  password = senha,
) {
  await page.goto("/login");
  await page.getByTestId("e2e.login.email").fill(email);
  await page.getByTestId("e2e.login.password").fill(password);
  await page.getByTestId("e2e.login.submit").click();
  await expect(page).not.toHaveURL(/\/login$/);
}
async function autenticar(email: string): Promise<Sessao> {
  const auth = await request.newContext({ baseURL: `${apiURL}/` });
  try {
    const response = await auth.post("auth/login", { data: { email, senha } });
    expect(response.status(), `Login E2E para ${email}`).toBe(200);
    const data = await response.json();
    const token = data.accessToken || data.token;
    expect(token, `Token E2E para ${email}`).toBeTruthy();
    return { token, usuarioId: data.usuarioId, nome: data.nome };
  } finally {
    await auth.dispose();
  }
}

export async function prepararSessoesFixture() {
  const sessoes: Record<string, Sessao> = {};
  for (const email of contasFixture) {
    sessoes[email] = await autenticar(email);
  }
  // O Playwright repassa o ambiente do globalSetup aos workers, inclusive nos retries.
  process.env[chaveSessoes] = JSON.stringify(sessoes);
}

function sessaoFixture(email: string): Sessao | undefined {
  const sessoes = JSON.parse(process.env[chaveSessoes] || "{}") as Record<string, Sessao>;
  return sessoes[email];
}

export async function abrirPainelAutenticado(page: Page) {
  const sessao = sessaoFixture(emailLojista);
  if (!sessao) throw new Error("Sessão da loja E2E não preparada.");
  await page.goto("/login");
  await page.evaluate(({ token, usuarioId, nome }) => {
    localStorage.setItem("@nhac:token", token);
    localStorage.setItem("@nhac:usuario", JSON.stringify({ id: usuarioId, nomeCompleto: nome }));
  }, sessao);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Painel", exact: true })).toBeVisible();
}

function apiComToken(token: string): Promise<APIRequestContext> {
  return request.newContext({
    baseURL: `${apiURL}/`,
    extraHTTPHeaders: { Authorization: `Bearer ${token}` },
  });
}

export async function apiAutenticada(email = emailLojista): Promise<APIRequestContext> {
  const sessao = sessaoFixture(email) ?? await autenticar(email);
  return apiComToken(sessao.token);
}

export async function apiDaSessao(page: Page): Promise<APIRequestContext> {
  const token = await page.evaluate(() => localStorage.getItem("@nhac:token"));
  if (!token) throw new Error("O painel E2E não tem sessão ativa.");
  return apiComToken(token);
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
export async function novoPedido(item?: { produtoId: string; nome: string; adicionais?: string[] }) {
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
          { ...(item ?? { produtoId: "e2e-produto-001", nome: "Produto E2E" }), quantidade: 1 },
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
