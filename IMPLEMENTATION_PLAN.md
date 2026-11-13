# Plano de Implementação — Tsukuyomi Focus

## 1. Diagnóstico do Workspace & Regras Aplicáveis

O repositório encontra-se atualmente limpo (contendo apenas `.git/` e `.agents/`). Portanto, a execução começará pelo bootstrap completo do projeto Next.js (App Router + TypeScript Strict + Tailwind CSS v4) antes da entrega sequencial das 8 issues.

### Skills Selecionadas (`.agents/skills/`) e Impactos Obrigatórios
Conforme `.agents/skills/mandatory-rules.md`, aplicam-se à implementação:

1. **`nextjs-app-router-patterns`** (`.agents/skills/nextjs-app-router-patterns/SKILL.md`):
   - `app/layout.tsx` e `app/page.tsx` permanecem **Server Components** por padrão; apenas a casca interativa (`<TsukuyomiApp />`) recebe `'use client'`.
   - Fontes carregadas via `next/font/google` no nível de módulo (`Inter`/`Geist` + `JetBrains_Mono` para `tabular-nums` + display serifada opcional como `Cinzel` para títulos Uchiha).
2. **`tailwind-design-system`** (`.agents/skills/tailwind-design-system/SKILL.md`):
   - Uso de **Tailwind CSS v4** (`@import "tailwindcss";` + `@theme` em `src/app/globals.css`), definindo tokens semânticos (`--color-bg-base`, `--color-surface`, `--color-crimson`, `--color-crimson-glow`, etc.) e `@keyframes` dentro de `@theme`, evitando `tailwind.config.ts` legado.
3. **`framer-motion`** & **`framer-motion-animator`** (`.agents/skills/framer-motion/SKILL.md`, `.agents/skills/framer-motion-animator/SKILL.md`):
   - Pacote instalado: `framer-motion` (conforme requisito explícito do Master Prompt).
   - **Regra Crítica de Física:** `type: "spring"` aceita no máximo 2 keyframes; qualquer array com `>= 3` valores (ex.: pulsação `[1, 1.06, 1]` ou flicker `[0.4, 1, 0.4]`) deve usar obrigatoriamente `type: "tween"` com `ease: "easeInOut"` ou `"linear"`.
   - Animar apenas propriedades aceleradas por GPU (`transform`, `opacity`, `filter`), evitando animações de layout (`width`, `height`, `top`, `left`).
   - Suportar `useReducedMotion()` e `AnimatePresence` para modais e transições de abas.
4. **`vercel-react-best-practices`** (`.agents/skills/vercel-react-best-practices/SKILL.md`):
   - **Sem barrel files** (`index.ts` reexportando componentes) para preservar tree-shaking (`bundle-barrel-imports`).
   - **SVG animado via wrapper `<div>`** (`rendering-animate-svg-wrapper`) em vez de aplicar transforms pesados diretamente no `<svg>` raiz do Sharingan.
   - **Refs para valores transitórios** (`rerender-use-ref-transient-values`) no timer de alta frequência e no engine Web Audio.
   - **Seletores derivados na store** (`rerender-derived-state`) para evitar re-renders do Kanban ou Pergaminho a cada tick de 1 segundo do relógio.
   - **Schema versionado no `localStorage`** (`client-localstorage-schema`) via `version` + `migrate` no Zustand `persist`.
   - **Prevenção de Hydration Mismatch** (`rendering-hydration-no-flicker`): flag `hasHydrated` na store para evitar divergência SSR vs. `localStorage` no primeiro render.
5. **`vercel-composition-patterns`** (`.agents/skills/vercel-composition-patterns/SKILL.md`):
   - Evitar proliferação de props booleanas; compor cards, modais e estágios do Susano'o por variantes explícitas (`variant`, compound components).
6. **`web-design-guidelines`** (`.agents/skills/web-design-guidelines/SKILL.md`):
   - Acessibilidade com `aria-label`, navegação por teclado, `font-mono tabular-nums` no cronômetro/KPIs, contraste adequado mesmo no Modo Tsukuyomi e no Desgaste Visual.

