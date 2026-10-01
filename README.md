# halftone-print

Turn any image into halftone dots on a canvas: a rotated screen with ink gain, positional jitter and size noise, for a printed rather than digital look. Works with SVG, PNG, JPEG, canvases, video frames — anything canvas can draw.

```sh
npm install halftone-print
```

## Usage

```ts
import { loadImage, renderHalftone } from 'halftone-print';

const img = await loadImage('/logo.svg'); // URL or Blob (e.g. a File from an <input>)
const canvas = document.querySelector('canvas')!;
canvas.style.width = canvas.style.height = '240px';

renderHalftone(canvas, img, { width: 240, height: 240, color: '#5a7fb0', pitch: 2.2 });
```

Compose your own source first (text, multiple images) by drawing to a canvas and halftoning that:

```ts
const src = document.createElement('canvas');
// …draw anything onto src…
renderHalftone(canvas, src, { width: 300, height: 300, fit: 'fill', seed: 'my-tile' });
```

Need the dots rather than pixels (SVG export, animation, custom drawing)?

```ts
import { halftone, drawDots } from 'halftone-print';

const { dots } = halftone(img, { width: 200, height: 200 }); // packed [x, y, r, …] in CSS px
drawDots(ctx, dots, '#222');
```

## Options

| Option | Default | |
|---|---|---|
| `width`, `height` | — | Output size in CSS px |
| `fit` | `'contain'` | `'contain'`, `'cover'` or `'fill'` |
| `pitch` | `2.2` | Dot spacing in CSS px |
| `angle` | `45` | Screen angle, degrees |
| `gain` | `1.2` | Ink spread; > 1 lets solids close up |
| `minDot` | `0.12` | Dots smaller than this fraction of `pitch` don't print |
| `jitter` | `0.08` | Dot position wobble, fraction of `pitch` |
| `noise` | `0.15` | Dot size wobble, fraction of radius |
| `seed` | `1` | Number or string; same seed, same dots |
| `invert` | `false` | Ink light areas instead of dark |
| `sampleScale` | `2` | Source samples per CSS px |
| `color` | `'#000'` | `renderHalftone` only |
| `dpr` | `devicePixelRatio` (≤ 3) | `renderHalftone` only |

Ink density is `alpha × (1 − luminance)`: dark, opaque pixels print; colour maps to tone (yellow barely prints). Dot area is proportional to the average density of its screen cell.

## Notes

- `loadImage` adds a size to SVGs without `width`/`height`, which Firefox otherwise refuses to draw to canvas.
- Pitch is in CSS px so dots look the same physical size on every display; `renderHalftone` sizes the canvas backing store for the device pixel ratio.
- The low-level maths (`screenDots`, `densityFromRGBA`, …) is pure and runs anywhere, including Node and workers.
- Tested in Chromium, Firefox and WebKit.

## Releasing

```sh
npm version patch   # or minor / major
git push --follow-tags
```

The tag triggers `.github/workflows/publish.yml`, which runs all tests and publishes via npm trusted publishing.

## License

GPL-3.0
