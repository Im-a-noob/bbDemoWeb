import font16Data from './font16.json';

// Each character is 16 bytes. Each byte is 8 bits (bit 7 = leftmost pixel).
export const FONT16: Uint8Array = new Uint8Array(font16Data);

/**
 * Scale and render a glyph or text string directly into a byte buffer (1 byte per pixel).
 */
export function renderGlyphToBuffer(
  buffer: Uint8Array,
  bufWidth: number,
  bufHeight: number,
  destX: number,
  destY: number,
  destW: number,
  destH: number,
  charCode: number,
  color: number
): void {
  if (destW <= 0 || destH <= 0) return;
  const glyphOffset = (charCode & 0xff) * 16;

  for (let dy = 0; dy < destH; dy++) {
    const py = destY + dy;
    if (py < 0 || py >= bufHeight) continue;
    const fontY = Math.min(15, Math.floor((dy * 16) / destH));
    const fontByte = FONT16[glyphOffset + fontY];

    for (let dx = 0; dx < destW; dx++) {
      const px = destX + dx;
      if (px < 0 || px >= bufWidth) continue;
      const fontX = Math.min(7, Math.floor((dx * 8) / destW));
      if ((fontByte & (0x80 >> fontX)) !== 0) {
        buffer[py * bufWidth + px] = color;
      }
    }
  }
}

/**
 * Print text scaled to (charW, charH) per character at (x, y) into the image buffer.
 */
export function print(
  buffer: Uint8Array,
  bufWidth: number,
  bufHeight: number,
  x: number,
  y: number,
  charW: number,
  charH: number,
  color: number,
  text: string
): void {
  if (!text || typeof text !== 'string') return;
  let cx = x;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code === 10) {
      // newline
      y += charH;
      cx = x;
      continue;
    }
    renderGlyphToBuffer(buffer, bufWidth, bufHeight, Math.round(cx), Math.round(y), Math.round(charW), Math.round(charH), code, color);
    cx += charW;
  }
}

/**
 * Print text centered horizontally at (centerX, y).
 */
export function centerprint(
  buffer: Uint8Array,
  bufWidth: number,
  bufHeight: number,
  centerX: number,
  y: number,
  charW: number,
  charH: number,
  color: number,
  text: string
): void {
  if (!text || typeof text !== 'string') return;
  const totalW = text.length * charW;
  const startX = centerX - totalW / 2;
  print(buffer, bufWidth, bufHeight, startX, y, charW, charH, color, text);
}
