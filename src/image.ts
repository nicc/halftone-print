// Loads images so they can be drawn to canvas in every browser.

const SVG_INTRINSIC_PX = 1024; // large enough that browsers rasterising at intrinsic size stay sharp

/** Adds width/height (from the viewBox) to an SVG that lacks them. Firefox can't draw unsized SVGs to canvas. */
export function withIntrinsicSize(svg: string): string {
  const open = svg.match(/<svg\b[^>]*>/i);
  if (!open || /\swidth\s*=/.test(open[0])) return svg;
  const vb = open[0].match(/viewBox\s*=\s*["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
  const [w, h] = vb ? [Number(vb[1]), Number(vb[2])] : [1, 1];
  const k = SVG_INTRINSIC_PX / Math.max(w, h);
  const tag = open[0].replace(/^<svg/i, `<svg width="${w * k}" height="${h * k}"`);
  return svg.replace(open[0], tag);
}

const isSvgUrl = (url: string) => url.startsWith('data:image/svg+xml') || /\.svg(\?|#|$)/i.test(url);
const svgDataUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(withIntrinsicSize(svg))}`;

/** Loads a URL or Blob (e.g. a File from an input) as an image ready for canvas, fixing unsized SVGs. */
export async function loadImage(src: string | Blob): Promise<HTMLImageElement> {
  let url: string;
  let revoke = false;
  if (typeof src !== 'string') {
    if (src.type === 'image/svg+xml') url = svgDataUrl(await src.text());
    else {
      url = URL.createObjectURL(src);
      revoke = true;
    }
  } else url = isSvgUrl(src) ? svgDataUrl(await (await fetch(src)).text()) : src;

  const img = new Image();
  try {
    // onload rather than decode(): WebKit has rejected decode() for some SVGs.
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error(`halftone-print: image failed to load: ${String(src).slice(0, 80)}`));
      img.src = url;
    });
  } finally {
    if (revoke) URL.revokeObjectURL(url);
  }
  return img;
}
