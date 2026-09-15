import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LayoutPagina from '../../components/layout/LayoutPagina';
import Cartao from '../../components/ui/Cartao';
import InputTexto from '../../components/ui/InputTexto';
import Seletor from '../../components/ui/Seletor';
import Botao from '../../components/ui/Botao';
import { MapPin } from 'lucide-react';
import { mascaraCep, ESTADOS_BRASILEIROS } from '../../utils/formatacao';
import { useLoja } from '../../contexts/LojaContext';
import { atualizarLoja, buscarCep as apiBuscarCep } from '../../services/api';
import { tratarErroApi } from '../../utils/errosApi';
import { useToast } from '../../contexts/ToastContext';
import estilos from './PaginaEnderecoLoja.module.css';

const PaginaEnderecoLoja = () => {
  const navigate = useNavigate();
  const { loja, recarregar } = useLoja();
  const { mostrarToast } = useToast();

  const [cep, setCep] = useState('');
  const [rua, setRua] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [uf, setUf] = useState('');
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  // Preenche o formulário com o endereço REAL da loja (GET /lojas/minha-loja).
  useEffect(() => {
    const endereco = loja?.endereco;
    if (!endereco) return;
    setCep(mascaraCep(endereco.cep || ''));
    setRua(endereco.rua || '');
    setNumero(endereco.numero || '');
    setComplemento(endereco.complemento || '');
    setBairro(endereco.bairro || '');
    setCidade(endereco.cidade || '');
    // O backend usa `estado` (LojaDetalhesDTO.EnderecoDTO), não `uf`.
    setUf(endereco.estado || '');
  }, [loja]);

  /** Consulta o ViaCEP usando o helper do api.ts (mesmo do cadastro). */
  const buscarCep = async (valorCep: string) => {
    const cepLimpo = valorCep.replace(/\D/g, '');
    if (cepLimpo.length !== 8) return;

    setBuscandoCep(true);
    setErros((prev) => {
      const novos = { ...prev };
      delete novos.cep;
      return novos;
    });
    try {
      const dados = await apiBuscarCep(cepLimpo);
      setRua(dados.logradouro || '');
      setBairro(dados.bairro || '');
      setCidade(dados.localidade || '');
      setUf(dados.uf || '');
    } catch {
      setErros((prev) => ({ ...prev, cep: 'CEP não encontrado' }));
    } finally {
      setBuscandoCep(false);
    }
  };

  const handleSalvar = async () => {
    const novosErros: Record<string, string> = {};
    if (!cep) novosErros.cep = 'CEP é obrigatório';
    if (!rua) novosErros.rua = 'Rua é obrigatória';
    if (!numero) novosErros.numero = 'Número é obrigatório';
    if (!bairro) novosErros.bairro = 'Bairro é obrigatório';
    if (!cidade) novosErros.cidade = 'Cidade é obrigatória';
    if (!uf) novosErros.uf = 'UF é obrigatório';

    if (Object.keys(novosErros).length > 0) {
      setErros(novosErros);
      return;
    }

    setErros({});
    setErroGeral(null);
    setSalvando(true);
    try {
      // PUT /lojas/{id} exige o payload COMPLETO (o backend não aceita
      // parcial) — espalha a loja carregada e sobrescreve só o endereço.
      const lojaAtual = loja;
      if (!lojaAtual) {
        setErroGeral('Loja não carregada. Recarregue a página e tente novamente.');
        return;
      }
      const { id, ...lojaSemId } = lojaAtual;
      await atualizarLoja(id, {
        ...lojaSemId,
        endereco: {
          cep: cep.replace(/\D/g, ''),
          rua,
          numero,
          complemento: complemento || undefined,
          bairro,
          cidade,
          estado: uf,
        },
      });
      await recarregar();
      mostrarToast('Endereço salvo com sucesso!');
      navigate('/configuracoes');
    } catch (err) {
      const tratado = tratarErroApi(err);
      setErroGeral(tratado.mensagemGeral ?? 'Não foi possível salvar o endereço.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <LayoutPagina titulo="Endereço da loja">
      <div className={estilos.container}>
        <Cartao className={estilos.cartao}>
          <div className={estilos.grid}>
            <InputTexto
              rotulo="CEP"
              valor={cep}
              aoMudar={(v) => {
                const val = mascaraCep(v);
                setCep(val);
                if (val.length === 9) buscarCep(val);
              }}
              icone={<MapPin size={18} />}
              erro={erros.cep}
              obrigatorio
            />
            {buscandoCep && <span className={estilos.buscando}>Buscando endereço...</span>}

            <div className={estilos.grid2}>
              <InputTexto rotulo="Rua" valor={rua} aoMudar={setRua} erro={erros.rua} obrigatorio />
              <InputTexto rotulo="Número" valor={numero} aoMudar={setNumero} erro={erros.numero} obrigatorio />
            </div>

            <div className={estilos.grid2}>
              <InputTexto rotulo="Complemento" valor={complemento} aoMudar={setComplemento} />
              <InputTexto rotulo="Bairro" valor={bairro} aoMudar={setBairro} erro={erros.bairro} obrigatorio />
            </div>

            <div className={estilos.grid2}>
              <InputTexto rotulo="Cidade" valor={cidade} aoMudar={setCidade} erro={erros.cidade} obrigatorio />
              <Seletor
                rotulo="Estado (UF)"
                opcoes={ESTADOS_BRASILEIROS.map(u => ({ valor: u, rotulo: u }))}
                valor={uf}
                aoMudar={setUf}
                erro={erros.uf}
                obrigatorio
              />
            </div>
          </div>
        </Cartao>

        <div className={estilos.acoes}>
          {erroGeral && <span className={estilos.erro}>{erroGeral}</span>}
          <Botao variante="fantasma" onClick={() => navigate('/configuracoes')}>
            Cancelar
          </Botao>
          <Botao variante="primario" carregando={salvando} onClick={handleSalvar}>
            Salvar endereço
          </Botao>
        </div>
      </div>
    </LayoutPagina>
  );
};

export default PaginaEnderecoLoja;
