import { useState, useEffect } from 'react';

// Safe Capacitor import with fallback
let Capacitor: any = null;
try {
  Capacitor = require('@capacitor/core').Capacitor;
} catch (error) {
  console.warn('Capacitor not available, using web fallback:', error);
  Capacitor = {
    isNativePlatform: () => false,
    getPlatform: () => 'web'
  };
}

declare global {
  interface Window {
    Capacitor?: any;
  }
}

interface PlatformInfo {
  isNative: boolean;
  platform: string;
  isCapacitorAvailable: boolean;
  storageMode: 'native' | 'memory' | 'unknown';
}

export const useNativePlatform = () => {
  const [platformInfo, setPlatformInfo] = useState<PlatformInfo>({
    isNative: false,
    platform: 'web',
    isCapacitorAvailable: false,
    storageMode: 'unknown'
  });

  useEffect(() => {
    const checkPlatform = () => {
      let isCapacitorAvailable = false;
      let isNative = false;
      let platform = 'web';
      let storageMode: 'native' | 'memory' | 'unknown' = 'memory';

      try {
        isCapacitorAvailable = typeof window !== 'undefined' && !!window.Capacitor && !!Capacitor;
        
        if (isCapacitorAvailable && Capacitor) {
          isNative = Capacitor.isNativePlatform();
          platform = Capacitor.getPlatform();
          
          if (isNative) {
            storageMode = 'native';
          }
        }
        
        console.log('✅ Platform detection successful:', {
          isNative,
          platform,
          isCapacitorAvailable,
          storageMode
        });
        
      } catch (error) {
        console.warn('⚠️ Platform detection error, using web fallback:', error);
        isCapacitorAvailable = false;
        isNative = false;
        platform = 'web';
        storageMode = 'memory';
      }

      setPlatformInfo({
        isNative,
        platform,
        isCapacitorAvailable,
        storageMode
      });

      // Log platform info for debugging
      console.log('🔍 Final Platform Info:', {
        isNative,
        platform,
        isCapacitorAvailable,
        storageMode,
        userAgent: navigator.userAgent,
        capacitorObject: !!window.Capacitor,
        capacitorImport: !!Capacitor
      });
    };

    // Wrap in timeout to ensure window is ready
    const timeoutId = setTimeout(checkPlatform, 100);
    
    return () => clearTimeout(timeoutId);
  }, []);

  return platformInfo;
};