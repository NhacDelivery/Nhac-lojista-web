---
version: alpha
name: Nhac Lojas
description: Painel operacional da marca Nhac para restaurantes e equipes.
colors:
  primary: '#FF6961'
  background: '#FFE7E5'
  surface: '#FFFFFF'
  text: '#5D201C'
  danger: '#C63F35'
typography:
  sans:
    fontFamily: 'Roboto, sans-serif'
  mono:
    fontFamily: 'Roboto Mono, monospace'
rounded:
  DEFAULT: '16px'
  sm: '8px'
  lg: '20px'
spacing:
  section-gap: '24px'
  page-max: '1200px'
components:
  button: {}
  card: {}
  dialog: {}
  input: {}
---
# Nhac Lojas Design System

## Overview
O quadro de pedidos de um restaurante é a referência: identificação rápida, status explícitos e ações próximas do pedido. Painel de uso diário em desktop e celular, português brasileiro, valores em reais. Evidência: PRODUCT.md e API NhacDelivery/backend-nhac. Não é landing page nem painel financeiro genérico.

A identidade existente é preservada: coral, fundo rosado, tinta marrom e logo oficial. O quadro operacional do painel é a assinatura; formulários permanecem discretos.

Os valores canônicos são mantidos em `src/styles/tema.css`. Este documento descreve esses tokens; não gera um segundo tema. Componentes consomem as variáveis CSS diretamente. Verificação: lint, build e inspeção do navegador.

## Colors
Coral para marca, branco para superfícies e marrom para texto. Estados usam tokens semânticos `--nhac-erro`, `--nhac-sucesso`, `--nhac-info` e `--nhac-aviso`, sempre acompanhados de texto. Scrollbar global usa tokens do tema, com fallback de sistema em forced-colors.

## Typography
Roboto para títulos, controles e leitura; Roboto Mono para identificação curta dos pedidos e dados operacionais. Fallbacks do sistema são válidos. Datas e moeda usam `utils/formatacao.ts` em pt-BR.

## Layout
Escala de 4, 8, 16, 24 e 32 px no tema. Conteúdo limitado a 1200 px, navegação lateral de 260 px e navegação móvel já existente. Formulários usam rolagem do documento. Paginação permite atingir todo o conjunto sem listas ilimitadas.

## Elevation & Depth
Cartões usam `--sombra-cartao`; confirmações usam `--sombra-elevada` e backdrop. Não adicionar elevação a todos os controles.

## Shapes
Botões em pílula, cartões de 16 px, diálogos de 20 px; ícones Lucide com traço consistente.

## Components
`Botao`, `InputTexto`, `Seletor`, `Toggle`, `Cartao`, `Paginacao` e `ModalConfirmacao` são os donos dos padrões. Foco visível, estados ocupados/desabilitados e rótulos acessíveis são obrigatórios. Seletor usa popup nativo do sistema por decisão explícita; não há requisito de geometria própria do popup. Diálogo usa `<dialog>.showModal()` para foco e isolamento nativos, botão cancelar focado inicialmente. Formulários usam noValidate e validação da aplicação/API. Mensagens ficam no ToastContext e erros de correção permanecem na tela.

Respeitar prefers-reduced-motion. Não usar animação para atrasar operação. Não usar dados fictícios como fallback de erro.

## Do's and Don'ts
- Preservar a marca e reutilizar os componentes compartilhados.
- Mostrar o estado real retornado pelo servidor e permitir nova tentativa.
- Não confundir cargo exibido com autorização implementada no servidor.
- Não criar controles sem ação, alert/confirm nativos ou listas truncadas silenciosamente.
