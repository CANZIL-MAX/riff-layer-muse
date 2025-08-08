import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AudioTrack } from '@/services/ProjectManager';
import { MetronomeEngine } from '@/services/MetronomeService';
import { Zap } from 'lucide-react';

interface QuantizeDialogProps {
  tracks: AudioTrack[];
  bpm: number;
  onQuantize: (trackIds: string[], subdivision: number) => void;
}

export function QuantizeDialog({ tracks, bpm, onQuantize }: QuantizeDialogProps) {
  const [selectedTracks, setSelectedTracks] = useState<string[]>([]);
  const [subdivision, setSubdivision] = useState('4');
  const [isOpen, setIsOpen] = useState(false);

  const handleTrackToggle = (trackId: string) => {
    setSelectedTracks(prev => 
      prev.includes(trackId) 
        ? prev.filter(id => id !== trackId)
        : [...prev, trackId]
    );
  };

  const handleSelectAll = () => {
    setSelectedTracks(tracks.map(t => t.id));
  };

  const handleSelectNone = () => {
    setSelectedTracks([]);
  };

  const handleQuantize = () => {
    if (selectedTracks.length > 0) {
      onQuantize(selectedTracks, parseInt(subdivision));
      setIsOpen(false);
      setSelectedTracks([]);
    }
  };

  const subdivisionOptions = [
    { value: '1', label: 'Whole Notes (1/1)', description: 'Snap to measures' },
    { value: '2', label: 'Half Notes (1/2)', description: 'Snap to half beats' },
    { value: '4', label: 'Quarter Notes (1/4)', description: 'Snap to beats' },
    { value: '8', label: 'Eighth Notes (1/8)', description: 'Snap to half beats' },
    { value: '16', label: 'Sixteenth Notes (1/16)', description: 'Snap to quarter beats' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Zap className="h-4 w-4" />
          Quantize
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Quantize Tracks</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Track Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">Select Tracks</Label>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                  All
                </Button>
                <Button variant="ghost" size="sm" onClick={handleSelectNone}>
                  None
                </Button>
              </div>
            </div>
            
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {tracks.map(track => (
                <div key={track.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`track-${track.id}`}
                    checked={selectedTracks.includes(track.id)}
                    onChange={() => handleTrackToggle(track.id)}
                    className="rounded"
                  />
                  <Label 
                    htmlFor={`track-${track.id}`} 
                    className="text-sm flex-1 cursor-pointer"
                  >
                    {track.name}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Subdivision Selection */}
          <div>
            <Label className="text-sm font-medium mb-2 block">
              Quantize To
            </Label>
            <RadioGroup value={subdivision} onValueChange={setSubdivision}>
              {subdivisionOptions.map(option => (
                <div key={option.value} className="flex items-center gap-2">
                  <RadioGroupItem value={option.value} id={option.value} />
                  <div className="flex-1">
                    <Label htmlFor={option.value} className="cursor-pointer">
                      {option.label}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {option.description}
                    </p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="text-xs text-muted-foreground">
            Current tempo: {bpm} BPM
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              className="flex-1"
              onClick={handleQuantize}
              disabled={selectedTracks.length === 0}
            >
              Quantize {selectedTracks.length > 0 && `(${selectedTracks.length})`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}