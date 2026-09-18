import { AAContext, AAAttribute, AADitherMode } from '../aalib/types';
import { clearImageBuffer, clearTextBuffer, aaPuts, aaRender, scaleImageToBuffer, drawImageToBuffer } from '../aalib/renderer';
import { print, centerprint, renderGlyphToBuffer } from '../aalib/font';
import { getImageSync, BBImage } from './image-loader';

export interface SceneContext {
  timeSec: number; // Seconds since demo started
  sceneTimeSec: number; // Seconds in current scene
  sceneProgress: number; // 0.0 .. 1.0 in current scene
  ctx: AAContext;
}

export type SceneId =
  | 'intro'
  | 'titles'
  | 'plasma'
  | 'fk'
  | 'invaders_fire'
  | 'greetings'
  | 'ms'
  | 'zebra'
  | 'fractal'
  | 'kt'
  | 'torus'
  | 'hh'
  | 'credits'
  | 'end_scroller';

export interface SceneMeta {
  id: SceneId;
  name: string;
  durationSec: number;
  songIdx: number;
}

export const SCENES_ORDER: SceneMeta[] = [
  { id: 'intro', name: 'Intro: Precalculating Data', durationSec: 4.5, songIdx: 1 },
  { id: 'titles', name: 'Scene 1: AA Presents BB', durationSec: 14, songIdx: 1 },
  { id: 'plasma', name: 'Scene 3: Sine Wave Plasma', durationSec: 13, songIdx: 1 },
  { id: 'fk', name: 'Member 1: Filip Kupsa (FK)', durationSec: 15, songIdx: 1 },
  { id: 'invaders_fire', name: 'Scene 4: Space Invaders & AAfire', durationSec: 17, songIdx: 1 },
  { id: 'greetings', name: 'Scene 2: Demogroup Greetings', durationSec: 16, songIdx: 1 },
  { id: 'ms', name: 'Member 2: Mojmír Svoboda (MS)', durationSec: 15, songIdx: 1 },
  { id: 'zebra', name: 'Scene 8: The Legendary Zebra', durationSec: 18, songIdx: 2 },
  { id: 'fractal', name: 'Scene 6: XaoS Fractal Zoomer', durationSec: 15, songIdx: 2 },
  { id: 'kt', name: 'Member 3: Kamil Toman (KT)', durationSec: 15, songIdx: 2 },
  { id: 'torus', name: 'Scene 5: 3D Torus Engine', durationSec: 15, songIdx: 2 },
  { id: 'hh', name: 'Member 4: Jan Hubička (HH)', durationSec: 15, songIdx: 2 },
  { id: 'credits', name: 'Credits: 3D Starfield & Snow', durationSec: 22, songIdx: 2 },
  { id: 'end_scroller', name: 'Outro: Interactive Terminal Doc', durationSec: 9999, songIdx: 3 },
];

export const TOTAL_TIMED_DURATION = SCENES_ORDER.slice(0, -1).reduce((acc, s) => acc + s.durationSec, 0);

// Helper for typewriter bio text
function renderTypewriterTerminal(
  ctx: AAContext,
  fullText: string,
  progress: number,
  startRow: number
): void {
  if (!fullText) return;
  const visibleChars = Math.min(fullText.length, Math.floor(progress * (fullText.length + 15)));
  const lines = fullText.substring(0, visibleChars).split('\n');
  const maxRows = ctx.scrheight - startRow;
  const displayLines = lines.slice(-maxRows);

  for (let r = 0; r < displayLines.length; r++) {
    const y = startRow + r;
    if (y < ctx.scrheight) {
      const line = displayLines[r];
      aaPuts(ctx, 2, y, AAAttribute.NORMAL, line);
      // If last line, show blinking cursor
      if (r === displayLines.length - 1 && visibleChars < fullText.length) {
        aaPuts(ctx, 2 + line.length, y, AAAttribute.REVERSE, ' ');
      }
    }
  }
}

// Global state for Fire simulation
let fireBuf: Uint8Array | null = null;
let fireW = 0;
let fireH = 0;

// Global state for Stars
interface Star {
  x: number;
  y: number;
  z: number;
}
let stars: Star[] | null = null;

// Global state for Space Invaders
interface InvaderState {
  x: number;
  y: number;
  dir: number;
  frame: number;
  bombs: { x: number; y: number }[];
  shipX: number;
  bullets: { x: number; y: number }[];
  exploded: boolean;
}
let invaderState: InvaderState | null = null;

