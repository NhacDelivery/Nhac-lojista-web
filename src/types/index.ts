// ==================== Usuário e Autenticação ====================

// Cargo exibido no painel. `cliente` é o estado temporário de uma conta
// recém-criada que ainda não cadastrou sua loja; ele não recebe permissões
// do painel e só pode entrar no onboarding.
export type Cargo = 'administrador' | 'gerente' | 'atendente' | 'cliente';

export interface Usuario {
  id: string;
  nomeCompleto: string;
  email: string;
  telefone: string;
  cargo: Cargo;
  fotoUrl?: string;
  lojaId: string;
}

export interface DadosLogin {
  email: string;
  senha: string;
}

// ==================== Loja ====================

export interface Loja {
  id: string;
  nome: string;
  descricao: string;
  categoria: string;
  fotoUrl?: string;
  endereco: Endereco;
  entrega: DadosEntrega;
  horarios: HorarioDia[];
  formasPagamento: FormasPagamento;
  notaMedia?: number;
  totalAvaliacoes?: number;
}

export interface Endereco {
  cep: string;
  rua: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  uf: string;
}

export interface DadosEntrega {
  entregaPropria: boolean;
  retiradaNoLocal: boolean;
  raioEntregaKm: number;
  taxaEntregaReais: number;
}

export interface HorarioDia {
  diaSemana: string;
  aberto: boolean;
  horarioAbertura: string;
  horarioFechamento: string;
}

export interface FormasPagamento {
  dinheiro: boolean;
  cartaoCredito: boolean;
  cartaoDebito: boolean;
  pix: boolean;
  valeRefeicao: boolean;
  valeAlimentacao: boolean;
}

// ==================== Cadastro (Wizard) ====================

export interface DadosCadastroEtapa1 {
  nomeCompleto: string;
  email: string;
  telefone: string;
  senha: string;
  confirmarSenha: string;
}

export interface DadosCadastroEtapa2 {
  fotoLoja: File | null;
  fotoLojaPreview: string;
  nomeLoja: string;
  descricaoLoja: string;
  categoriaLoja: string;
}

export type DadosCadastroEtapa3 = Endereco;

export type DadosCadastroEtapa4 = DadosEntrega;

export interface DadosCadastroEtapa5 {
  horarios: HorarioDia[];
}

export type DadosCadastroEtapa6 = FormasPagamento;

// ==================== Produtos ====================

export interface Adicional {
  id: string;
  nome: string;
  preco: number;
}

export interface GrupoAdicional {
  id: string;
  nome: string;
  obrigatorio: boolean;
  minimo: number;
  maximo: number;
  itens: Adicional[];
}

export interface Produto {
  id: string;
  nome: string;
  descricao: string;
  fotoUrl: string;
  categoria: string;
  preco: number;
  ativo: boolean;
  adicionais?: GrupoAdicional[];
}

// ==================== Funcionários ====================

export interface Funcionario {
  id: string;
  nomeCompleto: string;
  email: string;
  telefone: string;
  cargo: Cargo;
  fotoUrl?: string;
  ativo: boolean;
  dataCadastro: string;
}

// ==================== Pedidos ====================

export type StatusPedido = 'PENDENTE' | 'PAGO' | 'PREPARANDO' | 'SAIU_ENTREGA' | 'ENTREGUE' | 'CANCELADO';

export interface ItemPedido {
  produtoId: string;
  nomeProduto: string;
  quantidade: number;
  precoUnitario: number;
  adicionais?: string[];
}

export interface Pedido {
  id: string;
  numeroPedido: number;
  clienteNome: string;
  clienteTelefone: string;
  itens: ItemPedido[];
  valorTotal: number;
  status: StatusPedido;
  formaPagamento: string;
  enderecoEntrega: string;
  dataCriacao: string;
  observacoes?: string;
}

// ==================== Chat ====================

export interface Mensagem {
  id: string;
  remetenteId: string;
  remetenteNome: string;
  ehLoja: boolean;
  conteudo: string;
  dataEnvio: string;
  lida: boolean;
}

export interface Conversa {
  id: string;
  clienteNome: string;
  clienteFotoUrl?: string;
  pedidoId: string;
  numeroPedido: number;
  mensagens: Mensagem[];
  naoLidas: number;
  ultimaMensagem: string;
  dataUltimaMensagem: string;
}

// ==================== Financeiro ====================

export interface DadosFaturamento {
  data: string;
  valor: number;
}

export interface PedidosPorDia {
  dia: string;
  quantidade: number;
}

export interface VendasPorCategoria {
  categoria: string;
  valor: number;
  porcentagem: number;
}

export interface ProdutoMaisVendido {
  posicao: number;
  nome: string;
  quantidadeVendida: number;
  faturamento: number;
}

export interface ResumoFinanceiro {
  faturamentoDia: number;
  faturamentoMes: number;
  numeroPedidosDia: number;
  numeroPedidosMes: number;
  ticketMedio: number;
  taxaCancelamento: number;
}

export type FiltroPeriodo = 'hoje' | '7dias' | '30dias' | 'personalizado';

// ==================== Navegação ====================

export interface ItemMenu {
  rotulo: string;
  caminho: string;
  icone: string;
  cargosPermitidos: Cargo[];
}
