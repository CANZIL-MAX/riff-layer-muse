import { registerPlugin } from '@capacitor/core';

export interface AudioDevice {
  portUID: string;
  portName: string;
  portType: string;
  isBluetooth: boolean;
}

export interface AudioInputPlugin {
  getAvailableInputs(): Promise<{ devices: AudioDevice[] }>;
  getCurrentInput(): Promise<{ device: AudioDevice | null }>;
  setPreferredInput(options: { portUID: string }): Promise<{ success: boolean; message: string }>;
  addListener(
    eventName: 'audioRouteChanged',
    listenerFunc: (event: { reason: string }) => void
  ): Promise<any>;
  removeAllListeners(): Promise<void>;
}

const AudioInput = registerPlugin<AudioInputPlugin>('AudioInputPlugin', {
  web: () => {
    // Web fallback - returns empty implementation
    return {
      getAvailableInputs: async () => ({ devices: [] }),
      getCurrentInput: async () => ({ device: null }),
      setPreferredInput: async () => ({ success: false, message: 'Not supported on web' }),
      addListener: async () => ({}),
      removeAllListeners: async () => {},
    };
  },
});

export default AudioInput;