export function resetSceneState(ctx: AAContext): void {
  ctx.params.bright = 0;
  ctx.params.contrast = 0;
  ctx.params.gamma = 1.0;
  ctx.params.dither = AADitherMode.FLOYD_STEINBERG;
  ctx.params.inversion = false;
  ctx.params.randomval = 0;
  clearImageBuffer(ctx);
  clearTextBuffer(ctx);
  invaderState = null;
  fireBuf = null;
  stars = null;
}

// 1. INTRO: Precalculating Data
export function renderIntro(sctx: SceneContext): void {
  const { ctx, sceneTimeSec } = sctx;
  ctx.params.bright = 0;
  ctx.params.contrast = 0;
  ctx.params.inversion = false;
  ctx.params.randomval = 0;
  clearTextBuffer(ctx);

  aaPuts(ctx, 2, 2, AAAttribute.BOLD, 'Please wait. Precalculating data...');

  const progress = Math.max(0, Math.min(1.0, sceneTimeSec / 4.0));
  const availableWidth = Math.max(0, ctx.scrwidth - 20);
  const barLen = Math.max(0, Math.min(availableWidth, Math.floor(progress * availableWidth)));
  const spaces = Math.max(0, availableWidth - barLen - (barLen < availableWidth ? 1 : 0));
  const pointer = barLen < availableWidth ? '>' : '';
  const bar = '[' + '='.repeat(barLen) + pointer + ' '.repeat(spaces) + `] ${Math.floor(progress * 100)}%`;
  aaPuts(ctx, 2, 4, AAAttribute.NORMAL, bar);

  // Hex dump stream
  const hexChars = '0123456789ABCDEF';
  const startY = 6;
  const numRows = Math.max(0, ctx.scrheight - startY - 2);

  for (let r = 0; r < numRows; r++) {
    const y = startY + r;
    const addr = ((r * 16 + Math.floor(sceneTimeSec * 100)) & 0xffff).toString(16).toUpperCase().padStart(4, '0');
    let line = `${addr}: `;
    for (let b = 0; b < 16; b++) {
      const v1 = hexChars[Math.floor(Math.random() * 16)];
      const v2 = hexChars[Math.floor(Math.random() * 16)];
      line += `${v1}${v2} `;
      if (b === 7) line += ' ';
    }
    aaPuts(ctx, 2, y, r % 2 === 0 ? AAAttribute.DIM : AAAttribute.NORMAL, line);
  }
}

// 2. SCENE 1: Titles (AA Presents, Bouncing BB, Flash text)
export function renderScene1Titles(sctx: SceneContext): void {
  const { ctx, sceneTimeSec } = sctx;
  ctx.params.bright = 0;
  ctx.params.contrast = 0;
  ctx.params.inversion = false;
  ctx.params.randomval = 0;
  ctx.params.dither = AADitherMode.FLOYD_STEINBERG;
  clearImageBuffer(ctx);
  clearTextBuffer(ctx);

  if (sceneTimeSec < 4.0) {
    // Phase 1: "AA PRESENTS"
    const t = sceneTimeSec / 4.0;
    const alpha = Math.sin(t * Math.PI);
    const color = Math.min(255, Math.floor(alpha * 255 * 1.3));
    const charW = Math.floor(ctx.imgwidth * 0.05);
    const charH = Math.floor(ctx.imgheight * 0.18);
    const y = Math.floor(ctx.imgheight * 0.4);

    centerprint(ctx.imagebuffer, ctx.imgwidth, ctx.imgheight, ctx.imgwidth / 2, y, charW, charH, color, 'AA PRESENTS');
    aaRender(ctx);
  } else if (sceneTimeSec < 10.0) {
    // Phase 2: Giant "BB" sliding from sides and bouncing
    const t = (sceneTimeSec - 4.0) / 6.0;
    // Damped harmonic bounce
    const bounce = Math.sin(t * Math.PI * 4) * Math.exp(-t * 3);
    const centerOffset = bounce * (ctx.imgwidth * 0.35);

    const bCharW = Math.floor(ctx.imgwidth * 0.22);
    const bCharH = Math.floor(ctx.imgheight * 0.65);
    const bY = Math.floor(ctx.imgheight * 0.18);

    // Left B
    const b1X = ctx.imgwidth * 0.28 - centerOffset;
    print(ctx.imagebuffer, ctx.imgwidth, ctx.imgheight, b1X, bY, bCharW, bCharH, 255, 'B');

    // Right B
    const b2X = ctx.imgwidth * 0.52 + centerOffset;
    print(ctx.imagebuffer, ctx.imgwidth, ctx.imgheight, b2X, bY, bCharW, bCharH, 255, 'B');

    // Subtitle
    if (t > 0.5) {
      const subCharW = Math.floor(ctx.imgwidth * 0.035);
      const subCharH = Math.floor(ctx.imgheight * 0.1);
      centerprint(ctx.imagebuffer, ctx.imgwidth, ctx.imgheight, ctx.imgwidth / 2, ctx.imgheight * 0.82, subCharW, subCharH, 220, 'THE PORTABLE DEMO');
    }
    aaRender(ctx);
  } else {
    // Phase 3: Flash words on beat
    const flashWords = [
      'the', '100 %', 'ANSI C', 'PORTABLE', 'DEMO', ';^D', '(^;',
      'FULL', 'SVGA', 'TEXT', 'MODE', 'DEVELOPED', 'UNDER', 'LINUX',
      '!', '!', '!', '?'
    ];
    const t = Math.max(0, sceneTimeSec - 10.0);
    const wordIdx = Math.max(0, Math.min(flashWords.length - 1, Math.floor(t * 4.5)));
    const word = flashWords[wordIdx] || '';

    if (word) {
      const charW = Math.min(Math.floor(ctx.imgwidth * 0.7 / Math.max(1, word.length)), Math.floor(ctx.imgwidth * 0.12));
      const charH = Math.floor(ctx.imgheight * 0.35);
      const y = Math.floor(ctx.imgheight * 0.32);

      centerprint(ctx.imagebuffer, ctx.imgwidth, ctx.imgheight, ctx.imgwidth / 2, y, charW, charH, 255, word);
    }
    aaRender(ctx);
  }
}

