import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Mic, RefreshCw } from 'lucide-react';

interface SimpleFallbackProps {
  error?: string;
  onRetry?: () => void;
}

export function SimpleFallback({ error, onRetry }: SimpleFallbackProps) {
  console.log('SimpleFallback rendered with error:', error);
  
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="max-w-lg w-full p-8 text-center">
        <div className="flex justify-center mb-4">
          <AlertCircle className="h-16 w-16 text-yellow-500" />
        </div>
        
        <h1 className="text-3xl font-bold mb-4 text-foreground">
          Riff Layer Muse
        </h1>
        
        <div className="mb-6">
          <Mic className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
          <p className="text-lg text-muted-foreground">
            Digital Audio Workstation
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium mb-2">
              Initialization Issue
            </p>
            <p className="text-xs text-yellow-700 dark:text-yellow-300">
              {error.includes('directory') 
                ? 'Storage is not available on this device. The app will work in memory-only mode.'
                : 'Some features may be limited due to initialization errors.'
              }
            </p>
          </div>
        )}

        <div className="space-y-3">
          <p className="text-muted-foreground">
            The app is starting up...
          </p>
          
          {onRetry && (
            <Button 
              onClick={onRetry} 
              className="w-full"
              variant="outline"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry Initialization
            </Button>
          )}
          
          <p className="text-xs text-muted-foreground">
            If this persists, try refreshing the page
          </p>
        </div>
      </Card>
    </div>
  );
}