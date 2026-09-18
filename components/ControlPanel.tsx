'use client';

import React from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Tv,
  Music,
  Sliders,
  SkipBack,
  SkipForward,
  Info,
} from 'lucide-react';
import { PhosphorTheme } from './TerminalDisplay';
import { SceneId, SCENES_ORDER } from '../lib/demo/scenes';
import { AADitherMode } from '../lib/aalib/types';

interface ControlPanelProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  onRestart: () => void;
  onPrevScene?: () => void;
  onNextScene: () => void;
  currentSceneId: SceneId;
  onSelectScene: (id: SceneId) => void;
  theme: PhosphorTheme;
  onChangeTheme: (theme: PhosphorTheme) => void;
  crtEffect: boolean;
  onToggleCrt: () => void;
  scanlines: boolean;
  onToggleScanlines: () => void;
  bloom: boolean;
  onToggleBloom: () => void;
  volume: number;
  onChangeVolume: (vol: number) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  currentSongIdx: number;
  onSelectSong: (idx: number) => void;
  channelVUs: Float32Array;
  resolution: { w: number; h: number };
  onChangeResolution: (res: { w: number; h: number }) => void;
  ditherMode: AADitherMode;
  onChangeDitherMode: (mode: AADitherMode) => void;
  bright: number;
  onChangeBright: (b: number) => void;
  contrast: number;
  onChangeContrast: (c: number) => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onOpenAbout: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  isPlaying,
  onTogglePlay,
  onRestart,
  onPrevScene,
  onNextScene,
  currentSceneId,
  onSelectScene,
  theme,
  onChangeTheme,
  crtEffect,
  onToggleCrt,
  scanlines,
  onToggleScanlines,
  bloom,
  onToggleBloom,
  volume,
  onChangeVolume,
  isMuted,
  onToggleMute,
  currentSongIdx,
  onSelectSong,
  channelVUs,
  resolution,
  onChangeResolution,
  ditherMode,
  onChangeDitherMode,
  bright,
  onChangeBright,
  contrast,
  onChangeContrast,
  isFullscreen,
  onToggleFullscreen,
  onOpenAbout,
}) => {
  return (
    <div className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 sm:p-4 text-zinc-300 font-mono text-xs flex flex-col gap-3 shadow-xl">
      {/* Top Bar: Playback Controls, Scene Jump, Music Tracks, Fullscreen */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            id="ctrl-play-pause-btn"
            onClick={onTogglePlay}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-700 hover:bg-emerald-600 text-white font-semibold transition"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            <span className="hidden sm:inline">{isPlaying ? 'PAUSE' : 'PLAY'}</span>
          </button>

          <button
            id="ctrl-restart-btn"
            onClick={onRestart}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition"
            title="Restart Demo"
          >
            <RotateCcw size={14} />
            <span className="hidden md:inline">RESTART</span>
          </button>

          {onPrevScene && (
            <button
              id="ctrl-prev-scene-btn"
              onClick={onPrevScene}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition"
              title="Previous Scene"
            >
              <SkipBack size={14} />
              <span className="hidden md:inline">PREV</span>
            </button>
          )}

          <button
            id="ctrl-skip-scene-btn"
            onClick={onNextScene}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition"
            title="Next Scene"
          >
            <SkipForward size={14} />
            <span className="hidden md:inline">NEXT</span>
          </button>
        </div>

        {/* Scene Selector Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-zinc-500 hidden sm:inline">SCENE:</span>
          <select
            id="ctrl-scene-select"
            value={currentSceneId}
            onChange={(e) => onSelectScene(e.target.value as SceneId)}
            className="bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:border-emerald-500 max-w-[200px] sm:max-w-[260px] truncate"
          >
            {SCENES_ORDER.map((scene) => (
              <option key={scene.id} value={scene.id}>
                {scene.name}
              </option>
            ))}
          </select>
        </div>

        {/* Music Track Buttons */}
        <div className="flex items-center gap-1">
          <Music size={13} className="text-zinc-500 mr-1 hidden sm:inline" />
          {[
            { idx: 1, label: 'BB (Main)' },
            { idx: 2, label: 'Icy' },
            { idx: 3, label: 'Sandqueen' },
          ].map((song) => (
            <button
              key={song.idx}
              id={`ctrl-song-${song.idx}-btn`}
              onClick={() => onSelectSong(song.idx)}
              className={`px-2 py-1 rounded transition text-[11px] ${
                currentSongIdx === song.idx
                  ? 'bg-amber-600 text-white font-bold'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400'
              }`}
            >
              {song.idx}
            </button>
          ))}
        </div>

        {/* Volume & Fullscreen */}
        <div className="flex items-center gap-2">
          <button
            id="ctrl-mute-btn"
            onClick={onToggleMute}
            className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX size={14} className="text-red-400" /> : <Volume2 size={14} />}
          </button>
          <input
            id="ctrl-volume-slider"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={(e) => onChangeVolume(parseFloat(e.target.value))}
            className="w-16 sm:w-20 accent-emerald-500 cursor-pointer"
            title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
          />

          <button
            id="ctrl-fullscreen-btn"
            onClick={onToggleFullscreen}
            className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>

          <button
            id="ctrl-about-btn"
            onClick={onOpenAbout}
            className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
            title="About BB (1997)"
          >
            <Info size={14} />
          </button>
        </div>
      </div>

      {/* S3M Tracker Channel VU Meter Display */}
      <div className="flex items-center justify-between gap-1 bg-black/60 rounded px-2.5 py-1.5 border border-zinc-900 overflow-x-auto">
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider shrink-0 mr-1 hidden sm:inline">
          Tracker VU:
        </span>
        <div className="flex items-end gap-[3px] h-4 w-full">
          {Array.from({ length: 16 }).map((_, idx) => {
            const vu = channelVUs[idx] || 0;
            const heightPercent = Math.min(100, Math.round(vu * 100));
            return (
              <div
                key={idx}
                className="flex-1 bg-zinc-800/80 rounded-t overflow-hidden flex flex-col justify-end h-full"
                title={`Ch ${idx + 1}: ${heightPercent}%`}
              >
                <div
                  className={`w-full transition-all duration-75 ${
                    heightPercent > 80
                      ? 'bg-red-500'
                      : heightPercent > 50
                      ? 'bg-amber-400'
                      : 'bg-emerald-500'
                  }`}
                  style={{ height: `${heightPercent}%` }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Bar: CRT Phosphor Theme, Resolution, Dithering, Brightness/Contrast */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 items-center">
        {/* Phosphor Theme */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-zinc-400 uppercase">Phosphor:</label>
          <div className="flex gap-1">
            {(
              [
                { id: 'green', label: 'Green', color: 'bg-emerald-500' },
                { id: 'amber', label: 'Amber', color: 'bg-amber-500' },
                { id: 'white', label: 'Mono', color: 'bg-zinc-200' },
                { id: 'cyan', label: 'Cyan', color: 'bg-cyan-400' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                id={`theme-btn-${item.id}`}
                onClick={() => onChangeTheme(item.id)}
                className={`flex-1 py-1 px-1 text-center rounded border transition text-[10px] flex items-center justify-center gap-1 ${
                  theme === item.id
                    ? 'border-white bg-zinc-800 text-white font-bold'
                    : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:bg-zinc-800'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${item.color}`} />
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Resolution Preset */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-zinc-400 uppercase">Resolution:</label>
          <select
            id="ctrl-res-select"
            value={`${resolution.w}x${resolution.h}`}
            onChange={(e) => {
              const [w, h] = e.target.value.split('x').map(Number);
              onChangeResolution({ w, h });
            }}
            className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-zinc-200 focus:outline-none focus:border-emerald-500 text-[11px]"
          >
            <option value="80x25">80 x 25 (Classic DOS)</option>
            <option value="80x50">80 x 50 (SVGA Text)</option>
            <option value="100x40">100 x 40 (Wide Console)</option>
            <option value="120x60">120 x 60 (High Density)</option>
          </select>
        </div>

        {/* Dithering Mode */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-zinc-400 uppercase">Dither:</label>
          <select
            id="ctrl-dither-select"
            value={ditherMode}
            onChange={(e) => onChangeDitherMode(Number(e.target.value) as AADitherMode)}
            className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-zinc-200 focus:outline-none focus:border-emerald-500 text-[11px]"
          >
            <option value={AADitherMode.FLOYD_STEINBERG}>Floyd-Steinberg</option>
            <option value={AADitherMode.ERRORDISTRIB}>Error Diffusion</option>
            <option value={AADitherMode.NONE}>None</option>
          </select>
        </div>

        {/* CRT Glass & Scanline Toggles */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-zinc-400 uppercase">CRT Effects:</label>
          <div className="flex gap-1">
            <button
              id="ctrl-toggle-scanlines-btn"
              onClick={onToggleScanlines}
              className={`flex-1 py-1 px-1 text-center rounded border transition text-[10px] ${
                scanlines
                  ? 'border-emerald-500 bg-emerald-950/50 text-emerald-300'
                  : 'border-zinc-800 bg-zinc-900/60 text-zinc-500'
              }`}
            >
              Scanline
            </button>
            <button
              id="ctrl-toggle-crt-btn"
              onClick={onToggleCrt}
              className={`flex-1 py-1 px-1 text-center rounded border transition text-[10px] ${
                crtEffect
                  ? 'border-emerald-500 bg-emerald-950/50 text-emerald-300'
                  : 'border-zinc-800 bg-zinc-900/60 text-zinc-500'
              }`}
            >
              Curvature
            </button>
            <button
              id="ctrl-toggle-bloom-btn"
              onClick={onToggleBloom}
              className={`flex-1 py-1 px-1 text-center rounded border transition text-[10px] ${
                bloom
                  ? 'border-emerald-500 bg-emerald-950/50 text-emerald-300'
                  : 'border-zinc-800 bg-zinc-900/60 text-zinc-500'
              }`}
            >
              Bloom
            </button>
          </div>
        </div>

        {/* Brightness */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-[10px] text-zinc-400 uppercase">
            <span>Bright:</span>
            <span>{bright > 0 ? `+${bright}` : bright}</span>
          </div>
          <input
            id="ctrl-bright-slider"
            type="range"
            min="-100"
            max="100"
            step="5"
            value={bright}
            onChange={(e) => onChangeBright(parseInt(e.target.value, 10))}
            className="w-full accent-emerald-500 cursor-pointer"
          />
        </div>

        {/* Contrast */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-[10px] text-zinc-400 uppercase">
            <span>Contrast:</span>
            <span>{contrast}</span>
          </div>
          <input
            id="ctrl-contrast-slider"
            type="range"
            min="0"
            max="100"
            step="5"
            value={contrast}
            onChange={(e) => onChangeContrast(parseInt(e.target.value, 10))}
            className="w-full accent-emerald-500 cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};
