import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Card } from '@/components/ui/card';

interface ZoomControlsProps {
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onSetZoom: (level: number) => void;
  onFitToContent: () => void;
}

export function ZoomControls({
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onSetZoom,
  onFitToContent,
}: ZoomControlsProps) {
  const zoomPercentage = Math.round(zoomLevel * 100);

  return (
    <Card className="flex items-center gap-2 px-3 py-1.5">
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        onClick={onZoomOut}
        disabled={zoomLevel <= 0.25}
      >
        <ZoomOut className="h-3 w-3" />
      </Button>

      <div className="flex items-center gap-2 min-w-[120px]">
        <Slider
          value={[zoomLevel]}
          onValueChange={([value]) => onSetZoom(value)}
          min={0.25}
          max={8}
          step={0.25}
          className="flex-1"
        />
        <span className="text-xs font-mono text-muted-foreground min-w-[40px] text-center">
          {zoomPercentage}%
        </span>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        onClick={onZoomIn}
        disabled={zoomLevel >= 8}
      >
        <ZoomIn className="h-3 w-3" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        onClick={onFitToContent}
        title="Fit to content"
      >
        <Maximize2 className="h-3 w-3" />
      </Button>
    </Card>
  );
}