// 3. SCENE 3: Sine Wave Plasma
export function renderScene3Plasma(sctx: SceneContext): void {
  const { ctx, sceneTimeSec } = sctx;
  ctx.params.bright = 0;
  ctx.params.inversion = false;
  ctx.params.randomval = 0;
  ctx.params.contrast = 20;
  ctx.params.dither = AADitherMode.FLOYD_STEINBERG;
  clearImageBuffer(ctx);
  clearTextBuffer(ctx);

  const t = sceneTimeSec * 2.2;
  const w = ctx.imgwidth;
  const h = ctx.imgheight;
  const buf = ctx.imagebuffer;

  for (let y = 0; y < h; y += 2) {
    const row = y * w;
    const rowNext = (y + 1) * w;
    const ny = y * 0.06;

    for (let x = 0; x < w; x += 2) {
      const nx = x * 0.06;
      // Multivariable 4-harmonic plasma
      const v1 = Math.sin(nx + t);
      const v2 = Math.sin(ny - t * 1.2);
      const v3 = Math.sin((nx + ny) * 0.7 + t * 0.9);
      const dist = Math.sqrt((x - w / 2) * (x - w / 2) + (y - h / 2) * (y - h / 2)) * 0.08;
      const v4 = Math.sin(dist - t * 2.0);

      const val = Math.min(255, Math.max(0, Math.floor(((v1 + v2 + v3 + v4 + 4) / 8) * 255)));

      buf[row + x] = val;
      buf[row + x + 1] = val;
      buf[rowNext + x] = val;
      buf[rowNext + x + 1] = val;
    }
  }

  // Floating label in center
  const label = 'PLASMA EFFECT';
  const charW = Math.floor(ctx.imgwidth * 0.04);
  const charH = Math.floor(ctx.imgheight * 0.12);
  centerprint(buf, w, h, w / 2, Math.floor(h * 0.44), charW, charH, 255, label);

  aaRender(ctx);
}

