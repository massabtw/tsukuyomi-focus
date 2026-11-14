'use client';

import type { PointerEvent } from 'react';
import {
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from 'framer-motion';

const PARALLAX_SPRING_CONFIG = {
  stiffness: 110,
  damping: 26,
  mass: 0.6,
} as const;

/**
 * 4-layer Awwwards cursor parallax hook driven entirely by MotionValues (zero useState).
 * Layers:
 * - Plano -2 (layerBg): Deep abyss & radial vignette
 * - Plano -1 (layerMid): Ritual architecture & Susanoo/Shrine geometry
 * - Plano 0 (rotateX/rotateY): 3D Obsidian card surface tilt
 * - Plano +1 (layerFg): Sharingan iris, Tomoe rings & Amaterasu embers
 */
export function useAwwwardsParallax(intensity = 1) {
  const prefersReducedMotion = useReducedMotion();
  const factor = prefersReducedMotion ? 0 : intensity;

  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);

  const smoothX = useSpring(rawX, PARALLAX_SPRING_CONFIG);
  const smoothY = useSpring(rawY, PARALLAX_SPRING_CONFIG);

  const rotateX = useTransform(smoothY, [-0.5, 0.5], [4 * factor, -4 * factor]);
  const rotateY = useTransform(smoothX, [-0.5, 0.5], [-4 * factor, 4 * factor]);

  const layerBgX = useTransform(
    smoothX,
    [-0.5, 0.5],
    [12 * factor, -12 * factor],
  );
  const layerBgY = useTransform(
    smoothY,
    [-0.5, 0.5],
    [12 * factor, -12 * factor],
  );

  const layerMidX = useTransform(
    smoothX,
    [-0.5, 0.5],
    [-18 * factor, 18 * factor],
  );
  const layerMidY = useTransform(
    smoothY,
    [-0.5, 0.5],
    [-18 * factor, 18 * factor],
  );

  const layerFgX = useTransform(
    smoothX,
    [-0.5, 0.5],
    [-32 * factor, 32 * factor],
  );
  const layerFgY = useTransform(
    smoothY,
    [-0.5, 0.5],
    [-32 * factor, 32 * factor],
  );

  function handlePointerMove(e: PointerEvent<HTMLElement>) {
    if (factor === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const normX = (e.clientX - rect.left) / rect.width - 0.5;
    const normY = (e.clientY - rect.top) / rect.height - 0.5;
    rawX.set(Math.max(-0.5, Math.min(0.5, normX)));
    rawY.set(Math.max(-0.5, Math.min(0.5, normY)));
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
