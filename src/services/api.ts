/**
 * Cliente HTTP central para comunicação com o backend Nhac
 * Backend: https://github.com/Matheuskii/backend-nhac
 */

import { ApiError, ErroBackend } from '../utils/errosApi';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api/v1';

function limparSessao(): void {
  localStorage.removeItem('@nhac:token');
  localStorage.removeItem('@nhac:usuario');
}

/**
 * 401 em request autenticada = token expirado/inválido.
 * Limpa sessão e redireciona para /login (o backend não tem refresh token).
 */
function tratar401SessaoExpirada(): void {
  const token = localStorage.getItem('@nhac:token');
  if (token) {
    limparSessao();
    window.location.href = '/login';
  }
}

/**
 * Faz uma requisição HTTP genérica com tratamento de erros e autenticação
 */
async function requisicao<T>(
  endpoint: string,
  opcoes: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const token = localStorage.getItem('@nhac:token');

  // Multipart (upload de imagem) NÃO pode receber Content-Type manual: o
  // navegador precisa gerar o header com o boundary do FormData. Definir
  // 'application/json' aqui faz o backend rejeitar o multipart.
  const ehFormData = typeof FormData !== 'undefined' && opcoes.body instanceof FormData;

  const cabecalhos: HeadersInit = {
    ...(ehFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token && { Authorization: `Bearer ${token}` }),
  };

  const resposta = await fetch(url, {
    ...opcoes,
    headers: {
      ...cabecalhos,
      ...opcoes.headers,
    },
  });

  if (!resposta.ok) {
    let corpoErro: ErroBackend = {
      status: resposta.status,
      erro: 'ErroDesconhecido',
      mensagem: `Erro ${resposta.status}: ${resposta.statusText}`,
    };

    try {
      const json = await resposta.json();
      corpoErro = {
        requestId: json.requestId,
        status: json.status ?? resposta.status,
        erro: json.erro ?? json.error ?? 'ErroDesconhecido',
        mensagem: json.mensagem ?? json.message ?? corpoErro.mensagem,
        timestamp: json.timestamp,
        path: json.path,
        erros: json.details ?? json.erros ?? json.errors,
      };
    } catch {
      // mantém mensagem padrão
    }

    // 401 com token presente = sessão expirada → logout + redirect /login
    if (resposta.status === 401) {
      tratar401SessaoExpirada();
    }

    // Observado no backend real (validado em runtime contra branch Edu):
    // token inválido/expirado → 403 do Spring Security com corpo PADRÃO
    // (`error: "Forbidden"` — NÃO é ErroPadraoDTO). Já 403 de NEGÓCIO vem do
    // ResourceExceptionHandler com `error: "ACESSO_NEGADO"` (ex.: AcessoNegadoException).
    // "ErroDesconhecido" (403 sem corpo) e "Forbidden" = sessão inválida → logout.
    // 403 com `error` de negócio (ACESSO_NEGADO) NÃO desloga — só mostra a mensagem.
    if (
      resposta.status === 403 &&
      (corpoErro.erro === 'ErroDesconhecido' || corpoErro.erro === 'Forbidden')
    ) {
      tratar401SessaoExpirada();
    }

    // 5xx = erro genuíno do servidor. Logar o `requestId` para rastreio
    // (spec §2/§7) — a UI já exibe a mensagem genérica via tratarErroApi.
    if (resposta.status >= 500) {
      console.error(
        `[API] Erro ${resposta.status} em ${endpoint} — requestId: ${corpoErro.requestId ?? 'desconhecido'}`,
        corpoErro
      );
    }

    throw new ApiError(corpoErro);
  }

  if (resposta.status === 204) {
    return undefined as T;
  }

  // Endpoints "void" do backend respondem 2xx SEM corpo JSON
  // (ex.: /auth/enviar-codigo-cadastro, /auth/confirmar-email-cadastro,
  // /auth/alterar-senha, PATCH /pedidos/{id}/status). Tentar `resposta.json()`
  // num corpo vazio lança "Unexpected end of JSON input" — tratar como sucesso void.
  const tipoConteudo = resposta.headers.get('content-type') ?? '';
  if (!tipoConteudo.toLowerCase().includes('application/json')) {
    return undefined as T;
  }

  try {
    return await resposta.json();
  } catch {
    // 2xx com corpo vazio mas Content-Type JSON → sucesso void
    return undefined as T;
  }
}

