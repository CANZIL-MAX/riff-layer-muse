import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, Smartphone, Headphones } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import AudioInput, { AudioDevice } from '@/plugins/AudioInputPlugin';

interface DeviceSelectorProps {
  selectedDeviceId: string | undefined;
  onDeviceChange: (deviceId: string) => void;
}

export function DeviceSelector({ selectedDeviceId, onDeviceChange }: DeviceSelectorProps) {
  const [nativeDevices, setNativeDevices] = useState<AudioDevice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchNativeDevices = async () => {
    setIsLoading(true);
    try {
      // Request microphone permission first - this triggers iOS prompt
      console.log('🎧 [NATIVE] Requesting microphone permission...');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        console.log('✅ [NATIVE] Microphone permission granted');
      } catch (permError) {
        console.error('❌ [NATIVE] Microphone permission denied:', permError);
        toast({
          title: "Microphone Permission Required",
          description: "Please enable microphone access in iOS Settings",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
      
      console.log('🎧 [NATIVE] Fetching available audio input devices...');
      const result = await AudioInput.getAvailableInputs();
      console.log('🎧 [NATIVE] Available devices:', result.devices?.length || 0);
      
      if (result.devices.length === 0) {
        toast({
          title: "No Audio Devices Found",
          description: "Please connect your audio device and tap refresh.",
          variant: "default",
        });
      }
      
      setNativeDevices(result.devices);
      
      // Auto-select current device
      const current = await AudioInput.getCurrentInput();
      if (current.device) {
        onDeviceChange(current.device.portUID);
      } else if (result.devices.length > 0) {
        onDeviceChange(result.devices[0].portUID);
      }
    } catch (error) {
      console.error('❌ Error fetching devices:', error);
      toast({
        title: "Error",
        description: "Could not fetch audio devices.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNativeDeviceChange = async (portUID: string) => {
    try {
      const result = await AudioInput.setPreferredInput({ portUID });
      onDeviceChange(portUID);
      
      toast({
        title: "Device Switched",
        description: result.message,
      });
    } catch (error) {
      console.error('Error switching device:', error);
      toast({
        title: "Error",
        description: "Could not switch audio device.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    console.log('🎧 [NATIVE] Initializing native audio device handling');
    fetchNativeDevices();
    
    const listener = AudioInput.addListener('audioRouteChanged', async (event) => {
      console.log('🎧 Audio route changed:', event.reason);
      await fetchNativeDevices();
      
      toast({
        title: "Audio Route Changed",
        description: event.reason === 'deviceConnected' 
          ? "New audio device connected" 
          : event.reason === 'deviceDisconnected'
          ? "Audio device disconnected"
          : "Audio routing changed",
      });
    });
    
    return () => {
      listener.then(l => AudioInput.removeAllListeners());
    };
  }, []);


  const selectedNativeDevice = nativeDevices.find(device => device.portUID === selectedDeviceId);
  const selectValue = selectedDeviceId || (nativeDevices.length > 0 ? nativeDevices[0].portUID : undefined);

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Smartphone className="w-4 h-4" />
          Audio Input Device
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          {nativeDevices.length > 0 ? (
            <Select 
              value={selectValue}
              onValueChange={handleNativeDeviceChange}
              disabled={isLoading}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select input device" />
              </SelectTrigger>
              <SelectContent>
                {nativeDevices.map((device) => (
                  <SelectItem key={device.portUID} value={device.portUID}>
                    {device.isBluetooth ? '🎧' : '📱'} {device.portName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="flex-1 px-3 py-2 text-sm text-muted-foreground border border-input rounded-md bg-muted">
              {isLoading ? 'Loading devices...' : 'No devices found'}
            </div>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={fetchNativeDevices}
            disabled={isLoading}
            className="px-3"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        
        {selectedNativeDevice && (
          <p className="text-xs text-muted-foreground flex items-center gap-2">
            {selectedNativeDevice.isBluetooth ? <Headphones className="w-3 h-3" /> : <Smartphone className="w-3 h-3" />}
            Using: {selectedNativeDevice.portName}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
