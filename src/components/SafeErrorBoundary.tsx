import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class SafeErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    console.error('🚨 SafeErrorBoundary caught an error:', error);
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🚨 Uncaught error details:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleRetry = () => {
    console.log('🔄 Retrying after error...');
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  private handleReload = () => {
    console.log('🔄 Reloading page...');
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          backgroundColor: '#0a0a0a',
          color: '#ffffff',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <div style={{
            maxWidth: '500px',
            width: '100%',
            padding: '2rem',
            border: '1px solid #333',
            borderRadius: '8px',
            backgroundColor: '#111',
            textAlign: 'center'
          }}>
            <h2 style={{ 
              fontSize: '1.5rem', 
              fontWeight: 'bold', 
              marginBottom: '1rem',
              color: '#ff6b6b'
            }}>
              🎵 Riff Layer Muse Error
            </h2>
            <p style={{ 
              marginBottom: '1rem',
              color: '#ccc',
              lineHeight: '1.5'
            }}>
              The audio workstation encountered an unexpected error. This might be due to browser compatibility or missing audio permissions.
            </p>
            
            <div style={{
              backgroundColor: '#222',
              padding: '1rem',
              borderRadius: '4px',
              marginBottom: '1.5rem',
              fontSize: '0.875rem',
              color: '#999',
              textAlign: 'left',
              fontFamily: 'monospace',
              maxHeight: '120px',
              overflow: 'auto'
            }}>
              {this.state.error?.message || 'Unknown error occurred'}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
              <button
                onClick={this.handleRetry}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#0066cc',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}
              >
                Try Again
              </button>
              <button
                onClick={this.handleReload}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#666',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}
              >
                Reload Page
              </button>
            </div>
            
            <p style={{ 
              marginTop: '1rem',
              fontSize: '0.75rem',
              color: '#666',
              lineHeight: '1.4'
            }}>
              Make sure your browser supports Web Audio API and has microphone permissions enabled.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}