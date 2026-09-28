---
version: alpha
name: "Nhac Lojista"
description: "Painel de operação do delivery com a identidade coral e marrom do Nhac."
colors:
  primary: "#FF6961"
  background: "#FFE7E5"
  surface: "#FFFFFF"
  text: "#5D201C"
  border: "#F5C4C1"
  danger: "#C63F35"
typography:
  sans:
    fontFamily: "Roboto, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
  mono:
    fontFamily: "Roboto Mono, ui-monospace, Cascadia Mono, monospace"
rounded:
  card: "16px"
  control: "8px"
  pill: "999px"
spacing:
  section-gap: "24px"
  field-gap: "16px"
components:
  button: {}
  card: {}
  input: {}
---

# Nhac Lojista — contexto visual

## Overview

### Creative North Star

O painel é a bancada de operação da loja dentro da família Nhac: a cor coral identifica as ações, e superfícies claras mantêm pedidos, estoque e produtos fáceis de ler. A assinatura é a cor já usada no app cliente, aplicada com parcimônia aos controles e estados ativos.

### Product context and register

Lojistas brasileiros usam o painel em português para cadastrar produtos e atender pedidos. O registro é de produto: rapidez e clareza de estado prevalecem sobre efeitos decorativos. Evitar padrões visuais de painel corporativo genérico ou uma nova identidade separada do app Nhac.

### Token ownership/runtime mapping

Este arquivo documenta a identidade existente. `src/styles/tema.css` é a fonte canônica dos valores; os componentes usam variáveis CSS como `--nhac-primaria`, `--nhac-erro`, `--raio-cartao` e `--espaco-md`. Mudanças futuras de valor devem atualizar ambos no mesmo commit.

## Colors

Coral para ação principal e foco; marrom para texto; fundo rosa claro e cartões brancos para separar o trabalho da loja. Erros usam `--nhac-erro` com texto, além de cor. Não usar uma URL temporária como imagem persistida.

## Typography

Roboto serve textos e formulários; Roboto Mono é reservado para dados técnicos e numéricos conforme `tema.css`. Rótulos são frases curtas em português e valores monetários usam R$.

## Layout

Seções de formulário seguem cartões com intervalo de 24px; campos internos usam 16px. Linhas de opções de produto passam a duas colunas em telas estreitas, sem esconder nomes, preços ou remoção.

## Elevation & Depth

Cartões usam bordas e sombras discretas do tema. Erros aparecem próximos aos campos; não acrescentar sombras novas para estados comuns.

## Shapes

Cartões têm raio de 16px, controles pequenos 8px e botões em pílula quando o componente compartilhado determinar.

## Components

### Foundational visual states

Reutilizar `InputTexto`, `Botao`, `Cartao`, `Toggle` e os estilos de erro existentes. Upload em andamento desabilita salvar; sucesso só é anunciado após persistir a URL retornada pela API.

### Buttons and actions

Ações destrutivas usam a variante de perigo com nome acessível. Salvar continua no fim do formulário; cancelamento volta à lista da área correspondente.

### Navigation and data display

Pedidos e produtos conservam seus títulos e caminhos existentes; preço de adicional aparece junto do nome da opção.

### Forms and overlays

O lojista vê grupo, exigência, mínimo, máximo e opções com preço. Validação preserva o preenchimento e explica o campo a corrigir. Confirmar exclusão usa o modal existente.

### Iconography

Ícones Lucide acompanham texto; botões somente com ícone recebem nome acessível.

### Motion

Usar somente o feedback do tema e dos componentes existentes; reduzir movimento quando o sistema solicitar.

### Content and data visualization

Português direto: “Adicionar opção”, “Remover grupo”, “Salvar Produto”. Valores e erros são explícitos, sem depender só da cor.

## Do's and Don'ts

- Reutilizar os tokens e controles do app.
- Mostrar estado de envio e erro antes de salvar imagens.
- Não criar uma paleta independente para esta tela.
- Não persistir prévias locais ou placeholders como imagem da loja.
