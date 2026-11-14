# AGENTS.md — Frontend (Tsukuyomi Focus)

Escopo exclusivo do **frontend** (`frontend/`): Next.js App Router, TypeScript strict, Tailwind CSS v4, Zustand (`localStorage`), Framer Motion, `@dnd-kit`, Web Audio API e Canvas. Regras de negócio, contratos e fórmulas autoritativos vivem em `../IMPLEMENTATION_PLAN.md` — consulte cada seção sob demanda antes de implementar.

---

## 1. Protocolo Obrigatório de Commit no Início de Toda Execução

Em **todo início de processo de execução** (nova sessão, início do roadmap ou início de qualquer passo/issue), execute este gate **antes de criar ou editar qualquer arquivo**:

1. Rode `git status` e `git branch --show-current` na raiz do repositório; Sempre na branch frontend.
2. Garanta que o estado atual esteja registrado em um commit de início de execução:
   - Se houver alterações pendentes: `git add -A && git commit -m "chore(frontend): checkpoint antes de <etapa>"`
   - Se a árvore estiver limpa: `git commit --allow-empty -m "chore(frontend): start <etapa>"`
3. Confirme com `git log -1 --oneline` que o commit de início foi criado.

**Critério de conclusão:** `git log -1` exibe o commit de início da etapa atual antes da primeira edição de código.

Ao concluir cada passo com verificações verdes (`npx tsc --noEmit` e `npm run lint`), registre um commit de fechamento (`feat(frontend): ...`) para manter o histórico rastreável por etapa.

---

## 2. Ponteiros de Regras e Skills Obrigatórias

Leia `../.agents/skills/mandatory-rules.md` e aplique a skill correspondente sempre que o ramo abaixo disparar:

- **Arquitetura App Router, fontes e RSC boundary** → `../.agents/skills/nextjs-app-router-patterns/SKILL.md` (`layout.tsx` e `page.tsx` permanecem Server Components; `'use client'` apenas em `<TsukuyomiApp />` e folhas interativas; fontes via `next/font/google` no nível de módulo).
- **Tokens, tema Normal/Tsukuyomi e animações CSS** → `../.agents/skills/tailwind-design-system/SKILL.md` (Tailwind v4 via `@import "tailwindcss";` e `@theme` em `src/app/globals.css`, sem `tailwind.config.ts`).
- **Animações e física** → `../.agents/skills/framer-motion/SKILL.md` e `../.agents/skills/framer-motion-animator/SKILL.md` (pacote `framer-motion` instalado no `package.json`; anime apenas `transform`, `opacity`, `filter`; arrays com `>= 3` keyframes exigem `type: "tween"`, nunca `"spring"`; respeite `useReducedMotion()` e `AnimatePresence`).
- **Performance React/Next e hidratação** → `../.agents/skills/vercel-react-best-practices/SKILL.md` (sem barrel files `index.ts`; animar `<svg>` via wrapper `<div>`; `useRef` para timer/áudio; seletores derivados no Zustand; `version` + `migrate` no `persist`; gate `hasHydrated` contra hydration mismatch).
- **Composição de UI** → `../.agents/skills/vercel-composition-patterns/SKILL.md` (variantes explícitas e compound components em vez de proliferação de props booleanas).
- **Acessibilidade e tipografia numérica** → `../.agents/skills/web-design-guidelines/SKILL.md` (`aria-label`, navegação por teclado, `font-mono tabular-nums` no cronômetro/KPIs, contraste garantido no Modo Tsukuyomi e no Desgaste Visual).
- **Direção de arte Uchiha & Parallax Awwwards (`uchiha-cinematic-parallax`)** → Seção 4 abaixo (obrigatória ao criar, estilizar ou refatorar componentes visuais, telas, modais, SVGs oculares, Amaterasu, Susanoo, Izanagi ou layouts do Tsukuyomi Focus).

---

## 3. Passo a Passo Exclusivo do Frontend

Execute os passos em ordem sequencial. **Não avance** antes de cumprir o protocolo de commit inicial (Seção 1) e o critério de conclusão da etapa.

