import React, { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { TomAviso, descreverAviso } from '../utils/feedback';
import estilos from './ToastContext.module.css';

interface OpcoesToast { tipo?: TomAviso; titulo?: string; }
interface ToastContextType { mostrarToast: (mensagem: string, opcoes?: OpcoesToast) => void; }
const ToastContext = createContext<ToastContextType | undefined>(undefined);
const DURACAO_SUCESSO = 6000;
export const ProvedorToast: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [aviso, setAviso] = useState<{ mensagem: string; tipo: TomAviso; titulo?: string; orientacao?: string } | null>(null);
  const pausas = useRef(new Set<string>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const limparTimer = useCallback(() => { if (timer.current) { clearTimeout(timer.current); timer.current = null; } }, []);
  const fechar = useCallback(() => { limparTimer(); setAviso(null); }, [limparTimer]);
  const mostrarToast = useCallback((mensagem: string, opcoes?: OpcoesToast) => {
    limparTimer();
    // Uma chamada nova substitui a anterior. O timer antigo nunca fecha o aviso novo.
    const modelo = opcoes?.tipo === 'erro' ? descreverAviso(mensagem) : null;
    setAviso({ mensagem: modelo?.mensagem || mensagem, tipo: modelo?.tom || opcoes?.tipo || 'sucesso', titulo: opcoes?.titulo || modelo?.titulo, orientacao: modelo?.orientacao });
  }, [limparTimer]);
  useEffect(() => {
    if (aviso && aviso.tipo === 'sucesso') timer.current = setTimeout(fechar, DURACAO_SUCESSO);
    return limparTimer;
  }, [aviso, fechar, limparTimer]);
  const pausar = (motivo: string) => { pausas.current.add(motivo); limparTimer(); };
  const retomar = (motivo: string) => { pausas.current.delete(motivo); if (!pausas.current.size && aviso?.tipo === 'sucesso') { limparTimer(); timer.current = setTimeout(fechar, DURACAO_SUCESSO); } };
  const Icone = aviso?.tipo === 'sucesso' ? CheckCircle2 : aviso?.tipo === 'info' ? Info : AlertCircle;
  return <ToastContext.Provider value={{ mostrarToast }}>
    {children}
    {aviso && <div className={`${estilos.toast} ${estilos[aviso.tipo]}`} role={aviso.tipo === 'erro' || aviso.tipo === 'aviso' ? 'alert' : 'status'}
      onMouseEnter={() => pausar('mouse')} onMouseLeave={() => retomar('mouse')} onFocus={() => pausar('foco')} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) retomar('foco'); }}>
      <Icone size={22} aria-hidden="true" className={estilos.icone} />
      <div className={estilos.conteudo}><strong>{aviso.titulo || (aviso.tipo === 'sucesso' ? 'Tudo certo' : aviso.tipo === 'erro' ? 'Confira este aviso' : 'Antes de continuar')}</strong><p>{aviso.mensagem}</p>{aviso.orientacao && <p>{aviso.orientacao}</p>}</div>
      <button type="button" className={estilos.fechar} onClick={fechar} aria-label="Fechar aviso"><X size={18} aria-hidden="true" /></button>
    </div>}
  </ToastContext.Provider>;
};
export function useToast(): ToastContextType {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast deve ser usado dentro de ProvedorToast');
  return ctx;
}
