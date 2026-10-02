import React from 'react';
import estilos from './PaginaChat.module.css';

export function lerReferenciaProduto(conteudo: string) {
  const match = /^Produto: ([^\n]+)\nID: ([^\n]+)\nPreço: ([^\n]+)(?:\nImagem: ([^\n]+))?(?:\n\n([\s\S]*))?$/.exec(conteudo.replace(/\r\n/g, '\n'));
  if (!match) return null;
  return { nome: match[1], preco: match[3], imagem: match[4], mensagem: match[5] || '' };
}

export default function ConteudoMensagem({ conteudo }: { conteudo: string }) {
  const produto = lerReferenciaProduto(conteudo);
  if (!produto) return <>{conteudo}</>;
  let imagemSegura = false;
  try { imagemSegura = new URL(produto.imagem).protocol === 'https:'; } catch (_) { /* Sem foto válida. */ }
  return <>
    <div className={estilos.referenciaProduto}>
      {imagemSegura && <img src={produto.imagem} alt={produto.nome} onError={(event) => { event.currentTarget.hidden = true; }} />}
      <div><strong>{produto.nome}</strong><div>{produto.preco}</div></div>
    </div>
    {produto.mensagem && <div className={estilos.textoReferencia}>{produto.mensagem}</div>}
  </>;
}
