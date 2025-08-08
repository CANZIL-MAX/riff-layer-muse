export class MetronomeService {
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private isPlaying = false;
  private intervalId: number | null = null;
  private bpm = 120;
  private volume = 0.5;
  private beatCount = 0;
  private timeSignature = { numerator: 4, denominator: 4 };
  private onBeatCallback?: (beatNumber: number, isDownbeat: boolean) => void;

  async initialize(): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.audioContext.destination);
      this.setVolume(this.volume);
    }
    
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  setBpm(bpm: number): void {
    this.bpm = Math.max(60, Math.min(300, bpm)); // Clamp between 60-300 BPM
    if (this.isPlaying) {
      this.stop();
      this.start();
    }
  }

  getBpm(): number {
    return this.bpm;
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.gainNode) {
      this.gainNode.gain.setValueAtTime(this.volume, this.audioContext!.currentTime);
    }
  }

  getVolume(): number {
    return this.volume;
  }

  setTimeSignature(numerator: number, denominator: number): void {
    this.timeSignature = { numerator, denominator };
    this.beatCount = 0;
  }

  setOnBeatCallback(callback: (beatNumber: number, isDownbeat: boolean) => void): void {
    this.onBeatCallback = callback;
  }

  async start(): Promise<void> {
    if (this.isPlaying) return;
    
    await this.initialize();
    this.isPlaying = true;
    this.beatCount = 0;
    
    const beatInterval = (60 / this.bpm) * 1000; // Convert to milliseconds
    
    // Play first beat immediately
    this.playClick(true);
    this.onBeatCallback?.(1, true);
    this.beatCount = 1;
    
    this.intervalId = window.setInterval(() => {
      this.beatCount = (this.beatCount % this.timeSignature.numerator) + 1;
      const isDownbeat = this.beatCount === 1;
      this.playClick(isDownbeat);
      this.onBeatCallback?.(this.beatCount, isDownbeat);
    }, beatInterval);
  }

  stop(): void {
    this.isPlaying = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.beatCount = 0;
  }

  toggle(): void {
    if (this.isPlaying) {
      this.stop();
    } else {
      this.start();
    }
  }

  isRunning(): boolean {
    return this.isPlaying;
  }

  // Play count-in before recording
  async playCountIn(measures: number = 1): Promise<void> {
    return new Promise((resolve) => {
      const totalBeats = measures * this.timeSignature.numerator;
      let currentBeat = 0;
      
      const countInInterval = (60 / this.bpm) * 1000;
      
      const playCountBeat = () => {
        currentBeat++;
        const isDownbeat = (currentBeat - 1) % this.timeSignature.numerator === 0;
        this.playClick(isDownbeat);
        
        if (currentBeat >= totalBeats) {
          resolve();
        } else {
          setTimeout(playCountBeat, countInInterval);
        }
      };
      
      playCountBeat();
    });
  }

  private playClick(isDownbeat: boolean): void {
    if (!this.audioContext || !this.gainNode) return;

    const oscillator = this.audioContext.createOscillator();
    const envelope = this.audioContext.createGain();
    
    oscillator.connect(envelope);
    envelope.connect(this.gainNode);
    
    // Different frequencies for downbeat vs regular beat
    oscillator.frequency.setValueAtTime(
      isDownbeat ? 800 : 600, 
      this.audioContext.currentTime
    );
    
    // Create click envelope
    const now = this.audioContext.currentTime;
    envelope.gain.setValueAtTime(0, now);
    envelope.gain.linearRampToValueAtTime(0.3, now + 0.01);
    envelope.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    
    oscillator.start(now);
    oscillator.stop(now + 0.1);
  }

  // Utility methods for beat/time calculations
  beatsToSeconds(beats: number): number {
    return (beats / this.bpm) * 60;
  }

  secondsToBeats(seconds: number): number {
    return (seconds * this.bpm) / 60;
  }

  snapToNearestBeat(timeInSeconds: number, subdivision: number = 1): number {
    const beatDuration = 60 / this.bpm;
    const subdivisionDuration = beatDuration / subdivision;
    return Math.round(timeInSeconds / subdivisionDuration) * subdivisionDuration;
  }

  getNextBeatTime(currentTime: number): number {
    const beatDuration = 60 / this.bpm;
    return Math.ceil(currentTime / beatDuration) * beatDuration;
  }

  getBeatGridPoints(duration: number, subdivision: number = 4): number[] {
    const points: number[] = [];
    const beatDuration = 60 / this.bpm;
    const subdivisionDuration = beatDuration / subdivision;
    
    for (let time = 0; time <= duration; time += subdivisionDuration) {
      points.push(time);
    }
    
    return points;
  }
}

export const MetronomeEngine = new MetronomeService();