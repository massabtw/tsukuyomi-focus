'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from 'framer-motion';
import { cn } from '@/lib/cn';
import {
  useIsTsukuyomiMode,
  useTimerCore,
  useTsukuyomiCastNonce,
  useTsukuyomiStore,
} from '@/store/useTsukuyomiStore';
import type { MangekyouVariant } from '@/types/tsukuyomi';

const BACKDROP_SPRING = {
  stiffness: 90,
  damping: 28,
  mass: 0.8,
} as const;

const WILL_CHANGE_TRANSFORM = { willChange: 'transform' } as const;
const WILL_CHANGE_TRANSFORM_OPACITY = {
  willChange: 'transform, opacity',
} as const;

const VFX_BLEND_MASK_CLASS =
  'pointer-events-none select-none mix-blend-screen [mask-image:radial-gradient(ellipse_at_center,black_55%,transparent_98%)]';

interface CanvasChakraRgb {
  r: number;
  g: number;
  b: number;
  brightR: number;
  brightG: number;
  brightB: number;
}

const CHAKRA_RGB_MAP: Record<MangekyouVariant, CanvasChakraRgb> = {
  itachi: { r: 220, g: 38, b: 38, brightR: 239, brightG: 68, brightB: 68 },
  sasuke: { r: 139, g: 92, b: 246, brightR: 167, brightG: 139, brightB: 250 },
  shisui: { r: 16, g: 185, b: 129, brightR: 52, brightG: 211, brightB: 153 },
  madara: { r: 37, g: 99, b: 235, brightR: 96, brightG: 165, brightB: 250 },
  obito: { r: 14, g: 165, b: 233, brightR: 56, brightG: 189, brightB: 248 },
};

const CROW_BURST_COUNT = 22;
const MAX_ACTIVE_CROWS = 66;

interface DarkEyeZone {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

// Outer screen margins so ambient crow eyes lurk in the dark perimeter without overlapping center HUD
const OUTER_DARK_EYE_ZONES: readonly DarkEyeZone[] = [
  { minX: 3, maxX: 9, minY: 16, maxY: 32 },
  { minX: 2.5, maxX: 8, minY: 38, maxY: 60 },
  { minX: 3, maxX: 9.5, minY: 66, maxY: 84 },
  { minX: 91, maxX: 97, minY: 16, maxY: 32 },
  { minX: 92, maxX: 97.5, minY: 38, maxY: 60 },
  { minX: 90.5, maxX: 97, minY: 66, maxY: 84 },
  { minX: 11, maxX: 22, minY: 9, maxY: 15 },
  { minX: 78, maxX: 89, minY: 9, maxY: 15 },
  { minX: 12, maxX: 24, minY: 84, maxY: 91 },
  { minX: 76, maxX: 88, minY: 84, maxY: 91 },
];

interface ForegroundFeatherTrajectory {
  startX: string;
  midX: string;
  endX: string;
  startY: string;
  midY: string;
  endY: string;
  startRot: number;
  midRot: number;
  endRot: number;
}

const FOREGROUND_FEATHER_TRAJECTORIES: readonly ForegroundFeatherTrajectory[] = [
  {
    startX: '-25vw',
    midX: '48vw',
    endX: '125vw',
    startY: '14vh',
    midY: '42vh',
    endY: '76vh',
    startRot: -28,
    midRot: -8,
    endRot: 18,
  },
  {
    startX: '120vw',
    midX: '45vw',
    endX: '-28vw',
    startY: '22vh',
    midY: '54vh',
    endY: '84vh',
    startRot: 162,
    midRot: 188,
    endRot: 214,
  },
  {
    startX: '-22vw',
    midX: '50vw',
    endX: '122vw',
    startY: '74vh',
    midY: '46vh',
    endY: '16vh',
    startRot: -48,
    midRot: -24,
    endRot: 4,
  },
];

const CROW_EYE_TRIGGER_RADIUS_SQ = 105 * 105;

interface CrowEyeFeather {
  id: string;
  midX: number;
  midY: number;
  endX: number;
  endY: number;
  startRotate: number;
  midRotate: number;
  endRotate: number;
  lengthScale: number;
}

interface CrowEyePair {
  id: string;
  zoneIndex: number;
  xPct: number;
  yPct: number;
  tiltDeg: number;
  status: 'watching' | 'dissolving';
  spawnedAt: number;
  dissolvedAt: number;
  feathers: CrowEyeFeather[];
}

let crowPairCounter = 0;

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function createCrowEyePair(occupiedZones?: Set<number>): CrowEyePair {
  const availableIndices = OUTER_DARK_EYE_ZONES.map((_, idx) => idx).filter(
    (idx) => !occupiedZones || !occupiedZones.has(idx),
  );
  const pool =
    availableIndices.length > 0
      ? availableIndices
      : OUTER_DARK_EYE_ZONES.map((_, idx) => idx);
  const zoneIndex = pool[Math.floor(Math.random() * pool.length)];
  const zone = OUTER_DARK_EYE_ZONES[zoneIndex];

  crowPairCounter += 1;
  const pairId = `crow-eye-${crowPairCounter}`;
  const featherCount = Math.random() > 0.45 ? 3 : 2;
  const feathers: CrowEyeFeather[] = Array.from(
    { length: featherCount },
    (_, index) => {
      const dirAngle =
        ((index / featherCount) * Math.PI * 1.4 - Math.PI * 0.7) +
        randomBetween(-0.35, 0.35);
      const speedDist = randomBetween(46, 86);
      const startRotate = randomBetween(-45, 45);
      return {
        id: `${pairId}-f-${index}`,
        midX: Math.cos(dirAngle) * speedDist * 0.55,
        midY: Math.sin(dirAngle) * speedDist * 0.35 - 10,
        endX: Math.cos(dirAngle) * speedDist,
        endY: Math.sin(dirAngle) * speedDist + 36,
        startRotate,
        midRotate: startRotate + randomBetween(-55, 55),
        endRotate: startRotate + randomBetween(-120, 120),
        lengthScale: randomBetween(0.85, 1.15),
      };
    },
  );

  return {
    id: pairId,
    zoneIndex,
    xPct: randomBetween(zone.minX, zone.maxX),
    yPct: randomBetween(zone.minY, zone.maxY),
    tiltDeg: randomBetween(-8, 8),
    status: 'watching',
    spawnedAt: Date.now(),
    dissolvedAt: 0,
    feathers,
  };
}

interface FeatherParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  length: number;
  width: number;
  rot: number;
  vRot: number;
  tumblePhase: number;
  tumbleSpeed: number;
  swayAmp: number;
  alpha: number;
  camber: number;
}

interface EmberParticle {
  x: number;
  y: number;
  vy: number;
  size: number;
  driftPhase: number;
  driftSpeed: number;
  alpha: number;
  chakraBright: boolean;
}

interface CrowParticle {
  x: number;
  y: number;
  angle: number;
  speed: number;
  curlRate: number;
  scale: number;
  flapPhase: number;
  flapSpeed: number;
  age: number;
  maxAge: number;
  wingSpan: number;
}

function createFeather(
  width: number,
  height: number,
  randomY: boolean,
): FeatherParticle {
  return {
    x: Math.random() * width,
    y: randomY ? Math.random() * height : -24 - Math.random() * 80,
    vx: -14 + Math.random() * 28,
    vy: 24 + Math.random() * 26,
    length: 13 + Math.random() * 14,
    width: 4.5 + Math.random() * 4,
    rot: Math.random() * Math.PI * 2,
    vRot: -0.75 + Math.random() * 1.5,
    tumblePhase: Math.random() * Math.PI * 2,
    tumbleSpeed: 1.4 + Math.random() * 1.9,
    swayAmp: 18 + Math.random() * 26,
    alpha: 0.48 + Math.random() * 0.4,
    camber: (Math.random() > 0.5 ? 1 : -1) * (0.14 + Math.random() * 0.14),
  };
}