---

## 2. Bootstrap & Dependências (Pré-requisito)

- **Inicialização Next.js:** `create-next-app` (ou scaffold equivalente) com App Router, TypeScript (`"strict": true`), Tailwind CSS v4, ESLint, diretório `src/` e alias `@/*`.
- **Dependências de produção:**
  - `framer-motion`
  - `zustand`
  - `@dnd-kit/core` `@dnd-kit/sortable` `@dnd-kit/utilities`
  - `lucide-react`
  - `clsx` `tailwind-merge`
- **Configuração `next.config.ts`:** `images: { unoptimized: true }` para preview/fallback de imagens locais ou Data URLs.

---

## 3. Arquitetura de Pastas Planejada (`src/`)

```text
src/
├── app/
│   ├── layout.tsx                      # Server Component: fontes, metadata, bg escuro base
│   ├── page.tsx                        # Server Component: monta <TsukuyomiApp />
│   └── globals.css                     # Tailwind v4 @import + @theme tokens + keyframes
├── types/
│   └── tsukuyomi.ts                    # Todas as interfaces e unions globais
├── constants/
│   ├── ranks.ts                        # Tabela de Ranks D..S (tempo, multiplicador, cores, labels)
│   ├── evolution.ts                    # Tábua de Pedra Uchiha (7 estágios, requisitos, variantes MS)
│   └── seed.ts                         # Missões iniciais temáticas + logs de histórico de exemplo
├── lib/
│   ├── cn.ts                           # Helper clsx + tailwind-merge
│   ├── date.ts                         # Helpers YYYY-MM-DD em fuso local, diff de dias, 365 dias
│   ├── gamification.ts                 # Cálculos puros: Chakra, evolução ocular, streak, acuidade
│   ├── imageUpload.ts                  # Compressão/redimensionamento via Canvas para imagem IA customizada
│   └── audioEngine.ts                  # Singleton Web Audio API + fallback HTML5 Audio (/public/audio/*)
├── store/
│   └── useTsukuyomiStore.ts            # Zustand + persist ('tsukuyomi-focus-storage', version: 1)
├── hooks/
│   ├── useFocusTimer.ts                # Engine anti-throttling (targetEndTime) + document.title
│   └── useDailyChecks.ts               # Verificação na montagem e na virada de dia (Amaterasu & Streak)
└── components/
    ├── layout/
    │   ├── TsukuyomiApp.tsx            # Casca principal, hydration gate, modos Normal vs Tsukuyomi
    │   ├── NinjaHeader.tsx             # Topbar fixa: logo, estágio + barra Chakra, streak, olhos Izanagi, acuidade
    │   ├── TabNavigation.tsx           # 4 abas (Templo | Quadro de Missões | Santuário Naka | Pergaminho)
    │   └── GenjutsuBackdrop.tsx        # Vinheta carmesim + partículas/linhas sutis no Modo Tsukuyomi
    ├── clock/
    │   ├── TempleView.tsx              # Aba Templo: seleção de missão ativa, presets, mixer compacto e relógio
    │   ├── OcularClock.tsx             # Coração visual: anel SVG de progresso, imagem IA ou SVG vetorial, MM:SS
    │   ├── SharinganSvg.tsx            # SVGs fiéis (normal, 1/2/3 tomoes, 5 variantes MS, EMS, Rinnegan)
    │   ├── SusanooAura.tsx             # Evolução visual em 3 fases (0-33%, 34-66%, 67-100%)
    │   └── TimerControls.tsx           # Presets (25/50/90/Pausas), toggle Susano'o, Iniciar/Abortar
    ├── kanban/
    │   ├── KanbanBoard.tsx             # DndContext, 3 colunas, criação de missão, modal de nova missão
    │   ├── KanbanColumn.tsx            # Droppable + SortableContext, contador e ordenação Amaterasu-first
    │   ├── MissionCard.tsx             # Card draggable, badge Rank, efeito Amaterasu, botão "Tragar para o Tsukuyomi"
    │   └── NewMissionModal.tsx         # Formulário de criação (título, descrição, rank, tempo estimado, Amaterasu)
    ├── evolution/
    │   ├── NakaShrineView.tsx          # Tábua de Pedra Uchiha (árvore de 7 níveis) + Seletor de MS
    │   ├── CustomEyeUploader.tsx       # Slot IA do Sharingan do Itachi (upload/URL, zoom, glow, máscara circular)
    │   ├── AwakeningModal.tsx          # Modal cinematográfico ao desbloquear novo estágio ocular
    │   └── DevSimulatorBar.tsx         # Rodapé discreto (Dev Mode) para testar olhos, Chakra e Despertar
    ├── scroll/
    │   ├── ScrollStatsView.tsx         # Pergaminho de Estatísticas (KPIs, Heatmap, Rank Chart, Log)
    │   ├── UchihaHeatmap.tsx           # Grid 52 semanas / 365 dias com 5 níveis carmesim + tooltip
    │   ├── RankDistributionChart.tsx   # Barras horizontais D..S
    │   └── SessionLogList.tsx          # Histórico filtrável por Rank e Status
    ├── audio/
    │   └── AmbientSoundMixer.tsx       # Controles de SFX + sliders (Chuva Amegakure, Vento Uchiha, Binaural 40Hz)
    └── modals/
        ├── SusanooBreakModal.tsx       # Trava anti-impulso exigindo frase exata para quebrar o Susano'o
        ├── IzanagiModal.tsx            # Ritual de ativação do Izanagi (inversão de tela, perda de visão em 1 olho)
        └── AmaterasuPenaltyBanner.tsx  # Alerta temático quando uma missão Amaterasu do dia anterior falhou
```

