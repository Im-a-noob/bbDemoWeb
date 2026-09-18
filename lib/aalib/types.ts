export enum AAAttribute {
  NORMAL = 0,
  DIM = 1,
  BOLD = 2,
  BOLDFONT = 3,
  REVERSE = 4,
  SPECIAL = 5,
}

export enum AADitherMode {
  NONE = 0,
  ERRORDISTRIB = 1,
  FLOYD_STEINBERG = 2,
}

export interface AARenderParams {
  bright: number; // -255 .. +255
  contrast: number; // 0 .. 128
  gamma: number; // 0.1 .. 10.0 (1.0 = linear)
  dither: AADitherMode;
  inversion: boolean;
  randomval: number; // 0 .. 255 (noise)
}

export interface AAContext {
  imgwidth: number;
  imgheight: number;
  scrwidth: number;
  scrheight: number;
  imagebuffer: Uint8Array;
  textbuffer: Uint8Array; // ASCII character codes
  attrbuffer: Uint8Array; // AAAttribute
  params: AARenderParams;
}

export interface ImageDataRaw {
  width: number;
  height: number;
  data: Uint8Array;
}
