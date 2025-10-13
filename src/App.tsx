import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SafeErrorBoundary } from "@/components/SafeErrorBoundary";
import { NativeOnlyGate } from "@/components/NativeOnlyGate";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const App = () => {
  console.log('🚀 App component rendering...');
  
  return (
    <SafeErrorBoundary>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </SafeErrorBoundary>
  );
};

export default App;
