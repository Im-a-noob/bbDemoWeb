'use client';

/**
 * Authentic Scream Tracker 3 (S3M) WebAudio Player
 * Directly uses Screamtracker ESM engine with Web Audio ScriptProcessor.
 */
import { Screamtracker } from './screamtracker';

export interface SongInfo {
  title: string;
  channels: number;
  orders: number;
  patterns: number;
  currentOrder: number;
  currentRow: number;
  speed: number;
  bpm: number;
}

export class S3MPlayer {
  private audioCtx: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private scriptNode: ScriptProcessorNode | null = null;
  private dummySource: AudioBufferSourceNode | null = null;
  private isPlaying = false;
  private volume = 0.85;
  private isMuted = false;
  private stInstance: any = null;
  public channelVUs: Float32Array = new Float32Array(32);

  constructor() {
    // AudioContext will be initialized on first user click to satisfy browser autoplay policy
  }

  public async ensureContext(): Promise<AudioContext> {
    if (!this.audioCtx || this.audioCtx.state === 'closed') {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
      this.gainNode = this.audioCtx.createGain();
      this.gainNode.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.audioCtx.currentTime);
      this.gainNode.connect(this.audioCtx.destination);
    }
    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  public async loadAndPlay(url: string): Promise<boolean> {
    try {
      const ctx = await this.ensureContext();

      const resp = await fetch(url);
      if (!resp.ok) {
        console.error(`HTTP error ${resp.status} fetching ${url}`);
        return false;
      }
      const arrayBuffer = await resp.arrayBuffer();
      const u8 = new Uint8Array(arrayBuffer);

      this.stInstance = new (Screamtracker as any)();
      this.stInstance.samplerate = ctx.sampleRate;
      this.stInstance.repeat = true;
      const ok = this.stInstance.parse(u8);
      if (!ok) {
        console.error('Failed to parse S3M module', url);
        return false;
      }

      // Explicitly activate playback state in the engine
      this.stInstance.playing = true;
      this.stInstance.paused = false;
      this.isPlaying = true;

      this.setupWebAudioMixing(ctx);
      return true;
    } catch (err) {
      console.error('S3MPlayer loadAndPlay error:', err);
      return false;
    }
  }

  private setupWebAudioMixing(ctx: AudioContext): void {
    if (this.dummySource) {
      try {
        this.dummySource.stop();
        this.dummySource.disconnect();
      } catch (_) {}
      this.dummySource = null;
    }

    if (this.scriptNode) {
      this.scriptNode.disconnect();
      this.scriptNode = null;
    }

    const bufferLen = 2048;
    // Input channels MUST be 1 (passing 0 throws IndexSizeError in Chromium/WebKit)
    this.scriptNode = ctx.createScriptProcessor(bufferLen, 1, 2);

    // Keep onaudioprocess running reliably with a silent source
    const dummyBuffer = ctx.createBuffer(1, bufferLen, ctx.sampleRate);
    this.dummySource = ctx.createBufferSource();
    this.dummySource.buffer = dummyBuffer;
    this.dummySource.loop = true;
    this.dummySource.connect(this.scriptNode);
    this.dummySource.start();

    this.scriptNode.onaudioprocess = (e: AudioProcessingEvent) => {
      if (!this.isPlaying || !this.stInstance || !this.stInstance.playing) {
        e.outputBuffer.getChannelData(0).fill(0);
        e.outputBuffer.getChannelData(1).fill(0);
        return;
      }

      const outL = e.outputBuffer.getChannelData(0);
      const outR = e.outputBuffer.getChannelData(1);
      const bufs = [outL, outR];
      const buflen = outL.length;

      try {
        this.stInstance.mix(this.stInstance, bufs, buflen);

        // Update channel VU levels
        if (this.stInstance.chvu) {
          for (let c = 0; c < 32; c++) {
            this.channelVUs[c] = Math.min(1.0, this.stInstance.chvu[c] || 0);
          }
        }
      } catch (err) {
        console.error('Mix error', err);
      }
    };

    if (this.gainNode) {
      this.scriptNode.connect(this.gainNode);
    }
  }

  public play(): void {
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    this.isPlaying = true;
    if (this.stInstance) {
      this.stInstance.playing = true;
      this.stInstance.paused = false;
    }
  }

  public pause(): void {
    this.isPlaying = false;
    if (this.stInstance) {
      this.stInstance.playing = false;
      this.stInstance.paused = true;
    }
  }

  public togglePlay(): boolean {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
    return this.isPlaying;
  }

  public setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.gainNode && this.audioCtx && !this.isMuted) {
      this.gainNode.gain.setValueAtTime(this.volume, this.audioCtx.currentTime);
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.gainNode && this.audioCtx) {
      this.gainNode.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.audioCtx.currentTime);
    }
    return this.isMuted;
  }

  public getSongInfo(): SongInfo | null {
    if (!this.stInstance) return null;
    return {
      title: this.stInstance.title || 'BB',
      channels: this.stInstance.channels || 16,
      orders: this.stInstance.songlen || 0,
      patterns: this.stInstance.patNum || 0,
      currentOrder: this.stInstance.position || 0,
      currentRow: this.stInstance.row || 0,
      speed: this.stInstance.speed || 6,
      bpm: this.stInstance.bpm || 125,
    };
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public getVolume(): number {
    return this.volume;
  }

  public destroy(): void {
    this.pause();
    if (this.dummySource) {
      try {
        this.dummySource.stop();
        this.dummySource.disconnect();
      } catch (_) {}
      this.dummySource = null;
    }
    if (this.scriptNode) {
      this.scriptNode.disconnect();
      this.scriptNode = null;
    }
    if (this.audioCtx) {
      this.audioCtx.close();
      this.audioCtx = null;
    }
  }
}
