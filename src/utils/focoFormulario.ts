import { rotuloCampo } from './feedback';

export function focarCampo(campo: string, raiz: ParentNode = document): void {
  const controles = Array.from(raiz.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input, select, textarea'));
  const alvo = controles.find(c => c.name === campo || c.dataset.campo === campo)
    || controles.find(c => Array.from(document.querySelectorAll<HTMLLabelElement>('label')).some(label =>
      label.htmlFor === c.id && label.textContent?.replace(/\*/g, '').trim().toLowerCase().includes(rotuloCampo(campo).toLowerCase())))
    || controles.find(c => c.getAttribute('aria-invalid') === 'true');
  alvo?.focus();
  if (!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) alvo?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
}