---

## 4. Modelagem de Dados & Store (`ISSUE-01`)

### `src/types/tsukuyomi.ts`
Além do contrato base obrigatório (`MissionRank`, `MissionStatus`, `EyeStage`, `MangekyouVariant`, `Mission`, `FocusSessionLog`, `IzanagiState`), definiremos interfaces complementares estritamente tipadas:

- `ActiveTab`: `'temple' | 'kanban' | 'shrine' | 'scroll'`
- `TimerMode`: `'focus' | 'short_break' | 'long_break'`
- `TimerState`:
  - `status`: `'idle' | 'running' | 'paused'`
  - `mode`: `TimerMode`
  - `durationSeconds`: `number`
  - `remainingSeconds`: `number` (sincronizado a partir de `targetEndTime` quando `running`)
  - `targetEndTime`: `number | null` (epoch ms; garante precisão anti-throttling)
  - `activeMissionId`: `string | null`
  - `susanooEnabled`: `boolean`
- `CustomEyeConfig`:
  - `enabled`: `boolean`
  - `imageDataUrl`: `string | null` (Base64 otimizado ou URL local como `/assets/eyes/itachi-custom.png`)
  - `scale`: `number` (`0.8` a `1.8`)
  - `glowIntensity`: `number` (`0` a `1`)
- `AudioSettings`:
  - `muted`: `boolean`
  - `sfxVolume`: `number`
  - `rainVolume`: `number` (Chuva em Amegakure)
  - `windVolume`: `number` (Vento Noturno no Distrito Uchiha)
  - `binauralVolume`: `number` (Drone Binaural 40Hz/100Hz)
- `TsukuyomiState`:
  - `chakra`: `number`
  - `currentEyeStage`: `EyeStage`
  - `equippedEyeStage`: `EyeStage`
  - `mangekyouVariant`: `MangekyouVariant`
  - `streak`: `number`
  - `longestStreak`: `number`
  - `lastFocusDate`: `string | null` (`YYYY-MM-DD`)
  - `lastDailyCheckDate`: `string | null` (`YYYY-MM-DD`)
  - `visualBlurLevel`: `0 | 1 | 2 | 3`
  - `isTsukuyomiMode`: `boolean`
  - `izanagi`: `IzanagiState`
  - `missions`: `Mission[]`
  - `sessionLogs`: `FocusSessionLog[]`
  - `customEye`: `CustomEyeConfig`
  - `audio`: `AudioSettings`
  - `pendingAwakening`: `EyeStage | null`
  - `pendingAmaterasuPenalty`: `{ missionTitle: string; chakraLost: number } | null`

