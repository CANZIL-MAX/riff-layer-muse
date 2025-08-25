import { useNativePlatform } from "@/hooks/useNativePlatform";
import { Card } from "@/components/ui/card";

export const NativeOnlyGate = ({ children }: { children: React.ReactNode }) => {
  const { isNative, isCapacitorAvailable } = useNativePlatform();

  // Show gate if not running on native platform
  if (!isNative || !isCapacitorAvailable) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md mx-auto p-8 text-center">
          <div className="space-y-4">
            <div className="text-6xl mb-6">🎵</div>
            <h1 className="text-2xl font-bold text-foreground">
              Riff Layer Muse
            </h1>
            <p className="text-muted-foreground">
              This is a native-only music production app. Please download and run the iOS or Android version to access all features.
            </p>
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                Built with Capacitor for native mobile performance
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};