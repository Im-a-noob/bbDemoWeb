'use client';

import React, { useRef, useImperativeHandle, forwardRef, useEffect, useCallback } from 'react';
import { AAContext, AAAttribute } from '../lib/aalib/types';

export type PhosphorTheme = 'green' | 'amber' | 'white' | 'cyan';

export interface TerminalDisplayHandle {
  drawFrame: (ctx: AAContext) => void;
}

interface TerminalDisplayProps {
  ctx: AAContext;
  theme: PhosphorTheme;
  crtEffect: boolean;
  scanlines: boolean;
  bloom: boolean;
  className?: string;
}

const THEME_COLORS: Record<PhosphorTheme, { bg: string; normal: string; dim: string; bold: string; glow: string }> = {
  green: {
    bg: '#040d04',
    normal: '#2be02b',
    dim: '#116611',
    bold: '#75ff75',
    glow: 'rgba(40, 240, 40, 0.45)',
  },
  amber: {
    bg: '#100700',
    normal: '#ff9900',
    dim: '#7a4200',
    bold: '#ffcc33',
    glow: 'rgba(255, 160, 0, 0.45)',
  },
  white: {
    bg: '#08080a',
    normal: '#d4d4dc',
    dim: '#60606a',
    bold: '#ffffff',
    glow: 'rgba(255, 255, 255, 0.35)',
  },
  cyan: {
    bg: '#020d12',
    normal: '#00d4e6',
    dim: '#005d66',
    bold: '#85f5ff',
    glow: 'rgba(0, 220, 240, 0.45)',
  },
};

export const TerminalDisplay = forwardRef<TerminalDisplayHandle, TerminalDisplayProps>(
  ({ ctx, theme, crtEffect, scanlines, bloom, className = '' }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const drawFrameInternal = useCallback(
      (renderCtx: AAContext) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const canvasCtx = canvas.getContext('2d', { alpha: false });
        if (!canvasCtx) return;

        const { scrwidth, scrheight, textbuffer, attrbuffer } = renderCtx;
        const colors = THEME_COLORS[theme];

        // Character cell metrics: 10px width x 16px height
        const cellW = 10;
        const cellH = 16;
        const targetW = scrwidth * cellW;
        const targetH = scrheight * cellH;

        if (canvas.width !== targetW || canvas.height !== targetH) {
          canvas.width = targetW;
          canvas.height = targetH;
        }

        // Fill background
        canvasCtx.fillStyle = colors.bg;
        canvasCtx.fillRect(0, 0, targetW, targetH);

        // Font settings
        canvasCtx.font = 'bold 13px "Courier New", Courier, monospace';
        canvasCtx.textBaseline = 'top';

        for (let y = 0; y < scrheight; y++) {
          const rowOffset = y * scrwidth;
          const posY = y * cellH;

          for (let x = 0; x < scrwidth; x++) {
            const idx = rowOffset + x;
            const charCode = textbuffer[idx];
            const attr = attrbuffer[idx];

            if (charCode === 32 && attr !== AAAttribute.REVERSE) {
              continue; // Skip empty space
            }

            const posX = x * cellW;
            const charStr = String.fromCharCode(charCode);

            if (attr === AAAttribute.REVERSE) {
              canvasCtx.fillStyle = colors.bold;
              canvasCtx.fillRect(posX, posY, cellW, cellH);
              canvasCtx.fillStyle = colors.bg;
              canvasCtx.shadowBlur = 0;
              canvasCtx.fillText(charStr, posX + 1, posY + 1);
            } else {
              let textColor = colors.normal;
              if (attr === AAAttribute.BOLD || attr === AAAttribute.BOLDFONT) {
                textColor = colors.bold;
              } else if (attr === AAAttribute.DIM) {
                textColor = colors.dim;
              }

              if (bloom && (attr === AAAttribute.BOLD || attr === AAAttribute.BOLDFONT)) {
                canvasCtx.shadowColor = colors.glow;
                canvasCtx.shadowBlur = 5;
              } else {
                canvasCtx.shadowBlur = 0;
              }

              canvasCtx.fillStyle = textColor;
              canvasCtx.fillText(charStr, posX + 1, posY + 1);
            }
          }
        }
      },
      [theme, bloom]
    );

    useImperativeHandle(
      ref,
      () => ({
        drawFrame: (currentCtx: AAContext) => {
          drawFrameInternal(currentCtx);
        },
      }),
      [drawFrameInternal]
    );

    // Initial / theme change draw
    useEffect(() => {
      drawFrameInternal(ctx);
    }, [ctx, drawFrameInternal]);

    return (
      <div
        className={`relative overflow-hidden flex items-center justify-center select-none outline-none ${className}`}
        style={{
          backgroundColor: THEME_COLORS[theme].bg,
        }}
      >
        {/* Canvas Terminal Output */}
        <canvas
          ref={canvasRef}
          className="w-full h-full object-contain block image-rendering-pixelated"
          style={{
            filter: crtEffect ? 'contrast(1.08) brightness(1.04)' : 'none',
          }}
        />

        {/* CRT Scanlines Overlay */}
        {scanlines && (
          <div
            className="pointer-events-none absolute inset-0 z-10 opacity-30"
            style={{
              backgroundImage:
                'repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.45) 0px, rgba(0, 0, 0, 0.45) 1px, transparent 1px, transparent 2px)',
            }}
          />
        )}

        {/* CRT Glass Vignette & Curvature Shadow */}
        {crtEffect && (
          <div
            className="pointer-events-none absolute inset-0 z-20"
            style={{
              boxShadow:
                'inset 0 0 35px 12px rgba(0, 0, 0, 0.85), inset 0 0 90px 25px rgba(0, 0, 0, 0.65)',
              borderRadius: '12px',
            }}
          />
        )}
      </div>
    );
  }
);

TerminalDisplay.displayName = 'TerminalDisplay';
