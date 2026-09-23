import { useCallback, useEffect, useRef, useState } from 'react';
import { PaginaSpring } from '../services/api';
import { tratarErroApi } from '../utils/errosApi';

/** Ignores superseded responses and preserves data during background refresh. */
export function usePagina<T>(buscar: () => Promise<PaginaSpring<T>>, intervalo = 0) {
  const [dados, setDados] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const sequencia = useRef(0);
  const recarregar = useCallback(async (silencioso = false) => {
    const atual = ++sequencia.current;
    if (!silencioso) setCarregando(true);
    try {
      const pagina = await buscar();
      if (atual !== sequencia.current) return;
      setDados(pagina.content);
      setTotal(pagina.totalElements);
      setTotalPaginas(pagina.totalPages);
      setErro(null);
    } catch (e) {
      if (atual === sequencia.current) setErro(tratarErroApi(e).mensagemGeral ?? 'Não foi possível carregar. Tente novamente.');
    } finally {
      if (atual === sequencia.current) setCarregando(false);
    }
  }, [buscar]);
  useEffect(() => {
    recarregar();
    const timer = intervalo ? window.setInterval(() => {
      if (document.visibilityState === 'visible') recarregar(true);
    }, intervalo) : undefined;
    const contador = sequencia;
    return () => { contador.current++; window.clearInterval(timer); };
  }, [recarregar, intervalo]);
  return { dados, setDados, total, totalPaginas, carregando, erro, recarregar };
}