// 4. AUTHOR BIO SHOWCASE (FK, MS, KT, HH)
export function renderAuthorShowcase(
  sctx: SceneContext,
  prefix: 'fk' | 'ms' | 'kt' | 'hh',
  authorName: string,
  bioText: string
): void {
  const { ctx, sceneTimeSec, sceneProgress } = sctx;
  ctx.params.contrast = 0;
  ctx.params.inversion = false;
  ctx.params.randomval = 0;
  clearImageBuffer(ctx);
  clearTextBuffer(ctx);

  // Strobe photo phases: 0..4s cycle poses 1, 2, 3, 4, then hold 4 while typing bio
  let poseNum = 4;
  if (sceneTimeSec < 0.6) poseNum = 1;
  else if (sceneTimeSec < 1.2) poseNum = 2;
  else if (sceneTimeSec < 1.8) poseNum = 3;
  else poseNum = 4;

  const img = getImageSync(`${prefix}${poseNum}`) || getImageSync(`${prefix}4`);

  if (img) {
    // Render photo to the top/center of image buffer
    const imgAspect = img.width / img.height;
    const destH = Math.floor(ctx.imgheight * 0.55);
    const destW = Math.floor(destH * imgAspect * 1.5);
    const destX = Math.floor((ctx.imgwidth - destW) / 2);
    const destY = 2;

    drawImageToBuffer(img.data, img.width, img.height, ctx.imagebuffer, ctx.imgwidth, ctx.imgheight, destX, destY, destW, destH);
  }

  // Fade out transition at the end (last 1.5s)
  if (sceneProgress > 0.9) {
    const fade = (sceneProgress - 0.9) / 0.1;
    ctx.params.bright = Math.floor(-fade * 255);
  } else {
    ctx.params.bright = 0;
  }

  ctx.params.dither = AADitherMode.FLOYD_STEINBERG;
  aaRender(ctx);

  // Bottom typewriter terminal bio
  const bioStartRow = Math.floor(ctx.scrheight * 0.58);
  const bioProgress = Math.max(0, Math.min(1.0, (sceneTimeSec - 1.8) / (15.0 - 3.5)));
  renderTypewriterTerminal(ctx, bioText, bioProgress, bioStartRow);
}

// 5. SCENE 4: Space Invaders & AAfire
export function renderScene4InvadersAndFire(sctx: SceneContext): void {
  const { ctx, sceneTimeSec } = sctx;
  ctx.params.bright = 0;
  ctx.params.inversion = false;
  ctx.params.randomval = 0;
  clearImageBuffer(ctx);
  clearTextBuffer(ctx);

  const invadersPhase = sceneTimeSec < 7.0;

  if (invadersPhase) {
    // Space Invaders arcade simulation
    if (!invaderState) {
      invaderState = {
        x: 4,
        y: 2,
        dir: 1,
        frame: 0,
        bombs: [],
        shipX: Math.floor(ctx.scrwidth / 2),
        bullets: [],
        exploded: false,
      };
    }

    const st = invaderState;
    st.frame = (st.frame + 1) % 60;
    if (st.frame % 6 === 0) {
      st.x += st.dir * 2;
      if (st.x > ctx.scrwidth - 40 || st.x < 2) {
        st.dir = -st.dir;
        st.y += 1;
      }
    }

    // Move ship
    st.shipX += Math.floor(Math.sin(sceneTimeSec * 3) * 2);
    st.shipX = Math.max(2, Math.min(ctx.scrwidth - 10, st.shipX));

    // Shoot
    if (st.frame % 15 === 0) {
      st.bullets.push({ x: st.shipX + 2, y: ctx.scrheight - 4 });
      st.bombs.push({ x: st.x + Math.floor(Math.random() * 30), y: st.y + 4 });
    }

    // Draw Invaders
    const invaderChars = (st.frame % 20 < 10) ? ' /oo\\ ' : ' \\oo/ ';
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 6; col++) {
        const ix = st.x + col * 6;
        const iy = st.y + row * 2;
        if (ix >= 0 && ix < ctx.scrwidth - 6 && iy < ctx.scrheight - 4) {
          aaPuts(ctx, ix, iy, AAAttribute.BOLD, invaderChars);
        }
      }
    }

    // Bullets & Bombs
    for (const b of st.bullets) {
      b.y -= 2;
      if (b.y >= 0) aaPuts(ctx, b.x, b.y, AAAttribute.BOLD, '|');
    }
    for (const bm of st.bombs) {
      bm.y += 1;
      if (bm.y < ctx.scrheight) aaPuts(ctx, bm.x, bm.y, AAAttribute.NORMAL, '*');
    }
    st.bullets = st.bullets.filter(b => b.y >= 0);
    st.bombs = st.bombs.filter(b => b.y < ctx.scrheight);

    // Defender Ship
    aaPuts(ctx, st.shipX, ctx.scrheight - 3, AAAttribute.BOLD, ' [^] ');
    aaPuts(ctx, 2, ctx.scrheight - 1, AAAttribute.DIM, 'SCORE<1> 00840   HI-SCORE 09990');
  } else {
    // AAfire simulation phase!
    const w = ctx.imgwidth;
    const h = ctx.imgheight;
    if (!fireBuf || fireW !== w || fireH !== h) {
      fireBuf = new Uint8Array(w * (h + 4));
      fireW = w;
      fireH = h;
    }

    // 1. Generate flame seeds at bottom rows
    const bottomRow = h * w;
    for (let x = 0; x < w; x++) {
      const r = Math.random();
      const intensity = r > 0.35 ? Math.floor(Math.random() * 180 + 75) : 0;
      fireBuf[bottomRow + x] = intensity;
      fireBuf[bottomRow + w + x] = intensity;
    }

    // 2. Upward heat diffusion
    for (let y = 0; y < h; y++) {
      const row = y * w;
      const below = (y + 1) * w;
      const below2 = Math.min((h + 1) * w, (y + 2) * w);

      for (let x = 0; x < w; x++) {
        const xL = (x - 1 + w) % w;
        const xR = (x + 1) % w;

        const sum =
          fireBuf[below + xL] +
          fireBuf[below + x] +
          fireBuf[below + xR] +
          fireBuf[below2 + x];

        // Cooling factor
        const decay = Math.floor(Math.random() * 4) + 1;
        const heat = Math.max(0, Math.floor(sum / 4.02) - decay);
        fireBuf[row + x] = heat;
        ctx.imagebuffer[row + x] = heat;
      }
    }

    // Big label "AA FIRE"
    const charW = Math.floor(ctx.imgwidth * 0.07);
    const charH = Math.floor(ctx.imgheight * 0.22);
    centerprint(ctx.imagebuffer, w, h, w / 2, Math.floor(h * 0.15), charW, charH, 255, 'AA FIRE');

    ctx.params.contrast = 30;
    ctx.params.dither = AADitherMode.FLOYD_STEINBERG;
    aaRender(ctx);
  }
}