function createEmber(
  width: number,
  height: number,
  randomY: boolean,
): EmberParticle {
  return {
    x: Math.random() * width,
    y: randomY ? Math.random() * height : height + 10 + Math.random() * 60,
    vy: -(18 + Math.random() * 34),
    size: 1.4 + Math.random() * 2.2,
    driftPhase: Math.random() * Math.PI * 2,
    driftSpeed: 1.2 + Math.random() * 2.0,
    alpha: 0.32 + Math.random() * 0.62,
    chakraBright: Math.random() > 0.42,
  };
}

function spawnCrowBurst(
  crows: CrowParticle[],
  width: number,
  height: number,
): void {
  const cx = width * 0.5;
  const cy = height * 0.5;
  for (let i = 0; i < CROW_BURST_COUNT; i++) {
    if (crows.length >= MAX_ACTIVE_CROWS) {
      crows.shift();
    }
    const baseAngle = (i / CROW_BURST_COUNT) * Math.PI * 2;
    crows.push({
      x: cx + randomBetween(-14, 14),
      y: cy + randomBetween(-14, 14),
      angle: baseAngle + randomBetween(-0.22, 0.22),
      speed: randomBetween(280, 580),
      curlRate: randomBetween(-0.52, 0.52),
      scale: 0.25,
      flapPhase: randomBetween(0, Math.PI * 2),
      flapSpeed: randomBetween(12, 16),
      age: 0,
      maxAge: 2.3,
      wingSpan: randomBetween(24, 34),
    });
  }
}

function updateAndDrawEmbers(
  ctx: CanvasRenderingContext2D,
  embers: EmberParticle[],
  activeLimit: number,
  dt: number,
  width: number,
  height: number,
  active: boolean,
  rgb: CanvasChakraRgb,
): void {
  for (let i = 0; i < activeLimit; i++) {
    const ember = embers[i];
    ember.driftPhase += ember.driftSpeed * dt;
    ember.y += ember.vy * (active ? 1.15 : 0.75) * dt;
    ember.x += Math.sin(ember.driftPhase) * 14 * dt;

    if (ember.y < -16) {
      embers[i] = createEmber(width, height, false);
      continue;
    }

    const heightRatio = Math.max(0, Math.min(1, ember.y / Math.max(1, height)));
    const fade = Math.sin(heightRatio * Math.PI);
    const alpha = ember.alpha * fade * (active ? 0.92 : 0.42);
    if (alpha <= 0.02) continue;

    const r = ember.chakraBright ? rgb.brightR : rgb.r;
    const g = ember.chakraBright ? rgb.brightG : rgb.g;
    const b = ember.chakraBright ? rgb.brightB : rgb.b;

    if (ember.chakraBright && active) {
      ctx.beginPath();
      ctx.arc(ember.x, ember.y, ember.size * 2.2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${(alpha * 0.24).toFixed(3)})`;
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(ember.x, ember.y, ember.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`;
    ctx.fill();
  }
}

function updateAndDrawFeathers(
  ctx: CanvasRenderingContext2D,
  feathers: FeatherParticle[],
  activeLimit: number,
  dt: number,
  tSec: number,
  width: number,
  height: number,
  active: boolean,
  rgb: CanvasChakraRgb,
): void {
  const gustBase =
    Math.sin(tSec * 0.42) * 34 +
    Math.sin(tSec * 1.15 + 1.4) * 18 +
    Math.cos(tSec * 0.19) * 22;

  for (let i = 0; i < activeLimit; i++) {
    const f = feathers[i];
    f.tumblePhase += f.tumbleSpeed * dt;

    const localEddy =
      Math.sin(tSec * 0.9 + f.y * 0.006 + f.x * 0.003) * 22;
    const windX = (gustBase + localEddy) * (active ? 1.15 : 0.72);
    const targetWind = windX + Math.sin(f.tumblePhase * 0.85) * f.swayAmp;

    // Aerodynamic drag & vertical lift flutter
    f.vx += (targetWind - f.vx) * 1.8 * dt;
    const tumbleScale = Math.cos(f.tumblePhase);
    const broadside = Math.abs(tumbleScale);
    const liftFlutter =
      broadside * Math.sin(f.tumblePhase * 1.7) * 16 +
      Math.abs(windX) * 0.12 * broadside;
    const effectiveVy = Math.max(8, f.vy * (active ? 1.0 : 0.72) - liftFlutter);

    f.x += f.vx * dt;
    f.y += effectiveVy * dt;
    const aeroTilt = Math.max(-0.45, Math.min(0.45, f.vx * 0.004));
    f.rot += (f.vRot + aeroTilt * 0.6) * dt;

    if (f.y > height + 40) {
      feathers[i] = createFeather(width, height, false);
      continue;
    }
    if (f.x < -50) f.x = width + 40;
    if (f.x > width + 50) f.x = -40;

    const absTumble = Math.max(0.18, broadside);
    const alpha = f.alpha * (active ? 1 : 0.46);
    const curveShift = f.length * f.camber;

    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(f.rot);
    ctx.scale(tumbleScale < 0 ? -absTumble : absTumble, 1);

    // Crisp curved crow feather vane with natural barb notch
    ctx.beginPath();
    ctx.moveTo(0, -f.length * 0.56);
    ctx.bezierCurveTo(
      f.width * 1.05 + curveShift * 0.35,
      -f.length * 0.24,
      f.width * 0.95 + curveShift * 0.55,
      f.length * 0.14,
      f.width * 0.48 + curveShift * 0.4,
      f.length * 0.42,
    );
    ctx.lineTo(f.width * 0.22 + curveShift * 0.3, f.length * 0.35);
    ctx.lineTo(f.width * 0.32 + curveShift * 0.25, f.length * 0.52);
    ctx.lineTo(curveShift * 0.1, f.length * 0.62);
    ctx.bezierCurveTo(
      -f.width * 0.95 + curveShift * 0.15,
      f.length * 0.28,
      -f.width * 0.9 + curveShift * 0.25,
      -f.length * 0.18,
      0,
      -f.length * 0.56,
    );
    ctx.closePath();

    ctx.fillStyle = `rgba(6, 6, 9, ${alpha.toFixed(3)})`;
    ctx.fill();

    ctx.lineWidth = 0.85;
    ctx.strokeStyle = active
      ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${(alpha * 0.56).toFixed(3)})`
      : `rgba(82, 82, 91, ${(alpha * 0.38).toFixed(3)})`;
    ctx.stroke();

    // Curved central rachis quill line
    ctx.beginPath();
    ctx.moveTo(0, -f.length * 0.54);
    ctx.quadraticCurveTo(
      curveShift * 0.35,
      0,
      curveShift * 0.08,
      f.length * 0.72,
    );
    ctx.lineWidth = 0.75;
    ctx.strokeStyle = active
      ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${(alpha * 0.46).toFixed(3)})`
      : `rgba(113, 113, 122, ${(alpha * 0.35).toFixed(3)})`;
    ctx.stroke();

    ctx.restore();
  }
}

