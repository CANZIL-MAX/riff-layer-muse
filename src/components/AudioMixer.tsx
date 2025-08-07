import { AudioTrack } from '@/services/ProjectManager';

export class AudioMixerService {
  private audioContext: AudioContext | null = null;
  private playingSources: Map<string, AudioBufferSourceNode> = new Map();
  private masterGainNode: GainNode | null = null;

  async initializeAudioContext(): Promise<AudioContext> {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGainNode = this.audioContext.createGain();
      this.masterGainNode.connect(this.audioContext.destination);
    }
    
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    
    return this.audioContext;
  }

  async playTrack(track: AudioTrack, startTime: number = 0): Promise<void> {
    if (!track.audioData || track.isMuted) return;

    const audioContext = await this.initializeAudioContext();
    
    try {
      // Stop existing playback of this track
      this.stopTrack(track.id);

      // Convert base64 to AudioBuffer
      const audioBuffer = await this.base64ToAudioBuffer(track.audioData, audioContext);
      
      // Create source node
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      
      // Create gain node for this track
      const trackGain = audioContext.createGain();
      trackGain.gain.value = track.volume || 1;
      
      // Connect: source -> trackGain -> masterGain -> destination
      source.connect(trackGain);
      trackGain.connect(this.masterGainNode!);
      
      // Start playback
      source.start(0, startTime);
      
      // Store reference
      this.playingSources.set(track.id, source);
      
      // Clean up when finished
      source.onended = () => {
        this.playingSources.delete(track.id);
      };
      
    } catch (error) {
      console.error(`Failed to play track ${track.name}:`, error);
    }
  }

  stopTrack(trackId: string): void {
    const source = this.playingSources.get(trackId);
    if (source) {
      try {
        source.stop();
      } catch (error) {
        // Source might already be stopped
      }
      this.playingSources.delete(trackId);
    }
  }

  stopAllTracks(): void {
    for (const [trackId] of this.playingSources) {
      this.stopTrack(trackId);
    }
  }

  async playMultipleTracks(tracks: AudioTrack[], startTime: number = 0): Promise<void> {
    const playPromises = tracks
      .filter(track => !track.isMuted && track.audioData)
      .map(track => this.playTrack(track, startTime));
    
    await Promise.all(playPromises);
  }

  setMasterVolume(volume: number): void {
    if (this.masterGainNode) {
      this.masterGainNode.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  async base64ToAudioBuffer(base64Data: string, audioContext: AudioContext): Promise<AudioBuffer> {
    try {
      // Remove data URL prefix if present
      const cleanBase64 = base64Data.replace(/^data:audio\/[^;]+;base64,/, '');
      
      // Convert base64 to ArrayBuffer
      const binaryString = atob(cleanBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Decode audio data
      return await audioContext.decodeAudioData(bytes.buffer);
    } catch (error) {
      console.error('Failed to decode audio data:', error);
      throw error;
    }
  }

  async mixTracks(tracks: AudioTrack[]): Promise<AudioBuffer> {
    const audioContext = await this.initializeAudioContext();
    
    if (tracks.length === 0) {
      throw new Error('No tracks to mix');
    }

    // Find the longest track duration
    let maxDuration = 0;
    const audioBuffers: AudioBuffer[] = [];
    
    for (const track of tracks) {
      if (!track.isMuted && track.audioData) {
        try {
          // Convert base64 back to ArrayBuffer
          const binaryString = atob(track.audioData);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          
          const audioBuffer = await audioContext.decodeAudioData(bytes.buffer);
          audioBuffers.push(audioBuffer);
          maxDuration = Math.max(maxDuration, audioBuffer.duration);
        } catch (error) {
          console.warn(`Failed to decode audio for track ${track.name}:`, error);
        }
      }
    }

    if (audioBuffers.length === 0) {
      throw new Error('No valid audio tracks to mix');
    }

    // Create output buffer
    const sampleRate = audioContext.sampleRate;
    const frameCount = Math.ceil(maxDuration * sampleRate);
    const numberOfChannels = 2; // Stereo output
    
    const outputBuffer = audioContext.createBuffer(numberOfChannels, frameCount, sampleRate);
    
    // Mix all tracks
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const outputData = outputBuffer.getChannelData(channel);
      
      for (let i = 0; i < audioBuffers.length; i++) {
        const track = tracks.filter(t => !t.isMuted)[i];
        const buffer = audioBuffers[i];
        
        if (!track || !buffer) continue;
        
        const sourceChannel = Math.min(channel, buffer.numberOfChannels - 1);
        const sourceData = buffer.getChannelData(sourceChannel);
        const volume = track.volume || 1;
        
        for (let sample = 0; sample < Math.min(outputData.length, sourceData.length); sample++) {
          outputData[sample] += sourceData[sample] * volume;
        }
      }
      
      // Normalize to prevent clipping
      let maxValue = 0;
      for (let sample = 0; sample < outputData.length; sample++) {
        maxValue = Math.max(maxValue, Math.abs(outputData[sample]));
      }
      
      if (maxValue > 1) {
        for (let sample = 0; sample < outputData.length; sample++) {
          outputData[sample] /= maxValue;
        }
      }
    }
    
    return outputBuffer;
  }

  audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
    const length = buffer.length;
    const numberOfChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const bytesPerSample = 2;
    const byteRate = sampleRate * numberOfChannels * bytesPerSample;
    const blockAlign = numberOfChannels * bytesPerSample;
    const dataSize = length * numberOfChannels * bytesPerSample;
    const chunkSize = 36 + dataSize;

    const arrayBuffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(arrayBuffer);

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, chunkSize, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);

    // Audio data
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
        const value = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        view.setInt16(offset, value, true);
        offset += 2;
      }
    }

    return arrayBuffer;
  }

  arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}

export const AudioMixer = new AudioMixerService();