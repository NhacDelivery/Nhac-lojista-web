---
version: alpha
colors:
  primary: "#FF6961"
  background: "#FFE7E5"
  surface: "#FFFFFF"
  text: "#5D201C"
  success: "#2F8F4E"
  danger: "#C63F35"
typography:
  body:
    fontFamily: "Roboto, sans-serif"
  utility:
    fontFamily: "Roboto Mono, ui-monospace, monospace"
rounded:
  card: "16px"
  control: "8px"
spacing:
  md: "16px"
  lg: "24px"
omitted:
  - section: components
    reason: "Shared React components and CSS modules remain the runtime owner."
---

## Overview

Nhac Lojas is the working counter of the same delivery service: owners and staff scan new orders, manage products, and talk to customers all day. Preserve the app's coral, pink, brown, and rounded forms; let order state and actions lead. Avoid a generic analytics dashboard look. `src/styles/tema.css` is the canonical runtime token owner; this file mirrors its values.

## Colors

`primary` maps to `--nhac-primaria`; `background` to `--nhac-fundo`; `surface` to `--nhac-superficie`; `text` to `--nhac-texto`; `success` to `--nhac-sucesso`; `danger` to `--nhac-erro`. CSS variables flow into shared UI components and screen modules. Semantic status also requires a label.

## Typography

Roboto is the body and action family (`--fonte-familia`); Roboto Mono marks operational data (`--fonte-mono`). All UI copy is Brazilian Portuguese.

## Layout

The sidebar supports desktop operation and the bottom navigation supports staff on mobile browser. Lists must expose older records and keep filters understandable.

## Elevation & Depth

Card shadows are defined by `--sombra-cartao` and `--sombra-suave`. Keep loading and error feedback in stable card geometry.

## Shapes

Card radius maps to `--raio-cartao`, control radius to `--raio-pequeno`; the existing pill treatment marks statuses and chips.

## Components

Reuse `Botao`, `InputTexto`, `Cartao`, `ModalConfirmacao`, the toast context, and the route layout. An operation that needs server acknowledgement retains the field value and shows pending state until confirmed.

## Do's and Don'ts

State partial saves explicitly. Never imply a chat message has been delivered because STOMP accepted a publish call. Keep unavailable product options out of the form until their order flow exists.
