import { describe, expect, it } from 'vitest';
import { halftone, loadImage, renderHalftone } from '../src/index';

const square = (fill = '#000', size = 100) => {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = fill;
  ctx.fillRect(size / 4, size / 4, size / 2, size / 2);
  return c;
};

const inked = (c: HTMLCanvasElement) => {
  const px = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
  let n = 0;
  for (let i = 3; i < px.length; i += 4) if (px[i] > 0) n++;
  return n;
};

const unsizedSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 100"><rect width="400" height="100"/></svg>';

describe('loadImage', () => {
  it('loads an SVG with no width/height so it can be drawn (Firefox)', async () => {
    const img = await loadImage(`data:image/svg+xml,${encodeURIComponent(unsizedSvg)}`);
    expect(img.naturalWidth / img.naturalHeight).toBeCloseTo(4);
    const { dots } = halftone(img, { width: 80, height: 80 });
    expect(dots.length).toBeGreaterThan(0);
  });

  it('loads Blobs: SVG and raster', async () => {
    const svg = await loadImage(new Blob([unsizedSvg], { type: 'image/svg+xml' }));
    expect(svg.naturalWidth).toBeGreaterThan(0);
    const png = await new Promise<Blob>((r) => square().toBlob((b) => r(b!), 'image/png'));
    expect((await loadImage(png)).naturalWidth).toBe(100);
  });

  it('rejects images that fail to load', async () => {
    await expect(loadImage('data:image/png;base64,AAAA')).rejects.toThrow('halftone-print');
  });
});

describe('halftone', () => {
  it('prints only where the source has ink, in output CSS px', () => {
    const { dots, width, height } = halftone(square(), { width: 50, height: 50, jitter: 0, noise: 0 });
    expect([width, height]).toEqual([50, 50]);
    expect(dots.length).toBeGreaterThan(0);
    for (let i = 0; i < dots.length; i += 3) {
      expect(dots[i]).toBeGreaterThan(12.5 - 2.2);
      expect(dots[i]).toBeLessThan(37.5 + 2.2);
    }
  });

  it('places the source by fit', () => {
    const wide = document.createElement('canvas');
    wide.width = 200;
    wide.height = 100;
    wide.getContext('2d')!.fillRect(0, 0, 200, 100);
    const ys = (fit: 'contain' | 'cover') => {
      const { dots } = halftone(wide, { width: 100, height: 100, fit, jitter: 0, noise: 0 });
      let min = Infinity;
      for (let i = 1; i < dots.length; i += 3) min = Math.min(min, dots[i]);
      return min;
    };
    expect(ys('contain')).toBeGreaterThan(20); // letterboxed: starts ~25px down
    expect(ys('cover')).toBeLessThan(5);
  });

  it('is deterministic per seed, including string seeds', () => {
    const o = { width: 60, height: 60, seed: 'tile', jitter: 0.3 };
    expect(halftone(square(), o).dots).toEqual(halftone(square(), o).dots);
    expect(halftone(square(), { ...o, seed: 'other' }).dots).not.toEqual(halftone(square(), o).dots);
  });

  it('invert inks light areas instead of dark', () => {
    const light = square('#fff');
    expect(halftone(light, { width: 50, height: 50 }).dots.length).toBe(0);
    expect(halftone(light, { width: 50, height: 50, invert: true }).dots.length).toBeGreaterThan(0);
  });
});

describe('renderHalftone', () => {
  it('sizes the backing store by dpr and paints dots', () => {
    const out = document.createElement('canvas');
    renderHalftone(out, square(), { width: 40, height: 30, dpr: 2, color: '#5a7fb0' });
    expect([out.width, out.height]).toEqual([80, 60]);
    expect(inked(out)).toBeGreaterThan(100);
  });
});