### Estratégia da Store (`src/store/useTsukuyomiStore.ts`)
- Persistência com `persist(..., { name: 'tsukuyomi-focus-storage', version: 1, partialize: ... })`.
- **Recuperação de `targetEndTime` após reload:** se o usuário recarregar a página durante um timer `running`, o `onRehydrateStorage` recalcula `remainingSeconds` a partir de `targetEndTime - Date.now()` (ou finaliza o ciclo automaticamente se já expirou).
- **Lógica de negócio desacoplada:** funções puras em `src/lib/gamification.ts` recebem snapshots de estado e retornam deltas (Chakra ganho, novo `EyeStage`, atualização de streak, progresso de restauração de olho cego), facilitando futura troca por chamadas de API sem acoplar regras nos componentes React.

---

## 5. Detalhamento por Issue (ISSUE-01 a ISSUE-08)

### [ISSUE-01] Setup Base, Store Global, Design System & Alternância de Tema
- **`globals.css` (`@theme`):**
  - Modo Normal: fundo `#09090B`, cards `#121215` com `backdrop-blur-md`, bordas `#27272A` e foco/hover `#DC2626`, textos `#FAFAFA` / `#A1A1AA`.
  - Modo Tsukuyomi: fundo `#000000`, vinheta radial `radial-gradient(circle at center, rgba(153, 27, 27, 0.22) 0%, #000000 75%)`, textos `#FFFFFF` e `#EF4444`, linhas sutis de genjutsu e ocultação/minimização das barras de navegação secundárias.
- **`<NinjaHeader />`:**
  - Título Uchiha estilizado, badge do Estágio Ocular atual + barra de progresso de Chakra para o próximo nível, contador de Streak com ícone de chama (`Flame`), indicadores dos dois olhos (Direito/Esquerdo: ativo carmesim vs. cego cinza/riscado pelo Izanagi) e badge de Acuidade Visual (`100%`, `85%`, `70%`, `50%`).
- **Filtro de Desgaste Visual (`visualBlurLevel`):**
  - Mapeamento `0 -> blur-[0px]`, `1 -> blur-[1px]`, `2 -> blur-[2px]`, `3 -> blur-[3.5px]` aplicado em painéis e conteúdos secundários (preservando legibilidade dos botões de ação crítica, como iniciar ciclo e modais de confirmação).

### [ISSUE-02] Relógio Ocular Central (`<OcularClock />`)
- **Arquitetura Híbrida (Imagem IA + SVG):**
  - Se `customEye.enabled && customEye.imageDataUrl`, renderiza a imagem circular recortada (`object-cover rounded-full`) com `transform: scale(customEye.scale)` e halo vermelho dinâmico (`glowIntensity`).
  - Caso contrário, renderiza `<SharinganSvg stage={equippedEyeStage} variant={mangekyouVariant} />` com vetores SVG precisos para todos os 7 estágios e as 5 variantes do Mangekyou (`itachi`, `sasuke`, `shisui`, `obito`, `madara`).
- **Física de Rotação & Animação (60fps):**
  - Wrapper `<div>` ao redor do SVG animado (`rendering-animate-svg-wrapper`).
  - **Repouso:** rotação contínua muito lenta (`30s` por volta, `type: "tween", ease: "linear", repeat: Infinity`) + pulsação sutil (`scale: [1, 1.025, 1]` usando `type: "tween"`, nunca `spring`).
  - **Ativação (Awakening pulse):** burst inicial de escala (`spring` com 2 estados) + aumento do `drop-shadow` carmesim.
  - **Últimos 60 segundos:** transição para rotação acelerada e glow vermelho intenso.
- **Anel Circular de Progresso:**
  - `<svg>` com `<circle>` de fundo (`#27272A`) e `<circle>` ativo (`#DC2626` / `#EF4444`) usando `strokeDasharray` e `strokeDashoffset` calculados pelo progresso do timer.
  - Display central/inferior `MM:SS` em `font-mono tabular-nums`, acompanhado da missão vinculada.

