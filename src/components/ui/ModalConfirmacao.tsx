import React, { useEffect, useId, useRef } from 'react';
import Botao from './Botao';
import estilos from './ModalConfirmacao.module.css';

interface ModalConfirmacaoProps {
  aberto: boolean;
  carregando?: boolean;
  titulo: string;
  mensagem: string;
  textoBotaoConfirmar?: string;
  varianteBotaoConfirmar?: 'primario' | 'perigo' | 'secundario';
  aoConfirmar: () => void;
  aoCancelar: () => void;
}

const ModalConfirmacao: React.FC<ModalConfirmacaoProps> = ({
  aberto,
  carregando = false,
  titulo,
  mensagem,
  textoBotaoConfirmar = 'Confirmar',
  varianteBotaoConfirmar = 'perigo',
  aoConfirmar,
  aoCancelar,
}) => {
  const tituloId = useId();
  const mensagemId = useId();
  const modalRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!aberto) return;
    const anterior = document.activeElement as HTMLElement | null;
    modalRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    return () => anterior?.focus();
  }, [aberto]);
  if (!aberto) return null;

  return (
    <div className={estilos.overlay} onClick={() => !carregando && aoCancelar()} data-testid="confirmation-modal">
      <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby={tituloId} aria-describedby={mensagemId} aria-busy={carregando} className={estilos.modal} onClick={(e) => e.stopPropagation()} onKeyDown={e => {
        if (e.key === 'Escape' && !carregando) { e.stopPropagation(); aoCancelar(); }
        if (e.key === 'Tab') {
          const botoes = Array.from(modalRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') || []);
          const primeiro = botoes[0], ultimo = botoes[botoes.length - 1];
          if (!primeiro) { e.preventDefault(); return; }
          if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); ultimo.focus(); }
          else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro.focus(); }
        }
      }}>
        <h2 id={tituloId} className={estilos.titulo}>{titulo}</h2>
        <p id={mensagemId} className={estilos.mensagem}>{mensagem}</p>
        <div className={estilos.acoes}>
          <Botao variante="secundario" disabled={carregando} onClick={aoCancelar} data-testid="confirmation-cancel">
            Cancelar
          </Botao>
          <Botao variante={varianteBotaoConfirmar} carregando={carregando} onClick={aoConfirmar} data-testid="confirmation-submit">
            {textoBotaoConfirmar}
          </Botao>
        </div>
      </div>
    </div>
  );
};

export default ModalConfirmacao;
