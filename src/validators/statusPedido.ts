/**
 * Transições de status de pedido — espelham exatamente o método
 * `podeMudarPara` do enum StatusPedido do backend.
 *
 * O frontend bloqueia no UI transições inválidas antes de chamar a API.
 * Se o backend ainda assim retornar 409 TRANSICAO_STATUS_INVALIDA,
 * exibir toast com a mensagem do backend e refazer o fetch.
 */

import { StatusPedido } from '../types';

export const TRANSICOES_STATUS: Record<StatusPedido, StatusPedido[]> = {
  PENDENTE: ['PAGO', 'CANCELADO'],
  PAGO: ['PREPARANDO', 'CANCELADO'],
  PREPARANDO: ['SAIU_ENTREGA', 'CANCELADO'],
  SAIU_ENTREGA: ['ENTREGUE'],
  ENTREGUE: [],
  CANCELADO: [],
};

/**
 * O lojista confirma o pagamento manual e inicia o preparo. A coleta e a
 * conclusão pertencem ao entregador e devem apenas ser acompanhadas aqui.
 */
export const PROXIMO_STATUS_LOJISTA: Partial<Record<StatusPedido, StatusPedido>> = {
  PENDENTE: 'PAGO',
  PAGO: 'PREPARANDO',
};

export function proximoStatusPermitidoParaLojista(status: StatusPedido): StatusPedido | null {
  return PROXIMO_STATUS_LOJISTA[status] ?? null;
}

export function podeTransicionarComoLojista(de: StatusPedido, para: StatusPedido): boolean {
  return proximoStatusPermitidoParaLojista(de) === para;
}

/** Status para os quais o pedido atual pode avançar (botões exibidos no UI). */
export function proximosStatusPermitidos(status: StatusPedido): StatusPedido[] {
  return TRANSICOES_STATUS[status] ?? [];
}

/** Verifica se uma transição é válida antes de chamar a API. */
export function podeTransicionar(de: StatusPedido, para: StatusPedido): boolean {
  return proximosStatusPermitidos(de).includes(para);
}

/** Pedido em status final não aceita mais nenhuma transição. */
export function ehStatusFinal(status: StatusPedido): boolean {
  return proximosStatusPermitidos(status).length === 0;
}

/** Cancelamento permitido apenas enquanto ainda não saiu para entrega. */
export function podeCancelar(status: StatusPedido): boolean {
  return proximosStatusPermitidos(status).includes('CANCELADO');
}

/** Rótulo de ação para o botão que avança para o próximo status. */
export const ROTULO_ACAO_STATUS: Record<StatusPedido, string> = {
  PENDENTE: 'Confirmar pagamento',
  PAGO: 'Iniciar preparo',
  PREPARANDO: 'Saiu para entrega',
  SAIU_ENTREGA: 'Concluir entrega',
  ENTREGUE: 'Entregue',
  CANCELADO: 'Cancelado',
};