### [ISSUE-03] Engine do Timer Anti-Throttling & Ambiente Sonoro Imersivo
- **`useFocusTimer.ts`:**
  - Ao iniciar: `targetEndTime = Date.now() + remainingSeconds * 1000`.
  - Loop via `setInterval` (250ms) + listener de `visibilitychange` / `focus` para recalcular imediatamente `Math.max(0, Math.ceil((targetEndTime - Date.now()) / 1000))` ao retornar à aba.
  - Atualiza `document.title` em tempo real: ex. `(42:15) Tsukuyomi Ativo — Missão Rank A` (e restaura `"Tsukuyomi Focus"` quando `idle`).
  - Presets: Foco `25m`, `50m`, `90m`, Automático pelo Rank da missão selecionada, Pausa Curta (`5m` / `10m`) e Pausa Longa (`15m`).
- **`src/lib/audioEngine.ts` (Singleton global):**
  - Mantém `AudioContext` único fora do ciclo de vida das abas React (nunca corta ao alternar entre Templo/Kanban/Santuário/Pergaminho).
  - **Suporte híbrido:** tenta tocar `/audio/sharingan-activate.mp3` ou `/audio/tsukuyomi-complete.mp3` se configurados/disponíveis e faz fallback instantâneo via **Web Audio API sintetizada**:
    - *SFX Ativação Sharingan:* sweep de osciladores sawtooth/sine modulados + ruído filtrado + delay sintético.
    - *SFX Conclusão Tsukuyomi:* gongo/chime profundo com harmônicos em decaimento longo.
    - *Chuva em Amegakure:* buffer de Pink/Brown Noise em loop com `BiquadFilterNode` simulando chuva densa.
    - *Vento Noturno no Distrito Uchiha:* ruído filtrado modulado por LFO lento na frequência de corte.
    - *Binaural Genjutsu Drone:* dois osciladores estéreo (`StereoPannerNode` L/R) com offset de 40Hz (100Hz + 140Hz) em ganho suave para foco profundo.

### [ISSUE-04] Quadro Kanban de Missões & Sistema de Ranks Ninja (D até S)
- **Colunas:** `Pergaminho de Missões` (`todo`), `Dentro do Tsukuyomi` (`in_tsukuyomi`), `Missões Cumpridas` (`completed`).
- **Drag-and-Drop (`@dnd-kit`):**
  - `PointerSensor` com `activationConstraint: { distance: 8 }` + `KeyboardSensor` para permitir cliques normais nos botões do card sem disparar drag acidental.
  - `DragOverlay` para feedback visual fluido ao arrastar entre colunas.
- **Tabela Oficial de Ranks (`src/constants/ranks.ts`):**
  - `D`: 25 min | `1.0x` | Cinza/Bronze
  - `C`: 35 min | `1.2x` | Verde/Prata
  - `B`: 50 min | `1.5x` | Azul
  - `A`: 75 min | `2.0x` | Roxo/Ouro
  - `S`: 90 min | `3.0x` | Vermelho Carmesim Brilhante
- **Fórmula de Chakra:** `Math.round(durationMinutes * 10 * rankMultiplier * amaterasuMultiplier * susanooMultiplier)`.
- **Ação Rápida:** Botão **"Tragar para o Tsukuyomi"** em cada card move a missão para `in_tsukuyomi`, define `activeMissionId`, ajusta o timer para o tempo sugerido da missão (se `idle`) e navega para a aba `Templo`.

