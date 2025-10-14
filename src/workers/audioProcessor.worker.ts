// Web Worker for audio processing
// Offloads heavy audio normalization to prevent UI blocking

interface NormalizeMessage {
  type: 'normalize';
  audioData: Float32Array[];
  sampleRate: number;
  numberOfChannels: number;
}

interface NormalizeResponse {
  type: 'normalized';
  audioData: Float32Array[];
  gain: number;
}

// Audio normalization to peak at -0.1dB
function normalizeAudioData(
  channels: Float32Array[],
  targetPeak: number = 0.977 // -0.1dB in linear
): { normalizedData: Float32Array[]; gain: number } {
  // Find peak across all channels
  let peak = 0;
  for (const channelData of channels) {
    for (let i = 0; i < channelData.length; i++) {
      const absValue = Math.abs(channelData[i]);
      if (absValue > peak) {
        peak = absValue;
      }
    }
  }

  // If silent, return original
  if (peak === 0) {
    return { normalizedData: channels, gain: 1 };
  }

  // Calculate gain factor
  const gainFactor = targetPeak / peak;

  // Apply gain to all channels
  const normalizedData = channels.map(channelData => {
    const outputData = new Float32Array(channelData.length);
    for (let i = 0; i < channelData.length; i++) {
      let sample = channelData[i] * gainFactor;
      
      // Hard limiter
      if (sample > 0.99) sample = 0.99;
      if (sample < -0.99) sample = -0.99;
      
      outputData[i] = sample;
    }
    return outputData;
  });

  return { normalizedData, gain: gainFactor };
}

// Handle messages from main thread
self.onmessage = (e: MessageEvent<NormalizeMessage>) => {
  if (e.data.type === 'normalize') {
    const { audioData, sampleRate, numberOfChannels } = e.data;
    
    const { normalizedData, gain } = normalizeAudioData(audioData);
    
    const response: NormalizeResponse = {
      type: 'normalized',
      audioData: normalizedData,
      gain,
    };
    
    // Send back to main thread with transferable objects
    const transferList = normalizedData.map(d => d.buffer);
    self.postMessage(response, transferList as any);
  }
};

export {};
