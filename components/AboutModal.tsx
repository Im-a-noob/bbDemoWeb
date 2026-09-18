'use client';

import React from 'react';
import { X, ExternalLink, Terminal } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-zinc-950 border border-zinc-700 rounded-xl p-6 shadow-2xl text-zinc-300 font-mono text-sm max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          title="Close"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 border-b border-zinc-800 pb-4 mb-4">
          <div className="p-2.5 rounded bg-emerald-950/80 border border-emerald-700 text-emerald-400">
            <Terminal size={24} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-wide">BB: THE PORTABLE DEMO (1997)</h2>
            <p className="text-xs text-zinc-400">AA-Group & AAlib Audiovisual Masterpiece Ported to the Web</p>
          </div>
        </div>

        <div className="space-y-4 text-xs leading-relaxed text-zinc-300">
          <p>
            <strong className="text-emerald-400">BB</strong> is a seminal ASCII-art demoscene production released on
            August 3rd, 1997 by the Czech demogroup <strong className="text-white">AA-Group</strong>. Designed as a
            showcase for the newly created <strong className="text-white">AAlib</strong> (ASCII Art library), it proved
            that high-framerate fluid graphics, 3D textured objects, real-time fire simulations, zooming fractals, and
            photo rendering could run in pure text mode!
          </p>

          <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-lg">
            <h3 className="font-bold text-white mb-2 text-xs uppercase tracking-wider text-emerald-400">
              The Creators (AA-Group):
            </h3>
            <ul className="space-y-1.5 list-disc list-inside text-zinc-300">
              <li>
                <strong className="text-white">Jan Hubička (HH):</strong> Created AAlib and the XaoS fractal engine.
                Later went on to become a principal GNU Compiler Collection (GCC) optimization architect.
              </li>
              <li>
                <strong className="text-white">Kamil Toman (KT):</strong> Audio sync routines and AAlib architecture.
              </li>
              <li>
                <strong className="text-white">Mojmír Svoboda (MS):</strong> 3D engine, shaded torus mathematics, and demo direction.
              </li>
              <li>
                <strong className="text-white">Filip Kupsa (FK):</strong> Composed the iconic original Scream Tracker 3 soundtracks:
                <em> BB</em>, <em>Icy</em>, and <em>Waiting for my Sandqueen</em>.
              </li>
            </ul>
          </div>

          <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-lg">
            <h3 className="font-bold text-white mb-2 text-xs uppercase tracking-wider text-emerald-400">
              How AAlib Works:
            </h3>
            <p className="text-zinc-400">
              Unlike simplistic ASCII converters that only check average brightness, AAlib divides each character cell into
              four 2x2 subpixel quadrants. It mathematically matches the brightness distribution of these 4 quadrants against
              all glyphs in the hardware font bitmap, capturing sharp diagonals, curves, and edges. Floyd-Steinberg error
              diffusion dithering is applied across scanlines to produce smooth grayscale tones.
            </p>
          </div>

          <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-lg">
            <h3 className="font-bold text-white mb-2 text-xs uppercase tracking-wider text-emerald-400">
              Keyboard Shortcuts:
            </h3>
            <div className="grid grid-cols-2 gap-2 text-zinc-400">
              <div><kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-white">Space</kbd> : Pause / Resume</div>
              <div><kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-white">F</kbd> : Fullscreen</div>
              <div><kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-white">1 / 2 / 3</kbd> : Change Song</div>
              <div><kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-white">Up / Down</kbd> : Doc Scroller</div>
              <div><kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-white">R</kbd> : Restart Demo</div>
              <div><kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-white">M</kbd> : Mute / Unmute</div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-zinc-800 text-zinc-500">
            <span>Original source: 1997 GNU GPL v2</span>
            <a
              href="https://github.com/stroucki/bb"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 transition"
            >
              <span>GitHub: stroucki/bb</span>
              <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