function updateAndDrawCrows(
  ctx: CanvasRenderingContext2D,
  crows: CrowParticle[],
  dt: number,
  width: number,
  height: number,
  rgb: CanvasChakraRgb,
): void {
  if (crows.length === 0) return;

  const cx = width * 0.5;
  const cy = height * 0.5;
  const maxRadius = Math.hypot(cx, cy) + 90;

  for (let i = crows.length - 1; i >= 0; i--) {
    const crow = crows[i];
    crow.age += dt;
    crow.flapPhase += crow.flapSpeed * dt;
    crow.angle += crow.curlRate * Math.max(0.25, 1 - crow.age * 0.55) * dt;
    crow.x += Math.cos(crow.angle) * crow.speed * dt;
    crow.y += Math.sin(crow.angle) * crow.speed * dt;

    const dist = Math.hypot(crow.x - cx, crow.y - cy);
    const distRatio = Math.min(1, dist / Math.max(1, maxRadius));
    crow.scale = 0.25 + (1.8 - 0.25) * Math.pow(distRatio, 0.85);

    if (distRatio >= 1 || crow.age >= crow.maxAge) {
      crows.splice(i, 1);
      continue;
    }

    const fadeIn = Math.min(1, crow.age / 0.08);
    const edgeFade =
      distRatio < 0.72 ? 1 : Math.max(0, 1 - (distRatio - 0.72) / 0.28);
    const alpha = fadeIn * edgeFade * 0.96;
    if (alpha <= 0.02) continue;

    const flap = Math.sin(crow.flapPhase);
    const fold = Math.cos(crow.flapPhase);
    const w = crow.wingSpan;
    const wingTipX = w * (0.82 + 0.18 * fold);
    const wingTipY = flap * w * 0.52;
    const wristX = w * 0.44;
    const wristY = flap * w * 0.28 - w * 0.14;

    ctx.save();
    ctx.translate(crow.x, crow.y);
    ctx.rotate(crow.angle + Math.PI * 0.5);
    ctx.scale(crow.scale, crow.scale);

    // Real-time wing-flapping bezier crow silhouette
    ctx.beginPath();
    ctx.moveTo(0, -w * 0.58); // Beak tip
    ctx.lineTo(w * 0.08, -w * 0.36); // Right head
    ctx.quadraticCurveTo(w * 0.12, -w * 0.22, w * 0.14, -w * 0.14); // Right shoulder
    ctx.bezierCurveTo(
      wristX,
      wristY,
      wingTipX * 0.88,
      wingTipY - w * 0.08,
      wingTipX,
      wingTipY,
    );
    ctx.bezierCurveTo(
      w * 0.62,
      wingTipY + w * 0.2,
      w * 0.28,
      w * 0.16,
      w * 0.1,
      w * 0.22,
    );
    // Fanned tail
    ctx.lineTo(w * 0.16, w * 0.54);
    ctx.lineTo(0, w * 0.45);
    ctx.lineTo(-w * 0.16, w * 0.54);
    ctx.lineTo(-w * 0.1, w * 0.22);
    // Left wing
    ctx.bezierCurveTo(
      -w * 0.28,
      w * 0.16,
      -w * 0.62,
      wingTipY + w * 0.2,
      -wingTipX,
      wingTipY,
    );
    ctx.bezierCurveTo(
      -wingTipX * 0.88,
      wingTipY - w * 0.08,
      -wristX,
      wristY,
      -w * 0.14,
      -w * 0.14,
    );
    ctx.quadraticCurveTo(-w * 0.12, -w * 0.22, -w * 0.08, -w * 0.36);
    ctx.closePath();

    ctx.fillStyle = `rgba(4, 4, 7, ${alpha.toFixed(3)})`;
    ctx.fill();

    ctx.lineWidth = 1.0;
    ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${(alpha * 0.52).toFixed(3)})`;
    ctx.stroke();

    // Glowing chakra-tinted eyes
    ctx.shadowColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha.toFixed(3)})`;
    ctx.shadowBlur = 8;
    ctx.fillStyle = `rgba(${rgb.brightR}, ${rgb.brightG}, ${rgb.brightB}, ${alpha.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(-w * 0.036, -w * 0.38, 1.45, 0, Math.PI * 2);
    ctx.arc(w * 0.036, -w * 0.38, 1.45, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

function DissolveFeatherSvg() {
  return (
    <svg
      viewBox="0 0 24 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-7 w-4 drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]"
    >
      <path
        d="M 12 2 C 17 10 20 20 16 32 L 12 37 L 7 31 C 4 21 7 11 12 2 Z"
        fill="#050507"
        stroke="var(--chakra-primary, #991B1B)"
        strokeOpacity="0.6"
        strokeWidth="0.9"
      />
      <line
        x1="12"
        y1="4"
        x2="12"
        y2="42"
        stroke="var(--chakra-primary, #7F1D1D)"
        strokeOpacity="0.65"
        strokeWidth="0.9"
      />
    </svg>
  );
}

function ForegroundGiantFeatherSvg() {
  return (
    <svg
      viewBox="0 0 240 90"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-28 w-72 sm:h-32 sm:w-80"
    >
      <path
        d="M 8 48 C 46 24 106 12 178 24 C 204 29 224 38 234 45 C 216 56 188 67 148 70 C 98 74 52 66 22 54 L 8 48 Z"
        fill="#040406"
        stroke="var(--chakra-primary, #7F1D1D)"
        strokeOpacity="0.45"
        strokeWidth="1.5"
      />
      <path
        d="M 0 50 C 66 47 146 43 230 45"
        stroke="var(--chakra-primary, #450A0A)"
        strokeOpacity="0.65"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MistTile({
  intense,
  variant = 'back',
}: {
  intense: boolean;
  variant?: 'back' | 'front';
}) {
  const isFront = variant === 'front';
  return (
    <div className="relative h-full w-1/2 shrink-0">
      <div
        className="absolute inset-0"
        style={{
          background: isFront
            ? 'linear-gradient(180deg, transparent 0%, rgba(5, 5, 8, 0.4) 48%, rgba(0, 0, 0, 0.92) 100%)'
            : 'linear-gradient(180deg, transparent 0%, rgba(7, 7, 10, 0.35) 55%, rgba(0, 0, 0, 0.88) 100%)',
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          opacity: intense ? (isFront ? 0.95 : 0.85) : isFront ? 0.7 : 0.6,
          background: isFront
            ? 'radial-gradient(ellipse 30% 62% at 15% 84%, rgba(255, 255, 255, 0.055) 0%, transparent 70%), radial-gradient(ellipse 34% 66% at 46% 80%, rgba(255, 255, 255, 0.048) 0%, transparent 72%), radial-gradient(ellipse 28% 58% at 78% 86%, rgba(255, 255, 255, 0.05) 0%, transparent 68%)'
            : 'radial-gradient(ellipse 34% 68% at 20% 82%, rgba(255, 255, 255, 0.045) 0%, transparent 72%), radial-gradient(ellipse 38% 74% at 54% 76%, rgba(255, 255, 255, 0.038) 0%, transparent 74%), radial-gradient(ellipse 32% 65% at 84% 84%, rgba(255, 255, 255, 0.042) 0%, transparent 70%)',
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          opacity: intense ? (isFront ? 0.34 : 0.28) : isFront ? 0.2 : 0.16,
          background: isFront
            ? 'radial-gradient(ellipse 32% 64% at 18% 88%, var(--chakra-glow, rgba(220, 38, 38, 0.38)) 0%, transparent 72%), radial-gradient(ellipse 36% 68% at 64% 86%, var(--chakra-glow, rgba(220, 38, 38, 0.38)) 0%, transparent 72%)'
            : 'radial-gradient(ellipse 36% 72% at 24% 86%, var(--chakra-glow, rgba(220, 38, 38, 0.38)) 0%, transparent 74%), radial-gradient(ellipse 40% 70% at 72% 88%, var(--chakra-glow, rgba(220, 38, 38, 0.38)) 0%, transparent 74%)',
        }}
      />
    </div>
  );
}

export function GenjutsuBackdrop() {
  const isTsukuyomiMode = useIsTsukuyomiMode();
  const { status: timerStatus } = useTimerCore();
  const currentMinuteBucket = useTsukuyomiStore((s) =>
    Math.floor(s.timer.remainingSeconds / 60),
  );
  const mangekyouVariant = useTsukuyomiStore((s) => s.mangekyouVariant);
  const izanagiFlashNonce = useTsukuyomiStore((s) => s.izanagiFlashNonce);
  const tsukuyomiCastNonce = useTsukuyomiCastNonce();
  const prefersReducedMotion = useReducedMotion();

  const isTimerRunning = timerStatus === 'running';
  const isGenjutsuActive = isTsukuyomiMode || isTimerRunning;
  const factor = prefersReducedMotion ? 0 : 1;

  const [crowPairs, setCrowPairs] = useState<CrowEyePair[]>([]);
  const [waterRippleNonce, setWaterRippleNonce] = useState(0);
  const [foregroundFeatherNonce, setForegroundFeatherNonce] = useState(0);

  const genjutsuActiveRef = useRef(isGenjutsuActive);
  useEffect(() => {
    genjutsuActiveRef.current = isGenjutsuActive;
  }, [isGenjutsuActive]);

  const chakraRgbRef = useRef<CanvasChakraRgb>(
    CHAKRA_RGB_MAP[mangekyouVariant] ?? CHAKRA_RGB_MAP.itachi,
  );
  useEffect(() => {
    chakraRgbRef.current =
      CHAKRA_RGB_MAP[mangekyouVariant] ?? CHAKRA_RGB_MAP.itachi;
  }, [mangekyouVariant]);

  const tsukuyomiCastNonceRef = useRef(tsukuyomiCastNonce);
  useEffect(() => {
    tsukuyomiCastNonceRef.current = tsukuyomiCastNonce;
  }, [tsukuyomiCastNonce]);

  const crowPairsRef = useRef<CrowEyePair[]>([]);
  useEffect(() => {
    crowPairsRef.current = crowPairs;
  }, [crowPairs]);

  const prevMinuteRef = useRef<number | null>(null);
  useEffect(() => {
    const prevMinute = prevMinuteRef.current;
    prevMinuteRef.current = currentMinuteBucket;

    if (
      prefersReducedMotion ||
      !isTimerRunning ||
      prevMinute === null ||
      currentMinuteBucket === prevMinute
    ) {
      return;
    }

    const rafId = window.requestAnimationFrame(() => {
      setWaterRippleNonce((n) => n + 1);
    });
    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [currentMinuteBucket, isTimerRunning, prefersReducedMotion]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);

  const smoothX = useSpring(rawX, BACKDROP_SPRING);
  const smoothY = useSpring(rawY, BACKDROP_SPRING);

  // Layer -3 (Genjutsu Sky & Blood Moon): slowest depth
  const skyX = useTransform(smoothX, [-0.5, 0.5], [10 * factor, -10 * factor]);
  const skyY = useTransform(smoothY, [-0.5, 0.5], [10 * factor, -10 * factor]);

  // Heavy cinematic parallax for Tsukuyomi Blood Moon descent impact
  const moonDescentX = useTransform(
    smoothX,
    [-0.5, 0.5],
    [34 * factor, -34 * factor],
  );
  const moonDescentY = useTransform(
    smoothY,
    [-0.5, 0.5],
    [28 * factor, -28 * factor],
  );

  // Layer -2 (Abyss Vignette & 2.5D Architectural Horizon): mid & deep parallax planes
  const abyssX = useTransform(smoothX, [-0.5, 0.5], [16 * factor, -16 * factor]);
  const abyssY = useTransform(smoothY, [-0.5, 0.5], [16 * factor, -16 * factor]);

  const monolithX = useTransform(
    smoothX,
    [-0.5, 0.5],
    [18 * factor, -18 * factor],
  );
  const monolithY = useTransform(
    smoothY,
    [-0.5, 0.5],
    [14 * factor, -14 * factor],
  );

  const horizonX = useTransform(smoothX, [-0.5, 0.5], [24 * factor, -24 * factor]);
  const horizonY = useTransform(smoothY, [-0.5, 0.5], [18 * factor, -18 * factor]);

  // Global pointer tracking for 2.5D parallax & edge crow-eye proximity dissolve
  useEffect(() => {
    if (prefersReducedMotion) {
      rawX.set(0);
      rawY.set(0);
      return;
    }

    const handlePointerMove = (e: globalThis.PointerEvent) => {
      const width = window.innerWidth || 1;
      const height = window.innerHeight || 1;
      const normX = Math.max(-0.5, Math.min(0.5, e.clientX / width - 0.5));
      const normY = Math.max(-0.5, Math.min(0.5, e.clientY / height - 0.5));
      rawX.set(normX);
      rawY.set(normY);

      const pairs = crowPairsRef.current;
      if (pairs.length === 0) return;

      let triggered = false;
      const now = Date.now();
      const updated = pairs.map((pair) => {
        if (pair.status !== 'watching') return pair;
        const pairX = (pair.xPct / 100) * width;
        const pairY = (pair.yPct / 100) * height;
        const dx = e.clientX - pairX;
        const dy = e.clientY - pairY;
        if (dx * dx + dy * dy <= CROW_EYE_TRIGGER_RADIUS_SQ) {
          triggered = true;
          return {
            ...pair,
            status: 'dissolving' as const,
            dissolvedAt: now,
          };
        }
        return pair;
      });

      if (triggered) {
        crowPairsRef.current = updated;
        setCrowPairs(updated);
      }
    };

    const handlePointerLeave = () => {
      rawX.set(0);
      rawY.set(0);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerleave', handlePointerLeave, { passive: true });

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerleave', handlePointerLeave);
    };
  }, [prefersReducedMotion, rawX, rawY]);

  // Ambient darkness blinking crow eyes lifecycle (outer screen edges)
  useEffect(() => {
    if (prefersReducedMotion || typeof window === 'undefined') {
      return;
    }

    const initialTimer = window.setTimeout(() => {
      const first = createCrowEyePair();
      const occupied = new Set([first.zoneIndex]);
      const second = createCrowEyePair(occupied);
      setCrowPairs([first, second]);
    }, 900);

    const cycleInterval = window.setInterval(() => {
      const now = Date.now();
      setCrowPairs((prev) => {
        const active = prev.filter((pair) => {
          if (pair.status === 'dissolving') {
            return now - pair.dissolvedAt < 1150;
          }
          return now - pair.spawnedAt < 9000;
        });

        const watchingCount = active.filter((p) => p.status === 'watching').length;
        if (watchingCount < 3) {
          const occupied = new Set(active.map((p) => p.zoneIndex));
          return [...active, createCrowEyePair(occupied)];
        }
        return active.length === prev.length ? prev : active;
      });
    }, 2000);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(cycleInterval);
    };
  }, [prefersReducedMotion]);

  // Depth-of-Field foreground giant feather sweeping across camera lens every 12s
  useEffect(() => {
    if (prefersReducedMotion || typeof window === 'undefined') {
      return;
    }

    const sweepInterval = window.setInterval(() => {
      setForegroundFeatherNonce((n) => n + 1);
    }, 12000);

    return () => {
      window.clearInterval(sweepInterval);
    };
  }, [prefersReducedMotion]);

  // Layer -1: 60fps Wind-Physics Crow Feathers, Chakra Embers & Animated Crows Canvas
  useEffect(() => {
    if (prefersReducedMotion || typeof window === 'undefined') {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resizeCanvas = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resizeCanvas();

    const maxFeathers = 22;
    const maxEmbers = 34;
    const feathers: FeatherParticle[] = Array.from({ length: maxFeathers }, () =>
      createFeather(width, height, true),
    );
    const embers: EmberParticle[] = Array.from({ length: maxEmbers }, () =>
      createEmber(width, height, true),
    );
    const crows: CrowParticle[] = [];

    let lastSeenCastNonce = 0;
    let rafId = 0;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;
      const tSec = now * 0.001;

      const currentCastNonce = tsukuyomiCastNonceRef.current;
      if (currentCastNonce > lastSeenCastNonce) {
        lastSeenCastNonce = currentCastNonce;
        if (currentCastNonce > 0) {
          spawnCrowBurst(crows, width, height);
        }
      }

      const active = genjutsuActiveRef.current;
      const activeFeatherLimit = active ? maxFeathers : 7;
      const activeEmberLimit = active ? maxEmbers : 10;
      const rgb = chakraRgbRef.current;

      ctx.clearRect(0, 0, width, height);

      updateAndDrawEmbers(
        ctx,
        embers,
        activeEmberLimit,
        dt,
        width,
        height,
        active,
        rgb,
      );
      updateAndDrawFeathers(
        ctx,
        feathers,
        activeFeatherLimit,
        dt,
        tSec,
        width,
        height,
        active,
        rgb,
      );
      updateAndDrawCrows(ctx, crows, dt, width, height, rgb);

      rafId = window.requestAnimationFrame(tick);
    };

    window.addEventListener('resize', resizeCanvas, { passive: true });
    rafId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [prefersReducedMotion]);

  const activeForegroundTrajectory =
    FOREGROUND_FEATHER_TRAJECTORIES[
      foregroundFeatherNonce % FOREGROUND_FEATHER_TRAJECTORIES.length
    ];

  return (
    <>
      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none fixed inset-0 z-0 overflow-hidden transition-colors duration-700',
          isTsukuyomiMode ? 'bg-[#000000]' : 'bg-[#09090B]',
        )}
      >
        {/* Layer -3: Genjutsu Crimson Sky, Giant Blood Moon (/assets/vfx/blood-moon.webp) & Drifting Volumetric Clouds */}
        <motion.div
          style={{ x: skyX, y: skyY, ...WILL_CHANGE_TRANSFORM }}
          className={cn(
            'absolute -inset-10 transition-opacity duration-1000',
            isGenjutsuActive ? 'opacity-100' : 'opacity-0',
          )}
        >
          {/* Dark reactive Tsukuyomi atmospheric sky */}
          <div
            className="absolute inset-0 transition-all duration-700"
            style={{
              background:
                'radial-gradient(ellipse 85% 58% at 72% 20%, rgba(var(--chakra-rgb, 220, 38, 38), 0.24) 0%, rgba(var(--chakra-rgb, 220, 38, 38), 0.1) 44%, rgba(0, 0, 0, 0) 78%), linear-gradient(180deg, rgba(16, 6, 12, 0.55) 0%, rgba(6, 4, 8, 0.25) 52%, rgba(0, 0, 0, 0) 100%)',
            }}
          />

          {/* Giant Blood Moon (real VFX artwork fused with chakra lunar corona & subtle Rinnegan projection) */}
          <motion.div
            key={`sky-blood-moon-${tsukuyomiCastNonce}`}
            initial={
              tsukuyomiCastNonce > 0 && !prefersReducedMotion
                ? { y: -150, scale: 1.24, opacity: 0.15 }
                : { y: 0, scale: 1, opacity: 1 }
            }
            animate={{ y: 0, scale: 1, opacity: 1 }}
            transition={
              tsukuyomiCastNonce > 0 && !prefersReducedMotion
                ? { duration: 1.25, type: 'tween', ease: [0.16, 1, 0.3, 1] }
                : { duration: 0 }
            }
            style={WILL_CHANGE_TRANSFORM_OPACITY}
            className="absolute right-[4%] top-[4%] h-[230px] w-[230px] sm:right-[9%] sm:top-[4%] sm:h-[340px] sm:w-[340px] lg:h-[420px] lg:w-[420px]"
          >
            {/* Atmospheric reactive lunar corona */}
            <div
              className="absolute -inset-10 rounded-full transition-all duration-700"
              style={{
                background:
                  'radial-gradient(circle at center, rgba(var(--chakra-rgb, 220, 38, 38), 0.32) 0%, rgba(var(--chakra-rgb, 220, 38, 38), 0.12) 52%, rgba(0, 0, 0, 0) 74%)',
              }}
            />

            <Image
              src="/assets/vfx/blood-moon.webp"
              alt=""
              fill
              unoptimized
              loading="eager"
              sizes="(min-width: 1024px) 420px, (min-width: 640px) 340px, 230px"
              className={cn('object-contain opacity-95', VFX_BLEND_MASK_CLASS)}
            />

            {/* Subtle Projected Rinnegan / Mangekyou Silhouette */}
            <svg
              viewBox="0 0 320 320"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="relative z-10 h-full w-full opacity-[0.18]"
            >
              <g stroke="#09090B">
                <circle cx="160" cy="160" r="80" strokeWidth="1.4" />
                <circle cx="160" cy="160" r="56" strokeWidth="1.4" />
                <circle cx="160" cy="160" r="32" strokeWidth="1.4" />
                {[0, 120, 240].map((angle) => (
                  <path
                    key={angle}
                    transform={`rotate(${angle} 160 160)`}
                    d="M 152 146 C 148 116 168 88 202 80 C 184 102 178 122 176 146 Z"
                    fill="#09090B"
                    stroke="none"
                  />
                ))}
                <circle cx="160" cy="160" r="10" fill="#09090B" stroke="none" />
              </g>
            </svg>
          </motion.div>

          {/* Drifting Volumetric Clouds */}
          <motion.div
            animate={
              prefersReducedMotion
                ? { x: 0 }
                : { x: [-40, 48, -40] }
            }
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { duration: 36, repeat: Infinity, type: 'tween', ease: 'easeInOut' }
            }
            style={WILL_CHANGE_TRANSFORM}
            className="absolute inset-x-0 top-[4%] h-56 opacity-75"
          >
            <div
              className="absolute left-[10%] top-4 h-28 w-[42vw] rounded-full blur-2xl"
              style={{
                background:
                  'radial-gradient(ellipse at center, rgba(18, 4, 7, 0.88) 0%, rgba(45, 7, 10, 0.35) 55%, rgba(0,0,0,0) 78%)',
              }}
            />
            <div
              className="absolute right-[4%] top-16 h-32 w-[48vw] rounded-full blur-2xl"
              style={{
                background:
                  'radial-gradient(ellipse at center, rgba(9, 9, 11, 0.9) 0%, rgba(69, 10, 10, 0.28) 58%, rgba(0,0,0,0) 80%)',
              }}
            />
          </motion.div>

          <motion.div
            animate={
              prefersReducedMotion
                ? { x: 0 }
                : { x: [44, -44, 44] }
            }
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { duration: 48, repeat: Infinity, type: 'tween', ease: 'easeInOut' }
            }
            style={WILL_CHANGE_TRANSFORM}
            className="absolute inset-x-0 top-[18%] h-52 opacity-70"
          >
            <div
              className="absolute left-[26%] top-2 h-24 w-[52vw] rounded-full blur-2xl"
              style={{
                background:
                  'radial-gradient(ellipse at center, rgba(12, 4, 6, 0.85) 0%, rgba(92, 14, 18, 0.24) 55%, rgba(0,0,0,0) 80%)',
              }}
            />
          </motion.div>
        </motion.div>

        {/* Layer -2: Abyss & Crimson Radial Vignette */}
        <motion.div
          style={{ x: abyssX, y: abyssY, ...WILL_CHANGE_TRANSFORM }}
          className={cn(
            'absolute -inset-8 transition-opacity duration-700',
            isTsukuyomiMode ? 'tsukuyomi-vignette opacity-100' : 'normal-vignette opacity-100',
          )}
        />

        {/* Layer -2: Static SVG feTurbulence stone micro-texture (opacity 0.03) */}
        <div className="naka-stone-texture absolute inset-0" />

        {/* Layer -2: Tsukuyomi Genjutsu grid lines */}
        <motion.div
          style={{ x: horizonX, y: horizonY, ...WILL_CHANGE_TRANSFORM }}
          className={cn(
            'genjutsu-grid-lines absolute -inset-12 transition-opacity duration-700',
            isTsukuyomiMode
              ? 'animate-genjutsu-drift opacity-65'
              : 'opacity-20',
          )}
        />

        {/* Layer -2: Subtle Naka Shrine Seal Geometry */}
        <motion.div
          style={{ x: horizonX, y: horizonY, ...WILL_CHANGE_TRANSFORM }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <div
            className={cn(
              'transition-opacity duration-700',
              isTsukuyomiMode ? 'opacity-25' : 'opacity-10',
            )}
          >
            <svg
              width="760"
              height="760"
              viewBox="0 0 760 760"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="h-[min(86vw,760px)] w-[min(86vw,760px)]"
            >
              <circle
                cx="380"
                cy="380"
                r="340"
                stroke="var(--chakra-primary, #7F1D1D)"
                strokeOpacity="0.45"
                strokeWidth="1"
                strokeDasharray="6 10"
              />
              <circle
                cx="380"
                cy="380"
                r="268"
                stroke="var(--chakra-primary, #DC2626)"
                strokeOpacity="0.45"
                strokeWidth="1"
              />
              <circle
                cx="380"
                cy="380"
                r="196"
                stroke="var(--chakra-primary, #7F1D1D)"
                strokeOpacity="0.45"
                strokeWidth="1"
                strokeDasharray="2 8"
              />
              <polygon
                points="380,68 650,536 110,536"
                stroke="var(--chakra-primary, #7F1D1D)"
                strokeOpacity="0.4"
                strokeWidth="1"
              />
              <polygon
                points="380,692 110,224 650,224"
                stroke="var(--chakra-primary, #7F1D1D)"
                strokeOpacity="0.32"
                strokeWidth="1"
              />
              <line
                x1="380"
                y1="20"
                x2="380"
                y2="740"
                stroke="#27272A"
                strokeOpacity="0.7"
                strokeWidth="1"
              />
              <line
                x1="20"
                y1="380"
                x2="740"
                y2="380"
                stroke="#27272A"
                strokeOpacity="0.7"
                strokeWidth="1"
              />
            </svg>
          </div>
        </motion.div>

        {/* Layer -2B: Real 2.5D Monoliths Horizon Artwork (/assets/vfx/monoliths-horizon.webp) */}
        <motion.div
          style={{ x: monolithX, y: monolithY, ...WILL_CHANGE_TRANSFORM }}
          className={cn(
            'absolute -inset-8 transition-opacity duration-1000',
            isGenjutsuActive ? 'opacity-75' : 'opacity-30',
          )}
        >
          <div className="relative h-full w-full">
            <Image
              src="/assets/vfx/monoliths-horizon.webp"
              alt=""
              fill
              unoptimized
              loading="eager"
              sizes="100vw"
              className={cn('object-cover object-bottom', VFX_BLEND_MASK_CLASS)}
            />
          </div>
        </motion.div>

        {/* Layer -2A: 2.5D Architectural Horizon Silhouette (Tilted Tsukuyomi Monoliths/Crosses, Broken Torii Gates, Konoha Utility Poles/Cables) */}
        <motion.div
          style={{ x: horizonX, y: horizonY, ...WILL_CHANGE_TRANSFORM }}
          className={cn(
            'absolute -inset-8 transition-opacity duration-700',
            isGenjutsuActive ? 'opacity-90' : 'opacity-40',
          )}
        >
          <svg
            viewBox="0 0 1440 900"
            preserveAspectRatio="xMidYMax slice"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="h-full w-full"
          >
            {/* Dark Ground Silhouette Ridge */}
            <path
              d="M 0 770 L 210 742 L 420 778 L 720 792 L 1030 775 L 1250 744 L 1440 768 L 1440 900 L 0 900 Z"
              fill="#040406"
            />

            {/* Left Flank: Tilted Tsukuyomi Crosses & Monoliths */}
            <g
              fill="#050508"
              stroke={isGenjutsuActive ? 'var(--chakra-primary, #7F1D1D)' : '#27272A'}
              strokeOpacity={isGenjutsuActive ? '0.45' : '0.45'}
              strokeWidth="1.2"
            >
              {/* Tall tilted Tsukuyomi cross (Left Outer) */}
              <g transform="translate(155 560) rotate(-13)">
                <rect x="-13" y="-210" width="26" height="420" />
                <rect x="-86" y="-128" width="172" height="22" />
              </g>
              {/* Secondary tilted monolith / cross (Left Inner) */}
              <g transform="translate(295 620) rotate(9)">
                <rect x="-9" y="-155" width="18" height="310" />
                <rect x="-56" y="-92" width="112" height="16" />
              </g>
              {/* Broken Torii Gate Silhouette (Lower Left) */}
              <g transform="translate(228 730)">
                <path d="M -68 -95 L 74 -108 L 78 -98 L -64 -84 Z" />
                <path d="M -52 -66 L 56 -76 L 56 -68 L -52 -58 Z" />
                <rect x="-42" y="-88" width="12" height="118" />
                <path d="M 28 -96 L 40 -96 L 40 -34 L 28 -44 Z" />
              </g>
            </g>

            {/* Right Flank: Tilted Tsukuyomi Monoliths & Broken Torii */}
            <g
              fill="#050508"
              stroke={isGenjutsuActive ? 'var(--chakra-primary, #7F1D1D)' : '#27272A'}
              strokeOpacity={isGenjutsuActive ? '0.45' : '0.45'}
              strokeWidth="1.2"
            >
              {/* Tall tilted Tsukuyomi cross (Right Outer) */}
              <g transform="translate(1285 570) rotate(12)">
                <rect x="-14" y="-215" width="28" height="430" />
                <rect x="-88" y="-132" width="176" height="22" />
              </g>
              {/* Leaning monolith slab (Right Inner) */}
              <g transform="translate(1152 636) rotate(-11)">
                <polygon points="-12,-170 12,-150 18,175 -16,175" />
              </g>
              {/* Broken Torii Pillar (Lower Right) */}
              <g transform="translate(1196 734)">
                <path d="M -62 -86 L 26 -96 L 18 -84 L -64 -76 Z" />
                <rect x="-46" y="-82" width="12" height="114" />
                <rect x="28" y="-48" width="11" height="80" />
              </g>
            </g>

            {/* Konoha Utility Poles & Sagging Catenary Cables */}
            <g stroke="#07070A" fill="#050508">
              {/* Left Konoha Pole */}
              <rect x="74" y="210" width="9" height="585" />
              <rect x="44" y="248" width="68" height="5" />
              <rect x="52" y="290" width="52" height="4" />
              {/* Right Konoha Pole */}
              <rect x="1356" y="195" width="9" height="598" />
              <rect x="1324" y="232" width="70" height="5" />
              <rect x="1332" y="274" width="54" height="4" />

              {/* Sagging power cables across outer edges */}
              <path
                d="M -20 218 Q 34 252 78 248 Q 220 355 430 330"
                fill="none"
                stroke={isGenjutsuActive ? 'var(--chakra-primary, #450A0A)' : '#18181B'}
                strokeWidth="1.4"
                strokeOpacity={isGenjutsuActive ? '0.42' : '0.7'}
              />
              <path
                d="M -20 264 Q 30 296 78 290 Q 210 390 390 368"
                fill="none"
                stroke={isGenjutsuActive ? 'var(--chakra-primary, #450A0A)' : '#18181B'}
                strokeWidth="1.1"
                strokeOpacity={isGenjutsuActive ? '0.35' : '0.55'}
              />
              <path
                d="M 1010 318 Q 1210 352 1360 232 Q 1408 240 1460 210"
                fill="none"
                stroke={isGenjutsuActive ? 'var(--chakra-primary, #450A0A)' : '#18181B'}
                strokeWidth="1.4"
                strokeOpacity={isGenjutsuActive ? '0.42' : '0.7'}
              />
              <path
                d="M 1050 358 Q 1230 388 1360 274 Q 1410 282 1460 256"
                fill="none"
                stroke={isGenjutsuActive ? 'var(--chakra-primary, #450A0A)' : '#18181B'}
                strokeWidth="1.1"
                strokeOpacity={isGenjutsuActive ? '0.35' : '0.55'}
              />
            </g>
          </svg>
        </motion.div>

        {/* Layer -1.5: Deep Center-Darkening Vignette + Reactive Peripheral Chakra Bleed */}
        <div
          className={cn(
            'pointer-events-none absolute inset-0 transition-all duration-700',
            isGenjutsuActive ? 'opacity-100' : 'opacity-90',
          )}
          style={{
            background:
              'radial-gradient(circle at 50% 48%, rgba(0, 0, 0, 0.92) 0%, rgba(0, 0, 0, 0.78) 48%, rgba(4, 4, 7, 0.65) 70%, rgba(var(--chakra-rgb, 220, 38, 38), 0.22) 100%)',
          }}
        />

        {/* Layer -2: Bottom Dark Water Reflection (h-[16vh]) + Concentric Minute-Tick Ripples */}
        <div
          className={cn(
            'absolute inset-x-0 bottom-0 h-[16vh] overflow-hidden transition-opacity duration-700',
            isGenjutsuActive ? 'opacity-90' : 'opacity-50',
          )}
          style={{
            background:
              'linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, rgba(8, 4, 10, 0.72) 42%, rgba(0, 0, 0, 0.96) 100%)',
          }}
        >
          <div
            className="mx-auto mt-3 h-px w-[82%] opacity-40 transition-all duration-700"
            style={{
              background: isGenjutsuActive
                ? 'linear-gradient(90deg, transparent 0%, rgba(var(--chakra-rgb, 220, 38, 38), 0.55) 50%, transparent 100%)'
                : 'linear-gradient(90deg, transparent 0%, rgba(82,82,91,0.35) 50%, transparent 100%)',
            }}
          />
          <motion.div
            animate={
              prefersReducedMotion
                ? { scaleX: 1, opacity: 0.25 }
                : { scaleX: [0.94, 1.06, 0.94], opacity: [0.16, 0.36, 0.16] }
            }
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { duration: 5.5, repeat: Infinity, type: 'tween', ease: 'easeInOut' }
            }
            style={WILL_CHANGE_TRANSFORM_OPACITY}
            className="mx-auto mt-4 h-3 w-[48%] rounded-full blur-md"
          >
            <div
              className="h-full w-full rounded-full transition-all duration-700"
              style={{
                background: isGenjutsuActive
                  ? 'radial-gradient(ellipse at center, rgba(var(--chakra-rgb, 220, 38, 38), 0.42) 0%, rgba(0,0,0,0) 75%)'
                  : 'radial-gradient(ellipse at center, rgba(var(--chakra-rgb, 220, 38, 38), 0.16) 0%, rgba(0,0,0,0) 75%)',
              }}
            />
          </motion.div>

          {/* Concentric Water Ripples triggered on every clock minute pass (or Tsukuyomi activation) */}
          {!prefersReducedMotion && (waterRippleNonce > 0 || tsukuyomiCastNonce > 0) && (
            <div
              key={`water-ripple-${waterRippleNonce}-${tsukuyomiCastNonce}`}
              className="pointer-events-none absolute inset-0 flex items-center justify-center pt-3"
            >
              {[0, 1, 2].map((ringIndex) => (
                <div
                  key={ringIndex}
                  className="absolute flex items-center justify-center"
                  style={{ transform: 'scaleY(0.26)' }}
                >
                  <motion.div
                    initial={{ scale: 0.18, opacity: 0.8 }}
                    animate={{
                      scale: [0.18, 1.2, 2.35],
                      opacity: [0.8, 0.42, 0],
                      transitionEnd: { display: 'none' },
                    }}
                    transition={{
                      duration: 1.85,
                      delay: ringIndex * 0.22,
                      times: [0, 0.38, 1],
                      type: 'tween',
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    style={{
                      ...WILL_CHANGE_TRANSFORM_OPACITY,
                      borderColor: 'var(--chakra-primary, #DC2626)',
                      boxShadow: isGenjutsuActive
                        ? '0 0 16px var(--chakra-glow, rgba(220,38,38,0.4))'
                        : '0 0 10px var(--chakra-glow, rgba(127,29,29,0.3))',
                    }}
                    className="h-36 w-36 rounded-full border opacity-75 sm:h-48 sm:w-48"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Layer -1.2 & -1.1: 2 Continuous Horizontal Volumetric Moving Fog Layers at Base */}
        <motion.div
          animate={prefersReducedMotion ? { x: '0%' } : { x: ['0%', '-50%'] }}
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : { duration: 28, repeat: Infinity, type: 'tween', ease: 'linear' }
          }
          style={WILL_CHANGE_TRANSFORM}
          className="pointer-events-none absolute bottom-0 left-0 flex h-[28vh] w-[200%]"
        >
          <MistTile intense={isGenjutsuActive} variant="back" />
          <MistTile intense={isGenjutsuActive} variant="back" />
        </motion.div>

        <motion.div
          animate={prefersReducedMotion ? { x: '0%' } : { x: ['-50%', '0%'] }}
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : { duration: 20, repeat: Infinity, type: 'tween', ease: 'linear' }
          }
          style={WILL_CHANGE_TRANSFORM}
          className="pointer-events-none absolute bottom-0 left-0 flex h-[18vh] w-[200%]"
        >
          <MistTile intense={isGenjutsuActive} variant="front" />
          <MistTile intense={isGenjutsuActive} variant="front" />
        </motion.div>

        {/* Layer -1: 60fps Wind-Physics Feathers, Chakra Embers & Animated Crows Canvas */}
        {!prefersReducedMotion && (
          <canvas
            ref={canvasRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full"
          />
        )}

        {/* Layer -1: Ambient Darkness Blinking Crow Eyes (outer perimeter -> cursor dissolve into feathers) */}
        {!prefersReducedMotion &&
          crowPairs.map((pair) => (
            <div
              key={pair.id}
              style={{
                left: `${pair.xPct}%`,
                top: `${pair.yPct}%`,
                transform: `translate(-50%, -50%) rotate(${pair.tiltDeg}deg)`,
              }}
              className="pointer-events-none absolute"
            >
              {pair.status === 'watching' ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.92, 0.88, 0] }}
                  transition={{
                    duration: 8.6,
                    times: [0, 0.08, 0.85, 1],
                    type: 'tween',
                    ease: 'easeInOut',
                  }}
                  style={WILL_CHANGE_TRANSFORM_OPACITY}
                  className="relative flex items-center justify-center"
                >
                  <div className="absolute -inset-2 rounded-full bg-black/45 blur-[2px]" />
                  <motion.div
                    animate={{ scaleY: [1, 0.08, 1, 0.08, 1] }}
                    transition={{
                      duration: 0.7,
                      times: [0, 0.18, 0.36, 0.58, 1],
                      repeat: Infinity,
                      repeatDelay: 2.3,
                      type: 'tween',
                      ease: 'easeInOut',
                    }}
                    style={{ ...WILL_CHANGE_TRANSFORM, transformOrigin: 'center' }}
                    className="relative flex items-center gap-[7px]"
                  >
                    <span
                      className="h-[4px] w-[6px] rounded-full transition-colors duration-700"
                      style={{
                        backgroundColor: 'var(--chakra-primary, #EF4444)',
                        boxShadow:
                          '0 0 8px var(--chakra-primary, #DC2626), 0 0 14px var(--chakra-glow, rgba(239,68,68,0.65))',
                      }}
                    />
                    <span
                      className="h-[4px] w-[6px] rounded-full transition-colors duration-700"
                      style={{
                        backgroundColor: 'var(--chakra-primary, #EF4444)',
                        boxShadow:
                          '0 0 8px var(--chakra-primary, #DC2626), 0 0 14px var(--chakra-glow, rgba(239,68,68,0.65))',
                      }}
                    />
                  </motion.div>
                </motion.div>
              ) : (
                <div className="relative flex items-center justify-center">
                  {/* Rapid eye vanish flash */}
                  <motion.div
                    initial={{ opacity: 0.85, scale: 1 }}
                    animate={{ opacity: 0, scale: 0.35 }}
                    transition={{ duration: 0.16, type: 'tween', ease: 'easeOut' }}
                    style={WILL_CHANGE_TRANSFORM_OPACITY}
                    className="absolute flex items-center gap-[7px]"
                  >
                    <span
                      className="h-[4px] w-[6px] rounded-full"
                      style={{ backgroundColor: 'var(--chakra-primary, #DC2626)' }}
                    />
                    <span
                      className="h-[4px] w-[6px] rounded-full"
                      style={{ backgroundColor: 'var(--chakra-primary, #DC2626)' }}
                    />
                  </motion.div>

                  {/* 2-3 Black crow feathers fluttering away */}
                  {pair.feathers.map((feather) => (
                    <motion.div
                      key={feather.id}
                      initial={{
                        x: 0,
                        y: 0,
                        opacity: 0.95,
                        rotate: feather.startRotate,
                        scale: 0.65 * feather.lengthScale,
                      }}
                      animate={{
                        x: [0, feather.midX, feather.endX],
                        y: [0, feather.midY, feather.endY],
                        opacity: [0.95, 0.85, 0],
                        rotate: [
                          feather.startRotate,
                          feather.midRotate,
                          feather.endRotate,
                        ],
                        scale: [
                          0.65 * feather.lengthScale,
                          1.05 * feather.lengthScale,
                          0.82 * feather.lengthScale,
                        ],
                      }}
                      transition={{
                        duration: 0.95,
                        times: [0, 0.45, 1],
                        type: 'tween',
                        ease: 'easeOut',
                      }}
                      style={WILL_CHANGE_TRANSFORM_OPACITY}
                      className="absolute"
                    >
                      <DissolveFeatherSvg />
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          ))}
      </div>

      {/* Depth-of-Field Foreground Giant Feather cutting across the camera lens every 12s */}
      {!prefersReducedMotion && foregroundFeatherNonce > 0 ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-30 overflow-hidden"
        >
          <motion.div
            key={`dof-feather-${foregroundFeatherNonce}`}
            initial={{
              display: 'block',
              x: activeForegroundTrajectory.startX,
              y: activeForegroundTrajectory.startY,
              rotate: activeForegroundTrajectory.startRot,
              scale: 2.2,
            }}
            animate={{
              x: [
                activeForegroundTrajectory.startX,
                activeForegroundTrajectory.midX,
                activeForegroundTrajectory.endX,
              ],
              y: [
                activeForegroundTrajectory.startY,
                activeForegroundTrajectory.midY,
                activeForegroundTrajectory.endY,
              ],
              rotate: [
                activeForegroundTrajectory.startRot,
                activeForegroundTrajectory.midRot,
                activeForegroundTrajectory.endRot,
              ],
              scale: 2.2,
              transitionEnd: { display: 'none' },
            }}
            transition={{
              duration: 1.05,
              times: [0, 0.5, 1],
              type: 'tween',
              ease: [0.22, 1, 0.36, 1],
            }}
            style={{
              filter: 'blur(5px)',
              ...WILL_CHANGE_TRANSFORM,
            }}
            className="absolute left-0 top-0"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.72, 0.68, 0] }}
              transition={{
                duration: 1.05,
                times: [0, 0.16, 0.82, 1],
                type: 'tween',
                ease: 'linear',
              }}
              style={WILL_CHANGE_TRANSFORM_OPACITY}
            >
              <ForegroundGiantFeatherSvg />
            </motion.div>
          </motion.div>
        </div>
      ) : null}

      {/* Tsukuyomi Activation Cutscene (triggered when tsukuyomiCastNonce > 0 changes) */}
      {tsukuyomiCastNonce > 0 ? (
        <motion.div
          key={`tsukuyomi-cast-${tsukuyomiCastNonce}`}
          aria-hidden="true"
          initial={{ display: 'block', opacity: 1 }}
          animate={{
            opacity: [1, 1, 0],
            transitionEnd: { display: 'none' },
          }}
          transition={{
            duration: prefersReducedMotion ? 0.3 : 1.15,
            times: [0, 0.86, 1],
            type: 'tween',
            ease: 'linear',
          }}
          className="pointer-events-none fixed inset-0 z-[95] overflow-hidden"
        >
          {/* Crisp 90ms Photographic Negative High-Contrast Impact Frame (filter: invert(1) contrast(3)) */}
          <motion.div
            initial={
              prefersReducedMotion
                ? { opacity: 0 }
                : { opacity: 1, filter: 'invert(1) contrast(3)' }
            }
            animate={
              prefersReducedMotion
                ? {
                    opacity: [0, 0.35, 0],
                    transitionEnd: { display: 'none' },
                  }
                : {
                    opacity: [1, 1, 0],
                    filter: [
                      'invert(1) contrast(3)',
                      'invert(1) contrast(3)',
                      'invert(0) contrast(1)',
                    ],
                    transitionEnd: { display: 'none' },
                  }
            }
            transition={{
              duration: prefersReducedMotion ? 0.25 : 0.09,
              times: [0, 0.78, 1],
              type: 'tween',
              ease: 'linear',
            }}
            style={
              prefersReducedMotion
                ? WILL_CHANGE_TRANSFORM_OPACITY
                : {
                    backdropFilter: 'invert(1) contrast(3)',
                    WebkitBackdropFilter: 'invert(1) contrast(3)',
                    willChange: 'opacity, filter',
                  }
            }
            className={cn(
              'absolute inset-0 z-30',
              prefersReducedMotion ? 'bg-red-950/30' : 'bg-white/[0.04]',
            )}
          />

          {/* Descending Giant Blood Moon (/assets/vfx/blood-moon.webp) with Heavy Cinematic Parallax */}
          {!prefersReducedMotion && (
            <motion.div
              style={{ x: moonDescentX, y: moonDescentY, ...WILL_CHANGE_TRANSFORM }}
              className="absolute inset-0 z-10 flex items-center justify-center"
            >
              <motion.div
                initial={{ y: '-48vh', scale: 1.38, opacity: 0 }}
                animate={{
                  y: ['-48vh', '-4vh', '4vh'],
                  scale: [1.38, 1.06, 0.94],
                  opacity: [0, 0.96, 0],
                }}
                transition={{
                  duration: 1.05,
                  delay: 0.05,
                  times: [0, 0.42, 1],
                  type: 'tween',
                  ease: [0.16, 1, 0.3, 1],
                }}
                style={WILL_CHANGE_TRANSFORM_OPACITY}
                className="relative h-[320px] w-[320px] sm:h-[460px] sm:w-[460px]"
              >
                <Image
                  src="/assets/vfx/blood-moon.webp"
                  alt=""
                  fill
                  unoptimized
                  loading="eager"
                  sizes="(min-width: 640px) 460px, 320px"
                  className={cn('object-contain', VFX_BLEND_MASK_CLASS)}
                />
              </motion.div>
            </motion.div>
          )}

          {/* Expanding Radial Chakra Shockwave Rings from Center */}
          <div className="absolute inset-0 z-20 flex items-center justify-center">
            <motion.div
              initial={{ scale: 0.1, opacity: 0.95 }}
              animate={{
                scale: prefersReducedMotion ? [0.6, 1.4] : [0.1, 1.85, 3.3],
                opacity: prefersReducedMotion ? [0.6, 0] : [0.95, 0.55, 0],
              }}
              transition={{
                duration: prefersReducedMotion ? 0.28 : 1.05,
                times: prefersReducedMotion ? [0, 1] : [0, 0.45, 1],
                type: 'tween',
                ease: [0.16, 1, 0.3, 1],
              }}
              style={{
                ...WILL_CHANGE_TRANSFORM_OPACITY,
                borderColor: 'var(--chakra-primary, #DC2626)',
                boxShadow:
                  '0 0 60px var(--chakra-glow, rgba(220, 38, 38, 0.85)), inset 0 0 40px var(--chakra-glow, rgba(220, 38, 38, 0.45))',
              }}
              className="h-64 w-64 rounded-full border-2"
            />
            {!prefersReducedMotion && (
              <motion.div
                initial={{ scale: 0.08, opacity: 0 }}
                animate={{
                  scale: [0.08, 1.4, 2.7],
                  opacity: [0, 0.85, 0],
                }}
                transition={{
                  duration: 1.0,
                  delay: 0.08,
                  times: [0, 0.35, 1],
                  type: 'tween',
                  ease: [0.16, 1, 0.3, 1],
                }}
                style={{
                  ...WILL_CHANGE_TRANSFORM_OPACITY,
                  borderColor: 'var(--chakra-primary, #DC2626)',
                }}
                className="absolute h-52 w-52 rounded-full border opacity-80"
              />
            )}
          </div>
        </motion.div>
      ) : null}

      {/* Izanagi Luminance Inversion Overlay triggered whenever izanagiFlashNonce > 0 */}
      {izanagiFlashNonce > 0 ? (
        <motion.div
          key={izanagiFlashNonce}
          aria-hidden="true"
          initial={{
            display: 'block',
            opacity: 0,
            filter: 'invert(0) contrast(1)',
          }}
          animate={
            prefersReducedMotion
              ? {
                  opacity: [0, 0.65, 0],
                  filter: [
                    'invert(0) contrast(1)',
                    'invert(1) contrast(1.2)',
                    'invert(0) contrast(1)',
                  ],
                  transitionEnd: { display: 'none' },
                }
              : {
                  opacity: [0, 1, 0.9, 0],
                  filter: [
                    'invert(0) contrast(1)',
                    'invert(1) contrast(1.4)',
                    'invert(1) contrast(1.4)',
                    'invert(0) contrast(1)',
                  ],
                  transitionEnd: { display: 'none' },
                }
          }
          transition={{
            duration: prefersReducedMotion ? 0.25 : 0.7,
            type: 'tween',
            ease: 'easeInOut',
            times: prefersReducedMotion ? [0, 0.5, 1] : [0, 0.18, 0.55, 1],
          }}
          style={{
            backdropFilter: 'invert(1) contrast(1.4)',
            WebkitBackdropFilter: 'invert(1) contrast(1.4)',
            willChange: 'opacity, filter',
          }}
          className="pointer-events-none fixed inset-0 z-[100] bg-white/10"
        />
      ) : null}
    </>
  );
}