function extrairToken(resposta: { accessToken?: string; token?: string }): string {
  return resposta.accessToken ?? resposta.token ?? '';
}

// ==================== Autenticação ====================

/**
 * DTO real do backend (RegistroRequestDTO):
 * - id: UUID gerado pelo frontend (@NotBlank)
 * - senha: @Size(min=8) + @Pattern(^(?=.*[0-9])(?=.*[a-zA-Z]).*$)
 * - Não existe campo cpfCnpj no backend.
 * - Requer código de verificação confirmado nos últimos 30 minutos.
 */
export interface RegistroRequestDTO {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  senha: string;
}

export interface RegistroResponseDTO {
  accessToken?: string;
  token?: string;
  usuarioId?: string;
  nome?: string;
  email?: string;
  papel?: string;
}

export interface LoginRequestDTO {
  email: string;
  senha: string;
}

export interface LoginResponseDTO {
  accessToken?: string;
  token?: string;
  usuarioId: string;
  nome: string;
  email?: string;
  isNovoUsuario?: boolean;
  papel: string;
}

/**
 * Registra um novo usuário (conta sem loja)
 * POST /auth/registrar
 */
export async function registrar(dados: RegistroRequestDTO): Promise<RegistroResponseDTO & { accessToken: string }> {
  const resposta = await requisicao<RegistroResponseDTO>('/auth/registrar', {
    method: 'POST',
    body: JSON.stringify(dados),
  });
  return { ...resposta, accessToken: extrairToken(resposta) };
}

/**
 * Realiza login — POST /auth/login (público).
 * 200: { token|accessToken, usuarioId, nome, papel, isNovoUsuario }.
 * 401 CREDENCIAIS_INVALIDAS → toast "E-mail ou senha inválidos" (spec §3.5).
 * 400 REGRA_DE_NEGOCIO ("Verifique seu e-mail...") → oferecer reenvio.
 * 429 TENTATIVAS_LOGIN_EXCEDIDAS → bloqueio com temporizador.
 * O header `Content-Type: application/json` é garantido pelo `requisicao`.
 */
export async function login(dados: LoginRequestDTO): Promise<LoginResponseDTO & { accessToken: string }> {
  const resposta = await requisicao<LoginResponseDTO>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(dados),
  });
  return { ...resposta, accessToken: extrairToken(resposta) };
}

/**
 * Envia código de verificação de e-mail para cadastro
 * POST /auth/enviar-codigo-cadastro (público, 200 sem corpo).
 * Spec §3.2: cada chamada INVALIDA os códigos anteriores — o frontend
 * sempre usa o código da última tentativa (nunca cacheia códigos antigos).
 * 409 = e-mail já em uso · 429 = rate limit · 503 = falha Brevo.
 */