// 6. SCENE 2: Greetings to Demogroups
export function renderScene2Greetings(sctx: SceneContext): void {
  const { ctx, sceneTimeSec } = sctx;
  ctx.params.bright = 0;
  ctx.params.contrast = 0;
  ctx.params.inversion = false;
  ctx.params.randomval = 0;
  clearImageBuffer(ctx);
  clearTextBuffer(ctx);

  const pokec = [
    'Future Crew', 'Triton', 'Cascada', 'Complex', 'Pascal',
    'Titans', 'Xography', 'Sonic PC', 'Scrymag', 'Orange',
    'Aardbei', 'Pulse', 'CNCD', 'NoooN', 'Vantage', 'Moppi',
    'Farbrausch', 'Valhalla', 'Microsoft!?!'
  ];

  const safeTime = Math.max(0, sceneTimeSec);
  const groupIdx = Math.floor(safeTime * 1.2) % pokec.length;
  const group = pokec[groupIdx] || 'DEMOSCENE';

  const w = ctx.imgwidth;
  const h = ctx.imgheight;

  // Title "GREETINGS TO:"
  const headCharW = Math.floor(w * 0.045);
  const headCharH = Math.floor(h * 0.12);
  centerprint(ctx.imagebuffer, w, h, w / 2, Math.floor(h * 0.15), headCharW, headCharH, 255, 'GREETINGS TO:');

  // Dynamic flying sine-wave group name
  const groupCharW = Math.floor(w * 0.08);
  const groupCharH = Math.floor(h * 0.26);
  const waveY = Math.floor(h * 0.45 + Math.sin(sceneTimeSec * 4) * (h * 0.1));
  centerprint(ctx.imagebuffer, w, h, w / 2, waveY, groupCharW, groupCharH, 255, group);

  // Background stars / dots
  for (let i = 0; i < 60; i++) {
    const sx = Math.floor((Math.sin(i * 133 + sceneTimeSec * 2) * 0.5 + 0.5) * w);
    const sy = Math.floor((Math.cos(i * 77 + sceneTimeSec * 1.5) * 0.5 + 0.5) * h);
    if (sx >= 0 && sx < w && sy >= 0 && sy < h) {
      ctx.imagebuffer[sy * w + sx] = 200;
    }
  }

  ctx.params.dither = AADitherMode.FLOYD_STEINBERG;
  aaRender(ctx);
}

