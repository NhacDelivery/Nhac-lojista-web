# Surface brief — Nhac Lojista Web (redesign total)

## Scope and visitor mode

Modo **Operate**: app shell + todas as páginas (auth, painel, pedidos, produtos, chat, funcionário, financeiro, configurações). Visitante = lojista/equipe em turno, repetindo tarefas o dia inteiro; expressão jamais pode esconder tarefa, estado ou afordância familiar.

## Audience, job, action, proof, constraints

Público e job: PRODUCT.md. Ação nesta rodada: operar a loja (status, fila de pedidos, produtos, chat, financeiro) sem fricção. Prova: o painel carrega com a operação inteira legível em segundos. Constraints: funcionalidade, rotas, cópias e dados intocados; identidade do appNhac é vinculante; sem gerador de imagem (code-led); pt-BR.

## Chosen direction and memorable moment

Direção: **Quadro de PartidasNhac** (centro de despacho do delivery). Momento memorável: a **faixa AGORA** — a placa coral com o relógio vivo que corre no topo do eixo de horário e a fila que reordena no lugar quando um pedido muda de estado, sustentando o alerta até ser notado.

## Unresolved decisions

Nenhuma. Build path: code-led (sem gerador de imagem no ambiente; sem comps por contrato).

## Direction contract

<!-- development-only: never ship this file's contract into the artifact -->

THESIS: O painel é o quadro de despacho do delivery — a operação se lê como partidas alinhadas num eixo de horário — e não o dashboardSaaS de cartões iguais que a categoria sempre entrega.

OWN-WORLD: Chão rosa-cremeNhac; folhas brancas de rota com raio 16; coral só para ação e alerta; marrom para toda a fala; pílulas planas sem sombra; Roboto semibold; números tabulares; placas e tarjas — nunca ornamento tech.

STORY: O lojista vê a loja aberta, a próxima partida e o que fazer; acredita que está no comando do turno; age aceitando e preparando sem sair do eixo.

FIRST VIEWPORT: No Painel, faixa full-bleed de status ABERTO/FECHADO ocupando a largura toda, com relógio e faixa coral AGORA; abaixo, fila de tarjas de rota (nº tabular, hora, cliente, estado) à esquerda e etiquetas de conferência (KPIs) com atalhos à direita; nav lateral = placas de destino sob o logoNhac.

FORM: direção "Quadro de PartidasNhac" da lista grounded, posição 7, candidata principal da rodada; seed key 4796a9b1.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, the DESIGN.md, and every shipping raster carrying its provenance.