### Passo 1 — Fundação, Tipos, Design System & Store (`ISSUE-01`)
Referência: `../IMPLEMENTATION_PLAN.md` (Seções 3, 4, 5 `ISSUE-01` e 6).
1. Definir contratos globais em `src/types/tsukuyomi.ts`.
2. Criar constantes puras em `src/constants/ranks.ts`, `src/constants/evolution.ts` e `src/constants/seed.ts`.
3. Criar utilitários base em `src/lib/cn.ts`, `src/lib/date.ts` e cálculos puros em `src/lib/gamification.ts`.
4. Implementar `src/store/useTsukuyomiStore.ts` com Zustand `persist` (`'tsukuyomi-focus-storage'`, `version: 1`, `migrate`, `hasHydrated`, recálculo de `targetEndTime` no `onRehydrateStorage`).
5. Configurar tokens `@theme` Normal/Tsukuyomi em `src/app/globals.css`, fontes/metadata em `src/app/layout.tsx` e montagem de `<TsukuyomiApp />` em `src/app/page.tsx`.
6. Criar casca visual em `src/components/layout/`: `TsukuyomiApp.tsx`, `NinjaHeader.tsx`, `TabNavigation.tsx`, `GenjutsuBackdrop.tsx` (incluindo mapeamento de `visualBlurLevel`).

**Critério de conclusão:** App sobe sem hydration mismatch, alterna Normal vs. Tsukuyomi, exibe header/abas e passa em `npx tsc --noEmit` + `npm run lint`.

### Passo 2 — Relógio Ocular Central (`ISSUE-02`)
Referência: `../IMPLEMENTATION_PLAN.md` (Seção 5 `ISSUE-02`).
1. Implementar vetores dos 7 estágios e 5 variantes Mangekyou em `src/components/clock/SharinganSvg.tsx`.
2. Implementar `<OcularClock />` em `src/components/clock/OcularClock.tsx` (anel SVG circular de progresso, modo híbrido SVG vs. `customEye.imageDataUrl`, display `MM:SS` em `font-mono tabular-nums`, missão ativa, rotação `tween` em wrapper `<div>`, burst inicial e aceleração nos últimos 60s).

**Critério de conclusão:** Todos os 7 estágios e 5 variantes MS renderizam com animação 60fps via wrapper `<div>` e respeitam `useReducedMotion()`.

### Passo 3 — Engine Anti-Throttling & Ambiente Sonoro (`ISSUE-03`)
Referência: `../IMPLEMENTATION_PLAN.md` (Seção 5 `ISSUE-03` e Seção 7.3).
1. Implementar `src/hooks/useFocusTimer.ts` (`targetEndTime`, `setInterval` 250ms, `visibilitychange`/`focus`, sincronização de `document.title`).
2. Implementar singleton `src/lib/audioEngine.ts` (Web Audio API sintetizada + fallback `/audio/*.mp3`, desbloqueio por gesto do usuário, 3 canais ambientes + SFX).
3. Implementar `src/components/clock/TimerControls.tsx`, `src/components/audio/AmbientSoundMixer.tsx` e compor `src/components/clock/TempleView.tsx`.

**Critério de conclusão:** Timer mantém precisão em aba em segundo plano, áudio persiste ao trocar de aba e controles respeitam presets e mute.

### Passo 4 — Quadro Kanban & Ranks Ninja (`ISSUE-04`)
Referência: `../IMPLEMENTATION_PLAN.md` (Seção 5 `ISSUE-04` e Seção 7.4).
1. Implementar `src/components/kanban/KanbanBoard.tsx`, `KanbanColumn.tsx`, `MissionCard.tsx` e `NewMissionModal.tsx` usando `@dnd-kit/core` e `@dnd-kit/sortable`.
2. Configurar `PointerSensor` com `activationConstraint: { distance: 8 }`, `KeyboardSensor`, `DragOverlay` e `stopPropagation()` nos botões internos dos cards.
3. Implementar ação rápida **"Tragar para o Tsukuyomi"** (move para `in_tsukuyomi`, vincula `activeMissionId`, ajusta duração se `idle` e navega para `temple`).

