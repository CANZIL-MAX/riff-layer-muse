import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { MetronomeEngine } from '@/services/MetronomeService';
import { Clock, Play, Pause, Minus, Plus, Volume2 } from 'lucide-react';

interface MetronomeControlsProps {
  bpm: number;
  onBpmChange: (bpm: number) => void;
  isMetronomeEnabled: boolean;
  onMetronomeToggle: () => void;
  metronomeVolume: number;
  onMetronomeVolumeChange: (volume: number) => void;
}

export function MetronomeControls({
  bpm,
  onBpmChange,
  isMetronomeEnabled,
  onMetronomeToggle,
  metronomeVolume,
  onMetronomeVolumeChange,
}: MetronomeControlsProps) {
  const [currentBeat, setCurrentBeat] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [inputBpm, setInputBpm] = useState(bpm.toString());

  useEffect(() => {
    MetronomeEngine.setBpm(bpm);
    setInputBpm(bpm.toString());
  }, [bpm]);

  useEffect(() => {
    MetronomeEngine.setVolume(metronomeVolume);
  }, [metronomeVolume]);

  useEffect(() => {
    MetronomeEngine.setOnBeatCallback((beatNumber, isDownbeat) => {
      setCurrentBeat(beatNumber);
    });

    return () => {
      MetronomeEngine.stop();
    };
  }, []);

  const handleBpmInputChange = (value: string) => {
    setInputBpm(value);
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue >= 60 && numValue <= 300) {
      onBpmChange(numValue);
    }
  };

  const handleBpmAdjust = (delta: number) => {
    const newBpm = Math.max(60, Math.min(300, bpm + delta));
    onBpmChange(newBpm);
  };

  const toggleMetronome = async () => {
    if (isRunning) {
      MetronomeEngine.stop();
      setIsRunning(false);
      setCurrentBeat(0);
    } else {
      await MetronomeEngine.start();
      setIsRunning(true);
    }
  };

  // Tap tempo functionality
  const [tapTimes, setTapTimes] = useState<number[]>([]);
  
  const handleTapTempo = () => {
    const now = Date.now();
    const newTapTimes = [...tapTimes, now].slice(-4); // Keep last 4 taps
    setTapTimes(newTapTimes);
    
    if (newTapTimes.length >= 2) {
      const intervals = [];
      for (let i = 1; i < newTapTimes.length; i++) {
        intervals.push(newTapTimes[i] - newTapTimes[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b) / intervals.length;
      const calculatedBpm = Math.round(60000 / avgInterval);
      
      if (calculatedBpm >= 60 && calculatedBpm <= 300) {
        onBpmChange(calculatedBpm);
      }
    }
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Clock className="h-5 w-5" />
        <Label className="font-semibold">Metronome</Label>
      </div>

      {/* BPM Controls */}
      <div className="space-y-2">
        <Label className="text-sm">Tempo (BPM)</Label>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleBpmAdjust(-1)}
            className="h-8 w-8 p-0"
          >
            <Minus className="h-4 w-4" />
          </Button>
          
          <Input
            type="number"
            value={inputBpm}
            onChange={(e) => handleBpmInputChange(e.target.value)}
            className="w-20 text-center"
            min="60"
            max="300"
          />
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleBpmAdjust(1)}
            className="h-8 w-8 p-0"
          >
            <Plus className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleTapTempo}
            className="text-xs px-2"
          >
            TAP
          </Button>
        </div>
      </div>

      {/* Metronome Toggle */}
      <div className="flex items-center gap-2">
        <Button
          variant={isRunning ? "default" : "outline"}
          size="sm"
          onClick={toggleMetronome}
          className="flex items-center gap-2"
        >
          {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {isRunning ? 'Stop' : 'Start'}
        </Button>
        
        {/* Beat indicator */}
        {isRunning && (
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((beat) => (
              <div
                key={beat}
                className={`w-3 h-3 rounded-full transition-all duration-100 ${
                  beat === currentBeat
                    ? beat === 1 
                      ? 'bg-accent' 
                      : 'bg-primary'
                    : 'bg-muted'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Metronome Volume */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Volume2 className="h-4 w-4" />
          <Label className="text-sm">Metronome Volume</Label>
        </div>
        <Slider
          value={[metronomeVolume]}
          onValueChange={(value) => onMetronomeVolumeChange(value[0])}
          max={1}
          step={0.1}
          className="w-full"
        />
      </div>

      {/* Enable/Disable with playback */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="metronome-enabled"
          checked={isMetronomeEnabled}
          onChange={onMetronomeToggle}
          className="rounded"
        />
        <Label htmlFor="metronome-enabled" className="text-sm">
          Enable during playback & recording
        </Label>
      </div>
    </Card>
  );
}