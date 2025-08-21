import { useNativePlatform } from "@/hooks/useNativePlatform";

export const PlatformIndicator = () => {
  const { isNative } = useNativePlatform();

  // Don't show badges on native platforms for cleaner iPhone interface
  if (isNative) {
    return null;
  }

  // Only show indicators on web for debugging purposes
  return null;
};