import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DeviceSelectorProps {
  selectedDeviceId: string | null;
  onDeviceChange: (deviceId: string | null) => void;
}

export function DeviceSelector({ selectedDeviceId, onDeviceChange }: DeviceSelectorProps) {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const enumerateDevices = async () => {
    setIsLoading(true);
    try {
      // Request permissions first
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Get all audio input devices
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = allDevices.filter(device => device.kind === 'audioinput');
      
      setDevices(audioInputs);
      
      // If no device is selected and we have devices, select the first one
      if (!selectedDeviceId && audioInputs.length > 0) {
        onDeviceChange(audioInputs[0].deviceId);
      }
    } catch (error) {
      console.error('Error enumerating devices:', error);
      toast({
        title: "Microphone Access",
        description: "Please allow microphone access to select audio input devices.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    enumerateDevices();
    
    // Listen for device changes
    const handleDeviceChange = () => {
      enumerateDevices();
    };
    
    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    };
  }, []);

  const selectedDevice = devices.find(device => device.deviceId === selectedDeviceId);

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Mic className="w-4 h-4" />
          Microphone Input
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <Select 
            value={selectedDeviceId || ''} 
            onValueChange={(value) => onDeviceChange(value || null)}
            disabled={isLoading}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder={isLoading ? "Loading devices..." : "Select microphone"} />
            </SelectTrigger>
            <SelectContent>
              {devices.map((device) => (
                <SelectItem key={device.deviceId} value={device.deviceId}>
                  {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                </SelectItem>
              ))}
              {devices.length === 0 && (
                <SelectItem value="" disabled>
                  No microphones found
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            size="sm"
            onClick={enumerateDevices}
            disabled={isLoading}
            className="px-3"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        
        {selectedDevice && (
          <p className="text-xs text-muted-foreground">
            Using: {selectedDevice.label || `Device ${selectedDevice.deviceId.slice(0, 8)}`}
          </p>
        )}
        
        {devices.length === 0 && !isLoading && (
          <p className="text-xs text-destructive">
            No microphones detected. Please connect a microphone and refresh.
          </p>
        )}
      </CardContent>
    </Card>
  );
}