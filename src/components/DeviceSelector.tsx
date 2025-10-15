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
  const [hasPermission, setHasPermission] = useState(false);
  const { toast } = useToast();

  const requestMicrophonePermission = async () => {
    try {
      console.log('🎧 [NATIVE] Requesting microphone permission...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      console.log('✅ [NATIVE] Microphone permission granted');
      setHasPermission(true);
      return true;
    } catch (error) {
      console.error('❌ [NATIVE] Microphone permission denied:', error);
      toast({
        title: "Microphone Permission Required",
        description: "Please enable microphone access in iOS Settings",
        variant: "destructive",
      });
      return false;
    }
  };

  const fetchNativeDevices = async () => {
    if (!hasPermission) return;
    
    setIsLoading(true);
    try {
      console.log('🎧 [NATIVE] Fetching available audio input devices...');
      const result = await AudioInput.getAvailableInputs();
      console.log('🎧 [NATIVE] Available devices:', result.devices?.length || 0);
      
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
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    console.log('🔄 [NATIVE] Refresh button clicked');
    
    // Check if we still have permission, re-request if needed
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      
      if (!hasPermission) {
        console.log('✅ [NATIVE] Microphone permission re-granted');
        setHasPermission(true);
      }
      
      await fetchNativeDevices();
      
      toast({
        title: "Devices Refreshed",
        description: "Audio device list updated successfully",
      });
    } catch (error) {
      console.error('❌ [NATIVE] Permission denied on refresh:', error);
      setHasPermission(false);
      toast({
        title: "Permission Required",
        description: "Microphone access is required to refresh devices",
        variant: "destructive",
      });
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
    const initializeAudio = async () => {
      console.log('🎧 [NATIVE] Initializing audio...');
      const granted = await requestMicrophonePermission();
      if (granted) {
        await fetchNativeDevices();
      }
    };
    
    initializeAudio();
    
    const listener = AudioInput.addListener('audioRouteChanged', async (event) => {
      console.log('🎧 Audio route changed:', event.reason);
      // Silently refresh device list when routes change
      if (hasPermission) {
        const result = await AudioInput.getAvailableInputs();
        setNativeDevices(result.devices);
      }
    });
    
    return () => {
      listener.then(() => AudioInput.removeAllListeners());
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
            onClick={handleRefresh}
            disabled={isLoading}
            variant="outline"
            size="sm"
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
