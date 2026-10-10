/**
 * Tratamento padronizado de erros retornados pelo backend Nhac.
 *
 * Formato real (ErroPadraoDTO do GlobalExceptionHandler):
 * {
 *   "requestId": "uuid",
 *   "timestamp": "...",
 *   "status": 400,
 *   "error": "REGRA_DE_NEGOCIO",        // enum ErrorCode
 *   "title": "Requisição Inválida",
 *   "message": "Mensagem para o usuário", // ⚠️ campo é `message`, não `mensagem`
 *   "details": {},                       // mapa campo → erro (validações)
 *   "path": "/api/v1/...",
 *   "suggestions": []
 * }
 *
 * Mapeamento de exceções (do backend):
 *  400 RegraDeNegocioException / CampoObrigatorioFaltandoException / validações Bean
 *  401 CredenciaisInvalidasException (login) — token inválido/expirado (JWT filter)
 *  403 AcessoNegadoException
 *  404 IdNaoEncontrado / LojaNaoEncontrada / ProdutoNaoEncontrado / RecursoNaoEncontrado
 *  409 TransicaoStatusInvalidaException
 *  422 LojaFechada / EstoqueInsuficiente / ProdutoInativo
 *  429 TentativasLoginExcedidasException
 *  503 ServicoIndisponivelException (e-mail/SMS fora)
 */

export interface ErroBackend {
  requestId?: string;
  timestamp?: string;
  status: number;
  /** Enum ErrorCode em SCREAMING_SNAKE_CASE (ex.: REGRA_DE_NEGOCIO). */
  error?: string;
  /** Fallback legado. */
  erro?: string;
  /** Mensagem para o usuário (campo real do ErroPadraoDTO). */
  message?: string;
  /** Fallback legado. */
  mensagem?: string;
  title?: string;
  details?: Record<string, string>;
  /** Fallback legado. */
  erros?: Record<string, string>;
  path?: string;
}

export class ApiError extends Error {
  status: number;
  /** Código do erro (enum ErrorCode) — ex.: 'TRANSICAO_STATUS_INVALIDA'. */
  codigo?: string;
  mensagem: string;
  errosCampos?: Record<string, string>;
  /** UUID da requisição no backend — logar em erros 5xx para rastreio. */
  requestId?: string;

  constructor(corpo: ErroBackend) {
    // Spec §2: o shape de erro usa `message`; `details` carrega os erros
    // por campo da Bean Validation (title/suggestions/path são ignorados).
    const msg = corpo.message || corpo.mensagem || `Erro ${corpo.status}`;
    super(msg);
    this.name = "ApiError";
    this.status = corpo.status;
    this.codigo = corpo.error || corpo.erro;
    this.mensagem = msg;
    this.errosCampos = corpo.details || corpo.erros;
    this.requestId = corpo.requestId;
  }
}

export function ehApiError(erro: unknown): erro is ApiError {
  return erro instanceof ApiError;
}

/** Resultado da interpretação de um erro de API pela camada de UI. */
export interface ResultadoTratamentoErro {
  /** Mensagem para exibir em alerta geral / toast. */
  mensagemGeral?: string;
  /** Erros por campo, já normalizados a partir de `details` do backend. */
  errosCampos?: Record<string, string>;
  /** Redirecionar para a etapa de verificação de e-mail. */
  redirecionarVerificacao?: boolean;
  /** Erro a exibir sob o campo de código de verificação. */
  erroCodigo?: string;
  /** Cadastro bloqueado — sugerir "Fazer login". */
  sugerirLogin?: boolean;
  /** Rate limit (429) — bloquear a UI com temporizador. */
  rateLimit?: boolean;
  /** Sessão expirada — limpar token e ir para /login. */
  sessaoExpirada?: boolean;
  /** Loja do usuário não existe (404) — mostrar onboarding. */
  lojaNaoEncontrada?: boolean;
  /** Transição de status inválida (409) — toast + refetch. */
  transicaoInvalida?: boolean;
  /** Exibir toast genérico com mensagemGeral. */
  toastGenerico?: boolean;
}

/**
 * Helper pedido pela spec: mapeia um erro de API para { campo, mensagem }.
 * Usa `details` (validação de Bean) ou palavras-chave da mensagem para
 * inferir o campo correspondente do formulário.
 */
export function mapearErroBackend(erro: unknown): {
  campo?: string;
  mensagem: string;
  resultado: ResultadoTratamentoErro;
} {
  const resultado = tratarErroApi(erro);
  const mensagem = resultado.mensagemGeral ?? "Erro inesperado.";

  // 1) Backend já veio com erros por campo (details / Bean Validation)
  if (resultado.errosCampos && Object.keys(resultado.errosCampos).length > 0) {
    const [primeiroCampo, primeiraMsg] = Object.entries(
      resultado.errosCampos,
    )[0];
    return { campo: primeiroCampo, mensagem: primeiraMsg, resultado };
  }

  // 2) Inferir campo por palavras-chave da mensagem (mensagens exatas do backend)
  const m = mensagem.toLowerCase();
  if (
    m.includes("e-mail") &&
    (m.includes("já está em uso") || m.includes("já cadastrado"))
  ) {
    return { campo: "email", mensagem, resultado };
  }
  if (m.includes("senha deve")) {
    return { campo: "senha", mensagem, resultado };
  }
  if (m.includes("código")) {
    return { campo: "codigo", mensagem, resultado };
  }
  if (m.includes("telefone")) {
    return { campo: "telefone", mensagem, resultado };
  }
  if (m.includes("preço") || m.includes("preco")) {
    return { campo: "preco", mensagem, resultado };
  }
  if (m.includes("cpf") || m.includes("cnpj")) {
    return { campo: "cpfCnpj", mensagem, resultado };
  }
  if (
    m.includes("não verificado") ||
    m.includes("nao verificado") ||
    m.includes("verifique seu e-mail")
  ) {
    return { campo: "email", mensagem, resultado };
  }

  return { mensagem, resultado };
}

