import { Slider } from '@/components/ui/slider';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TimelineScrollbarProps {
  scrollPosition: number;
  maxScrollPosition: number;
  onScroll: (position: number) => void;
  visibleWidth: number;
  totalWidth: number;
}

export function TimelineScrollbar({
  scrollPosition,
  maxScrollPosition,
  onScroll,
  visibleWidth,
  totalWidth,
}: TimelineScrollbarProps) {
  const handlePrevious = () => {
    onScroll(Math.max(0, scrollPosition - visibleWidth * 0.5));
  };

  const handleNext = () => {
    onScroll(Math.min(maxScrollPosition, scrollPosition + visibleWidth * 0.5));
  };

  const scrollPercentage = maxScrollPosition > 0 
    ? (scrollPosition / maxScrollPosition) * 100 
    : 0;

  return (
    <div className="flex items-center gap-2 px-4 py-3 border-t border-border bg-timeline/50">
      <Button
        variant="outline"
        size="sm"
        onClick={handlePrevious}
        disabled={scrollPosition <= 0}
        className="h-8 w-8 p-0"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      
      <div className="flex-1 flex items-center gap-2">
        <span className="text-xs text-muted-foreground min-w-[3rem]">
          {Math.round(scrollPercentage)}%
        </span>
        <div 
          onTouchStart={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          className="flex-1"
        >
          <Slider
            value={[scrollPosition]}
            min={0}
            max={maxScrollPosition}
            step={1}
            onValueChange={([value]) => onScroll(value)}
            className="w-full"
          />
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={handleNext}
        disabled={scrollPosition >= maxScrollPosition}
        className="h-8 w-8 p-0"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
