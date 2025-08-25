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
        // Enhanced native platform detection
        const hasCapacitor = typeof window !== 'undefined' && !!window.Capacitor;
        const hasCapacitorImport = !!Capacitor;
        
        isCapacitorAvailable = hasCapacitor && hasCapacitorImport;
        
        if (isCapacitorAvailable && Capacitor && Capacitor.isNativePlatform) {
          isNative = Capacitor.isNativePlatform();
          platform = Capacitor.getPlatform();
          
          // Only set native storage if we're actually on a native platform
          if (isNative) {
            storageMode = 'native';
            console.log('🎯 Native platform confirmed:', platform);
          } else {
            console.log('🌐 Web platform with Capacitor available');
          }
        } else {
          console.log('🌐 Pure web platform, no Capacitor');
        }
        
        console.log('✅ Platform detection successful:', {
          isNative,
          platform,
          isCapacitorAvailable,
          storageMode,
          hasCapacitor,
          hasCapacitorImport
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

      // Enhanced platform logging for native debugging
      console.log('🔍 Final Platform Info:', {
        isNative,
        platform,
        isCapacitorAvailable,
        storageMode,
        userAgent: navigator.userAgent,
        capacitorObject: !!window.Capacitor,
        capacitorImport: !!Capacitor,
        nativeCheck: Capacitor?.isNativePlatform?.() || false
      });
    };

    // Wrap in timeout to ensure window is ready
    const timeoutId = setTimeout(checkPlatform, 100);
    
    return () => clearTimeout(timeoutId);
  }, []);

  return platformInfo;
};