// 7. SCENE 8: The Legendary Zebra
export function renderScene8Zebra(sctx: SceneContext): void {
  const { ctx, sceneTimeSec, sceneProgress } = sctx;
  ctx.params.bright = 0;
  clearImageBuffer(ctx);
  clearTextBuffer(ctx);

  const zeb = getImageSync('zeb');
  if (!zeb) {
    aaPuts(ctx, 2, 2, AAAttribute.BOLD, 'Loading Zebra (600x470)...');
    return;
  }

  // Replicating original camera path in scene8.c:
  // Pans from body stripes to eye, to muzzle, zoom in/out, contrast changes
  const t = sceneProgress;
  let cx = 300, cy = 250, spanW = 300, spanH = 230;

  if (t < 0.2) {
    // Zoom in on eye
    const subT = t / 0.2;
    cx = 250 + subT * 100;
    cy = 200 - subT * 50;
    spanW = 280 - subT * 180;
    spanH = 220 - subT * 140;
    ctx.params.contrast = Math.floor(subT * 40);
  } else if (t < 0.45) {
    // Pan across stripes
    const subT = (t - 0.2) / 0.25;
    cx = 350 + Math.sin(subT * Math.PI) * 150;
    cy = 150 + subT * 150;
    spanW = 120 + Math.sin(subT * Math.PI * 2) * 40;
    spanH = 90 + Math.sin(subT * Math.PI * 2) * 30;
    ctx.params.inversion = subT > 0.5;
  } else if (t < 0.75) {
    // Zoom out to full zebra
    const subT = (t - 0.45) / 0.3;
    cx = 300;
    cy = 235;
    spanW = 120 + subT * 180;
    spanH = 90 + subT * 145;
    ctx.params.inversion = false;
    ctx.params.contrast = 25;
  } else {
    // Modulate brightness & noise
    cx = 300 + Math.sin(sceneTimeSec * 3) * 30;
    cy = 235 + Math.cos(sceneTimeSec * 2) * 20;
    spanW = 300;
    spanH = 235;
    ctx.params.randomval = Math.floor(Math.sin((t - 0.75) * 8) * 60);
  }

  const x1 = Math.max(0, cx - spanW);
  const y1 = Math.max(0, cy - spanH);
  const x2 = Math.min(zeb.width, cx + spanW);
  const y2 = Math.min(zeb.height, cy + spanH);

  scaleImageToBuffer(zeb.data, zeb.width, zeb.height, ctx.imagebuffer, ctx.imgwidth, ctx.imgheight, x1, y1, x2, y2);

  ctx.params.dither = AADitherMode.FLOYD_STEINBERG;
  aaRender(ctx);
}

// 8. SCENE 6: XaoS Fractal Zoomer (Mandelbrot & Julia)
export function renderScene6Fractal(sctx: SceneContext): void {
  const { ctx, sceneTimeSec } = sctx;
  ctx.params.bright = 0;
  ctx.params.contrast = 0;
  ctx.params.inversion = false;
  ctx.params.randomval = 0;
  clearImageBuffer(ctx);
  clearTextBuffer(ctx);

  const w = ctx.imgwidth;
  const h = ctx.imgheight;
  const buf = ctx.imagebuffer;

  // Zoom factor
  const zoom = Math.exp(sceneTimeSec * 0.45);
  const centerX = -0.743643887037158704752191506114774;
  const centerY = 0.131825904205311970493132056385139;

  const maxIter = 40;

  for (let y = 0; y < h; y += 2) {
    const row = y * w;
    const rowNext = (y + 1) * w;
    const c_im = centerY + (y - h / 2) / (0.5 * zoom * h);

    for (let x = 0; x < w; x += 2) {
      const c_re = centerX + (x - w / 2) / (0.5 * zoom * h);
      let z_re = c_re;
      let z_im = c_im;
      let iter = 0;

      while (z_re * z_re + z_im * z_im <= 4 && iter < maxIter) {
        const next_re = z_re * z_re - z_im * z_im + c_re;
        z_im = 2 * z_re * z_im + c_im;
        z_re = next_re;
        iter++;
      }

      const val = iter === maxIter ? 0 : Math.floor((iter / maxIter) * 255);
      buf[row + x] = val;
      buf[row + x + 1] = val;
      buf[rowNext + x] = val;
      buf[rowNext + x + 1] = val;
    }
  }

  // Floating label
  centerprint(buf, w, h, w / 2, Math.floor(h * 0.82), Math.floor(w * 0.04), Math.floor(h * 0.1), 255, 'XAOS FRACTAL ZOOMER');

  ctx.params.dither = AADitherMode.FLOYD_STEINBERG;
  aaRender(ctx);
}

