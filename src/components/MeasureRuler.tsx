interface MeasureRulerProps {
  timelineWidth: number;
  totalDuration: number;
  timeSignature?: { numerator: number; denominator: number };
  bpm?: number;
  onTimeSelect?: (time: number) => void;
  showBeatLines?: boolean;
}

export function MeasureRuler({ 
  timelineWidth, 
  totalDuration, 
  timeSignature = { numerator: 4, denominator: 4 },
  bpm = 120,
  onTimeSelect,
  showBeatLines = true
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

  const handleClick = (event: React.MouseEvent) => {
    if (!onTimeSelect) return;
    
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const time = (x / timelineWidth) * totalDuration;
    
    onTimeSelect(Math.max(0, Math.min(time, totalDuration)));
  };

  const handleTouchStart = (event: React.TouchEvent) => {
    if (!onTimeSelect) return;
    
    const rect = event.currentTarget.getBoundingClientRect();
    const touch = event.touches[0];
    const x = touch.clientX - rect.left;
    const time = (x / timelineWidth) * totalDuration;
    
    onTimeSelect(Math.max(0, Math.min(time, totalDuration)));
  };

  return (
    <div 
      className="relative h-8 bg-timeline border-b border-border cursor-pointer" 
      onClick={handleClick}
      onTouchStart={handleTouchStart}
    >
      {measures.map(({ measure, position }) => (
        <div
          key={measure}
          className="absolute top-0 h-full flex flex-col items-center justify-center pointer-events-none"
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
      {showBeatLines && measures.map(({ measure, position, time }) => {
        const beatLines = [];
        for (let beat = 1; beat < timeSignature.numerator; beat++) {
          const beatTime = time + (beat * beatDuration);
          const beatPosition = (beatTime / totalDuration) * timelineWidth;
          
          if (beatPosition <= timelineWidth) {
            beatLines.push(
              <div
                key={`${measure}-${beat}`}
                className="absolute top-0 w-px h-full bg-border/30 pointer-events-none"
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