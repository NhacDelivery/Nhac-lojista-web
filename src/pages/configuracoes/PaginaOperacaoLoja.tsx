import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LayoutPagina from '../../components/layout/LayoutPagina';
import { Botao, Cartao, InputTexto, Toggle } from '../../components/ui';
import { useLoja } from '../../contexts/LojaContext';
import { useToast } from '../../contexts/ToastContext';
import { atualizarLoja, HorariosDTO } from '../../services/api';
import { tratarErroApi } from '../../utils/errosApi';
import estilos from './PaginaEditarInfoLoja.module.css';

const dias: [keyof HorariosDTO, string][] = [['segunda', 'Segunda-feira'], ['terca', 'Terça-feira'], ['quarta', 'Quarta-feira'], ['quinta', 'Quinta-feira'], ['sexta', 'Sexta-feira'], ['sabado', 'Sábado'], ['domingo', 'Domingo']];
export default function PaginaOperacaoLoja() {
  const { loja, recarregar } = useLoja();
  const navigate = useNavigate();
  const { mostrarToast } = useToast();
  const [horarios, setHorarios] = useState<HorariosDTO>(loja!.horarios || { segunda: '', terca: '', quarta: '', quinta: '', sexta: '', sabado: '', domingo: '' });
  const [taxa, setTaxa] = useState(String(loja!.dadosOperacionais?.taxaEntregaBase ?? ''));
  const [minimo, setMinimo] = useState(String(loja!.dadosOperacionais?.tempoEntregaMin ?? ''));
  const [maximo, setMaximo] = useState(String(loja!.dadosOperacionais?.tempoEntregaMax ?? ''));
  const [raio, setRaio] = useState(String(loja!.dadosOperacionais?.raioEntregaKm ?? ''));
  const [propria, setPropria] = useState(loja!.dadosOperacionais?.entregaPropria ?? true);
  const [retirada, setRetirada] = useState(loja!.dadosOperacionais?.retiradaNoLocal ?? false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const salvar = async (event: React.FormEvent) => {
    event.preventDefault();
    if (salvando || !loja) return;
    const valor = Number(taxa.replace(',', '.'));
    const alcance = raio.trim() ? Number(raio.replace(',', '.')) : null;
    if (!taxa.trim() || !minimo.trim() || !maximo.trim() || !Number.isFinite(valor) || valor < 0 ||
      !Number.isInteger(Number(minimo)) || Number(minimo) < 0 || !Number.isInteger(Number(maximo)) || Number(maximo) < Number(minimo) ||
      (alcance !== null && (!Number.isFinite(alcance) || alcance <= 0))) {
      setErro('Informe taxa válida, tempos inteiros com máximo maior ou igual ao mínimo e raio positivo.'); return;
    }
    const formato = /^(Fechado|([01]\d|2[0-3]):[0-5]\d\s*-\s*([01]\d|2[0-3]):[0-5]\d(,\s*([01]\d|2[0-3]):[0-5]\d\s*-\s*([01]\d|2[0-3]):[0-5]\d)*)$/i;
    if (dias.some(([dia]) => !formato.test(horarios[dia]?.trim() ?? ''))) {
      setErro('Use “Fechado” ou intervalos como 11:00 - 15:00, 18:00 - 23:00 em cada dia.'); return;
    }
    setSalvando(true); setErro('');
    try {
      const { id, ...cadastro } = loja;
      await atualizarLoja(id, { ...cadastro, horarios, dadosOperacionais: {
        taxaEntregaBase: valor, tempoEntregaMin: Number(minimo), tempoEntregaMax: Number(maximo),
        raioEntregaKm: alcance, entregaPropria: propria, retiradaNoLocal: retirada,
      } });
      await recarregar(); mostrarToast('Horários e entrega salvos.'); navigate('/configuracoes');
    } catch (e) { setErro(tratarErroApi(e).mensagemGeral ?? 'Não foi possível salvar.'); }
    finally { setSalvando(false); }
  };
  return <LayoutPagina titulo="Horários e entrega">
    <form noValidate onSubmit={salvar} className={estilos.form}>
      {erro && <p role="alert">{erro}</p>}
      <Cartao className={estilos.secao}>
        <h2>Horários de funcionamento</h2>
        <p>Informe os intervalos de atendimento ou “Fechado”.</p>
        {dias.map(([dia, nome]) => <InputTexto key={dia} rotulo={nome} valor={horarios[dia] || ''}
          aoMudar={valor => setHorarios(atual => ({ ...atual, [dia]: valor }))} placeholder="11:00 - 23:00" />)}
      </Cartao>
      <Cartao className={estilos.secao}>
        <h2>Entrega e retirada</h2>
        <InputTexto rotulo="Taxa base de entrega (R$)" valor={taxa} aoMudar={setTaxa} inputMode="decimal" />
        <InputTexto rotulo="Tempo mínimo (minutos)" valor={minimo} aoMudar={setMinimo} inputMode="numeric" />
        <InputTexto rotulo="Tempo máximo (minutos)" valor={maximo} aoMudar={setMaximo} inputMode="numeric" />
        <InputTexto rotulo="Raio de entrega (km)" valor={raio} aoMudar={setRaio} inputMode="decimal" placeholder="Vazio para ilimitado" />
        <Toggle rotulo="Entrega própria" ativo={propria} aoMudar={setPropria} />
        <Toggle rotulo="Retirada no local" ativo={retirada} aoMudar={setRetirada} />
      </Cartao>
      <div className={estilos.acoes}>
        <Botao variante="fantasma" disabled={salvando} onClick={() => navigate('/configuracoes')}>Cancelar</Botao>
        <Botao type="submit" carregando={salvando}>Salvar</Botao>
      </div>
    </form>
  </LayoutPagina>;
}
