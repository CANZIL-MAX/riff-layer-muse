import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

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
      let isNative = true; // iOS-only app - default to native
      let platform = 'ios';
      let storageMode: 'native' | 'memory' | 'unknown' = 'native';

      try {
        // Multiple methods for native detection
        const hasWindowCapacitor = typeof window !== 'undefined' && !!window.Capacitor;
        const isCapacitorURL = typeof window !== 'undefined' && window.location?.href?.startsWith('capacitor://');
        const hasCapacitorImport = !!Capacitor;
        
        // Prioritize definitive native indicators
        isNative = isCapacitorURL || (hasWindowCapacitor && Capacitor?.isNativePlatform?.());
        isCapacitorAvailable = hasWindowCapacitor || hasCapacitorImport;
        
        if (isNative) {
          platform = Capacitor?.getPlatform?.() || 'native';
          storageMode = 'native';
          console.log('🎯 Native platform confirmed:', platform);
        } else if (isCapacitorAvailable) {
          console.log('🌐 Web platform with Capacitor available');
        } else {
          console.log('🌐 Pure web platform, no Capacitor');
        }
        
        console.log('✅ Platform detection successful:', {
          isNative,
          platform,
          isCapacitorAvailable,
          storageMode,
          isCapacitorURL,
          hasWindowCapacitor,
          hasCapacitorImport
        });
        
      } catch (error) {
        console.warn('⚠️ Platform detection error, defaulting to native:', error);
        isCapacitorAvailable = false;
        isNative = true;
        platform = 'ios';
        storageMode = 'native';
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