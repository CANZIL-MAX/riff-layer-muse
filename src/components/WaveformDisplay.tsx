import { useEffect, useRef } from 'react';

interface WaveformDisplayProps {
  audioBuffer: AudioBuffer;
  isPlaying: boolean;
  isMuted: boolean;
  currentTime: number;
  height: number;
}

export function WaveformDisplay({ 
  audioBuffer, 
  isPlaying, 
  isMuted, 
  currentTime, 
  height 
}: WaveformDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !audioBuffer) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const data = audioBuffer.getChannelData(0);
    const step = Math.ceil(data.length / width);
    const amp = height / 2;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw waveform
    ctx.beginPath();
    ctx.strokeStyle = isMuted 
      ? 'hsl(var(--muted-foreground))' 
      : isPlaying 
        ? 'hsl(var(--waveform-active))' 
        : 'hsl(var(--waveform))';
    ctx.lineWidth = 1;

    for (let i = 0; i < width; i++) {
      let min = 1.0;
      let max = -1.0;
      
      for (let j = 0; j < step; j++) {
        const datum = data[(i * step) + j];
        if (datum < min) min = datum;
        if (datum > max) max = datum;
      }
      
      ctx.moveTo(i, (1 + min) * amp);
      ctx.lineTo(i, (1 + max) * amp);
    }
    
    ctx.stroke();

    // Draw progress indicator
    if (isPlaying && !isMuted) {
      const progressX = (currentTime / audioBuffer.duration) * width;
      ctx.fillStyle = 'hsl(var(--waveform-active))';
      ctx.fillRect(0, 0, progressX, height);
      ctx.globalCompositeOperation = 'multiply';
      
      // Reset composite operation
      ctx.globalCompositeOperation = 'source-over';
    }
  }, [audioBuffer, isPlaying, isMuted, currentTime, height]);

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={height}
      className="w-full h-full"
      style={{ height: `${height}px` }}
    />
  );
}