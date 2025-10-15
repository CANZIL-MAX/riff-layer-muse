import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SafeErrorBoundary } from "@/components/SafeErrorBoundary";
import { RecordingStudio } from "@/components/RecordingStudio";

const App = () => {
  console.log('🚀 iOS-only DAW app initializing...');
  
  return (
    <SafeErrorBoundary>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <RecordingStudio />
      </TooltipProvider>
    </SafeErrorBoundary>
  );
};

export default App;
