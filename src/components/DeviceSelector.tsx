import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, RefreshCw, Smartphone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNativePlatform } from '@/hooks/useNativePlatform';

interface DeviceSelectorProps {
  selectedDeviceId: string | null;
  onDeviceChange: (deviceId: string | null) => void;
}

export function DeviceSelector({ selectedDeviceId, onDeviceChange }: DeviceSelectorProps) {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [permissionState, setPermissionState] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const { toast } = useToast();
  const { isNative, platform } = useNativePlatform();

  const requestNativePermissions = async () => {
    setIsLoading(true);
    try {
      // Import Capacitor dynamically to avoid issues on web
      const { Capacitor } = await import('@capacitor/core');
      
      if (Capacitor.isNativePlatform()) {
        console.log('Requesting native microphone permissions...');
        
        // Check current permission status
        const { Device } = await import('@capacitor/device');
        
        // Try to access microphone to trigger permission dialog
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach(track => track.stop()); // Clean up
          setPermissionState('granted');
          
          // Set a default device for native (we can't enumerate on iOS)
          onDeviceChange('default-native-microphone');
          
          toast({
            title: "Microphone Access Granted",
            description: "You can now record audio in your projects.",
          });
        } catch (error) {
          console.error('Microphone permission denied:', error);
          setPermissionState('denied');
          
          toast({
            title: "Microphone Permission Required",
            description: "Please enable microphone access in Settings > Privacy & Security > Microphone > riff-layer-muse",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error('Error requesting native permissions:', error);
      setPermissionState('denied');
    } finally {
      setIsLoading(false);
    }
  };

  const enumerateDevices = async () => {
    // On native platforms, handle permissions differently
    if (isNative) {
      await requestNativePermissions();
      return;
    }

    setIsLoading(true);
    try {
      // Web platform device enumeration
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('MediaDevices API not supported');
      }

      console.log('Requesting microphone permissions...');
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      if (!navigator.mediaDevices.enumerateDevices) {
        throw new Error('Device enumeration not supported');
      }

      console.log('Enumerating devices...');
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = allDevices.filter(device => device.kind === 'audioinput');
      
      console.log(`Found ${audioInputs.length} audio input devices`);
      setDevices(audioInputs);
      setPermissionState('granted');
      
      if (!selectedDeviceId && audioInputs.length > 0) {
        onDeviceChange(audioInputs[0].deviceId);
      }
    } catch (error) {
      console.error('Error enumerating devices:', error);
      setPermissionState('denied');
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
    
    // Listen for device changes - with compatibility check
    const handleDeviceChange = () => {
      enumerateDevices();
    };
    
    let cleanup: (() => void) | null = null;
    
    if (navigator.mediaDevices) {
      if (navigator.mediaDevices.addEventListener) {
        // Modern browsers
        console.log('Using addEventListener for device changes');
        navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
        cleanup = () => {
          navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
        };
      } else if ('ondevicechange' in navigator.mediaDevices) {
        // iOS Safari fallback
        console.log('Using ondevicechange for device changes');
        navigator.mediaDevices.ondevicechange = handleDeviceChange;
        cleanup = () => {
          navigator.mediaDevices.ondevicechange = null;
        };
      }
    }
    
    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, []);

  const selectedDevice = devices.find(device => device.deviceId === selectedDeviceId);

  // Render native iOS interface
  if (isNative) {
    return (
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Smartphone className="w-4 h-4" />
            Device Microphone
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Button
              variant={permissionState === 'granted' ? 'default' : 'outline'}
              size="sm"
              onClick={enumerateDevices}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  Checking permissions...
                </>
              ) : permissionState === 'granted' ? (
                <>
                  <Mic className="w-4 h-4 mr-2" />
                  Microphone Ready
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4 mr-2" />
                  Allow Microphone Access
                </>
              )}
            </Button>
          </div>
          
          {permissionState === 'granted' && (
            <p className="text-xs text-muted-foreground">
              Using: Built-in microphone
            </p>
          )}
          
          {permissionState === 'denied' && (
            <div className="space-y-2">
              <p className="text-xs text-destructive">
                Microphone access denied. To enable recording:
              </p>
              <ol className="text-xs text-muted-foreground space-y-1 ml-4 list-decimal">
                <li>Go to Settings → Privacy & Security → Microphone</li>
                <li>Find "riff-layer-muse" and toggle it on</li>
                <li>Return to the app and tap "Allow Microphone Access"</li>
              </ol>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Render web interface
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
            disabled={isLoading || devices.length === 0}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder={
                isLoading 
                  ? "Loading devices..." 
                  : devices.length === 0 
                    ? "No microphones found" 
                    : "Select microphone"
              } />
            </SelectTrigger>
            <SelectContent>
              {devices.map((device) => (
                <SelectItem key={device.deviceId} value={device.deviceId}>
                  {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                </SelectItem>
              ))}
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
        
        {devices.length === 0 && !isLoading && permissionState !== 'denied' && (
          <p className="text-xs text-destructive">
            No microphones detected. Please connect a microphone and refresh.
          </p>
        )}
        
        {permissionState === 'denied' && (
          <p className="text-xs text-destructive">
            Microphone access denied. Please allow microphone access and refresh.
          </p>
        )}
      </CardContent>
    </Card>
  );
}