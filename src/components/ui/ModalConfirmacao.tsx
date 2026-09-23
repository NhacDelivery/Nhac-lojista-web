import React, { useEffect, useId, useRef, useState } from 'react';
import Botao from './Botao';
import estilos from './ModalConfirmacao.module.css';

interface ModalConfirmacaoProps {
  aberto: boolean; titulo: string; mensagem: string;
  textoBotaoConfirmar?: string;
  varianteBotaoConfirmar?: 'primario' | 'perigo' | 'secundario';
  aoConfirmar: () => unknown;
  aoCancelar: () => void;
}
export default function ModalConfirmacao({ aberto, titulo, mensagem, textoBotaoConfirmar = 'Confirmar',
  varianteBotaoConfirmar = 'perigo', aoConfirmar, aoCancelar }: ModalConfirmacaoProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const ocupado = useRef(false);
  const [salvando, setSalvando] = useState(false);
  const id = useId();
  useEffect(() => {
    if (!aberto) return;
    const anterior = document.activeElement as HTMLElement | null;
    const elemento = dialog.current;
    elemento?.showModal();
    return () => { elemento?.close(); anterior?.focus(); };
  }, [aberto]);
  if (!aberto) return null;
  const confirmar = async () => {
    if (ocupado.current) return;
    ocupado.current = true;
    setSalvando(true);
    try { await aoConfirmar(); }
    finally { ocupado.current = false; setSalvando(false); }
  };
  return <dialog ref={dialog} className={estilos.modal} aria-labelledby={`${id}-titulo`} aria-describedby={`${id}-mensagem`}
    data-testid="confirmation-modal" onCancel={e => { e.preventDefault(); if (!ocupado.current) aoCancelar(); }}>
    <h2 id={`${id}-titulo`} className={estilos.titulo}>{titulo}</h2>
    <p id={`${id}-mensagem`} className={estilos.mensagem}>{mensagem}</p>
    <div className={estilos.acoes}>
      <Botao autoFocus variante="secundario" disabled={salvando} onClick={aoCancelar} data-testid="confirmation-cancel">Cancelar</Botao>
      <Botao variante={varianteBotaoConfirmar} carregando={salvando} onClick={confirmar} data-testid="confirmation-submit">{textoBotaoConfirmar}</Botao>
    </div>
  </dialog>;
}
