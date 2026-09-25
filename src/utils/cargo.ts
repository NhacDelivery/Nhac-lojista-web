import { Cargo } from '../types';

/** Cargo da interface; a autorização das operações continua no backend. */
export function mapearCargo(papel?: string, cargo?: string | null): Cargo {
  // CLIENTE é a conta recém-criada, que ainda vai cadastrar sua própria loja.
  if (papel === 'LOJISTA' || papel === 'ADMIN') {
    return 'administrador';
  }
  if (papel === 'CLIENTE') return 'cliente';
  if (papel === 'FUNCIONARIO') {
    const normalizado = cargo?.trim().toLowerCase();
    if (normalizado === 'administrador' || normalizado === 'gerente') {
      return normalizado;
    }
  }
  return 'atendente';
}
