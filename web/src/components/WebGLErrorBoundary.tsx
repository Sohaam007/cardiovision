import { Component, type ErrorInfo, type ReactNode } from 'react';
import { WebGLFallback } from './WebGLFallback.tsx';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class WebGLErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn('WebGLErrorBoundary caught 3D rendering error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback ?? <WebGLFallback />;
    }

    return this.props.children;
  }
}
