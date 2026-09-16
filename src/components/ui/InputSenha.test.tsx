import React, { useState } from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import InputSenha from './InputSenha';

const Harness = ({ comPlaceholder = true }: { comPlaceholder?: boolean }) => {
  const [valor, setValor] = useState('');
  const [mostrar, setMostrar] = useState(false);
  return (
    <InputSenha
      rotulo="Senha"
      valor={valor}
      aoMudar={setValor}
      placeholder={comPlaceholder ? 'Sua senha' : undefined}
      icone={<span data-testid="icone-lock">lock</span>}
      mostrarAgora={mostrar}
      onAlternarVisualizacao={() => setMostrar(!mostrar)}
      obrigatorio
    />
  );
};

describe('InputSenha', () => {
  it('esconde o placeholder quando o campo está vazio e sem foco (evita texto sobreposto ao rótulo)', () => {
    render(<Harness />);
    const input = screen.getByTestId('icone-lock').parentElement!.parentElement!.querySelector('input')!;

    expect(screen.queryByPlaceholderText('Sua senha')).toBeNull();
    expect(screen.getByText(/Senha/)).toBeTruthy();

    fireEvent.focus(input);
    expect(screen.getByPlaceholderText('Sua senha')).toBeTruthy();

    fireEvent.blur(input);
    expect(screen.queryByPlaceholderText('Sua senha')).toBeNull();
  });

  it('renderiza o ícone à esquerda, antes do input (não colide com o botão do olho)', () => {
    render(<Harness />);
    const icone = screen.getByTestId('icone-lock');
    const input = icone.parentElement!.parentElement!.querySelector('input')!;

    // eslint-disable-next-line no-bitwise
    expect(icone.compareDocumentPosition(input) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('alterna o tipo do input e o rótulo de acessibilidade ao clicar no olho', () => {
    render(<Harness />);
    const icone = screen.getByTestId('icone-lock');
    const input = icone.parentElement!.parentElement!.querySelector('input')!;

    expect(input.getAttribute('type')).toBe('password');

    const botao = screen.getByRole('button', { name: 'Mostrar senha' });
    fireEvent.click(botao);

    expect(input.getAttribute('type')).toBe('text');
    expect(screen.getByRole('button', { name: 'Ocultar senha' })).toBeTruthy();
  });

  it('reserva espaço à direita do input quando existe o botão de alternância', () => {
    const { container } = render(<Harness />);
    const input = container.querySelector('input')!;
    expect(input.className).toContain('comAcao');
  });

  it('dispara onBlur (validação do formulário)', () => {
    const aoSair = jest.fn();
    render(
      <InputSenha rotulo="Senha" valor="" aoMudar={() => undefined} onBlur={aoSair} obrigatorio />,
    );
    const input = document.querySelector('input')!;

    fireEvent.blur(input);
    expect(aoSair).toHaveBeenCalledTimes(1);
  });

  it('repassa o que o usuário digita', () => {
    render(<Harness />);
    const input = screen.getByTestId('icone-lock').parentElement!.parentElement!.querySelector('input')!;

    fireEvent.change(input, { target: { value: 'senha123' } });
    expect((input as HTMLInputElement).value).toBe('senha123');
  });
});
