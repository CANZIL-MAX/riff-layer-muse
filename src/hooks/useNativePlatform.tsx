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
      const isCapacitorAvailable = typeof window !== 'undefined' && !!window.Capacitor;
      const isNative = Capacitor.isNativePlatform();
      const platform = Capacitor.getPlatform();
      
      // Check storage mode
      let storageMode: 'native' | 'memory' | 'unknown' = 'unknown';
      try {
        if (isCapacitorAvailable && isNative) {
          storageMode = 'native';
        } else {
          storageMode = 'memory';
        }
      } catch (error) {
        console.warn('Could not determine storage mode:', error);
        storageMode = 'memory';
      }

      setPlatformInfo({
        isNative,
        platform,
        isCapacitorAvailable,
        storageMode
      });

      // Log platform info for debugging
      console.log('🔍 Platform Detection:', {
        isNative,
        platform,
        isCapacitorAvailable,
        storageMode,
        userAgent: navigator.userAgent
      });
    };

    checkPlatform();
  }, []);

  return platformInfo;
};