**Critério de conclusão:** Drag-and-drop entre as 3 colunas, criação de missão com Rank `D..S` e atalho para o Templo funcionam sem conflito clique vs. arraste.

### Passo 5 — Mecânicas de Lore I: Amaterasu & Susano'o (`ISSUE-05`)
Referência: `../IMPLEMENTATION_PLAN.md` (Seção 5 `ISSUE-05`).
1. Garantir unicidade diária do Amaterasu, ordenação Amaterasu-first nas colunas, visual de chamas negras e bônus `2.0x`.
2. Implementar `src/hooks/useDailyChecks.ts` e `src/components/modals/AmaterasuPenaltyBanner.tsx` (dedução de `300` Chakra na virada de dia para Amaterasu incompleta).
3. Implementar `src/components/clock/SusanooAura.tsx` (3 fases: `0–33%`, `34–66%`, `67–100%`), bônus `1.25x` e trava anti-impulso em `src/components/modals/SusanooBreakModal.tsx` exigindo a frase exata `"Eu aceito quebrar meu Susanoo e perder Chakra"`.

**Critério de conclusão:** Penalidade de virada de dia dispara apenas após `hasHydrated`, aura do Susano'o evolui em 3 fases e abandono selado exige digitação exata da frase.

### Passo 6 — Mecânicas de Lore II: Desgaste Visual, Streak & Izanagi (`ISSUE-06`)
Referência: `../IMPLEMENTATION_PLAN.md` (Seção 5 `ISSUE-06`).
1. Ligar incremento de `visualBlurLevel` (até `3`) ao abandono e decremento (`Colírio`) à conclusão intacta, além do cálculo de `streak` / `longestStreak`.
2. Implementar `src/components/modals/IzanagiModal.tsx` com fluxo de ativação (inversão breve de tela via `tween`, cegueira sequencial `rightEyeBlind` -> `leftEyeBlind`, preservação de streak/abandono, bloqueio com ambos cegos) e restauração progressiva (`180` min por olho).

**Critério de conclusão:** Desgaste visual, streak e ritual Izanagi (incluindo restauração em 180 min) atualizam estado e UI de forma determinística.

### Passo 7 — Santuário Naka, Customizador IA & Simulador Dev (`ISSUE-07`)
Referência: `../IMPLEMENTATION_PLAN.md` (Seção 5 `ISSUE-07` e Seção 7.2).
1. Implementar `src/lib/imageUpload.ts` (compressão HTML5 Canvas `<= 512x512` WebP) e `src/components/evolution/CustomEyeUploader.tsx` (upload/URL, máscara circular, zoom, glow).
2. Implementar `src/components/evolution/NakaShrineView.tsx` (Tábua de Pedra Uchiha com 7 níveis + seletor de Mangekyou), `AwakeningModal.tsx` e `DevSimulatorBar.tsx`.

**Critério de conclusão:** Desbloqueio automático (Chakra ou `streak >= 7` para MS), upload comprimido aplicado ao `<OcularClock />` e Dev Mode testam todos os estágios e despertares.

### Passo 8 — Pergaminho de Estatísticas & Heatmap 365 Dias (`ISSUE-08`)
Referência: `../IMPLEMENTATION_PLAN.md` (Seção 5 `ISSUE-08`).
1. Implementar `src/components/scroll/ScrollStatsView.tsx` com os KPIs de foco, Chakra, ofensiva, precisão Uchiha, Izanagi e Amaterasu.
2. Implementar `src/components/scroll/UchihaHeatmap.tsx` (grid 52+ semanas / 365 dias com 5 níveis carmesim e tooltip), `RankDistributionChart.tsx` e `SessionLogList.tsx` (filtros por Rank e Status).

**Critério de conclusão:** Dados de seed e novas sessões refletem imediatamente nos KPIs, heatmap, barras por Rank e filtros do log.

### Passo 9 — Auditoria Final do Frontend
Referência: `../IMPLEMENTATION_PLAN.md` (Seção 8) e `../.agents/skills/mandatory-rules.md`.
1. Executar `npx tsc --noEmit`, `npm run lint` e `npm run build` dentro de `frontend/`.
2. Revisar o diff contra as skills da Seção 2 e validar o fluxo funcional das 8 issues.