export function tratarErroApi(erro: unknown): ResultadoTratamentoErro {
  if (!ehApiError(erro)) {
    return {
      mensagemGeral: erro instanceof Error ? erro.message : "Erro inesperado.",
    };
  }

  const { status, codigo, mensagem, errosCampos } = erro;
  const m = mensagem.toLowerCase();

  // ---------- 401: credenciais OU sessão expirada ----------
  if (status === 401) {
    if (m.includes("senha atual")) return { mensagemGeral: mensagem };
    // Login com credenciais inválidas → mensagem genérica (não revelar qual campo errou)
    if (
      codigo === "CREDENCIAIS_INVALIDAS" ||
      m.includes("e-mail não encontrado ou senha inválida") ||
      m.includes("senha inválida")
    ) {
      return { mensagemGeral: "E-mail ou senha inválidos." };
    }
    // Qualquer outro 401 em request autenticada = token expirado/inválido
    return {
      sessaoExpirada: true,
      mensagemGeral: "Sessão expirada. Faça login novamente.",
    };
  }

  // ---------- 429: rate limit de login / envio de código ----------
  if (status === 429) {
    return {
      rateLimit: true,
      mensagemGeral:
        mensagem || "Muitas tentativas. Tente novamente em alguns minutos.",
    };
  }

  // ---------- 400: regra de negócio / validação ----------
  if (status === 400) {
    if (errosCampos && Object.keys(errosCampos).length > 0) {
      return { errosCampos, mensagemGeral: mensagem };
    }
    if (
      m.includes("não verificado") ||
      m.includes("nao verificado") ||
      m.includes("verifique seu e-mail antes")
    ) {
      return { redirecionarVerificacao: true, mensagemGeral: mensagem };
    }
    if (
      m.includes("código de verificação inválido") ||
      m.includes("código de verificação expirado")
    ) {
      return { erroCodigo: mensagem };
    }
    if (m.includes("código")) {
      return { erroCodigo: mensagem };
    }
    if (m.includes("já está em uso") || m.includes("já cadastrado")) {
      return { sugerirLogin: true, mensagemGeral: mensagem };
    }
    return { mensagemGeral: mensagem };
  }

  // ---------- 403: acesso negado (permissão — NÃO deslogar) ----------
  if (status === 403) {
    if (m.includes("não é o dono") || m.includes("não tem permissão")) {
      return {
        toastGenerico: true,
        mensagemGeral: mensagem || "Você não tem permissão para esta ação.",
      };
    }
    return { mensagemGeral: mensagem || "Acesso negado." };
  }

  // ---------- 404 ----------
  if (status === 404) {
    if (
      m.includes("loja do usuário não encontrada") ||
      m.includes("loja não encontrada")
    ) {
      return { lojaNaoEncontrada: true };
    }
    return { mensagemGeral: mensagem };
  }

  // ---------- 409: conflito (transição de status, lock, e-mail em uso) ----------
  if (status === 409) {
    if (
      codigo === "TRANSICAO_STATUS_INVALIDA" ||
      m.includes("transição de status") ||
      m.includes("transicao de status")
    ) {
      return { transicaoInvalida: true, mensagemGeral: mensagem };
    }
    // Spec §3.2: enviar-codigo-cadastro retorna 409 quando o e-mail já
    // está confirmado/cadastrado → sugerir login em vez de toast genérico.
    if (
      m.includes("já está em uso") ||
      m.includes("já cadastrado") ||
      m.includes("confirmado")
    ) {
      return { sugerirLogin: true, mensagemGeral: mensagem };
    }
    return { toastGenerico: true, mensagemGeral: mensagem };
  }

  // ---------- 422: estado inválido ----------
  if (status === 422) {
    return { toastGenerico: true, mensagemGeral: mensagem };
  }

  // ---------- 503 ----------
  if (status === 503) {
    return {
      toastGenerico: true,
      mensagemGeral:
        mensagem || "Serviço temporariamente indisponível. Tente novamente.",
    };
  }

  // ---------- 500 ----------
  if (status >= 500) {
    return {
      toastGenerico: true,
      mensagemGeral: "Erro interno. Tente novamente mais tarde.",
    };
  }

  return { mensagemGeral: mensagem };
}

export const CHAVE_EMAIL_VERIFICADO = "@nhac:emailVerificado";

export function marcarEmailVerificado(email: string): void {
  localStorage.setItem(CHAVE_EMAIL_VERIFICADO, email);
}

export function emailEstaVerificado(email: string): boolean {
  return localStorage.getItem(CHAVE_EMAIL_VERIFICADO) === email;
}

export function limparEmailVerificado(): void {
  localStorage.removeItem(CHAVE_EMAIL_VERIFICADO);
}
