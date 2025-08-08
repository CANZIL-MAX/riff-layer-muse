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

  async playTracks(tracks: AudioTrack[], currentTimelinePosition: number = 0): Promise<void> {
    await this.initialize();
    
    console.log('PlayTracks called with:', {
      trackCount: tracks.length,
      currentTimelinePosition,
      trackDetails: tracks.map(t => ({
        id: t.id,
        name: t.name,
        startTime: t.startTime,
        trimStart: t.trimStart,
        trimEnd: t.trimEnd,
        duration: t.duration,
        isMuted: t.isMuted,
        hasAudioData: !!t.audioData
      }))
    });
    
    if (this.isPlaying) {
      this.stop();
    }

    const validTracks = tracks.filter(track => track.audioData && !track.isMuted);
    console.log('Valid tracks after filtering:', validTracks.length);
    
    if (validTracks.length === 0) {
      console.log('No valid tracks to play');
      return;
    }

    this.isPlaying = true;
    this.startTime = this.audioContext!.currentTime;

    // Schedule tracks based on their timeline positions
    for (const track of validTracks) {
      console.log(`Attempting to play track: ${track.name}`);
      await this.playTrackWithTiming(track, currentTimelinePosition);
    }

    console.log('Started time update');
    this.startTimeUpdate();
  }

  async playTrackWithTiming(track: AudioTrack, currentTimelinePosition: number): Promise<void> {
    if (!this.audioContext || !track.audioData) return;

    console.log(`Playing track ${track.name}:`, {
      trackStartTime: track.startTime,
      currentTimelinePosition,
      trimStart: track.trimStart,
      trimEnd: track.trimEnd,
      duration: track.duration
    });

    try {
      const audioBuffer = await this.base64ToAudioBuffer(track.audioData);
      
      // Calculate timing based on track position and current timeline position
      const trackStartTime = track.startTime || 0;
      const trimStart = track.trimStart || 0;
      const trimEnd = track.trimEnd || track.duration;
      
      // Check if the track should be playing at the current timeline position
      // SIMPLER LOGIC: If we're playing from start (currentTimelinePosition = 0), play all tracks from their positions
      if (currentTimelinePosition === 0) {
        console.log(`Track ${track.name} PLAYING from start - no time filtering`);
      } else if (currentTimelinePosition < trackStartTime || currentTimelinePosition >= trackStartTime + (trimEnd - trimStart)) {
        // Track shouldn't be playing at this timeline position
        console.log(`Track ${track.name} SKIPPED - outside time range`, {
          currentTimelinePosition,
          trackStartTime,
          trackEndTime: trackStartTime + (trimEnd - trimStart),
          reason: currentTimelinePosition < trackStartTime ? 'before start' : 'after end'
        });
        return;
      } else {
        console.log(`Track ${track.name} SHOULD PLAY - in time range`);
      }
      
      // Calculate how far into the track we should start playing
      let offsetIntoTrack = 0;
      let actualAudioOffset = trimStart;
      
      if (currentTimelinePosition > trackStartTime) {
        offsetIntoTrack = currentTimelinePosition - trackStartTime;
        actualAudioOffset = trimStart + offsetIntoTrack;
      }
      
      console.log(`Offset calculations:`, {
        trackStartTime,
        currentTimelinePosition,
        offsetIntoTrack,
        actualAudioOffset,
        trimStart,
        trimEnd
      });
      
      // Only play if there's audio left to play
      if (actualAudioOffset >= trimEnd) {
        console.log(`Track ${track.name} - no audio left to play`, { actualAudioOffset, trimEnd });
        return;
      }
      
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;

      const trackGain = this.audioContext.createGain();
      trackGain.gain.value = track.volume || 1;

      source.connect(trackGain);
      trackGain.connect(this.masterGainNode!);

      // Start playing from the calculated offset
      const duration = trimEnd - actualAudioOffset;
      console.log(`STARTING AUDIO for track ${track.name}:`, { 
        actualAudioOffset, 
        duration, 
        trimStart, 
        trimEnd,
        audioBufferDuration: audioBuffer.duration
      });
      source.start(0, actualAudioOffset, duration);
      this.playingSources.set(track.id, source);
      console.log(`Track ${track.name} added to playing sources. Total playing: ${this.playingSources.size}`);

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

  async playTrack(track: AudioTrack, offset: number = 0): Promise<void> {
    // Legacy method for backward compatibility
    return this.playTrackWithTiming(track, offset);
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