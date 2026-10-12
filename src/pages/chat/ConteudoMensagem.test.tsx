import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import ConteudoMensagem from './ConteudoMensagem';

test('histórico persistido mantém foto, produto, preço e mensagem sem ID bruto', () => {
  const texto = 'Produto: Pizza\r\nID: prod-1\r\nPreço: R$ 19,90\r\nImagem: https://example.com/pizza.jpg\r\n\r\nTem cebola?';
  const view = render(<ConteudoMensagem conteudo={texto} />);
  expect(screen.getByRole('img', { name: 'Pizza' })).toHaveAttribute('src', 'https://example.com/pizza.jpg');
  expect(screen.getByText('R$ 19,90')).toBeInTheDocument();
  expect(screen.getByText('Tem cebola?')).toBeInTheDocument();
  expect(screen.queryByText(/prod-1/)).toBeNull();
  view.unmount();
  render(<ConteudoMensagem conteudo={texto} />);
  expect(screen.getByText('Pizza')).toBeInTheDocument();
});

test('conversa normal continua normal e referência antiga sem foto é interpretada', () => {
  const view = render(<ConteudoMensagem conteudo="Meu pedido saiu?" />);
  expect(screen.getByText('Meu pedido saiu?')).toBeInTheDocument();
  view.rerender(<ConteudoMensagem conteudo={'Produto: Pizza\nID: p1\nPreço: R$ 19,90'} />);
  expect(screen.getByText('Pizza')).toBeInTheDocument();
  expect(screen.queryByText(/ID:/)).toBeNull();
});

test('referência do pedido apresenta resumo e abre o detalhe correspondente', () => {
  render(<ConteudoMensagem conteudo={'Pedido: #ABCD1234\nID: pedido-1\nResumo: 2x Pizza\nTotal: R$ 50,00\nStatus: Em preparo\n\nMeu pedido saiu?'} />);
  expect(screen.getByText('#ABCD1234')).toBeInTheDocument();
  expect(screen.getByText('2x Pizza')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Abrir pedido' })).toHaveAttribute('href', '/pedidos/pedido-1');
  expect(screen.getByText('Meu pedido saiu?')).toBeInTheDocument();
});
