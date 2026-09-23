import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import LayoutPagina from '../../components/layout/LayoutPagina';
import InputTexto from '../../components/ui/InputTexto';
import Seletor from '../../components/ui/Seletor';
import Botao from '../../components/ui/Botao';
import Cartao from '../../components/ui/Cartao';
import { buscarFuncionario, criarFuncionario, atualizarFuncionario } from '../../services/api';
import { tratarErroApi } from '../../utils/errosApi';
import { useToast } from '../../contexts/ToastContext';
import estilos from './PaginaFormularioFuncionario.module.css';

const opcoesCargo = [
  { valor: '', rotulo: 'Selecione um cargo' },
  { valor: 'Administrador', rotulo: 'Administrador' },
  { valor: 'Gerente', rotulo: 'Gerente' },
  { valor: 'Atendente', rotulo: 'Atendente' },
];

const PaginaFormularioFuncionario = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { mostrarToast } = useToast();
  const ehEdicao = !!id && id !== 'novo';

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [cargo, setCargo] = useState('');
  const [senha, setSenha] = useState('');
  const [carregandoDados, setCarregandoDados] = useState(ehEdicao);
  const [salvando, setSalvando] = useState(false);
  const [registroCarregado, setRegistroCarregado] = useState(!ehEdicao);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (!ehEdicao || !id) return;
    // Não existe GET /lojista/funcionarios/{id} — a listagem já traz tudo,
    // então reaproveita a lista pra achar o registro (mesmo padrão que a
    // tela de produtos usa pra editar produtos inativos).
    (async () => {
      try {
        setCarregandoDados(true);
        const func = await buscarFuncionario(id);
        if (func) {
          setRegistroCarregado(true);
          setNome(func.nomeCompleto);
          setEmail(func.email);
          setTelefone(func.telefone || '');
          setCargo(func.cargo);
        } else {
          setErro('Funcionário não encontrado.');
        }
      } catch (err) {
        const tratado = tratarErroApi(err);
        setErro(tratado.mensagemGeral ?? 'Não foi possível carregar os dados do funcionário.');
      } finally {
        setCarregandoDados(false);
      }
    })();
  }, [ehEdicao, id]);

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (salvando || !registroCarregado) return;
    if (!nome.trim() || !cargo || (!ehEdicao && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^(?=.*[a-zA-Z])(?=.*\d).{8,}$/.test(senha)))) {
      setErro('Preencha nome, cargo, e-mail válido e senha com 8 caracteres, letra e número.');
      return;
    }
    setSalvando(true);
    setErro('');
    try {
      if (ehEdicao && id) {
        await atualizarFuncionario(id, { nome, telefone, cargo });
      } else {
        await criarFuncionario({ nome, email, telefone, senha, cargo });
      }
      mostrarToast(ehEdicao ? 'Funcionário atualizado.' : 'Funcionário cadastrado.');
      navigate('/funcionarios');
    } catch (err) {
      const tratado = tratarErroApi(err);
      if (tratado.toastGenerico) {
        mostrarToast(tratado.mensagemGeral ?? 'Erro interno.');
      } else {
        setErro(tratado.mensagemGeral ?? 'Não foi possível salvar o funcionário.');
      }
    } finally {
      setSalvando(false);
    }
  };

  if (carregandoDados) {
    return (
      <LayoutPagina titulo="Editar Funcionário">
        <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--nhac-texto-claro)' }}>Carregando...</p>
      </LayoutPagina>
    );
  }

  return (
    <LayoutPagina titulo={ehEdicao ? 'Editar Funcionário' : 'Novo Funcionário'}>
      <form noValidate onSubmit={handleSalvar} className={estilos.form}>
        <Cartao className={estilos.cartao}>
          <h3 className={estilos.tituloSecao}>Dados do Funcionário</h3>

          {erro && (
            <div style={{ color: 'var(--nhac-erro, #e53935)', marginBottom: '1rem', fontSize: '0.875rem' }}>
              {erro}
            </div>
          )}

          <div className={estilos.grid}>
            <InputTexto rotulo="Nome Completo" valor={nome} aoMudar={setNome} obrigatorio />
            <InputTexto
              rotulo="E-mail"
              tipo="email"
              valor={email}
              aoMudar={setEmail}
              obrigatorio
              // E-mail é a identidade de login — não dá pra trocar depois do
              // cadastro por esta tela (PUT /lojista/funcionarios não aceita
              // esse campo).
              disabled={ehEdicao}
            />
            <InputTexto rotulo="Telefone" valor={telefone} aoMudar={setTelefone} placeholder="(00) 00000-0000" />
            <Seletor rotulo="Cargo" valor={cargo} aoMudar={setCargo} opcoes={opcoesCargo} obrigatorio />

            {!ehEdicao && (
              <div>
                <InputTexto
                  rotulo="Senha inicial"
                  tipo="password"
                  valor={senha}
                  aoMudar={setSenha}
                  obrigatorio
                />
                <small style={{ color: 'var(--nhac-texto-claro)', fontSize: '0.75rem' }}>
                  Mínimo 8 caracteres, com pelo menos uma letra e um número. O funcionário pode trocar depois em &quot;Esqueci minha senha&quot;.
                </small>
              </div>
            )}
          </div>
        </Cartao>

        <div className={estilos.acoes}>
          <Botao type="button" variante="fantasma" onClick={() => navigate('/funcionarios')}>Cancelar</Botao>
          <Botao type="submit" variante="primario" carregando={salvando} disabled={!registroCarregado}>Salvar</Botao>
        </div>
      </form>
    </LayoutPagina>
  );
};

export default PaginaFormularioFuncionario;
