'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TerminalDisplay, TerminalDisplayHandle, PhosphorTheme } from '../components/TerminalDisplay';
import { ControlPanel } from '../components/ControlPanel';
import { AboutModal } from '../components/AboutModal';
import { AAContext, AADitherMode } from '../lib/aalib/types';
import { createAAContext } from '../lib/aalib/renderer';
import { S3MPlayer } from '../lib/audio/s3m-player';
import { preloadAllImages } from '../lib/demo/image-loader';
import {
  SceneId,
  SCENES_ORDER,
  renderIntro,
  renderScene1Titles,
  renderScene3Plasma,
  renderAuthorShowcase,
  renderScene4InvadersAndFire,
  renderScene2Greetings,
  renderScene8Zebra,
  renderScene6Fractal,
  renderScene5Torus,
  renderCredits1Stars,
  renderEndScroller,
  resetSceneState,
} from '../lib/demo/scenes';
import { AUTHOR_BIOS } from '../lib/demo/bios';
import { BB_DOC_LINES } from '../lib/demo/doc-text';
import { Terminal, Play, Sparkles } from 'lucide-react';

export default function BBApp() {
  // Demo Execution State
  const [hasStarted, setHasStarted] = useState<boolean>(false);
  const [assetsLoaded, setAssetsLoaded] = useState<boolean>(false);
  const [loadProgress, setLoadProgress] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentSceneId, setCurrentSceneId] = useState<SceneId>('intro');
  const [currentSongIdx, setCurrentSongIdx] = useState<number>(1);
  const [scrollRow, setScrollRow] = useState<number>(0);
  const [isAboutOpen, setIsAboutOpen] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Terminal & Display Settings
  const [theme, setTheme] = useState<PhosphorTheme>('green');
  const [crtEffect, setCrtEffect] = useState<boolean>(true);
  const [scanlines, setScanlines] = useState<boolean>(true);
  const [bloom, setBloom] = useState<boolean>(true);
  const [resolution, setResolution] = useState<{ w: number; h: number }>({ w: 80, h: 25 });
  const [ditherMode, setDitherMode] = useState<AADitherMode>(AADitherMode.FLOYD_STEINBERG);
  const [bright, setBright] = useState<number>(0);
  const [contrast, setContrast] = useState<number>(0);

  // Audio State
  const [volume, setVolume] = useState<number>(0.85);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [channelVUs, setChannelVUs] = useState<Float32Array>(new Float32Array(32));

  // Derived AA Context with useMemo
  const aaContext = React.useMemo(() => {
    const newCtx = createAAContext(resolution.w, resolution.h);
    newCtx.params.dither = ditherMode;
    newCtx.params.bright = bright;
    newCtx.params.contrast = contrast;
    return newCtx;
  }, [resolution.w, resolution.h, ditherMode, bright, contrast]);

  const playerRef = useRef<S3MPlayer | null>(null);
  const aaContextRef = useRef<AAContext>(aaContext);
  const terminalRef = useRef<TerminalDisplayHandle | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const demoStartTimeRef = useRef<number>(0);
  const sceneStartTimeRef = useRef<number>(0);
  const sceneIdxRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Sync ref with aaContext
  useEffect(() => {
    aaContextRef.current = aaContext;
  }, [aaContext]);

  // Preload Images on mount
  useEffect(() => {
    preloadAllImages((loaded, total) => {
      setLoadProgress(Math.round((loaded / total) * 100));
    }).then(() => {
      setAssetsLoaded(true);
    });

    playerRef.current = new S3MPlayer();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (playerRef.current) playerRef.current.destroy();
    };
  }, []);

  // Audio Player Safe Accessor
  const getPlayer = useCallback(() => {
    if (!playerRef.current) {
      playerRef.current = new S3MPlayer();
    }
    return playerRef.current;
  }, []);

  // Audio Song Switcher
  const playTrack = useCallback(async (songIdx: number) => {
    const player = getPlayer();
    setCurrentSongIdx(songIdx);
    const songUrl = songIdx === 2 ? '/audio/bb2.s3m' : songIdx === 3 ? '/audio/bb3.s3m' : '/audio/bb.s3m';
    await player.loadAndPlay(songUrl);
    player.setVolume(volume);
  }, [getPlayer, volume]);

  // Launch Demo on User Gesture
  const handleStartDemo = useCallback(async () => {
    const player = getPlayer();
    try {
      await player.ensureContext();
    } catch (e) {
      console.warn('AudioContext resume on click:', e);
    }

    setHasStarted(true);
    setIsPlaying(true);
    demoStartTimeRef.current = performance.now();
    sceneStartTimeRef.current = performance.now();
    sceneIdxRef.current = 0;
    setCurrentSceneId(SCENES_ORDER[0].id);

    // Start Audio Track 1
    await playTrack(1);
  }, [getPlayer, playTrack]);

  // Scene Switching Logic
  const jumpToScene = useCallback(
    async (sceneId: SceneId) => {
      const idx = SCENES_ORDER.findIndex((s) => s.id === sceneId);
      if (idx === -1) return;

      if (aaContextRef.current) {
        resetSceneState(aaContextRef.current);
      }

      sceneIdxRef.current = idx;
      setCurrentSceneId(sceneId);
      sceneStartTimeRef.current = performance.now();

      // Ensure AudioContext is ready and play track for this scene
      const player = getPlayer();
      try {
        await player.ensureContext();
      } catch (_) {}

      const targetSong = SCENES_ORDER[idx].songIdx;
      await playTrack(targetSong);

      if (!hasStarted) {
        setHasStarted(true);
        setIsPlaying(true);
        demoStartTimeRef.current = performance.now();
      } else if (!isPlaying) {
        setIsPlaying(true);
      }
    },
    [hasStarted, isPlaying, getPlayer, playTrack]
  );

  const handleNextScene = useCallback(() => {
    const nextIdx = (sceneIdxRef.current + 1) % SCENES_ORDER.length;
    jumpToScene(SCENES_ORDER[nextIdx].id);
  }, [jumpToScene]);

  const handlePrevScene = useCallback(() => {
    const prevIdx = (sceneIdxRef.current - 1 + SCENES_ORDER.length) % SCENES_ORDER.length;
    jumpToScene(SCENES_ORDER[prevIdx].id);
  }, [jumpToScene]);

  const handleRestart = useCallback(() => {
    jumpToScene(SCENES_ORDER[0].id);
    demoStartTimeRef.current = performance.now();
    sceneStartTimeRef.current = performance.now();
    playTrack(1);
  }, [jumpToScene, playTrack]);

  const handleTogglePlay = useCallback(async () => {
    const player = getPlayer();
    try {
      await player.ensureContext();
    } catch (_) {}
    const nowPlaying = player.togglePlay();
    setIsPlaying(nowPlaying);
  }, [getPlayer]);

  // Main Demo Animation Frame Loop
  useEffect(() => {
    if (!hasStarted) return;

    let lastVuUpdate = 0;

    const renderLoop = (now: number) => {
      if (isPlaying) {
        const totalElapsedSec = (now - demoStartTimeRef.current) / 1000.0;
        const sceneElapsedSec = (now - sceneStartTimeRef.current) / 1000.0;
        const currentMeta = SCENES_ORDER[sceneIdxRef.current];

        // Scene auto-advance (except final interactive scroller)
        if (currentMeta.id !== 'end_scroller' && sceneElapsedSec >= currentMeta.durationSec) {
          const nextIdx = sceneIdxRef.current + 1;
          if (nextIdx < SCENES_ORDER.length) {
            if (aaContextRef.current) {
              resetSceneState(aaContextRef.current);
            }
            sceneIdxRef.current = nextIdx;
            setCurrentSceneId(SCENES_ORDER[nextIdx].id);
            sceneStartTimeRef.current = now;

            // Auto-switch track if the next scene has a different soundtrack
            const curSong = SCENES_ORDER[nextIdx - 1].songIdx;
            const nextSong = SCENES_ORDER[nextIdx].songIdx;
            if (nextSong !== curSong) {
              playTrack(nextSong);
            }
          }
        }

        const sceneProgress = Math.min(1.0, sceneElapsedSec / currentMeta.durationSec);
        const sctx = {
          timeSec: totalElapsedSec,
          sceneTimeSec: sceneElapsedSec,
          sceneProgress,
          ctx: aaContextRef.current,
        };

        // Render current scene
        switch (currentMeta.id) {
          case 'intro':
            renderIntro(sctx);
            break;
          case 'titles':
            renderScene1Titles(sctx);
            break;
          case 'plasma':
            renderScene3Plasma(sctx);
            break;
          case 'fk':
            renderAuthorShowcase(sctx, 'fk', AUTHOR_BIOS.fk.authorName, AUTHOR_BIOS.fk.bioText);
            break;
          case 'invaders_fire':
            renderScene4InvadersAndFire(sctx);
            break;
          case 'greetings':
            renderScene2Greetings(sctx);
            break;
          case 'ms':
            renderAuthorShowcase(sctx, 'ms', AUTHOR_BIOS.ms.authorName, AUTHOR_BIOS.ms.bioText);
            break;
          case 'zebra':
            renderScene8Zebra(sctx);
            break;
          case 'fractal':
            renderScene6Fractal(sctx);
            break;
          case 'kt':
            renderAuthorShowcase(sctx, 'kt', AUTHOR_BIOS.kt.authorName, AUTHOR_BIOS.kt.bioText);
            break;
          case 'torus':
            renderScene5Torus(sctx);
            break;
          case 'hh':
            renderAuthorShowcase(sctx, 'hh', AUTHOR_BIOS.hh.authorName, AUTHOR_BIOS.hh.bioText);
            break;
          case 'credits':
            renderCredits1Stars(sctx);
            break;
          case 'end_scroller':
            renderEndScroller(sctx, BB_DOC_LINES, scrollRow);
            break;
        }

        // Immediately render ASCII frame onto CRT canvas
        terminalRef.current?.drawFrame(sctx.ctx);

        // Update audio VU meters ~20fps
        if (now - lastVuUpdate > 50 && playerRef.current) {
          lastVuUpdate = now;
          setChannelVUs(new Float32Array(playerRef.current.channelVUs));
        }
      }

      animFrameRef.current = requestAnimationFrame(renderLoop);
    };

    animFrameRef.current = requestAnimationFrame(renderLoop);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [hasStarted, isPlaying, scrollRow, playTrack]);

  // Global Keyboard Navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement> | KeyboardEvent) => {
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        if (!document.fullscreenElement) {
          containerRef.current?.requestFullscreen?.();
          setIsFullscreen(true);
        } else {
          document.exitFullscreen?.();
          setIsFullscreen(false);
        }
      } else if (e.key === '1') {
        playTrack(1);
      } else if (e.key === '2') {
        playTrack(2);
      } else if (e.key === '3') {
        playTrack(3);
      } else if (e.key === 'm' || e.key === 'M') {
        if (playerRef.current) {
          const muted = playerRef.current.toggleMute();
          setIsMuted(muted);
        }
      } else if (e.key === 'r' || e.key === 'R') {
        handleRestart();
      } else if (e.key === 'ArrowDown' || e.key === 'j') {
        setScrollRow((prev) => Math.min(BB_DOC_LINES.length - 20, prev + 1));
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        setScrollRow((prev) => Math.max(0, prev - 1));
      } else if (e.key === 'PageDown') {
        setScrollRow((prev) => Math.min(BB_DOC_LINES.length - 20, prev + 15));
      } else if (e.key === 'PageUp') {
        setScrollRow((prev) => Math.max(0, prev - 15));
      }
    },
    [handleTogglePlay, playTrack, handleRestart]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  return (
    <main
      ref={containerRef}
      className="min-h-screen bg-black text-zinc-100 flex flex-col items-center justify-between p-2 sm:p-4 md:p-6 select-none font-mono"
    >
      {/* Header Bar */}
      <header className="w-full max-w-6xl flex items-center justify-between py-2 px-3 border-b border-zinc-800/80 mb-2 sm:mb-4">
        <div className="flex items-center gap-2">
          <Terminal size={18} className="text-emerald-500" />
          <h1 className="font-bold text-sm sm:text-base tracking-wider text-zinc-200">
            BB <span className="text-zinc-500 font-normal">| The Portable Demo (1997)</span>
          </h1>
        </div>
        <div className="flex items-center gap-3 text-xs text-zinc-400">
          <span className="hidden sm:inline bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded text-[11px] text-emerald-400">
            AA-GROUP / AALIB
          </span>
          <button
            onClick={() => setIsAboutOpen(true)}
            className="text-zinc-400 hover:text-white transition flex items-center gap-1 text-[11px]"
          >
            <Sparkles size={13} className="text-amber-400" />
            <span>ABOUT</span>
          </button>
        </div>
      </header>

      {/* Main Terminal Display Area */}
      <div className="w-full max-w-6xl flex-1 flex flex-col items-center justify-center relative my-auto">
        {!hasStarted ? (
          /* Retro DOS / Linux Terminal Boot Prompt to satisfy Audio Autoplay */
          <div
            id="boot-prompt-screen"
            onClick={handleStartDemo}
            className="w-full aspect-[4/3] max-h-[70vh] bg-zinc-950 border-2 border-zinc-800 rounded-xl flex flex-col justify-between p-6 sm:p-10 cursor-pointer shadow-2xl hover:border-emerald-600 transition group relative overflow-hidden"
          >
            <div className="space-y-2 text-zinc-300 text-xs sm:text-sm font-mono leading-relaxed">
              <p className="text-zinc-500">Linux 2.0.30 (i486-pc-linux-gnu) - Mon Aug 4 1997</p>
              <p className="text-emerald-400">aalib login: <span className="text-white">guest</span></p>
              <p className="text-emerald-400">Password: <span className="text-zinc-600">••••••••</span></p>
              <p className="pt-2 text-zinc-400">guest@aalib:~$ cd demo/bb</p>
              <p className="text-zinc-400">guest@aalib:~/demo/bb$ ./bb -extended -reverse</p>
              <p className="pt-2 text-zinc-300">
                Initializing AAlib 1.2 [SVGA / Text Mode]...
              </p>
              <p className="text-zinc-400">
                Loading Scream Tracker 3 audio engine (bb.s3m)...
              </p>
              {assetsLoaded ? (
                <p className="text-emerald-400 font-semibold">
                  Decompressed assets verified [Zebra + 16 Author Portraits OK]
                </p>
              ) : (
                <p className="text-amber-400">
                  Decompressing image assets: {loadProgress}%...
                </p>
              )}
            </div>

            {/* Pulsing Launch Button */}
            <div className="flex flex-col items-center justify-center py-6">
              <button
                id="launch-demo-btn"
                className="flex items-center gap-3 px-6 py-3.5 rounded-xl bg-emerald-600 group-hover:bg-emerald-500 text-white font-bold text-sm sm:text-base tracking-widest uppercase shadow-lg shadow-emerald-950/50 transition transform group-hover:scale-105"
              >
                <Play size={18} fill="currentColor" />
                <span>START BB DEMO</span>
              </button>
              <p className="text-[11px] text-zinc-500 pt-3 tracking-wider">
                Click anywhere or press any key to start with audio
              </p>
            </div>

            <div className="text-[10px] text-zinc-600 flex justify-between">
              <span>(C) 1997 AA-Group (Jan Hubička, Kamil Toman, Mojmír Svoboda, Filip Kupsa)</span>
              <span>Web Port 2026</span>
            </div>
          </div>
        ) : (
          /* Active Terminal Output */
          <div className="w-full aspect-[4/3] max-h-[72vh] rounded-xl overflow-hidden shadow-2xl border-4 border-zinc-900 bg-black flex items-center justify-center relative">
            <TerminalDisplay
              ref={terminalRef}
              ctx={aaContext}
              theme={theme}
              crtEffect={crtEffect}
              scanlines={scanlines}
              bloom={bloom}
              className="w-full h-full"
            />
          </div>
        )}
      </div>

      {/* Control Panel Toolbar */}
      <footer className="w-full max-w-6xl mt-2 sm:mt-4">
        <ControlPanel
          isPlaying={isPlaying}
          onTogglePlay={handleTogglePlay}
          onRestart={handleRestart}
          onPrevScene={handlePrevScene}
          onNextScene={handleNextScene}
          currentSceneId={currentSceneId}
          onSelectScene={jumpToScene}
          theme={theme}
          onChangeTheme={setTheme}
          crtEffect={crtEffect}
          onToggleCrt={() => setCrtEffect(!crtEffect)}
          scanlines={scanlines}
          onToggleScanlines={() => setScanlines(!scanlines)}
          bloom={bloom}
          onToggleBloom={() => setBloom(!bloom)}
          volume={volume}
          onChangeVolume={(v) => {
            setVolume(v);
            playerRef.current?.setVolume(v);
          }}
          isMuted={isMuted}
          onToggleMute={() => {
            if (playerRef.current) {
              const m = playerRef.current.toggleMute();
              setIsMuted(m);
            }
          }}
          currentSongIdx={currentSongIdx}
          onSelectSong={playTrack}
          channelVUs={channelVUs}
          resolution={resolution}
          onChangeResolution={setResolution}
          ditherMode={ditherMode}
          onChangeDitherMode={setDitherMode}
          bright={bright}
          onChangeBright={setBright}
          contrast={contrast}
          onChangeContrast={setContrast}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          onOpenAbout={() => setIsAboutOpen(true)}
        />
      </footer>

      {/* About Modal */}
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
    </main>
  );
}
