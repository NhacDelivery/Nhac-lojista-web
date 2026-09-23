import React, { createContext, useCallback, useContext, useState, useRef, useEffect, ReactNode } from 'react';

interface ToastContextType {
  mostrarToast: (mensagem: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ProvedorToast: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [mensagem, setMensagem] = useState<string | null>(null);

  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const mostrarToast = useCallback((texto: string) => {
    setMensagem(texto);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMensagem(null), 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ mostrarToast }}>
      {children}
      {mensagem && (
        <div
          role="alert"
          style={{
            position: 'fixed',
            bottom: '1.5rem',
            right: '1.5rem',
            zIndex: 'var(--z-toast, 500)',
            background: 'var(--nhac-texto, #5D201C)',
            color: 'var(--nhac-sobre-primaria, #FEE3E1)',
            padding: '0.875rem 1.25rem',
            borderRadius: 'var(--raio-cartao, 16px)',
            boxShadow: '0 6px 20px rgba(93, 32, 28, 0.30)',
            maxWidth: '320px',
            fontSize: '0.875rem',
          }}
        >
          {mensagem}
        </div>
      )}
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextType {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast deve ser usado dentro de ProvedorToast');
  }
  return ctx;
}
