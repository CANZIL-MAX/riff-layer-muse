import { useEffect, useRef } from 'react';

interface WaveformDisplayProps {
  audioBuffer: AudioBuffer | null;
  trimStart?: number;
  trimEnd?: number;
  currentTime?: number;
  isPlaying?: boolean;
  isMuted?: boolean;
  width: number;
  height: number;
  className?: string;
  zoomLevel?: number;
}

export function WaveformDisplay({ 
  audioBuffer, 
  trimStart = 0, 
  trimEnd, 
  currentTime = 0, 
  isPlaying = false, 
  isMuted = false,
  width, 
  height, 
  className = "",
  zoomLevel = 1 
}: WaveformDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !audioBuffer) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // High DPI support - scale canvas for crisp rendering
    const devicePixelRatio = window.devicePixelRatio || 1;
    const scaleFactor = devicePixelRatio * Math.max(1, zoomLevel * 0.5);
    
    canvas.width = width * scaleFactor;
    canvas.height = height * scaleFactor;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(scaleFactor, scaleFactor);

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Get audio data
    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    const duration = audioBuffer.duration;
    
    // Calculate effective trim boundaries
    const effectiveTrimEnd = trimEnd || duration;
    const displayDuration = effectiveTrimEnd - trimStart;
    
    if (displayDuration <= 0) return;

    // Calculate sampling strategy based on zoom level
    const samplesPerPixel = Math.max(1, Math.floor((displayDuration * sampleRate) / width / Math.max(1, zoomLevel)));
    
    // Ultra-high detail when zoomed in
    const detailMultiplier = Math.min(8, Math.max(1, zoomLevel * 2));
    const renderSamplesPerPixel = Math.max(1, Math.floor(samplesPerPixel / detailMultiplier));
    
    const startSample = Math.floor(trimStart * sampleRate);
    const endSample = Math.floor(effectiveTrimEnd * sampleRate);
    
    // Waveform styling
    const centerY = height / 2;
    const amplitude = height * 0.4;
    
    // Draw waveform with adaptive line width
    const waveformColor = isMuted ? 'hsl(var(--muted-foreground))' : 'hsl(var(--primary))';
    const waveformFillColor = isMuted ? 'hsla(var(--muted-foreground), 0.2)' : 'hsla(var(--primary), 0.3)';
    
    ctx.strokeStyle = waveformColor;
    ctx.fillStyle = waveformFillColor;
    ctx.lineWidth = Math.max(0.3, Math.min(1, 2 / zoomLevel));
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // High-quality waveform rendering
    ctx.beginPath();
    
    const pixelsToRender = Math.min(width, Math.ceil((endSample - startSample) / renderSamplesPerPixel));
    
    for (let x = 0; x < pixelsToRender; x++) {
      const sampleStart = startSample + Math.floor(x * renderSamplesPerPixel);
      const sampleEnd = Math.min(sampleStart + renderSamplesPerPixel, endSample, channelData.length);
      
      if (sampleStart >= channelData.length) break;
      
      // Calculate RMS and peak for better visualization
      let rmsSum = 0;
      let peak = 0;
      let sampleCount = 0;
      
      for (let i = sampleStart; i < sampleEnd; i++) {
        const sample = channelData[i] || 0;
        rmsSum += sample * sample;
        peak = Math.max(peak, Math.abs(sample));
        sampleCount++;
      }
      
      const rms = sampleCount > 0 ? Math.sqrt(rmsSum / sampleCount) : 0;
      
      // Use a combination of RMS and peak for more detailed visualization
      const combinedAmplitude = (rms * 0.7 + peak * 0.3) * amplitude;
      
      const y1 = centerY - combinedAmplitude;
      const y2 = centerY + combinedAmplitude;
      
      if (x === 0) {
        ctx.moveTo(x, y1);
      } else {
        ctx.lineTo(x, y1);
      }
    }
    
    // Complete the top part of the waveform
    for (let x = pixelsToRender - 1; x >= 0; x--) {
      const sampleStart = startSample + Math.floor(x * renderSamplesPerPixel);
      const sampleEnd = Math.min(sampleStart + renderSamplesPerPixel, endSample, channelData.length);
      
      if (sampleStart >= channelData.length) continue;
      
      let rmsSum = 0;
      let peak = 0;
      let sampleCount = 0;
      
      for (let i = sampleStart; i < sampleEnd; i++) {
        const sample = channelData[i] || 0;
        rmsSum += sample * sample;
        peak = Math.max(peak, Math.abs(sample));
        sampleCount++;
      }
      
      const rms = sampleCount > 0 ? Math.sqrt(rmsSum / sampleCount) : 0;
      const combinedAmplitude = (rms * 0.7 + peak * 0.3) * amplitude;
      const y2 = centerY + combinedAmplitude;
      
      ctx.lineTo(x, y2);
    }
    
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Draw center line
    ctx.strokeStyle = 'hsla(var(--muted-foreground), 0.2)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();

    // Draw playback progress indicator
    if (isPlaying && !isMuted && currentTime >= trimStart && currentTime <= effectiveTrimEnd) {
      const relativeTime = currentTime - trimStart;
      const progressX = (relativeTime / displayDuration) * width;
      
      // Playback line
      ctx.strokeStyle = 'hsl(var(--primary))';
      ctx.lineWidth = Math.max(1, 2 / zoomLevel);
      ctx.beginPath();
      ctx.moveTo(progressX, 0);
      ctx.lineTo(progressX, height);
      ctx.stroke();
      
      // Progress overlay
      ctx.fillStyle = 'hsla(var(--primary), 0.1)';
      ctx.fillRect(0, 0, progressX, height);
    }

  }, [audioBuffer, trimStart, trimEnd, currentTime, isPlaying, isMuted, width, height, zoomLevel]);

  return (
    <canvas
      ref={canvasRef}
      className={`block ${className}`}
      style={{ 
        width: `${width}px`, 
        height: `${height}px`,
        imageRendering: 'crisp-edges'
      }}
    />
  );
}