### [ISSUE-05] Mecânicas de Lore I — Amaterasu & Susano'o
- **Amaterasu (Chamas Negras Inextinguíveis):**
  - Regra de unicidade diária: no máximo 1 missão ativa marcada com `isAmaterasu: true` por dia (`amaterasuDate === today`).
  - Ordenação automática: cards `isAmaterasu` são sempre pinados no topo de sua coluna.
  - Visual: borda animada com gradiente escuro + brasas carmesim e badge de chamas negras.
  - Bônus: `2.0x` Chakra cumulativo com o multiplicador do Rank ao concluir ciclos vinculados a ela.
  - **Penalidade de virada de dia (`useDailyChecks`):** ao iniciar o app ou detectar mudança de `YYYY-MM-DD`, se existir missão com `isAmaterasu === true`, `status !== 'completed'` e `amaterasuDate < today`, deduz `300` Chakra (mínimo 0), registra a falha e exibe `<AmaterasuPenaltyBanner />`.
- **Susano'o (Modo Blindagem de Deep Work):**
  - Toggle no painel de controle antes de iniciar o foco (com recomendação para ciclos `>= 50 min`).
  - **Evolução visual da Aura (`<SusanooAura progress={...} />`) ao redor do Relógio Ocular:**
    - `0% – 33%`: Costelas do Susano'o.
    - `34% – 66%`: Esqueleto com espada/chamas envolventes.
    - `67% – 100%`: Susano'o Perfeito (armadura completa + aura intensa).
  - **Recompensa:** `+25%` (`1.25x`) Chakra ao concluir o ciclo com Susano'o ativo.
  - **Trava Anti-Impulso:** botão normal de Pausar/Cancelar fica selado; clicar em quebrar o selo abre `<SusanooBreakModal />` exigindo digitação exata da frase:
    `"Eu aceito quebrar meu Susanoo e perder Chakra"`
    antes de habilitar o botão de confirmação de abandono.

### [ISSUE-06] Mecânicas de Lore II — Desgaste Visual & Izanagi
- **Consequência de Abandono:**
  - Cancelar um ciclo em andamento registra `FocusSessionLog` com `wasCompleted: false` e incrementa `visualBlurLevel = Math.min(3, visualBlurLevel + 1)`.
  - Concluir um ciclo inteiro sem interrupções decrementa `visualBlurLevel = Math.max(0, visualBlurLevel - 1)` ("Colírio / Repouso Ocular").
- **Ofensiva Diária (Streak):**
  - Ao concluir >= 1 ciclo de foco no dia (`today`): se `lastFocusDate === yesterday`, `streak += 1`; se `lastFocusDate !== today`, reinicia para `1` (salvo se o Izanagi preservar a ofensiva). Atualiza `longestStreak`.
- **Izanagi ("Reescrever a Realidade"):**
  - **Gatilhos:** (a) durante tentativa de abandono de ciclo crítico para evitar penalidade, ou (b) na detecção de quebra de ofensiva (`lastFocusDate < yesterday` e `streak > 0`) oferecendo reescrever a realidade para preservar o streak.
  - **Custo & Regras:**
    - Disponível enquanto `!izanagi.leftEyeBlind || !izanagi.rightEyeBlind`. Se ambos cegos, fica bloqueado até restaurar pelo menos um olho.
    - Ao ativar: animação dramática de inversão da tela (`filter: invert(1)` breve via `tween`), preserva `streak` / anula penalidade de abandono, cega um dos olhos (`rightEyeBlind` primeiro, depois `leftEyeBlind`), incrementa `totalTimesUsed` e define meta de restauração de `180` minutos por olho cego.
    - **Restauração Ocular:** cada ciclo de foco concluído soma `durationMinutes` em `restorationProgressMinutes`. Ao atingir `180` minutos, restaura um olho cego.

### [ISSUE-07] Santuário Naka — Sistema de Evolução Ocular & Customizador de Olhos
- **Tábua de Pedra Uchiha (7 Níveis):**
  1. `normal`: `0` Chakra (0h)
  2. `tomoe_1`: `1.200` Chakra (~2h)
  3. `tomoe_2`: `4.800` Chakra (~8h)
  4. `tomoe_3`: `12.000` Chakra (~20h)
  5. `mangekyou`: `24.000` Chakra (~40h **OU** `streak >= 7` / `longestStreak >= 7`) — libera seleção livre entre `itachi`, `sasuke`, `shisui`, `obito`, `madara`
  6. `ems`: `72.000` Chakra (~120h)
  7. `rinnegan`: `180.000` Chakra (~300h)
