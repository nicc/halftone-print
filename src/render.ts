// Browser rendering: any canvas-drawable image → halftone dots → canvas.
import { densityFromRGBA, hashString, screenDots } from './screen.js';

export type Fit = 'contain' | 'cover' | 'fill';

export interface HalftoneOptions {
  /** Output size in CSS px. */
  width: number;
  height: number;
  /** How the source is placed in the output box. Default 'contain'. */
  fit?: Fit;
  /** Dot spacing in CSS px. Default 2.2. */
  pitch?: number;
  /** Screen angle in degrees. Default 45. */
  angle?: number;
  /** Ink spread: >1 fattens dots so solids close up. Default 1.2. */
  gain?: number;
  /** Dots smaller than this fraction of pitch aren't printed. Default 0.12. */
  minDot?: number;
  /** Dot position wobble, fraction of pitch. Default 0.08. */
  jitter?: number;
  /** Dot size wobble, fraction of radius. Default 0.15. */
  noise?: number;
  /** Seed for jitter/noise; same seed, same dots. Default 1. */
  seed?: number | string;
  /** Lighter = more ink. Default false. */
  invert?: boolean;
  /** Sampling resolution in source px per CSS px. Default 2. */
  sampleScale?: number;
}

export interface RenderOptions extends HalftoneOptions {
  /** Ink colour. Default '#000'. */
  color?: string;
  /** Canvas pixels per CSS px. Default devicePixelRatio, capped at 3. */
  dpr?: number;
}

/** Packed [x, y, r, ...] in CSS px within a width × height box. */
export interface Dots {
  dots: Float32Array;
  width: number;
  height: number;
}

type Source = CanvasImageSource;

function sourceSize(s: Source): [number, number] {
  if (typeof HTMLImageElement !== 'undefined' && s instanceof HTMLImageElement) return [s.naturalWidth, s.naturalHeight];
  if (typeof HTMLVideoElement !== 'undefined' && s instanceof HTMLVideoElement) return [s.videoWidth, s.videoHeight];
  if (typeof SVGImageElement !== 'undefined' && s instanceof SVGImageElement) return [s.width.baseVal.value, s.height.baseVal.value];
  if ('displayWidth' in s) return [s.displayWidth, s.displayHeight]; // VideoFrame
  return [(s as HTMLCanvasElement).width, (s as HTMLCanvasElement).height];
}

function placement(sw: number, sh: number, w: number, h: number, fit: Fit): [number, number, number, number] {
  if (fit === 'fill') return [0, 0, w, h];
  const k = fit === 'contain' ? Math.min(w / sw, h / sh) : Math.max(w / sw, h / sh);
  return [(w - sw * k) / 2, (h - sh * k) / 2, sw * k, sh * k];
}

function scratch(w: number, h: number): CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h).getContext('2d', { willReadFrequently: true })!;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c.getContext('2d', { willReadFrequently: true })!;
}

/** Computes halftone dots for an image. Pure output; draw them with drawDots or renderHalftone. */
export function halftone(source: Source, o: HalftoneOptions): Dots {
  const s = o.sampleScale ?? 2;
  const w = Math.max(1, Math.round(o.width * s));
  const h = Math.max(1, Math.round(o.height * s));
  const ctx = scratch(w, h);
  const [sw, sh] = sourceSize(source);
  if (sw > 0 && sh > 0) ctx.drawImage(source, ...placement(sw, sh, w, h, o.fit ?? 'contain'));
  const density = densityFromRGBA(ctx.getImageData(0, 0, w, h).data, o.invert);
  const raw = screenDots(density, w, h, {
    pitch: (o.pitch ?? 2.2) * s,
    angleDeg: o.angle ?? 45,
    gain: o.gain ?? 1.2,
    minDot: o.minDot ?? 0.12,
    jitter: o.jitter ?? 0.08,
    noise: o.noise ?? 0.15,
    seed: typeof o.seed === 'string' ? hashString(o.seed) : (o.seed ?? 1),
  });
  for (let i = 0; i < raw.length; i++) raw[i] /= s;
  return { dots: raw, width: o.width, height: o.height };
}

/** Fills dots as one path in the context's current units. */
export function drawDots(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  dots: Float32Array,
  color = '#000',
): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < dots.length; i += 3) {
    ctx.moveTo(dots[i] + dots[i + 2], dots[i + 1]);
    ctx.arc(dots[i], dots[i + 1], dots[i + 2], 0, Math.PI * 2);
  }
  ctx.fill();
}

/** Halftones an image onto a canvas, sizing its backing store for crisp dots. Set the canvas's CSS size yourself. */
export function renderHalftone(canvas: HTMLCanvasElement | OffscreenCanvas, source: Source, o: RenderOptions): Dots {
  const result = halftone(source, o);
  const dpr = o.dpr ?? Math.min(3, (typeof devicePixelRatio !== 'undefined' && devicePixelRatio) || 1);
  canvas.width = Math.round(o.width * dpr);
  canvas.height = Math.round(o.height * dpr);
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawDots(ctx, result.dots, o.color);
  return result;
}
