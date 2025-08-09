import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    console.error('ErrorBoundary caught an error:', error);
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="max-w-md w-full p-6 text-center">
            <h2 className="text-2xl font-bold mb-4 text-destructive">
              Something went wrong
            </h2>
            <p className="text-muted-foreground mb-4">
              The app encountered an error. Please try refreshing.
            </p>
            <pre className="text-xs bg-muted p-2 rounded mb-4 text-left overflow-auto max-h-32">
              {this.state.error?.message || 'Unknown error'}
            </pre>
            <Button 
              onClick={() => this.setState({ hasError: false })}
              className="w-full"
            >
              Try Again
            </Button>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}