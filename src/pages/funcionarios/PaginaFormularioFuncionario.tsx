import AvisoFormulario from '../../components/ui/AvisoFormulario';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import LayoutPagina from '../../components/layout/LayoutPagina';
import InputTexto from '../../components/ui/InputTexto';
import Seletor from '../../components/ui/Seletor';
import Botao from '../../components/ui/Botao';
import Cartao from '../../components/ui/Cartao';
import { listarFuncionarios, criarFuncionario, atualizarFuncionario } from '../../services/api';
import { tratarErroApi } from '../../utils/errosApi';
import { useToast } from '../../contexts/ToastContext';
import { AvisoModelo, descreverAviso } from '../../utils/feedback';
import { focarCampo } from '../../utils/focoFormulario';
import { obrigatorio, validarEmail, validarTelefone, validarSenhaCadastro, normalizarEmail, soDigitos } from '../../validators';
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
  const [aviso, setAviso] = useState<AvisoModelo | null>(null);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [registroCarregado, setRegistroCarregado] = useState(!ehEdicao);

  useEffect(() => {
    if (!ehEdicao || !id) return;
    let ativo = true;
    setRegistroCarregado(false);
    // Não existe GET /lojista/funcionarios/{id} — a listagem já traz tudo,
    // então reaproveita a lista pra achar o registro (mesmo padrão que a
    // tela de produtos usa pra editar produtos inativos).
    (async () => {
      try {
        setCarregandoDados(true);
        const funcionarios = await listarFuncionarios();
        if (!ativo) return;
        const func = funcionarios.find(f => f.id === id);
        if (func) {
          setRegistroCarregado(true);
          setNome(func.nomeCompleto);
          setEmail(func.email);
          setTelefone(func.telefone || '');
          setCargo(func.cargo);
        } else {
          setAviso(descreverAviso({ status: 404 }));
        }
      } catch (err) {
        const tratado = tratarErroApi(err);
        if (ativo) setAviso(tratado.aviso || null);
      } finally {
        if (ativo) setCarregandoDados(false);
      }
    })();
    return () => { ativo = false; };
  }, [ehEdicao, id]);

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (salvando || !registroCarregado) return;
    const telefoneDigitos = soDigitos(telefone);
    const telefoneNacional = telefoneDigitos.startsWith('55') && telefoneDigitos.length > 11 ? telefoneDigitos.slice(2) : telefoneDigitos;
    const validacoes: Record<string, string | null> = {
      nome: obrigatorio('Informe o nome do funcionário.')(nome),
      cargo: opcoesCargo.some(opcao => opcao.valor && opcao.valor === cargo) ? null : 'Selecione um cargo.',
      telefone: !ehEdicao || telefone.trim() ? validarTelefone(telefoneNacional) : null,
      ...(!ehEdicao ? { email: validarEmail(email), senha: validarSenhaCadastro(senha) } : {}),
    };
    const invalidos = Object.fromEntries(Object.entries(validacoes).filter((entrada): entrada is [string, string] => !!entrada[1]));
    setErros(invalidos);
    if (Object.keys(invalidos).length) {
      setAviso(descreverAviso({ status: 400, details: invalidos }));
      focarCampo(Object.keys(invalidos)[0]);
      return;
    }
    setSalvando(true);
    setAviso(null);
    try {
      if (ehEdicao && id) {
        await atualizarFuncionario(id, { nome: nome.trim(), telefone: telefoneNacional, cargo });
      } else {
        await criarFuncionario({ nome: nome.trim(), email: normalizarEmail(email), telefone: telefoneNacional, senha, cargo });
      }
      mostrarToast(ehEdicao ? 'Funcionário atualizado.' : 'Funcionário cadastrado.');
      navigate('/funcionarios');
    } catch (err) {
      const tratado = tratarErroApi(err);
      setAviso(tratado.aviso || null);
      setErros(tratado.errosCampos || {});
      if (tratado.errosCampos) focarCampo(Object.keys(tratado.errosCampos)[0]);
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
      <form onSubmit={handleSalvar} className={estilos.form} noValidate>
        <Cartao className={estilos.cartao}>
          <h3 className={estilos.tituloSecao}>Dados do Funcionário</h3>

          {aviso && (
            <AvisoFormulario aviso={aviso} aoCorrigirCampo={focarCampo} />
          )}

          <div className={estilos.grid}>
            <InputTexto name="nome" erro={erros.nome || erros.nomeCompleto} rotulo="Nome Completo" valor={nome} aoMudar={setNome} obrigatorio />
            <InputTexto
              name="email"
              erro={erros.email}
              autoComplete="email"
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
            <InputTexto name="telefone" erro={erros.telefone} obrigatorio={!ehEdicao} tipo="tel" autoComplete="tel-national" rotulo="Telefone" valor={telefone} aoMudar={setTelefone} placeholder="(00) 00000-0000" />
            <Seletor erro={erros.cargo} rotulo="Cargo" valor={cargo} aoMudar={setCargo} opcoes={opcoesCargo} obrigatorio />

            {!ehEdicao && (
              <div>
                <InputTexto
                  name="senha"
                  erro={erros.senha}
                  autoComplete="new-password"
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