export async function enviarCodigoCadastro(emailBruto: string): Promise<void> {
  const email = emailBruto.trim().toLowerCase();
  return requisicao<void>('/auth/enviar-codigo-cadastro', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

/**
 * Confirma e-mail no cadastro
 * POST /auth/confirmar-email-cadastro (público, 200 sem corpo).
 * Spec §3.3: `codigo` é SEMPRE string de 6 dígitos (preserva zeros à
 * esquerda — nunca converter para número). Máx. 5 tentativas: no 5º
 * erro o código é bloqueado → exigir novo envio.
 * 400 "Código de verificação inválido." | "Código de verificação expirado."
 */
export async function confirmarEmailCadastro(emailBruto: string, codigoBruto: string): Promise<void> {
  // Spec §3.3: codigo sempre string de 6 dígitos (zeros à esquerda).
  const email = emailBruto.trim().toLowerCase();
  const codigo = String(codigoBruto ?? '').replace(/\D/g, '').slice(0, 6);
  return requisicao<void>('/auth/confirmar-email-cadastro', {
    method: 'POST',
    body: JSON.stringify({ email, codigo }),
  });
}

/**
 * Verifica se um e-mail já está cadastrado.
 * POST /auth/checar-email — body: { email } → { existe: boolean }
 * Uso: decidir entre o fluxo de login (existe=true) ou de cadastro (existe=false).
 */
export async function checarEmail(emailBruto: string): Promise<{ existe: boolean }> {
  const email = emailBruto.trim().toLowerCase();
  return requisicao<{ existe: boolean }>('/auth/checar-email', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

// ==================== Recuperação / Alteração de senha ====================

/**
 * Solicita código de recuperação por e-mail
 * POST /auth/esqueci-senha/email — body: { email }
 */
export async function esqueciSenhaEmail(email: string): Promise<void> {
  return requisicao<void>('/auth/esqueci-senha/email', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

/**
 * Redefine a senha com o código recebido
 * POST /auth/redefinir-senha/email — body: { email, codigo, novaSenha }
 * novaSenha: @Size(min=6)
 */
export async function redefinirSenhaEmail(
  email: string,
  codigo: string,
  novaSenha: string
): Promise<void> {
  return requisicao<void>('/auth/redefinir-senha/email', {
    method: 'POST',
    body: JSON.stringify({ email, codigo, novaSenha }),
  });
}

/**
 * Altera a senha do usuário autenticado
 * PUT /auth/alterar-senha — body: { senhaAtual, novaSenha }
 * novaSenha: @Size(min=6). Erros: 401 "A senha atual informada está incorreta."
 */
export async function alterarSenha(senhaAtual: string, novaSenha: string): Promise<void> {
  return requisicao<void>('/auth/alterar-senha', {
    method: 'PUT',
    body: JSON.stringify({ senhaAtual, novaSenha }),
  });
}

// ==================== Loja ====================

export interface EnderecoLojaDTO {
  cep: string;
  rua: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
}

export interface HorariosDTO {
  segunda: string;
  terca: string;
  quarta: string;
  quinta: string;
  sexta: string;
  sabado: string;
  domingo: string;
}

export interface DadosOperacionaisDTO {
  taxaEntregaBase: number;
  tempoEntregaMin: number;
  tempoEntregaMax: number;
  entregaPropria?: boolean;
  retiradaNoLocal?: boolean;
  raioEntregaKm?: number | null;
}

export interface FormasPagamentoDTO {
  aceitaDinheiro: boolean;
  aceitaCredito: boolean;
  aceitaDebito: boolean;
  aceitaPix: boolean;
  aceitaValeRefeicao: boolean;
  aceitaValeAlimentacao: boolean;
}

export interface LojaCreateDTO {
  nome: string;
  imagemUrl: string;
  descricao: string;
  categoria: string;
  isAberto: boolean;
  endereco: EnderecoLojaDTO;
  horarios: HorariosDTO;
  dadosOperacionais: DadosOperacionaisDTO;
  formasPagamento?: FormasPagamentoDTO;
}

export interface LojaResponseDTO extends LojaCreateDTO {
  id: string;
}

/**
 * Cria a loja do usuário logado — POST /lojas (autenticado, 201).
 * Spec §5.3: o `usuarioId` sempre vem do token (campo no body é ignorado);
 * após o 201 o backend promove CLIENTE → LOJISTA, então o frontend deve
 * refazer GET /minha-loja (ou refetch do usuário) antes de entrar no painel.
 * 400 VALIDACAO_FALHOU (Bean Validation: mensagem/detalhes por campo em
 * `message`/`details`) · 401 sem token/token inválido.
 *
 * Payload completo (todos obrigatórios exceto `complemento` e os opcionais
 * de `dadosOperacionais`/`formasPagamento`): nome, descricao, categoria,
 * imagemUrl, isAberto, dadosOperacionais{taxaEntregaBase, tempoEntregaMin,
 * tempoEntregaMax, entregaPropria, retiradaNoLocal, raioEntregaKm},
 * endereco{rua, numero, cidade, estado, cep, bairro, complemento?},
 * horarios{domingo..sabado}, formasPagamento{6 flags}.
 */
export async function criarLoja(dados: LojaCreateDTO): Promise<{ id: string }> {
  return requisicao<{ id: string }>('/lojas', {
    method: 'POST',
    body: JSON.stringify(dados),
  });
}

/**
 * Busca dados da loja do usuário autenticado.
 * GET /lojas/minha-loja (Bearer).
 * Spec §5.1/§5.2: 404 LOJA_NAO_ENCONTRADA = usuário autenticado ainda
 * NÃO criou loja — ESTADO VÁLIDO, retorna null (onboarding). 401 (token
 * expirado) propaga para o logout centralizado no `requisicao`; 5xx vira
 * toast com `requestId` logado no console.
 */
export async function buscarMinhaLoja(): Promise<LojaResponseDTO | null> {
  try {
    return await requisicao<LojaResponseDTO>('/lojas/minha-loja');
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return null;
    }
    throw err;
  }
}

/**
 * Atualiza dados da loja.
 * PUT /lojas/{id} — o backend exige o payload COMPLETO (não aceita parcial).
 * Por isso a assinatura pede LojaCreateDTO inteiro: quem chamar deve montar
 * o objeto completo (normalmente espalhando a loja já carregada do contexto
 * e sobrescrevendo só os campos que mudaram), nunca só os campos editados.
 */
export async function atualizarLoja(id: string, dados: LojaCreateDTO): Promise<LojaResponseDTO> {
  return requisicao<LojaResponseDTO>(`/lojas/${id}`, {
    method: 'PUT',
    body: JSON.stringify(dados),
  });
}

/**
 * Abre/fecha a loja sem reenviar o cadastro completo.
 * PATCH /lojas/{id}/abertura — body: { isAberto } (AtualizarAberturaDTO).
 * Use esta rota no toggle do painel: PUT /lojas/{id} exige o payload inteiro
 * e pode perder dados se algo estiver desatualizado no contexto.
 */
export async function atualizarAberturaLoja(id: string, isAberto: boolean): Promise<LojaResponseDTO> {
  return requisicao<LojaResponseDTO>(`/lojas/${id}/abertura`, {
    method: 'PATCH',
    body: JSON.stringify({ isAberto }),
  });
}

/**
 * Calcula frete para um endereço
 * POST /lojas/{id}/calcular-frete
 */
export interface CalcularFreteRequestDTO {
  cep: string;
  numero?: string;
}

export interface CalcularFreteResponseDTO {
  valorFrete: number;
  tempoEstimadoMin?: number;
  tempoEstimadoMax?: number;
}

export async function calcularFrete(
  lojaId: string,
  dados: CalcularFreteRequestDTO
): Promise<CalcularFreteResponseDTO> {
  return requisicao<CalcularFreteResponseDTO>(`/lojas/${lojaId}/calcular-frete`, {
    method: 'POST',
    body: JSON.stringify(dados),
  });
}

// ==================== Uploads (Firebase Storage via backend) ====================

/** Pastas aceitas pelo backend (UploadService.PASTAS_PERMITIDAS). */
export type PastaUpload = 'lojas' | 'produtos';

/**
 * Envia uma imagem para o Firebase Storage e devolve a URL pública.
 * POST /uploads/imagem — multipart/form-data: `arquivo` + `pasta`.
 * 201 → { url }. 400: arquivo ausente, formato fora de JPEG/PNG/WEBP,
 * acima do limite (5MB padrão) ou pasta inválida.
 * A URL retornada é persistente — usar em `imagemUrl` de loja/produto.
 */
export async function enviarImagem(arquivo: File, pasta: PastaUpload): Promise<string> {
  const dados = new FormData();
  dados.append('arquivo', arquivo);
  dados.append('pasta', pasta);

  const resposta = await requisicao<{ url: string }>('/uploads/imagem', {
    method: 'POST',
    body: dados,
  });
  return resposta.url;
}

// ==================== Produtos ====================

export interface PaginaSpring<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export interface ProdutoLojistaDTO {
  id?: string;
  nome: string;
  descricao: string;
  preco: number;
  categoriaMenu: string;
  imagemUrl?: string;
  /** ProdutoLojistaDTO.peso é String no backend (ex.: "200g"), não número. */
  peso?: string;
  percentualDesconto?: number;
  ativo: boolean;
  estoque?: number;
  adicionais?: GrupoAdicionalDTO[];
}

export interface GrupoAdicionalDTO {
  nome: string;
  obrigatorio: boolean;
  minimo?: number;
  maximo?: number;
  itens: { nome: string; preco: number }[];
}

export interface ResumoAvaliacoesDTO {
  media: number;
  totalAvaliacoes: number;
}

/**
 * Lista produtos da loja do lojista autenticado (paginado).
 * GET /lojista/produtos
 */
export async function listarProdutos(params?: { page?: number; size?: number }): Promise<ProdutoLojistaDTO[]> {
  const search = new URLSearchParams();
  search.set('size', String(params?.size ?? 100));
  if (params?.page !== undefined) search.set('page', String(params.page));

  const pagina = await requisicao<PaginaSpring<ProdutoLojistaDTO>>(`/lojista/produtos?${search.toString()}`);
  return pagina.content ?? [];
}

/**
 * Busca um produto específico por ID (visão do painel do lojista).
 * GET /lojista/produtos/{produtoId} → ProdutoLojistaDTO.
 * Importante: o endpoint público GET /produtos/{id} devolve ProdutoResumoDTO,
 * que NÃO traz `ativo` nem `estoque` — usá-lo no formulário de edição apagava
 * esses campos (produto voltava a ficar ativo/estoque zerado ao salvar).
 */
export async function buscarProduto(id: string): Promise<ProdutoLojistaDTO> {
  return requisicao<ProdutoLojistaDTO>(`/lojista/produtos/${id}`);
}

/**
 * O backend (ProdutoCreateDTO / ProdutoUpdateDTO) recebe `isAtivo` (@NotNull),
 * mas RESPONDE `ativo` (ProdutoLojistaDTO). O formulário trabalha com o campo
 * de resposta (`ativo`) — aqui convertemos para o contrato de entrada.
 * Validado em runtime na branch Edu: PUT sem `isAtivo` → 400 VALIDACAO_FALHOU.
 */
function paraPayloadProduto(dados: Partial<ProdutoLojistaDTO>): Record<string, unknown> {
  const { ativo, ...resto } = dados;
  return { ...resto, isAtivo: ativo };
}

/**
 * Cria um novo produto
 * POST /produtos
 */
export async function criarProduto(dados: ProdutoLojistaDTO): Promise<{ id: string }> {
  return requisicao<{ id: string }>('/produtos', {
    method: 'POST',
    body: JSON.stringify(paraPayloadProduto(dados)),
  });
}

/**
 * Atualiza um produto existente
 * PUT /produtos/{id} — payload completo (isAtivo obrigatório no backend).
 */
export async function atualizarProduto(id: string, dados: Partial<ProdutoLojistaDTO>): Promise<void> {
  return requisicao<void>(`/produtos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(paraPayloadProduto(dados)),
  });
}

/**
 * Desativa um produto (soft delete)
 * DELETE /produtos/{id} → 204 No Content
 */
export async function desativarProduto(id: string): Promise<void> {
  return requisicao<void>(`/produtos/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Ativa um produto previamente inativo
 * PATCH /produtos/{id}/ativar
 */
export async function ativarProduto(id: string): Promise<void> {
  return requisicao<void>(`/produtos/${id}/ativar`, {
    method: 'PATCH',
  });
}

/**
 * Atualiza a quantidade em estoque (reposição rápida).
 * PATCH /produtos/{id}/estoque — body: { estoque } (AtualizarEstoqueDTO,
 * valor ABSOLUTO e >= 0, não incremento).
 * Atenção ao contrato real (branch Edu): responde ProdutoResumoDTO — SEM os
 * campos `ativo`/`estoque` do ProdutoLojistaDTO. Quem chamar NÃO deve usar a
 * resposta como produto completo; recarregar a lista com listarProdutos().
 */
export async function atualizarEstoqueProduto(id: string, estoque: number): Promise<void> {
  return requisicao<void>(`/produtos/${id}/estoque`, {
    method: 'PATCH',
    body: JSON.stringify({ estoque }),
  });
}

/**
 * Resumo de avaliações de um produto
 * GET /produtos/{id}/avaliacoes/resumo
 */
export async function resumoAvaliacoesProduto(id: string): Promise<ResumoAvaliacoesDTO> {
  return requisicao<ResumoAvaliacoesDTO>(`/produtos/${id}/avaliacoes/resumo`);
}

// ==================== Pedidos ====================

/**
 * GET /lojista/pedidos — desde a correção do backend (Round 20), retorna
 * clienteNome + quantidadeItens em vez de lojaId/lojaNome (que eram sempre
 * a própria loja de quem está logado — inútil e causava o bug de mostrar o
 * nome da loja no lugar do cliente na listagem).
 */
export interface PedidoResumoLojistaDTO {
  id: string;
  clienteNome: string;
  quantidadeItens: number;
  valorTotal: number;
  status: string;
  criadoEm: string;
}

export interface EnderecoEntregaPedidoDTO {
  rua: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  complemento?: string;
}

export interface ItemPedidoDTO {
  id: string;
  produtoId: string;
  nome: string;
  imagemUrl?: string;
  preco: number;
  quantidade: number;
}

/**
 * GET /lojista/pedidos/{id} — novo nesta rodada (antes não existia; GET
 * /pedidos/{id} só autorizava o cliente comprador). Já vem com clienteNome/
 * clienteTelefone, que o lojista precisa pra atender o pedido.
 */
export interface PedidoDetalheLojistaDTO {
  id: string;
  clienteNome: string;
  clienteTelefone: string | null;
  valorTotal: number;
  taxaFrete: number;
  formaPagamento: string;
  trocoPara: number | null;
  observacao: string | null;
  status: string;
  criadoEm: string;
  enderecoEntrega: EnderecoEntregaPedidoDTO | null;
  itens: ItemPedidoDTO[];
}

/**
 * Lista pedidos recebidos pela loja do lojista autenticado (paginado).
 * GET /lojista/pedidos
 */
export async function listarPedidos(filtros?: {
  status?: string;
  page?: number;
  size?: number;
}): Promise<PedidoResumoLojistaDTO[]> {
  const params = new URLSearchParams();
  params.set('size', String(filtros?.size ?? 100));
  if (filtros?.page !== undefined) params.set('page', String(filtros.page));
  if (filtros?.status) params.set('status', filtros.status);

  const pagina = await requisicao<PaginaSpring<PedidoResumoLojistaDTO>>(`/lojista/pedidos?${params.toString()}`);
  return pagina.content ?? [];
}

/**
 * Detalhe de pedido para o lojista.
 * GET /lojista/pedidos/{id} — novo nesta rodada.
 */
export async function buscarPedido(id: string): Promise<PedidoDetalheLojistaDTO> {
  return requisicao<PedidoDetalheLojistaDTO>(`/lojista/pedidos/${id}`);
}

/**
 * Atualiza status de um pedido
 * PATCH /pedidos/{id}/status
 * (O cancelamento pelo painel passa por aqui com status "CANCELADO" — o
 * backend agora devolve o estoque nesse caminho também, ver Round 20.)
 */
export async function atualizarStatusPedido(id: string, status: string): Promise<void> {
  return requisicao<void>(`/pedidos/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

/**
 * Cancela um pedido
 * PATCH /pedidos/{id}/cancelar
 */
export async function cancelarPedido(id: string): Promise<void> {
  return requisicao<void>(`/pedidos/${id}/cancelar`, {
    method: 'PATCH',
  });
}

// ==================== Funcionários ====================
// Novo nesta rodada (Round 20): funcionário é uma conta com login próprio,
// cargo é só rótulo (sem RBAC real), o lojista define a senha no cadastro.

export interface FuncionarioResponseDTO {
  id: string;
  nomeCompleto: string;
  email: string;
  telefone: string;
  cargo: string;
  fotoUrl?: string;
  ativo: boolean;
  dataCadastro: string;
}

export interface FuncionarioCreateDTO {
  nome: string;
  email: string;
  telefone: string;
  senha: string;
  cargo: string;
}

export interface FuncionarioUpdateDTO {
  nome: string;
  telefone?: string;
  cargo: string;
  imagemUrl?: string;
}

/** GET /lojista/funcionarios */
export async function listarFuncionarios(): Promise<FuncionarioResponseDTO[]> {
  const pagina = await requisicao<PaginaSpring<FuncionarioResponseDTO>>('/lojista/funcionarios?size=100');
  return pagina.content ?? [];
}

/** POST /lojista/funcionarios — restrito ao dono da loja */
export async function criarFuncionario(dados: FuncionarioCreateDTO): Promise<FuncionarioResponseDTO> {
  return requisicao<FuncionarioResponseDTO>('/lojista/funcionarios', {
    method: 'POST',
    body: JSON.stringify(dados),
  });
}

/** PUT /lojista/funcionarios/{id} — não altera e-mail nem senha */
export async function atualizarFuncionario(id: string, dados: FuncionarioUpdateDTO): Promise<FuncionarioResponseDTO> {
  return requisicao<FuncionarioResponseDTO>(`/lojista/funcionarios/${id}`, {
    method: 'PUT',
    body: JSON.stringify(dados),
  });
}

/** DELETE /lojista/funcionarios/{id} — soft delete, já bloqueia login */
export async function desativarFuncionario(id: string): Promise<void> {
  return requisicao<void>(`/lojista/funcionarios/${id}`, {
    method: 'DELETE',
  });
}

/** PATCH /lojista/funcionarios/{id}/ativar */
export async function reativarFuncionario(id: string): Promise<FuncionarioResponseDTO> {
  return requisicao<FuncionarioResponseDTO>(`/lojista/funcionarios/${id}/ativar`, {
    method: 'PATCH',
  });
}

// ==================== Usuário (conta do lojista) ====================

/**
 * Dados editáveis da própria conta (UsuarioAtualizarDTO).
 * Atualização PARCIAL: campos omitidos (undefined/null) não são alterados;
 * o backend rejeita e-mail já usado por outra conta (400 REGRA_DE_NEGOCIO).
 */
export interface UsuarioAtualizarDTO {
  nome?: string;
  email?: string;
  telefone?: string;
  imagemUrl?: string;
}

/**
 * Os 4 toggles de notificação da tela de configurações da conta
 * (PreferenciasNotificacaoDTO — todos obrigatórios no PUT).
 */
export interface PreferenciasNotificacaoDTO {
  notificarNovoPedido: boolean;
  notificarMensagens: boolean;
  notificarAvaliacoes: boolean;
  notificarNovidades: boolean;
}

/**
 * Atualiza dados da própria conta.
 * PUT /usuarios/{id} — restrito ao dono. Responde LoginResponseDTO com um
 * token NOVO (o papel pode ter mudado), por isso devolvemos `accessToken`
 * para a UI renovar a sessão no localStorage.
 */
export async function atualizarUsuario(
  id: string,
  dados: UsuarioAtualizarDTO
): Promise<LoginResponseDTO & { accessToken: string }> {
  const resposta = await requisicao<LoginResponseDTO>(`/usuarios/${id}`, {
    method: 'PUT',
    body: JSON.stringify(dados),
  });
  return { ...resposta, accessToken: extrairToken(resposta) };
}

/** GET /usuarios/{id}/preferencias-notificacao (restrito ao dono) */
export async function buscarPreferenciasNotificacao(id: string): Promise<PreferenciasNotificacaoDTO> {
  return requisicao<PreferenciasNotificacaoDTO>(`/usuarios/${id}/preferencias-notificacao`);
}

/**
 * Substitui as 4 preferências de notificação de uma vez.
 * PUT /usuarios/{id}/preferencias-notificacao (restrito ao dono).
 */
export async function atualizarPreferenciasNotificacao(
  id: string,
  preferencias: PreferenciasNotificacaoDTO
): Promise<PreferenciasNotificacaoDTO> {
  return requisicao<PreferenciasNotificacaoDTO>(`/usuarios/${id}/preferencias-notificacao`, {
    method: 'PUT',
    body: JSON.stringify(preferencias),
  });
}

// ==================== Painel (Dashboard) ====================
// Novo nesta rodada (Round 20). GET /lojista/painel.

export interface FaturamentoDiaDTO {
  data: string;
  valor: number;
}

export interface PainelResumoDTO {
  lojaAberta: boolean;
  faturamentoHoje: number;
  pedidosEmPreparo: number;
  pedidosACaminho: number;
  pedidosConcluidosHoje: number;
  faturamentoUltimos7Dias: FaturamentoDiaDTO[];
  pedidosRecentes: PedidoResumoLojistaDTO[];
}

/** GET /lojista/painel */
export async function buscarPainel(): Promise<PainelResumoDTO> {
  return requisicao<PainelResumoDTO>('/lojista/painel');
}

// ==================== Financeiro ====================
// Novo nesta rodada (Round 20). GET /lojista/financeiro?periodo=...
// Atenção: o backend expõe faturamentoPeriodo (um valor só, referente ao
// período selecionado), não faturamentoDia + faturamentoMes simultâneos
// como o mock antigo do frontend tinha — por isso o tipo aqui é o contrato
// real da API, não o antigo `ResumoFinanceiro` de `types/index.ts`.

export type PeriodoFinanceiro = 'HOJE' | 'SETE_DIAS' | 'TRINTA_DIAS';

export interface ResumoFinanceiroDTO {
  faturamentoPeriodo: number;
  numeroPedidos: number;
  ticketMedio: number;
  taxaCancelamentoPercentual: number;
}

export interface PedidosPorDiaSemanaDTO {
  diaSemana: string;
  quantidade: number;
}

export interface VendasPorCategoriaDTO {
  categoria: string;
  valor: number;
  percentual: number;
}

export interface VendasPorPagamentoDTO {
  formaPagamento: string;
  valor: number;
  percentual: number;
}

export interface ProdutoMaisVendidoDTO {
  produtoId: string;
  nome: string;
  quantidadeVendida: number;
  faturamento: number;
}

export interface PedidosPorHoraDTO {
  hora: number;
  quantidade: number;
}

export interface FinanceiroDTO {
  periodo: string;
  resumo: ResumoFinanceiroDTO;
  faturamentoDiario: FaturamentoDiaDTO[];
  pedidosPorDiaSemana: PedidosPorDiaSemanaDTO[];
  vendasPorCategoria: VendasPorCategoriaDTO[];
  vendasPorFormaPagamento: VendasPorPagamentoDTO[];
  produtosMaisVendidos: ProdutoMaisVendidoDTO[];
  pedidosPorHora: PedidosPorHoraDTO[];
}

/** GET /lojista/financeiro?periodo=HOJE|SETE_DIAS|TRINTA_DIAS */
export async function buscarFinanceiro(periodo: PeriodoFinanceiro): Promise<FinanceiroDTO> {
  return requisicao<FinanceiroDTO>(`/lojista/financeiro?periodo=${periodo}`);
}

// ==================== Chat (histórico via REST) ====================
// Novo nesta rodada (Round 20). Envio de mensagem em tempo real é via
// WebSocket — ver services/chatSocket.ts. Isso aqui é só o histórico e a
// listagem de conversas.

export type RemetenteTipo = 'CLIENTE' | 'LOJA';

export interface ConversaResumoDTO {
  id: string;
  clienteId: string;
  clienteNome: string;
  ultimaMensagemPreview: string | null;
  ultimaMensagemEm: string;
  naoLidas: number;
}

export interface MensagemDTO {
  id: string;
  conversaId: string;
  remetenteTipo: RemetenteTipo;
  remetenteUsuarioId: string;
  conteudo: string;
  enviadaEm: string;
}

/** GET /lojista/conversas */
export async function listarConversas(): Promise<ConversaResumoDTO[]> {
  const pagina = await requisicao<PaginaSpring<ConversaResumoDTO>>('/lojista/conversas?size=100');
  return pagina.content ?? [];
}

/**
 * GET /lojista/conversas/{id}/mensagens — paginado, mais recentes primeiro.
 * O componente de chat deve inverter a ordem antes de renderizar (mais
 * antiga no topo), já que o backend devolve DESC por enviadaEm.
 */
export async function listarMensagens(conversaId: string, params?: { page?: number; size?: number }): Promise<MensagemDTO[]> {
  const search = new URLSearchParams();
  search.set('size', String(params?.size ?? 30));
  if (params?.page !== undefined) search.set('page', String(params.page));

  const pagina = await requisicao<PaginaSpring<MensagemDTO>>(`/lojista/conversas/${conversaId}/mensagens?${search.toString()}`);
  return pagina.content ?? [];
}

/** PATCH /lojista/conversas/{id}/lida */
export async function marcarConversaComoLida(conversaId: string): Promise<void> {
  return requisicao<void>(`/lojista/conversas/${conversaId}/lida`, {
    method: 'PATCH',
  });
}

// ==================== Utilitários ====================

/**
 * Busca CEP via ViaCEP
 */
export async function buscarCep(cep: string): Promise<{
  cep: string;
  logradouro: string;
  complemento?: string;
  bairro: string;
  localidade: string;
  uf: string;
}> {
  const cepLimpo = cep.replace(/\D/g, '');
  const resposta = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);

  if (!resposta.ok) {
    throw new Error('Erro ao buscar CEP');
  }

  return resposta.json();
}

export { requisicao };