**Critério de conclusão:** Zero erros de TypeScript, ESLint e build de produção, com todas as regras das skills verificadas.

---

## 4. Direção de Arte & Engenharia de Animação (`uchiha-cinematic-parallax`)

Diretrizes arquiteturais e estéticas para construir interfaces dark-cinematic no padrão Awwwards com parallax em profundidade (3D multi-layer e scroll-driven) e fidelidade visual estrita ao universo Uchiha do anime.

**Quando aplicar:**
- Criar ou refatorar componentes visuais do Tsukuyomi Focus (`OcularClock`, `SharinganSvg`, `SusanooAura`, `TempleView`, `KanbanBoard`, `NakaShrineView`, `ScrollStatsView` e modais rituais).
- Implementar efeitos de parallax controlados por cursor (3D tilt/magnetic depth) ou por scroll (`useScroll` + `useTransform`) no estilo Awwwards.
- Traduzir elementos canônicos do anime (Sharingan, Mangekyou, chamas negras do Amaterasu, costelas/armadura do Susanoo, distorção do Izanagi e Tábua de Pedra do Santuário Naka) para UI/SVG sem estética genérica de jogos ou cyberpunk.
- Otimizar animações complexas em Framer Motion mantendo 60fps constantes e zero re-renders desnecessários no React.

### 4.1 Arquitetura de Parallax Multi-Camadas (Padrão Awwwards)

Estruture cada tela ou componente focal em 4 planos de profundidade (`z-depth`) usando `useMotionValue`, `useSpring` e `useTransform` do `framer-motion`. **Nunca** use `useState` para rastrear coordenadas de mouse ou scroll.

- **Plano -2 (Abismo & Atmosfera):** Fundo `#09090B` (ou `#000000` no Modo Tsukuyomi), vinheta radial carmesim profunda e textura de grão/fumaça com movimento inverso lento (fator `-0.015` a `-0.025`).
- **Plano -1 (Arquitetura & Simbolismo Ritual):** Silhuetas sutis do Santuário Naka, geometria de selos na pedra ou costelas etéreas do Susanoo posicionadas atrás do componente principal (fator `-0.04`).
- **Plano 0 (Superfície de Obsidiana / UI Funcional):** Cards e containers em `#121215` / `#18181B` com borda `#27272A`, perspectiva 3D (`perspective: 1200px`) e inclinação sutil (`rotateX` e `rotateY` entre `-4deg` e `4deg`).
- **Plano +1 (Energia Focal & Olho):** Íris do Sharingan, anéis de Tomoe, brasas negras do Amaterasu e indicadores de Chakra com deslocamento positivo (fator `0.05` a `0.08`) e `drop-shadow` dinâmico que reage à direção da luz.

Padrão base de hook para Parallax 3D sem re-render (ex.: `src/hooks/useAwwwardsParallax.ts`):

```tsx
'use client';

import type { PointerEvent } from 'react';
import {
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
} from 'framer-motion';

export function useAwwwardsParallax(intensity = 1) {
  const prefersReducedMotion = useReducedMotion();
  const factor = prefersReducedMotion ? 0 : intensity;

  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);

  const springConfig = { stiffness: 110, damping: 26, mass: 0.6 };
  const smoothX = useSpring(rawX, springConfig);
  const smoothY = useSpring(rawY, springConfig);

  const rotateX = useTransform(smoothY, [-0.5, 0.5], [4 * factor, -4 * factor]);
  const rotateY = useTransform(smoothX, [-0.5, 0.5], [-4 * factor, 4 * factor]);

  const layerBgX = useTransform(smoothX, [-0.5, 0.5], [12 * factor, -12 * factor]);
  const layerBgY = useTransform(smoothY, [-0.5, 0.5], [12 * factor, -12 * factor]);

  const layerMidX = useTransform(smoothX, [-0.5, 0.5], [-18 * factor, 18 * factor]);
  const layerMidY = useTransform(smoothY, [-0.5, 0.5], [-18 * factor, 18 * factor]);

  const layerFgX = useTransform(smoothX, [-0.5, 0.5], [-32 * factor, 32 * factor]);
  const layerFgY = useTransform(smoothY, [-0.5, 0.5], [-32 * factor, 32 * factor]);

  function handlePointerMove(e: PointerEvent<HTMLElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const normX = (e.clientX - rect.left) / rect.width - 0.5;
    const normY = (e.clientY - rect.top) / rect.height - 0.5;
    rawX.set(normX);
    rawY.set(normY);
  }

  function handlePointerLeave() {
    rawX.set(0);
    rawY.set(0);
  }

  return {
    rotateX,
    rotateY,
    layerBg: { x: layerBgX, y: layerBgY },
    layerMid: { x: layerMidX, y: layerMidY },
    layerFg: { x: layerFgX, y: layerFgY },
    handlers: {
      onPointerMove: handlePointerMove,
      onPointerLeave: handlePointerLeave,
    },
  };
}
```

