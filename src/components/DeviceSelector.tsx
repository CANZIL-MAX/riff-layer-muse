import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, RefreshCw, Smartphone, Headphones } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNativePlatform } from '@/hooks/useNativePlatform';
import AudioInput, { AudioDevice } from '@/plugins/AudioInputPlugin';

interface DeviceSelectorProps {
  selectedDeviceId: string | null;
  onDeviceChange: (deviceId: string | null) => void;
}

export function DeviceSelector({ selectedDeviceId, onDeviceChange }: DeviceSelectorProps) {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [nativeDevices, setNativeDevices] = useState<AudioDevice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [permissionState, setPermissionState] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const { toast } = useToast();
  const { isNative } = useNativePlatform();

  const fetchNativeDevices = async () => {
    setIsLoading(true);
    try {
      console.log('🎧 [NATIVE] Fetching available audio input devices...');
      console.log('🎧 [NATIVE] Platform check - isNative:', isNative);
      const result = await AudioInput.getAvailableInputs();
      console.log('🎧 [NATIVE] Raw result from plugin:', JSON.stringify(result, null, 2));
      console.log('🎧 [NATIVE] Available devices count:', result.devices?.length || 0);
      console.log('🎧 [NATIVE] Available devices:', result.devices);
      
      if (result.devices.length === 0) {
        console.warn('⚠️ No audio devices found. Make sure:');
        console.warn('  1. Microphone permission is granted');
        console.warn('  2. AirPods/Bluetooth device is connected');
        console.warn('  3. Device is selected in iOS Bluetooth settings');
        
        toast({
          title: "No Audio Devices Found",
          description: "Please connect your AirPods or other audio device and tap refresh.",
          variant: "default",
        });
      }
      
      setNativeDevices(result.devices);
      
      // Auto-select current device
      console.log('🎧 [NATIVE] Checking current input device...');
      const current = await AudioInput.getCurrentInput();
      console.log('🎧 [NATIVE] Current input result:', JSON.stringify(current, null, 2));
      if (current.device) {
        console.log('🎧 [NATIVE] Current device:', current.device);
        onDeviceChange(current.device.portUID);
        setPermissionState('granted');
      } else if (result.devices.length > 0) {
        // If we have devices but none is current, select the first one
        console.log('🎧 Auto-selecting first device:', result.devices[0]);
        onDeviceChange(result.devices[0].portUID);
        setPermissionState('granted');
      }
      
      if (result.devices.length > 0) {
        setPermissionState('granted');
      }
    } catch (error) {
      console.error('Error fetching native devices:', error);
      toast({
        title: "Error",
        description: "Could not fetch audio devices. Please check microphone permissions.",
        variant: "destructive",
      });
      setPermissionState('denied');
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

  const requestNativePermissions = async () => {
    setIsLoading(true);
    try {
      console.log('🎤 [NATIVE] Requesting microphone permissions...');
      // Request microphone permission via MediaDevices API
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: { ideal: 44100 },
          channelCount: { ideal: 2 }
        } 
      });
      
      console.log('🎤 [NATIVE] Microphone permission granted, stopping test stream...');
      stream.getTracks().forEach(track => track.stop());
      
      // Wait 500ms for audio session to stabilize
      console.log('⏳ [NATIVE] Waiting for audio session to stabilize...');
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log('⏳ [NATIVE] Audio session should be ready now');
      
      // Now fetch native devices
      await fetchNativeDevices();
      
      toast({
        title: "Microphone Access Granted",
        description: "You can now select your audio input device.",
      });
    } catch (error) {
      console.error('Microphone permission denied:', error);
      setPermissionState('denied');
      
      toast({
        title: "Microphone Permission Required",
        description: "Please enable microphone access in Settings > Privacy & Security > Microphone > riff-layer-muse",
        variant: "destructive",
      });
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
    
    // Listen for native device changes
    if (isNative) {
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
    
    // Listen for device changes on web
    const handleDeviceChange = () => {
      enumerateDevices();
    };
    
    let cleanup: (() => void) | null = null;
    
    if (navigator.mediaDevices && !isNative) {
      if (navigator.mediaDevices.addEventListener) {
        console.log('Using addEventListener for device changes');
        navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
        cleanup = () => {
          navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
        };
      } else if ('ondevicechange' in navigator.mediaDevices) {
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
  }, [isNative]);

  const selectedDevice = devices.find(device => device.deviceId === selectedDeviceId);
  const selectedNativeDevice = nativeDevices.find(device => device.portUID === selectedDeviceId);

  // Render native iOS interface
  if (isNative) {
    return (
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Smartphone className="w-4 h-4" />
            Audio Input Device
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {permissionState === 'unknown' || permissionState === 'denied' ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={requestNativePermissions}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                    Checking permissions...
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4 mr-2" />
                    Allow Microphone Access
                  </>
                )}
              </Button>
              
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
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <Select 
                  value={selectedDeviceId || ''} 
                  onValueChange={handleNativeDeviceChange}
                  disabled={isLoading || nativeDevices.length === 0}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder={
                      isLoading 
                        ? "Loading devices..." 
                        : nativeDevices.length === 0 
                          ? "No devices found" 
                          : "Select input device"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {nativeDevices.map((device) => (
                      <SelectItem key={device.portUID} value={device.portUID}>
                        <span className="flex items-center gap-2">
                          {device.isBluetooth ? '🎧' : '📱'} {device.portName}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
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
            </>
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
