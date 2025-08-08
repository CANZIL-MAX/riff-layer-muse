import { AudioTrack } from './ProjectManager';

export class PlaybackEngineService {
  private audioContext: AudioContext | null = null;
  private isPlaying: boolean = false;
  private startTime: number = 0;
  private pauseTime: number = 0;
  private playingSources: Map<string, AudioBufferSourceNode> = new Map();
  private masterGainNode: GainNode | null = null;
  private onTimeUpdateCallback?: (currentTime: number) => void;
  private animationFrameId?: number;

  async initialize(): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGainNode = this.audioContext.createGain();
      this.masterGainNode.connect(this.audioContext.destination);
    }

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  async playTracks(tracks: AudioTrack[]): Promise<void> {
    await this.initialize();
    
    if (this.isPlaying) {
      this.stop();
    }

    const validTracks = tracks.filter(track => track.audioData && !track.isMuted);
    if (validTracks.length === 0) return;

    this.isPlaying = true;
    this.startTime = this.audioContext!.currentTime;

    for (const track of validTracks) {
      await this.playTrack(track, this.pauseTime);
    }

    this.startTimeUpdate();
  }

  async playTrack(track: AudioTrack, offset: number = 0): Promise<void> {
    if (!this.audioContext || !track.audioData) return;

    try {
      const audioBuffer = await this.base64ToAudioBuffer(track.audioData);
      
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;

      const trackGain = this.audioContext.createGain();
      trackGain.gain.value = track.volume || 1;

      source.connect(trackGain);
      trackGain.connect(this.masterGainNode!);

      source.start(0, offset);
      this.playingSources.set(track.id, source);

      source.onended = () => {
        this.playingSources.delete(track.id);
        if (this.playingSources.size === 0) {
          this.isPlaying = false;
          this.stopTimeUpdate();
        }
      };
    } catch (error) {
      console.error(`Failed to play track ${track.name}:`, error);
    }
  }

  pause(): void {
    if (!this.isPlaying) return;

    this.pauseTime = this.getCurrentTime();
    this.stop();
  }

  stop(): void {
    for (const source of this.playingSources.values()) {
      try {
        source.stop();
      } catch (error) {
        // Source might already be stopped
      }
    }
    
    this.playingSources.clear();
    this.isPlaying = false;
    this.pauseTime = 0;
    this.stopTimeUpdate();
  }

  seekTo(time: number): void {
    this.pauseTime = Math.max(0, time);
    if (this.isPlaying) {
      // Restart playback from new position
      this.stop();
      // Will be restarted by caller if needed
    }
  }

  getCurrentTime(): number {
    if (!this.audioContext || !this.isPlaying) return this.pauseTime;
    return this.pauseTime + (this.audioContext.currentTime - this.startTime);
  }

  setOnTimeUpdate(callback: (currentTime: number) => void): void {
    this.onTimeUpdateCallback = callback;
  }

  private startTimeUpdate(): void {
    const updateTime = () => {
      if (this.isPlaying && this.onTimeUpdateCallback) {
        this.onTimeUpdateCallback(this.getCurrentTime());
        this.animationFrameId = requestAnimationFrame(updateTime);
      }
    };
    updateTime();
  }

  private stopTimeUpdate(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = undefined;
    }
  }

  private async base64ToAudioBuffer(base64Data: string): Promise<AudioBuffer> {
    if (!this.audioContext) throw new Error('AudioContext not initialized');

    try {
      const cleanBase64 = base64Data.replace(/^data:audio\/[^;]+;base64,/, '');
      const binaryString = atob(cleanBase64);
      const bytes = new Uint8Array(binaryString.length);
      
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      return await this.audioContext.decodeAudioData(bytes.buffer);
    } catch (error) {
      console.error('Failed to decode audio data:', error);
      throw error;
    }
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  setMasterVolume(volume: number): void {
    if (this.masterGainNode) {
      this.masterGainNode.gain.value = Math.max(0, Math.min(1, volume));
    }
  }
}

export const PlaybackEngine = new PlaybackEngineService();