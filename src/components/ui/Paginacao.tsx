import React from 'react';
import Botao from './Botao';

export default function Paginacao({ pagina, totalPaginas, total, carregando, aoMudar }: {
  pagina: number; totalPaginas: number; total: number; carregando: boolean; aoMudar: (pagina: number) => void;
}) {
  return <nav aria-label="Paginação" className="paginacao">
    <Botao variante="secundario" disabled={carregando || pagina === 0} onClick={() => aoMudar(pagina - 1)}>Anterior</Botao>
    <span role="status">Página {pagina + 1} de {Math.max(1, totalPaginas)} · {total} registros</span>
    <Botao variante="secundario" disabled={carregando || pagina + 1 >= totalPaginas} onClick={() => aoMudar(pagina + 1)}>Próxima</Botao>
  </nav>;
}
