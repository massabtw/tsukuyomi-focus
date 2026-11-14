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

## 3. Direção de Arte & Engenharia de Animação (`uchiha-cinematic-parallax`)

Diretrizes arquiteturais e estéticas para construir interfaces dark-cinematic no padrão Awwwards com parallax em profundidade (3D multi-layer e scroll-driven) e fidelidade visual estrita ao universo Uchiha do anime.

**Quando aplicar:**
- Criar ou refatorar componentes visuais do Tsukuyomi Focus (`OcularClock`, `SharinganSvg`, `SusanooAura`, `TempleView`, `KanbanBoard`, `NakaShrineView`, `ScrollStatsView` e modais rituais).
- Implementar efeitos de parallax controlados por cursor (3D tilt/magnetic depth) ou por scroll (`useScroll` + `useTransform`) no estilo Awwwards.
- Traduzir elementos canônicos do anime (Sharingan, Mangekyou, chamas negras do Amaterasu, costelas/armadura do Susanoo, distorção do Izanagi e Tábua de Pedra do Santuário Naka) para UI/SVG sem estética genérica de jogos ou cyberpunk.
- Otimizar animações complexas em Framer Motion mantendo 60fps constantes e zero re-renders desnecessários no React.

### 4 Arquitetura de Parallax Multi-Camadas (Padrão Awwwards)

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

### 4.1 Coreografia de Scroll Parallax & Transição de Câmara

Em telas com rolagem (`NakaShrineView`, `ScrollStatsView`, `KanbanBoard`), trate o scroll como o movimento físico de uma câmera cinematográfica descendo por um santuário escuro:

- Use `useScroll({ target: ref, offset: ['start end', 'end start'] })` acoplado a `useTransform` para deslocar camadas de fundo em velocidades distintas (`y: ['0%', '18%']` para pedra/fundo vs. `y: ['0%', '-6%']` para elementos em primeiro plano).
- Aplique transições entre abas (`Templo`, `Kanban`, `Santuário`, `Pergaminho`) simulando profundidade focal (Dolly Zoom sutil): entrada com `initial={{ opacity: 0, scale: 0.97, filter: 'blur(6px)' }}`, `animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}` e saída com `exit={{ opacity: 0, scale: 1.02, filter: 'blur(4px)' }}` usando `duration: 0.45` e curva cinematográfica `ease: [0.16, 1, 0.3, 1]`.

### 4.2 Fidelidade Canônica à Estética do Anime (Naruto / Uchiha)

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

### 4.3 Iluminação Low-Key, Texturas e Composição Editorial

- **Dominância do Preto (Regra 85/12/3):** pelo menos 85% da viewport em tons de preto e obsidiana (`#000000`, `#09090B`, `#121215`), 12% em cinzas estruturais/tipografia (`#27272A`, `#A1A1AA`, `#FAFAFA`) e apenas 3% em carmesim concentrado (`#DC2626`, `#EF4444`, `#7F1D1D`) nos pontos focais.
- **Rim Lighting Direcional:** aplique `border-t border-white/[0.07]` ou `border-t border-red-500/25` no topo dos cards de pedra/obsidiana e oclusão densa na base (`shadow-[0_20px_50px_rgba(0,0,0,0.9)]`).
- **Micro-textura de Pedra (Santuário Naka):** aplique overlay SVG `feTurbulence` estático com `opacity-[0.03]` e `pointer-events-none` sobre o background para eliminar aspecto plástico de cor chapada.

### 4.4 Checklist de Física/Performance (60fps) & Gotchas

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
