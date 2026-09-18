import { AAAttribute, AADitherMode, AARenderParams, AAContext } from './types';
import { AA_TABLE, AA_FILLTABLE } from './tables';

export function createDefaultParams(): AARenderParams {
  return {
    bright: 0,
    contrast: 0,
    gamma: 1.0,
    dither: AADitherMode.FLOYD_STEINBERG,
    inversion: false,
    randomval: 0,
  };
}

export function createAAContext(scrwidth: number, scrheight: number): AAContext {
  const imgwidth = scrwidth * 2;
  const imgheight = scrheight * 2;
  return {
    imgwidth,
    imgheight,
    scrwidth,
    scrheight,
    imagebuffer: new Uint8Array(imgwidth * imgheight),
    textbuffer: new Uint8Array(scrwidth * scrheight).fill(32), // space
    attrbuffer: new Uint8Array(scrwidth * scrheight).fill(AAAttribute.NORMAL),
    params: createDefaultParams(),
  };
}

export function clearImageBuffer(ctx: AAContext, color = 0): void {
  ctx.imagebuffer.fill(color);
}

export function clearTextBuffer(ctx: AAContext): void {
  ctx.textbuffer.fill(32);
  ctx.attrbuffer.fill(AAAttribute.NORMAL);
}

export function aaPuts(ctx: AAContext, x: number, y: number, attr: AAAttribute, str: string): void {
  const w = ctx.scrwidth;
  const h = ctx.scrheight;
  if (y < 0 || y >= h) return;
  for (let i = 0; i < str.length; i++) {
    const px = x + i;
    if (px >= 0 && px < w) {
      const idx = y * w + px;
      ctx.textbuffer[idx] = str.charCodeAt(i);
      ctx.attrbuffer[idx] = attr;
    }
  }
}

/**
 * Contrast mapping from original AAlib:
 * DO_CONTRAST(i, c) (i<c?0:(i>256-c)?255:(i-c)*255/(255-2*c))
 */
function doContrast(val: number, c: number): number {
  if (c <= 0) return val;
  if (val < c) return 0;
  if (val > 255 - c) return 255;
  return Math.round(((val - c) * 255) / (255 - 2 * c));
}

/**
 * Renders the 2x imagebuffer to textbuffer & attrbuffer using AAlib quadrant matching + Floyd Steinberg dithering
 */
