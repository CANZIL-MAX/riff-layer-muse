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
      // Handle different base64 formats
      let cleanBase64 = base64Data;
      if (base64Data.startsWith('data:')) {
        cleanBase64 = base64Data.replace(/^data:audio\/[^;]+;base64,/, '');
      }
      
      // Validate base64 format
      if (!/^[A-Za-z0-9+/]*={0,2}$/.test(cleanBase64)) {
        throw new Error('Invalid base64 format');
      }
      
      // Decode base64 to array buffer with error handling
      const binaryString = atob(cleanBase64);
      if (binaryString.length === 0) {
        throw new Error('Empty audio data after base64 decode');
      }
      
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Validate minimum audio data size
      if (bytes.length < 44) { // Minimum WAV header size
        throw new Error('Audio data too small to be valid');
      }
      
      // Decode audio data with validation
      const audioBuffer = await audioContext.decodeAudioData(bytes.buffer);
      
      if (!audioBuffer || audioBuffer.length === 0) {
        throw new Error('Failed to decode audio buffer');
      }
      
      return audioBuffer;
    } catch (error) {
      console.error('❌ Failed to convert base64 to audio buffer:', error);
      throw new Error(`Audio conversion failed: ${error.message}`);
    }
  }

  async mixTracks(tracks: AudioTrack[]): Promise<AudioBuffer> {
    console.log('🎵 Starting to mix tracks:', tracks.length);
    
    const audioContext = await this.initializeAudioContext();
    
    if (tracks.length === 0) {
      throw new Error('No tracks to mix');
    }

    // Get all audio buffers with enhanced validation
    const validTracks: { track: AudioTrack; buffer: AudioBuffer }[] = [];
    let maxDuration = 0;

    for (const track of tracks) {
      if (!track.audioData) {
        console.warn('⚠️ Skipping track without audio data:', track.name);
        continue;
      }

      // Validate track audio data
      if (typeof track.audioData !== 'string' || track.audioData.length < 10) {
        console.error('❌ Invalid audio data for track:', track.name);
        continue;
      }

      try {
        console.log(`🔄 Processing track: ${track.name}, data length: ${track.audioData.length}`);
        const buffer = await this.base64ToAudioBuffer(track.audioData, audioContext);
        
        // Validate buffer
        if (!buffer || buffer.length === 0 || buffer.numberOfChannels === 0) {
          console.error('❌ Invalid audio buffer for track:', track.name);
          continue;
        }
        
        // Calculate track end time including its position on timeline
        const trackStartTime = (track as any).startTime || 0;
        const trackEndTime = trackStartTime + buffer.duration;
        maxDuration = Math.max(maxDuration, trackEndTime);
        
        validTracks.push({ track, buffer });
        console.log(`✅ Loaded track: ${track.name}, duration: ${buffer.duration}s, position: ${trackStartTime}s`);
      } catch (error) {
        console.error(`❌ Failed to load audio data for track ${track.name}:`, error);
        continue; // Skip this track but continue with others
      }
    }

    if (validTracks.length === 0) {
      throw new Error('No valid audio tracks found to mix. Please check your audio data.');
    }

    // Ensure minimum duration
    maxDuration = Math.max(maxDuration, 1.0);

    // Create output buffer with validation
    const sampleRate = audioContext.sampleRate;
    const outputChannels = 2; // Stereo
    const outputLength = Math.ceil(maxDuration * sampleRate);
    
    if (outputLength <= 0 || outputLength > sampleRate * 3600) { // Max 1 hour
      throw new Error(`Invalid output length: ${outputLength} samples`);
    }
    
    const outputBuffer = audioContext.createBuffer(outputChannels, outputLength, sampleRate);

    // Mix all valid tracks
    for (let channel = 0; channel < outputChannels; channel++) {
      const outputData = outputBuffer.getChannelData(channel);
      
      for (const { track, buffer } of validTracks) {
        try {
          // Calculate start position in samples
          const startSample = Math.floor(((track as any).startTime || 0) * sampleRate);
          
          // Get input data (use mono for both channels if input is mono)
          const inputData = buffer.getChannelData(Math.min(channel, buffer.numberOfChannels - 1));
          
          // Mix the audio data with bounds checking
          for (let sample = 0; sample < inputData.length && (startSample + sample) < outputLength; sample++) {
            const outputIndex = startSample + sample;
            if (outputIndex >= 0 && outputIndex < outputData.length) {
              // Apply volume and mix with clipping protection
              const mixedValue = outputData[outputIndex] + (inputData[sample] * (track.volume || 1.0));
              outputData[outputIndex] = Math.max(-1, Math.min(1, mixedValue));
            }
          }
        } catch (error) {
          console.error(`❌ Error mixing track ${track.name}:`, error);
        }
      }
    }

    console.log(`✅ Successfully mixed ${validTracks.length} tracks into ${maxDuration.toFixed(2)}s output`);
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