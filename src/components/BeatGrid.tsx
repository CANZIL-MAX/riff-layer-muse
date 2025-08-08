import { MetronomeEngine } from '@/services/MetronomeService';

interface BeatGridProps {
  timelineWidth: number;
  totalDuration: number;
  bpm: number;
  timeToPixels: (time: number, width: number) => number;
  showGrid?: boolean;
  subdivision?: number; // 1 = quarter notes, 2 = eighth notes, 4 = sixteenth notes
}

export function BeatGrid({
  timelineWidth,
  totalDuration,
  bpm,
  timeToPixels,
  showGrid = true,
  subdivision = 4,
}: BeatGridProps) {
  if (!showGrid) return null;

  const beatDuration = 60 / bpm;
  const subdivisionDuration = beatDuration / subdivision;
  const gridLines: { position: number; isBeat: boolean; isMeasure: boolean }[] = [];

  let time = 0;
  let beatCount = 0;
  let measureCount = 0;

  while (time <= totalDuration) {
    const position = timeToPixels(time, timelineWidth);
    const isBeat = beatCount % subdivision === 0;
    const isMeasure = isBeat && beatCount % (4 * subdivision) === 0;

    gridLines.push({
      position,
      isBeat,
      isMeasure,
    });

    time += subdivisionDuration;
    beatCount++;
    
    if (isMeasure) {
      measureCount++;
    }
  }

  return (
    <div className="absolute inset-0 pointer-events-none">
      {gridLines.map((line, index) => (
        <div
          key={index}
          className={`absolute top-0 bottom-0 ${
            line.isMeasure
              ? 'border-l-2 border-accent/60'
              : line.isBeat
              ? 'border-l border-accent/40'
              : 'border-l border-accent/20'
          }`}
          style={{ left: `${line.position}px` }}
        />
      ))}
    </div>
  );
}