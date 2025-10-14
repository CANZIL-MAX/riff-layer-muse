import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, RefreshCw, Smartphone, Headphones } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNativePlatform } from '@/hooks/useNativePlatform';
import AudioInput, { AudioDevice } from '@/plugins/AudioInputPlugin';

interface DeviceSelectorProps {
  selectedDeviceId: string | undefined;
  onDeviceChange: (deviceId: string) => void;
}

export function DeviceSelector({ selectedDeviceId, onDeviceChange }: DeviceSelectorProps) {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [nativeDevices, setNativeDevices] = useState<AudioDevice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { isNative } = useNativePlatform();

  const fetchNativeDevices = async () => {
    setIsLoading(true);
    try {
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

  const enumerateDevices = async () => {
    // On native platforms, just fetch devices
    if (isNative) {
      await fetchNativeDevices();
      return;
    }

    setIsLoading(true);
    try {
      if (!navigator.mediaDevices?.enumerateDevices) {
        console.warn('MediaDevices API not supported on web, skipping');
        return;
      }

      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = allDevices.filter(device => device.kind === 'audioinput');
      
      setDevices(audioInputs);
      
      if (!selectedDeviceId && audioInputs.length > 0) {
        onDeviceChange(audioInputs[0].deviceId);
      }
    } catch (error) {
      console.error('Error enumerating devices:', error);
      // Don't show error toast on native - it's expected to fail
      if (!isNative) {
        toast({
          title: "Error",
          description: "Could not access audio devices.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // NATIVE ONLY - use AudioInputPlugin
    if (isNative) {
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
    }
    
    // WEB ONLY - use MediaDevices API
    console.log('🌐 [WEB] Initializing web audio device handling');
    enumerateDevices();
    
    const handleDeviceChange = () => {
      console.log('🌐 [WEB] Device change detected');
      enumerateDevices();
    };
    
    if (navigator.mediaDevices?.addEventListener) {
      console.log('🌐 [WEB] Using addEventListener for device changes');
      navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
      
      return () => {
        navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
      };
    } else if (navigator.mediaDevices && 'ondevicechange' in navigator.mediaDevices) {
      console.log('🌐 [WEB] Using ondevicechange for device changes');
      navigator.mediaDevices.ondevicechange = handleDeviceChange;
      
      return () => {
        navigator.mediaDevices.ondevicechange = null;
      };
    }
  }, [isNative]);

  const selectedDevice = devices.find(device => device.deviceId === selectedDeviceId);
  const selectedNativeDevice = nativeDevices.find(device => device.portUID === selectedDeviceId);

  // Render native iOS interface
  if (isNative) {
    // Calculate the select value properly to avoid controlled/uncontrolled switching
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

  // Render web interface
  const webSelectValue = selectedDeviceId || (devices.length > 0 ? devices[0].deviceId : undefined);
  
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
          {devices.length > 0 ? (
            <Select 
              value={webSelectValue}
              onValueChange={onDeviceChange}
              disabled={isLoading}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select microphone" />
              </SelectTrigger>
              <SelectContent>
                {devices.map((device) => (
                  <SelectItem key={device.deviceId} value={device.deviceId}>
                    {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="flex-1 px-3 py-2 text-sm text-muted-foreground border border-input rounded-md bg-muted">
              {isLoading ? 'Loading devices...' : 'No microphones found'}
            </div>
          )}
          
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
          <p className="text-xs text-muted-foreground">
            No microphones detected. Please connect a microphone and refresh.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
