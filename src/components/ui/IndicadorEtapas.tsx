import React from 'react';
import { Check } from 'lucide-react';
import estilos from './IndicadorEtapas.module.css';

export interface PropsIndicadorEtapas {
  etapas: string[];
  etapaAtual: number;
  aoClicarEtapa?: (indice: number) => void;
  className?: string;
}

/**
 * Indicador de etapas do cadastro.
 *
 * Cada etapa ocupa a mesma largura (`flex: 1 1 0`) e o conector é desenhado
 * pelo `::before` de cada etapa, ancorado no centro do círculo. Dessa forma os
 * círculos ficam sempre na mesma linha, com espaçamento idêntico, mesmo quando
 * os rótulos têm larguras/anúmeros de linha diferentes (ex.: "Verificação de E-mail").
 */
const IndicadorEtapas = ({ etapas, etapaAtual, aoClicarEtapa, className = '' }: PropsIndicadorEtapas) => {
  return (
    <div className={`${estilos.container} ${className}`}>
      {etapas.map((etapa, indice) => {
        const completa = indice < etapaAtual;
        const ativa = indice === etapaAtual;
        const pendente = indice > etapaAtual;
        const clicavel = Boolean(aoClicarEtapa) && completa;

        return (
          <div
            key={etapa}
            className={[
              estilos.etapaWrapper,
              clicavel ? estilos.clicavel : '',
              // O trecho de linha que chega nesta etapa já está percorrido quando
              // a etapa é a atual ou anterior a ela.
              indice <= etapaAtual ? estilos.conectorAtivo : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={clicavel ? () => aoClicarEtapa?.(indice) : undefined}
          >
            <div
              className={[
                estilos.circulo,
                completa ? estilos.completa : '',
                ativa ? estilos.ativa : '',
                pendente ? estilos.pendente : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {completa ? <Check size={16} strokeWidth={3} /> : (indice + 1)}
            </div>
            <span
              className={[
                estilos.rotulo,
                ativa ? estilos.rotuloAtivo : '',
                pendente ? estilos.rotuloPendente : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {etapa}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default IndicadorEtapas;