- **Customizador de Imagem IA (`<CustomEyeUploader />`):**
  - Upload de `.png`, `.webp`, `.jpg` (redimensionado via `<canvas>` para máx. `512x512` WebP) ou input de URL/caminho local (ex.: `/assets/eyes/itachi-custom.png`).
  - Preview em tempo real com máscara circular, ajuste de Zoom/Escala e brilho do glow vermelho, aplicando instantaneamente ao `<OcularClock />`.
- **Modo Simulador / Dev Mode:**
  - Barra discreta no rodapé do Santuário Naka para adicionar Chakra de teste, desbloquear todos os olhos, simular cegueira Izanagi e disparar `<AwakeningModal />`.

### [ISSUE-08] Pergaminho de Estatísticas (Heatmap 365 Dias, KPIs & Histórico)
- **KPIs no Topo:**
  - Tempo Total no Tsukuyomi (`Xh Ym`)
  - Chakra Total Acumulado & Estágio Ocular Atual
  - Ofensiva Atual e Recorde de Ofensiva (dias)
  - Taxa de Precisão Uchiha (`%` de ciclos concluídos vs. abandonados)
  - Vezes que o Izanagi foi invocado & Missões Amaterasu concluídas
- **Uchiha Heatmap (365 dias / 52+ semanas):**
  - Escala de cores:
    - `0 min`: `#18181B`
    - `1–29 min`: `#450A0A`
    - `30–59 min`: `#7F1D1D`
    - `60–119 min`: `#DC2626`
    - `120+ min`: `#EF4444` (com leve glow vermelho)
  - Tooltip exibindo data formatada, minutos focados e Chakra obtido no dia.
- **Distribuição por Rank & Log de Sessões:**
  - Gráfico de barras horizontais (`D` a `S`) com contagem de missões concluídas.
  - Lista cronológica das sessões com filtros por **Rank** e **Status** (`Concluída | Abandonada | Com Susano'o`).

---

## 6. Dados Iniciais (Seed Data)

No primeiro acesso (quando `localStorage` está vazio), a store inicializa com:
- **4 missões temáticas no Kanban:**
  1. Rank `S` marcada com `isAmaterasu: true` (`amaterasuDate: today`)
  2. Rank `A` em `in_tsukuyomi`
  3. Rank `B` em `todo`
  4. Rank `D` em `completed`
- **Histórico de sessões recente** distribuído nos últimos dias (incluindo sessões concluídas, com Susano'o e uma abandonada) para popular imediatamente o Heatmap, KPIs, gráfico por Rank e streak inicial.

---

## 7. Pontos de Atenção & Riscos Mapeados

1. **Hidratação SSR vs. `localStorage`:** Zustand `persist` lê o cliente após o mount; `onRehydrateStorage` + `hasHydrated` evitam hydration mismatch no App Router e impedem checagem prematura do Amaterasu antes da hidratação.
2. **Quota do `localStorage` com Upload de Imagem:** compressão automática via HTML5 Canvas (`<= 512px`, WebP) antes de salvar Data URLs na store.
3. **Política de Autoplay de Áudio:** `AudioContext` inicializado/resumido no gesto do usuário pelo singleton `AudioEngine`.
4. **Conflito Drag vs. Clique no Kanban:** `PointerSensor` com `activationConstraint: { distance: 8 }` e `stopPropagation()` nos botões internos dos cards.

---

## 8. Plano de Verificação (Quando Autorizada a Execução)

1. **Verificação Estática:** `npx tsc --noEmit`, `npm run lint` e `npm run build`.
2. **Verificação Funcional:** fluxo completo das 8 issues (timer anti-throttling em segundo plano, Modo Tsukuyomi, áudio contínuo entre abas, Kanban DnD, Amaterasu + penalidade, Susano'o 3 estágios + frase de quebra, Desgaste Visual + Izanagi + restauração 180m, Santuário Naka + upload circular + Dev Mode, Pergaminho + Heatmap 365 dias + filtros).