// 9. SCENE 5: 3D Torus Engine
export function renderScene5Torus(sctx: SceneContext): void {
  const { ctx, sceneTimeSec, sceneProgress } = sctx;
  ctx.params.bright = 0;
  ctx.params.contrast = 0;
  ctx.params.randomval = 0;
  clearImageBuffer(ctx);
  clearTextBuffer(ctx);

  const w = ctx.imgwidth;
  const h = ctx.imgheight;
  const buf = ctx.imagebuffer;

  const angleX = sceneTimeSec * 1.5;
  const angleY = sceneTimeSec * 2.1;
  const angleZ = sceneTimeSec * 0.8;

  const R = Math.min(w, h) * 0.28; // Major radius
  const r = R * 0.45; // Minor tube radius

  const cosX = Math.cos(angleX), sinX = Math.sin(angleX);
  const cosY = Math.cos(angleY), sinY = Math.sin(angleY);

  const uSteps = 28;
  const vSteps = 16;

  // Render 3D shaded torus
  for (let i = 0; i < uSteps; i++) {
    const u = (i * Math.PI * 2) / uSteps;
    const cosU = Math.cos(u), sinU = Math.sin(u);

    for (let j = 0; j < vSteps; j++) {
      const v = (j * Math.PI * 2) / vSteps;
      const cosV = Math.cos(v), sinV = Math.sin(v);

      // Torus parametric coords
      const tx = (R + r * cosV) * cosU;
      const ty = (R + r * cosV) * sinU;
      const tz = r * sinV;

      // Rotate Y
      const x1 = tx * cosY + tz * sinY;
      const y1 = ty;
      const z1 = -tx * sinY + tz * cosY;

      // Rotate X
      const x2 = x1;
      const y2 = y1 * cosX - z1 * sinX;
      const z2 = y1 * sinX + z1 * cosX;

      // Perspective projection
      const dist = 400;
      const pz = z2 + dist;
      if (pz > 10) {
        const px = Math.floor(w / 2 + (x2 * dist) / pz);
        const py = Math.floor(h / 2 + (y2 * dist) / pz);

        // Lighting calculation (normal vector)
        const nx = cosV * cosU;
        const ny = cosV * sinU;
        const nz = sinV;
        const dot = Math.max(0, nx * 0.5 + ny * 0.3 + nz * 0.8);
        const brightness = Math.floor(dot * 220 + 35);

        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const sx = px + dx;
            const sy = py + dy;
            if (sx >= 0 && sx < w && sy >= 0 && sy < h) {
              buf[sy * w + sx] = Math.max(buf[sy * w + sx], brightness);
            }
          }
        }
      }
    }
  }

  // Feature banners
  let banner = 'Supports ANTIALIASING';
  if (sceneProgress < 0.66) {
    ctx.params.inversion = false;
  }
  if (sceneProgress > 0.33 && sceneProgress < 0.66) {
    banner = 'Supports DITHERING';
  } else if (sceneProgress >= 0.66) {
    banner = 'Supports INVERSIONS';
    ctx.params.inversion = (Math.floor(sceneTimeSec * 4) % 2 === 0);
  }

  centerprint(buf, w, h, w / 2, Math.floor(h * 0.1), Math.floor(w * 0.04), Math.floor(h * 0.1), 255, banner);

  ctx.params.dither = AADitherMode.FLOYD_STEINBERG;
  aaRender(ctx);
}

