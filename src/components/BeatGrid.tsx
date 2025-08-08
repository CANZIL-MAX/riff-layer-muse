interface BeatGridProps {
  timelineWidth: number;
  totalDuration: number;
  bpm: number;
  timeToPixels: (time: number, width: number) => number;
  showGrid?: boolean;
  subdivision?: number; // 1 = quarter notes, 2 = eighth notes, 4 = sixteenth notes
  zoomLevel?: number;
}

export function BeatGrid({
  timelineWidth,
  totalDuration,
  bpm,
  timeToPixels,
  showGrid = true,
  subdivision = 4,
  zoomLevel = 1,
}: BeatGridProps) {
  if (!showGrid) return null;

  const beatDuration = 60 / bpm;
  
  // Increase grid density based on zoom level
  let effectiveSubdivision = subdivision;
  if (zoomLevel >= 2) effectiveSubdivision = subdivision * 2;
  if (zoomLevel >= 4) effectiveSubdivision = subdivision * 4;
  if (zoomLevel >= 6) effectiveSubdivision = subdivision * 8;
  
  const subdivisionDuration = beatDuration / effectiveSubdivision;
  const gridLines: { position: number; isBeat: boolean; isMeasure: boolean; isSubdivision?: boolean }[] = [];

  let time = 0;
  let beatCount = 0;
  let measureCount = 0;

  while (time <= totalDuration) {
    const position = timeToPixels(time, timelineWidth);
    const isBeat = beatCount % effectiveSubdivision === 0;
    const isSubdivision = beatCount % (effectiveSubdivision / 4) === 0 && !isBeat;
    const isMeasure = isBeat && beatCount % (4 * effectiveSubdivision) === 0;

    gridLines.push({
      position,
      isBeat,
      isMeasure,
      isSubdivision,
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
              ? 'border-l-2 border-gray-400/40 z-20'
              : line.isBeat
              ? 'border-l border-gray-400/25 z-10'
              : line.isSubdivision && zoomLevel >= 2
              ? 'border-l border-gray-400/15 z-5'
              : 'border-l border-gray-400/8'
          }`}
          style={{ left: `${line.position}px` }}
        />
      ))}
    </div>
  );
}