export function aaRender(ctx: AAContext): void {
  const { imgwidth, scrwidth, scrheight, imagebuffer, textbuffer, attrbuffer, params } = ctx;
  const { bright, contrast, gamma, dither, inversion, randomval } = params;

  // 1. Build 256-entry palette translation lookup table
  const paletteTable = new Uint8Array(256);
  const useGamma = Math.abs(gamma - 1.0) > 0.01;
  for (let i = 0; i < 256; i++) {
    let y = i + bright;
    if (y > 255) y = 255;
    else if (y < 0) y = 0;

    if (contrast !== 0) {
      y = doContrast(y, contrast);
    }
    if (useGamma) {
      y = Math.min(255, Math.max(0, Math.round(Math.pow(y / 255.0, gamma) * 255)));
    }
    if (inversion) {
      y = 255 - y;
    }
    paletteTable[i] = y;
  }

  // Error buffers for Floyd-Steinberg dithering (two lines)
  const err0 = new Int32Array(scrwidth + 4);
  const err1 = new Int32Array(scrwidth + 4);
  let curErr = 0;

  const VAL_THRESH = 13;

  for (let y = 0; y < scrheight; y++) {
    const rowImgPos = 2 * y * imgwidth;
    const rowTextPos = y * scrwidth;
    let esum = 0;
    const nextErr = curErr ^ 1;
    if (dither === AADitherMode.FLOYD_STEINBERG) {
      (nextErr === 0 ? err0 : err1).fill(0);
    }

    const currentLineErr = curErr === 0 ? err0 : err1;
    const nextLineErr = curErr === 0 ? err1 : err0;

    for (let x = 0; x < scrwidth; x++) {
      const pos = rowImgPos + 2 * x;
      let i1 = paletteTable[imagebuffer[pos]];
      let i2 = paletteTable[imagebuffer[pos + 1]];
      let i3 = paletteTable[imagebuffer[pos + imgwidth]];
      let i4 = paletteTable[imagebuffer[pos + 1 + imgwidth]];

      // Add noise / randomval
      if (randomval > 0) {
        const half = randomval >> 1;
        i1 += Math.floor(Math.random() * randomval) - half;
        i2 += Math.floor(Math.random() * randomval) - half;
        i3 += Math.floor(Math.random() * randomval) - half;
        i4 += Math.floor(Math.random() * randomval) - half;
        if (i1 < 0) i1 = 0; else if (i1 > 255) i1 = 255;
        if (i2 < 0) i2 = 0; else if (i2 > 255) i2 = 255;
        if (i3 < 0) i3 = 0; else if (i3 > 255) i3 = 255;
        if (i4 < 0) i4 = 0; else if (i4 > 255) i4 = 255;
      }

      if (dither === AADitherMode.ERRORDISTRIB) {
        esum = (esum + 2) >> 2;
        i1 += esum;
        i2 += esum;
        i3 += esum;
        i4 += esum;
      } else if (dither === AADitherMode.FLOYD_STEINBERG) {
        if ((i1 | i2 | i3 | i4) !== 0) {
          esum = (esum + currentLineErr[x + 2]) >> 0;
          i1 += (esum + 1) >> 2;
          i2 += (esum) >> 2;
          i3 += (esum + 3) >> 2;
          i4 += (esum + 2) >> 2;
        }
      }

      // Clamp
      if (i1 < 0) i1 = 0; else if (i1 > 255) i1 = 255;
      if (i2 < 0) i2 = 0; else if (i2 > 255) i2 = 255;
      if (i3 < 0) i3 = 0; else if (i3 > 255) i3 = 255;
      if (i4 < 0) i4 = 0; else if (i4 > 255) i4 = 255;

      const avg = (i1 + i2 + i3 + i4) >> 2;
      let val: number;

      // Uniform area detection (fill table)
      if (
        Math.abs(i1 - avg) < VAL_THRESH &&
        Math.abs(i2 - avg) < VAL_THRESH &&
        Math.abs(i3 - avg) < VAL_THRESH &&
        Math.abs(i4 - avg) < VAL_THRESH
      ) {
        val = AA_FILLTABLE[Math.min(255, Math.max(0, avg))];
      } else {
        // Quadrant character lookup
        const q1 = i1 >> 4;
        const q2 = i2 >> 4;
        const q3 = i3 >> 4;
        const q4 = i4 >> 4;
        // In AAlib: pos(i2, i1, i4, i3) = (i1<<12) | (i2<<8) | (i3<<4) | i4
        const tableIdx = (q1 << 12) | (q2 << 8) | (q3 << 4) | q4;
        val = AA_TABLE[tableIdx];
      }

      if (dither === AADitherMode.FLOYD_STEINBERG) {
        // Floyd-Steinberg error distribution:
        // Right: 7/16, Down-Left: 3/16, Down: 5/16, Down-Right: 1/16
        const charIntensity = (val >> 8 === AAAttribute.BOLD) ? avg * 1.1 : (val >> 8 === AAAttribute.DIM) ? avg * 0.8 : avg;
        const err = Math.round(avg - charIntensity);
        if (x + 1 < scrwidth) {
          nextLineErr[x + 1] += (err * 3) >> 4;
          nextLineErr[x + 2] += (err * 5) >> 4;
          nextLineErr[x + 3] += (err * 1) >> 4;
        }
        esum = (err * 7) >> 4;
      }

      const textPos = rowTextPos + x;
      attrbuffer[textPos] = val >> 8;
      textbuffer[textPos] = val & 0xff;
    }

    curErr ^= 1;
  }
}

/**
 * Scale and copy arbitrary rectangular region from source image to imagebuffer
 */
export function scaleImageToBuffer(
  srcData: Uint8Array,
  srcW: number,
  srcH: number,
  dstBuf: Uint8Array,
  dstW: number,
  dstH: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): void {
  const spanX = x2 - x1;
  const spanY = y2 - y1;
  if (spanX <= 0 || spanY <= 0) return;

  for (let dy = 0; dy < dstH; dy++) {
    const srcY = Math.floor(y1 + (dy * spanY) / dstH);
    if (srcY < 0 || srcY >= srcH) continue;
    const srcRow = srcY * srcW;
    const dstRow = dy * dstW;

    for (let dx = 0; dx < dstW; dx++) {
      const srcX = Math.floor(x1 + (dx * spanX) / dstW);
      if (srcX < 0 || srcX >= srcW) continue;
      dstBuf[dstRow + dx] = srcData[srcRow + srcX];
    }
  }
}

/**
 * Draw source image positioned and scaled into destination buffer
 */
export function drawImageToBuffer(
  srcData: Uint8Array,
  srcW: number,
  srcH: number,
  dstBuf: Uint8Array,
  dstW: number,
  dstH: number,
  dstX: number,
  dstY: number,
  destSpanW: number,
  destSpanH: number
): void {
  const clampX1 = Math.max(0, dstX);
  const clampY1 = Math.max(0, dstY);
  const clampX2 = Math.min(dstW, dstX + destSpanW);
  const clampY2 = Math.min(dstH, dstY + destSpanH);

  for (let dy = clampY1; dy < clampY2; dy++) {
    const srcY = Math.floor(((dy - dstY) * srcH) / destSpanH);
    if (srcY < 0 || srcY >= srcH) continue;
    const srcRow = srcY * srcW;
    const dstRow = dy * dstW;

    for (let dx = clampX1; dx < clampX2; dx++) {
      const srcX = Math.floor(((dx - dstX) * srcW) / destSpanW);
      if (srcX < 0 || srcX >= srcW) continue;
      dstBuf[dstRow + dx] = srcData[srcRow + srcX];
    }
  }
}
