'use client';

import { useId } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/cn';

export interface SusanooAuraProps {
  progress: number;
  enabled: boolean;
  isRunning?: boolean;
  className?: string;
}

type SusanooPhase = 1 | 2 | 3;

function getSusanooPhase(clampedProgress: number): SusanooPhase {
  if (clampedProgress >= 67) return 3;
  if (clampedProgress >= 34) return 2;
  return 1;
}

export function SusanooAura({
  progress,
  enabled,
  isRunning = false,
  className,
}: SusanooAuraProps) {
  const prefersReducedMotion = useReducedMotion();
  const rawId = useId();
  const safeId = rawId.replace(/:/g, '');
  const flameGradId = `susanoo-flame-${safeId}`;
  const armorGradId = `susanoo-armor-${safeId}`;

  const clamped = Math.max(0, Math.min(100, progress));
  const phase = getSusanooPhase(clamped);

  const shouldOscillate = enabled && isRunning && !prefersReducedMotion;

  return (
    <AnimatePresence>
      {enabled && (
        <motion.div
          key="susanoo-aura"
          aria-hidden="true"
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{
            opacity: 1,
            scale: 1,
            y: shouldOscillate ? [0, -6, 0] : 0,
          }}
          exit={{ opacity: 0, scale: 0.94 }}
          transition={
            shouldOscillate
              ? {
                  opacity: { duration: 0.45, ease: 'easeOut' },
                  scale: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
                  y: {
                    type: 'tween',
                    ease: 'easeInOut',
                    duration: 4.4,
                    repeat: Infinity,
                  },
                }
              : { duration: 0.4, ease: [0.16, 1, 0.3, 1] }
          }
          className={cn(
            'pointer-events-none select-none will-change-transform',
            className,
          )}
        >
          <svg
            viewBox="0 0 420 420"
            className="h-full w-full drop-shadow-[0_0_14px_rgba(220,38,38,0.42)]"
          >
            <defs>
              <linearGradient
                id={flameGradId}
                x1="50%"
                y1="100%"
                x2="50%"
                y2="0%"
              >
                <stop offset="0%" stopColor="#7F1D1D" stopOpacity="0.15" />
                <stop offset="55%" stopColor="#DC2626" stopOpacity="0.65" />
                <stop offset="100%" stopColor="#EF4444" stopOpacity="0.9" />
              </linearGradient>

              <linearGradient
                id={armorGradId}
                x1="50%"
                y1="0%"
                x2="50%"
                y2="100%"
              >
                <stop offset="0%" stopColor="#EF4444" stopOpacity="0.85" />
                <stop offset="60%" stopColor="#DC2626" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#450A0A" stopOpacity="0.18" />
              </linearGradient>
            </defs>

            {/* Phase 1 (0-33%): Spectral Ribcage framing the clock */}
            <g fill="none" strokeLinecap="round" strokeLinejoin="round">
              {/* Outer spectral aura contour (opacity 0.2) */}
              <g stroke="#DC2626" strokeWidth="10" strokeOpacity="0.2">
                <path d="M 118 112 C 44 148 34 252 98 320 C 132 354 176 372 210 374" />
                <path d="M 302 112 C 376 148 386 252 322 320 C 288 354 244 372 210 374" />
              </g>

              {/* Arched ribcage bones (layered 0.5 & 0.85) */}
              {[0, 1, 2, 3].map((ribIdx) => {
                const yStart = 128 + ribIdx * 36;
                const xReach = 54 + ribIdx * 7;
                const yEnd = 228 + ribIdx * 34;
                const xEnd = 132 + ribIdx * 14;
                return (
                  <g key={ribIdx}>
                    {/* Left rib */}
                    <path
                      d={`M 142 ${yStart} C ${xReach} ${yStart + 18}, ${xReach - 8} ${yEnd - 22}, ${xEnd} ${yEnd}`}
                      stroke="#EF4444"
                      strokeWidth="5.5"
                      strokeOpacity="0.5"
                    />
                    <path
                      d={`M 142 ${yStart} C ${xReach} ${yStart + 18}, ${xReach - 8} ${yEnd - 22}, ${xEnd} ${yEnd}`}
                      stroke="#FCA5A5"
                      strokeWidth="1.6"
                      strokeOpacity="0.85"
                    />
                    {/* Right rib */}
                    <path
                      d={`M 278 ${yStart} C ${420 - xReach} ${yStart + 18}, ${420 - xReach + 8} ${yEnd - 22}, ${420 - xEnd} ${yEnd}`}
                      stroke="#EF4444"
                      strokeWidth="5.5"
                      strokeOpacity="0.5"
                    />
                    <path
                      d={`M 278 ${yStart} C ${420 - xReach} ${yStart + 18}, ${420 - xReach + 8} ${yEnd - 22}, ${420 - xEnd} ${yEnd}`}
                      stroke="#FCA5A5"
                      strokeWidth="1.6"
                      strokeOpacity="0.85"
                    />
                  </g>
                );
              })}

              {/* Dorsal spine & sternum anchor */}
              <path
                d="M 210 38 L 210 72 M 186 356 L 210 374 L 234 356"
                stroke="#DC2626"
                strokeWidth="3"
                strokeOpacity="0.5"
              />
            </g>

            {/* Phase 2 (34-66%): Upper Skeletal Structure & Dense Chakra Flames */}
            {phase >= 2 && (
              <g>
                {/* Dense chakra flame plumes rising from shoulders */}
                <path
                  d="M 76 196 C 46 146 58 92 92 52 C 84 90 100 118 118 134 C 106 94 126 56 154 32 C 144 68 154 96 172 114"
                  fill="none"
                  stroke={`url(#${flameGradId})`}
                  strokeWidth="7"
                  strokeOpacity="0.2"
                  strokeLinecap="round"
                />
                <path
                  d="M 344 196 C 374 146 362 92 328 52 C 336 90 320 118 302 134 C 314 94 294 56 266 32 C 276 68 266 96 248 114"
                  fill="none"
                  stroke={`url(#${flameGradId})`}
                  strokeWidth="7"
                  strokeOpacity="0.2"
                  strokeLinecap="round"
                />

                {/* Skeletal clavicles & jagged pauldrons */}
                <g fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <path
                    d="M 164 68 L 116 86 L 74 128 L 94 144 L 130 108 L 176 90"
                    stroke="#DC2626"
                    strokeWidth="4.5"
                    strokeOpacity="0.5"
                  />
                  <path
                    d="M 164 68 L 116 86 L 74 128"
                    stroke="#EF4444"
                    strokeWidth="1.8"
                    strokeOpacity="0.85"
                  />
                  <path
                    d="M 256 68 L 304 86 L 346 128 L 326 144 L 290 108 L 244 90"
                    stroke="#DC2626"
                    strokeWidth="4.5"
                    strokeOpacity="0.5"
                  />
                  <path
                    d="M 256 68 L 304 86 L 346 128"
                    stroke="#EF4444"
                    strokeWidth="1.8"
                    strokeOpacity="0.85"
                  />

                  {/* Spectral Susanoo Blade Silhouette (Right Flank) */}
                  <path
                    d="M 358 318 L 378 134 L 392 84 L 396 140 L 372 324 Z"
                    fill={`url(#${flameGradId})`}
                    fillOpacity="0.2"
                    stroke="#EF4444"
                    strokeWidth="1.8"
                    strokeOpacity="0.85"
                  />
                </g>
              </g>
            )}

            {/* Phase 3 (67-100%): Full Tengu Armor & Winged Mantle */}
            {phase === 3 && (
              <g>
                {/* Sweeping Tengu Armor Wings */}
                <path
                  d="M 96 108 C 44 64 16 88 12 138 C 34 128 52 138 66 154 C 24 162 14 198 22 238 C 42 218 62 214 78 222 C 48 248 42 288 62 320 C 78 286 98 268 118 262"
                  fill={`url(#${armorGradId})`}
                  fillOpacity="0.2"
                  stroke="#EF4444"
                  strokeWidth="2.2"
                  strokeOpacity="0.85"
                  strokeLinejoin="round"
                />
                <path
                  d="M 324 108 C 376 64 404 88 408 138 C 386 128 368 138 354 154 C 396 162 406 198 398 238 C 378 218 358 214 342 222 C 372 248 378 288 358 320 C 342 286 322 268 302 262"
                  fill={`url(#${armorGradId})`}
                  fillOpacity="0.2"
                  stroke="#EF4444"
                  strokeWidth="2.2"
                  strokeOpacity="0.85"
                  strokeLinejoin="round"
                />

                {/* Tengu Horned Helm Crest above the Clock */}
                <path
                  d="M 160 56 L 142 18 L 184 40 L 210 12 L 236 40 L 278 18 L 260 56 C 242 46 178 46 160 56 Z"
                  fill={`url(#${armorGradId})`}
                  fillOpacity="0.2"
                  stroke="#EF4444"
                  strokeWidth="2"
                  strokeOpacity="0.85"
                  strokeLinejoin="round"
                />
                {/* Armored forehead gem & cheek plates */}
                <polygon
                  points="210,28 216,38 210,48 204,38"
                  fill="#EF4444"
                  fillOpacity="0.85"
                />
                <path
                  d="M 88 180 L 66 226 L 84 282 L 106 254"
                  fill="none"
                  stroke="#DC2626"
                  strokeWidth="3"
                  strokeOpacity="0.5"
                />
                <path
                  d="M 332 180 L 354 226 L 336 282 L 314 254"
                  fill="none"
                  stroke="#DC2626"
                  strokeWidth="3"
                  strokeOpacity="0.5"
                />
              </g>
            )}
          </svg>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
