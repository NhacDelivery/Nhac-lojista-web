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

## Fluxos operacionais

No chat, aguardar a confirmação da mensagem pelo servidor e recuperar o histórico após a reconexão. Na edição do endereço, exibir a posição marcada no mapa e só anunciar sucesso quando endereço e coordenadas forem salvos. A navegação deve manter acessíveis pedidos antigos, filtros e estados de erro.

## Avisos e recuperação

`AvisoFormulario` é o componente compartilhado para falhas que exigem correção. Usa os tokens de superfície, texto, raio e tons de `tema.css`, com uma faixa lateral, ícone e título. O texto principal explica a situação; a orientação diz o que fazer; campos conhecidos têm links de foco. Não exibir status HTTP, stack trace, SQL, senha ou corpo da requisição. A referência de suporte fica em uma divulgação secundária.

`ToastContext` usa a mesma linguagem visual. Sucessos são anunciados educadamente e encerrados após seis segundos, pausando com foco/hover; falhas persistem até fechar e não usam o tom de sucesso. Um formulário mantém seu aviso próprio mesmo quando há uma notificação complementar.

## Imagens da loja e do catálogo

Logos usam superfície branca, borda do tema e cantos arredondados, com `object-fit: contain`; fotos de pessoas continuam usando o avatar circular. Fotos de produto usam moldura 1:1 e contenção, inclusive no chat. Novos uploads são convertidos para JPEG 800 × 800, com zoom proporcional e recorte central para preencher o quadrado, sem barras brancas ou distorção. Mostrar formatos aceitos, limite de 5 MB e resultado antes da seleção. Durante preparação/envio, indicar andamento e bloquear seleção/remoção concorrentes. Uma falha mantém a imagem anterior.
