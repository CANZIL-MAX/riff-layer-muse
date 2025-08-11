import { Badge } from "@/components/ui/badge";
import { useNativePlatform } from "@/hooks/useNativePlatform";

export const PlatformIndicator = () => {
  const { isNative, platform, storageMode } = useNativePlatform();

  return (
    <div className="flex gap-2">
      <Badge 
        variant={isNative ? "default" : "secondary"}
        className="text-xs"
      >
        {platform}
      </Badge>
      <Badge 
        variant={storageMode === 'native' ? "default" : "outline"}
        className="text-xs"
      >
        {storageMode}
      </Badge>
    </div>
  );
};