// 10. CREDITS 1: 3D Starfield & Rolling Credits
export function renderCredits1Stars(sctx: SceneContext): void {
  const { ctx, sceneTimeSec } = sctx;
  ctx.params.bright = 0;
  ctx.params.contrast = 0;
  ctx.params.inversion = false;
  ctx.params.randomval = 0;
  clearImageBuffer(ctx);
  clearTextBuffer(ctx);

  const w = ctx.imgwidth;
  const h = ctx.imgheight;
  const buf = ctx.imagebuffer;

  // Initialize stars
  if (!stars) {
    stars = [];
    for (let i = 0; i < 350; i++) {
      stars.push({
        x: (Math.random() - 0.5) * 2000,
        y: (Math.random() - 0.5) * 1600,
        z: Math.random() * 1000 + 1,
      });
    }
  }

  // Move stars
  const speed = 18;
  for (const s of stars) {
    s.z -= speed;
    if (s.z <= 0) {
      s.x = (Math.random() - 0.5) * 2000;
      s.y = (Math.random() - 0.5) * 1600;
      s.z = 1000;
    }

    const sx = Math.floor(w / 2 + (s.x * 200) / s.z);
    const sy = Math.floor(h / 2 + (s.y * 200) / s.z);
    if (sx >= 0 && sx < w && sy >= 0 && sy < h) {
      const b = Math.min(255, Math.floor(((1000 - s.z) / 1000) * 255));
      buf[sy * w + sx] = b;
      if (s.z < 300) {
        if (sx + 1 < w) buf[sy * w + sx + 1] = b;
        if (sy + 1 < h) buf[(sy + 1) * w + sx] = b;
      }
    }
  }

  // Rolling credits list
  const creditsList = [
    'Thank you',
    'For watching',
    'BB',
    '*** CREDITS ***',
    'FK: Music & Samples',
    'MS: 3D Engine & Donut',
    'KT: Sound Engine & Sync',
    'HH: AA-Lib & Fractals',
    'Special Thanks to:',
    'Eva Hubickova (photos)',
    'Texas Linux Users Group',
    'Thomas Marsh (XaoS)',
    'IBM for MDA Card',
    'Jiri Matousek (searching alg)'
  ];

  const rollSpeed = 2.2;
  const totalOffset = sceneTimeSec * rollSpeed;

  for (let i = 0; i < creditsList.length; i++) {
    const itemY = Math.floor(h * 0.9 - (totalOffset - i * 3) * (h * 0.12));
    if (itemY > -20 && itemY < h + 20) {
      centerprint(buf, w, h, w / 2, itemY, Math.floor(w * 0.035), Math.floor(h * 0.09), 240, creditsList[i]);
    }
  }

  ctx.params.dither = AADitherMode.FLOYD_STEINBERG;
  aaRender(ctx);
}

// 11. CREDITS 2 & Interactive End Terminal Scroller
export function renderEndScroller(
  sctx: SceneContext,
  docLines: string[],
  scrollRow: number
): void {
  const { ctx, sceneTimeSec } = sctx;
  ctx.params.bright = 0;
  ctx.params.contrast = 0;
  ctx.params.inversion = false;
  ctx.params.randomval = 0;
  clearTextBuffer(ctx);

  if (sceneTimeSec < 5.0) {
    // "The END" with spherical warp dissolution
    clearImageBuffer(ctx);
    const alpha = Math.min(1.0, sceneTimeSec / 2.5);
    centerprint(ctx.imagebuffer, ctx.imgwidth, ctx.imgheight, ctx.imgwidth / 2, Math.floor(ctx.imgheight * 0.35), Math.floor(ctx.imgwidth * 0.08), Math.floor(ctx.imgheight * 0.2), Math.floor(alpha * 255), 'The');
    centerprint(ctx.imagebuffer, ctx.imgwidth, ctx.imgheight, ctx.imgwidth / 2, Math.floor(ctx.imgheight * 0.6), Math.floor(ctx.imgwidth * 0.1), Math.floor(ctx.imgheight * 0.25), Math.floor(alpha * 255), 'END');
    aaRender(ctx);
    return;
  }

  // Interactive documentation scroller
  const maxRows = ctx.scrheight - 3;
  const startLine = Math.max(0, Math.min(docLines.length - maxRows, scrollRow));

  // Top header bar
  const topBar = ` [BB FINAL VERSION]  Line ${startLine + 1}/${docLines.length}  (Controls: Space/Down/j=Down, Up/k=Up, 1/2/3=Song) `;
  aaPuts(ctx, 0, 0, AAAttribute.REVERSE, topBar.padEnd(ctx.scrwidth, ' '));

  for (let r = 0; r < maxRows; r++) {
    const lineIdx = startLine + r;
    const y = r + 1;
    if (lineIdx < docLines.length) {
      const line = docLines[lineIdx];
      // Check markup: #b = bold, #c = center
      const isBold = line.includes('#b');
      const cleanLine = line.replace(/#[a-z]/g, '');
      aaPuts(ctx, 2, y, isBold ? AAAttribute.BOLD : AAAttribute.NORMAL, cleanLine);
    } else {
      aaPuts(ctx, 0, y, AAAttribute.DIM, '~');
    }
  }

  // Bottom command hint
  const bottomBar = ' [q/Esc]: Restart Demo | [1/2/3]: Switch Music Track | [F]: Fullscreen ';
  aaPuts(ctx, 0, ctx.scrheight - 1, AAAttribute.REVERSE, bottomBar.padEnd(ctx.scrwidth, ' '));
}