### 4.2 Coreografia de Scroll Parallax & Transição de Câmara

Em telas com rolagem (`NakaShrineView`, `ScrollStatsView`, `KanbanBoard`), trate o scroll como o movimento físico de uma câmera cinematográfica descendo por um santuário escuro:

- Use `useScroll({ target: ref, offset: ['start end', 'end start'] })` acoplado a `useTransform` para deslocar camadas de fundo em velocidades distintas (`y: ['0%', '18%']` para pedra/fundo vs. `y: ['0%', '-6%']` para elementos em primeiro plano).
- Aplique transições entre abas (`Templo`, `Kanban`, `Santuário`, `Pergaminho`) simulando profundidade focal (Dolly Zoom sutil): entrada com `initial={{ opacity: 0, scale: 0.97, filter: 'blur(6px)' }}`, `animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}` e saída com `exit={{ opacity: 0, scale: 1.02, filter: 'blur(4px)' }}` usando `duration: 0.45` e curva cinematográfica `ease: [0.16, 1, 0.3, 1]`.

### 4.3 Fidelidade Canônica à Estética do Anime (Naruto / Uchiha)

Mantenha a representação visual fiel à direção de arte sombria do anime (episódios de Hirofumi Suzuki / Norio Matsumoto), evitando reinterpretações cartunescas ou sci-fi:

- **Anatomia Real do Sharingan e Mangekyou:**
  - **Íris:** gradiente radial profundo do carmesim vivo (`#DC2626`) no centro para vermelho sangue escuro (`#7F1D1D`) na borda externa, cercado por um anel limbal quase negro (`#09090B`) para volume esférico real.
  - **Pupila e Anel Cortical:** pupila central negra absoluta (`#000000`) com leve reflexo especular assimétrico (efeito de lente úmida). O anel fino escuro que conecta os Tomoe deve ter `stroke-width: 1.5` a `2` e opacidade `0.75`.
  - **Geometria dos Tomoe:** cabeça circular perfeita e cauda afilada curvada na direção exata de rotação do olho. No despertar ou troca de estágio, os Tomoe giram em torno do eixo central com inércia pesada antes de travar na posição com um flash carmesim curto.
  - **Variantes do Mangekyou (`itachi`, `sasuke`, `shisui`, `obito`, `madara`):** use silhuetas vetoriais fiéis ao traço original (ex.: 3 lâminas curvas de Itachi conectadas ao centro; átomo de 6 pontas invertido de Sasuke; catavento de 4 pontas de Shisui). Quando `customEye` (imagem real/IA) estiver ativo, aplique máscara circular com vinheta interna escura (`inset 0 0 24px #000000`) para integrar a imagem ao globo ocular.
- **Amaterasu (Chamas Negras Inextinguíveis):**
  - Núcleo de escuridão absoluta (`#000000`) com bordas queimando em contorno fino carmesim/vermelho-sangue (`#DC2626` / `#7F1D1D`).
  - **Nunca** use laranja ou amarelo. Renderize missões e alertas Amaterasu com núcleo `#000000`, sombra interna profunda e camadas de partículas/ondulações escuras nas bordas com `drop-shadow(0 0 8px rgba(220, 38, 38, 0.65))`.
