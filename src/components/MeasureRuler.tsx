interface MeasureRulerProps {
  timelineWidth: number;
  totalDuration: number;
  timeSignature?: { numerator: number; denominator: number };
  bpm?: number;
}

export function MeasureRuler({ 
  timelineWidth, 
  totalDuration, 
  timeSignature = { numerator: 4, denominator: 4 },
  bpm = 120 
}: MeasureRulerProps) {
  // Calculate measure duration based on time signature and BPM
  const beatDuration = 60 / bpm; // Duration of one beat in seconds
  const measureDuration = (beatDuration * timeSignature.numerator * 4) / timeSignature.denominator;
  
  const measures = [];
  const totalMeasures = Math.ceil(totalDuration / measureDuration);
  
  for (let i = 0; i <= totalMeasures; i++) {
    const time = i * measureDuration;
    const position = (time / totalDuration) * timelineWidth;
    
    if (position <= timelineWidth) {
      measures.push({
        measure: i + 1,
        position,
        time
      });
    }
  }

  return (
    <div className="relative h-8 bg-timeline border-b border-border">
      {measures.map(({ measure, position }) => (
        <div
          key={measure}
          className="absolute top-0 h-full flex flex-col items-center justify-center"
          style={{ left: `${position}px` }}
        >
          {/* Measure line */}
          <div className="w-px h-full bg-border" />
          
          {/* Measure number */}
          <div className="absolute top-1 text-xs font-mono text-muted-foreground bg-timeline px-1">
            {measure}
          </div>
        </div>
      ))}
      
      {/* Grid lines for beats */}
      {measures.map(({ measure, position, time }) => {
        const beatLines = [];
        for (let beat = 1; beat < timeSignature.numerator; beat++) {
          const beatTime = time + (beat * beatDuration);
          const beatPosition = (beatTime / totalDuration) * timelineWidth;
          
          if (beatPosition <= timelineWidth) {
            beatLines.push(
              <div
                key={`${measure}-${beat}`}
                className="absolute top-0 w-px h-full bg-border/30"
                style={{ left: `${beatPosition}px` }}
              />
            );
          }
        }
        return beatLines;
      })}
    </div>
  );
}