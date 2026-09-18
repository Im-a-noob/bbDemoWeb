'use client';

export interface BBImage {
  name: string;
  width: number;
  height: number;
  data: Uint8Array;
}

const MANIFEST: Record<string, { width: number; height: number; length: number }> = {
  zeb: { width: 600, height: 470, length: 282000 },
  fk1: { width: 155, height: 200, length: 31000 },
  fk2: { width: 180, height: 200, length: 36000 },
  fk3: { width: 179, height: 200, length: 35800 },
  fk4: { width: 143, height: 200, length: 28600 },
  ms1: { width: 169, height: 200, length: 33800 },
  ms2: { width: 178, height: 200, length: 35600 },
  ms3: { width: 178, height: 200, length: 35600 },
  ms4: { width: 187, height: 200, length: 37400 },
  kt1: { width: 157, height: 200, length: 31400 },
  kt2: { width: 184, height: 200, length: 36800 },
  kt3: { width: 186, height: 200, length: 37200 },
  kt4: { width: 143, height: 200, length: 28600 },
  hh1: { width: 145, height: 200, length: 29000 },
  hh2: { width: 207, height: 200, length: 41400 },
  hh3: { width: 212, height: 200, length: 42400 },
  hh4: { width: 159, height: 200, length: 31800 },
};

const imageCache: Map<string, BBImage> = new Map();

export async function loadBBImage(name: string): Promise<BBImage | null> {
  if (imageCache.has(name)) return imageCache.get(name)!;

  const meta = MANIFEST[name];
  if (!meta) {
    console.warn(`Unknown image: ${name}`);
    return null;
  }

  try {
    const res = await fetch(`/assets/images/${name}.raw`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = await res.arrayBuffer();
    const data = new Uint8Array(buf);
    const img: BBImage = {
      name,
      width: meta.width,
      height: meta.height,
      data,
    };
    imageCache.set(name, img);
    return img;
  } catch (err) {
    console.error(`Failed to load image ${name}:`, err);
    return null;
  }
}

export async function preloadAllImages(onProgress?: (loaded: number, total: number) => void): Promise<void> {
  const names = Object.keys(MANIFEST);
  let loaded = 0;
  await Promise.all(
    names.map(async (name) => {
      await loadBBImage(name);
      loaded++;
      if (onProgress) onProgress(loaded, names.length);
    })
  );
}

export function getImageSync(name: string): BBImage | null {
  return imageCache.get(name) || null;
}