- **Susanoo (Manifestação Etérea de Chakra):**
  - Respeite a progressão anatômica: Fase 1 (`0–33%`) caixa torácica espectral (costelas arqueadas envolvendo o relógio); Fase 2 (`34–66%`) estrutura óssea superior e chamas de chakra densas; Fase 3 (`67–100%`) armadura completa estilo Tengu.
  - Use traços vetoriais com opacidade em camadas (`0.2`, `0.5`, `0.85`) e oscilação vertical lenta de parallax para simular o usuário dentro do núcleo do Susanoo.
- **Izanagi & Desgaste Ocular:**
  - Ao ativar o Izanagi, reproduza inversão abrupta de luminância (`filter: invert(1) contrast(1.4)`) por uma fração de segundo seguida pelo apagamento gradual da luz carmesim de um dos indicadores oculares para cinza opaco/cego (`#52525B`).
  - O desgaste visual (`visualBlurLevel`) deve simular perda progressiva de foco do Mangekyou com `backdrop-blur` e leve aberração cromática vermelha nos elementos secundários, mantendo os controles vitais nítidos.

### 4.4 Iluminação Low-Key, Texturas e Composição Editorial

- **Dominância do Preto (Regra 85/12/3):** pelo menos 85% da viewport em tons de preto e obsidiana (`#000000`, `#09090B`, `#121215`), 12% em cinzas estruturais/tipografia (`#27272A`, `#A1A1AA`, `#FAFAFA`) e apenas 3% em carmesim concentrado (`#DC2626`, `#EF4444`, `#7F1D1D`) nos pontos focais.
- **Rim Lighting Direcional:** aplique `border-t border-white/[0.07]` ou `border-t border-red-500/25` no topo dos cards de pedra/obsidiana e oclusão densa na base (`shadow-[0_20px_50px_rgba(0,0,0,0.9)]`).
- **Micro-textura de Pedra (Santuário Naka):** aplique overlay SVG `feTurbulence` estático com `opacity-[0.03]` e `pointer-events-none` sobre o background para eliminar aspecto plástico de cor chapada.

### 4.5 Checklist de Física/Performance (60fps) & Gotchas

- **Keyframes no Framer Motion:** `type: "spring"` aceita exatamente 2 estados (inicial e final); animações cíclicas ou com `>= 3` valores no array (ex.: `scale: [1, 1.03, 1]`, `opacity: [0.4, 0.9, 0.4]`) usam obrigatoriamente `type: "tween"` com `ease: "easeInOut"` ou `"linear"`.
- **Wrapper em SVGs Animados:** aplique transformações contínuas de rotação e parallax em `<motion.div className="will-change-transform">` envolvendo o `<svg>`, nunca na tag `<svg>` raiz.
- **Propriedades Aceleradas por GPU:** anime apenas `transform` (`x`, `y`, `scale`, `rotate`, `rotateX`, `rotateY`), `opacity` e `filter`; evite animar `width`, `height`, `top`, `left` ou `margin` em loops.
- **Tipografia Numérica & Acessibilidade:** todo cronômetro, contador de Chakra e KPI usa `font-mono tabular-nums` e respeita `useReducedMotion()`.
- **Gotcha — Cyberpunk Drift:** evite acumular múltiplos `blur-2xl bg-red-600/50`; o brilho Uchiha é denso, recortado contra a escuridão profunda e com queda rápida de luz (`radial-gradient` controlado).
- **Gotcha — Re-renders por Mouse:** nunca armazene `mouseX` ou `mouseY` em `useState` ou na store Zustand; use sempre `useMotionValue` + `useSpring`.
- **Gotcha — Parallax 3D vs. `@dnd-kit`:** no `KanbanBoard`, desative o tilt 3D de pointer (`rotateX`/`rotateY`) no card enquanto `isDragging` for `true`, evitando conflito com `CSS.Translate.toString(transform)` do `@dnd-kit/utilities`.
- **Gotcha — Paleta do Amaterasu:** mantenha contraste estrito de preto absoluto (`#000000`) sobre superfície escura (`#121215`) delineado por brasa carmesim fina (`#DC2626`), sem tons quentes de laranja ou amarelo.

---

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
