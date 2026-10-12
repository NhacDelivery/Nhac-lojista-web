import React, { useEffect, useId, useRef } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { AvisoModelo, descreverAviso, rotuloCampo } from '../../utils/feedback';
import Botao from './Botao';
import estilos from './AvisoFormulario.module.css';

interface Props {
  mensagem?: string;
  aviso?: AvisoModelo;
  aoCorrigirCampo?: (campo: string) => void;
  aoTentarNovamente?: () => void;
  focar?: boolean;
}
export default function AvisoFormulario({ mensagem, aviso, aoCorrigirCampo, aoTentarNovamente, focar = false }: Props) {
  const id = useId();
  const ref = useRef<HTMLElement>(null);
  const modelo = aviso || descreverAviso(mensagem);
  useEffect(() => { if (focar) ref.current?.focus(); }, [focar, modelo.mensagem]);
  const Icone = { erro: AlertCircle, aviso: AlertTriangle, info: Info, sucesso: CheckCircle2 }[modelo.tom];
  return (
    <section ref={ref} tabIndex={-1} role="alert" aria-labelledby={`${id}-titulo`} className={`${estilos.container} ${estilos[modelo.tom]}`}>
      <div className={estilos.icone}><Icone size={22} aria-hidden="true" /></div>
      <div className={estilos.conteudo}>
        <h3 id={`${id}-titulo`}>{modelo.titulo}</h3>
        <p>{modelo.mensagem}</p>
        {modelo.orientacao && <p className={estilos.orientacao}>{modelo.orientacao}</p>}
        {modelo.campos && <ul className={estilos.campos}>{Object.entries(modelo.campos).map(([campo, msg]) => (
          <li key={campo}>{aoCorrigirCampo && rotuloCampo(campo) !== 'Campo informado' ? <button type="button" onClick={() => aoCorrigirCampo(campo)}><strong>{rotuloCampo(campo)}</strong> — {msg}</button> : <span><strong>{rotuloCampo(campo)}</strong> — {msg}</span>}</li>
        ))}</ul>}
        {(modelo.sugerirLogin || aoTentarNovamente) && <div className={estilos.acoes}>
          {aoTentarNovamente && <Botao type="button" variante="secundario" tamanho="pequeno" onClick={aoTentarNovamente}>Tentar novamente</Botao>}
          {modelo.sugerirLogin && <><a href="/login">Fazer login</a><a href="/recuperar-senha">Recuperar senha</a></>}
        </div>}
        {modelo.requestId && <details className={estilos.referencia}><summary>Referência para suporte</summary><code>{modelo.requestId}</code></details>}
      </div>
    </section>
  );
}
