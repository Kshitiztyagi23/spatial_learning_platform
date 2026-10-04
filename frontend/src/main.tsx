import React, { Component, ErrorInfo, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class RootErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('RootErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', maxWidth: '800px', margin: '2rem auto', background: '#fff', borderRadius: '8px', border: '2px solid #ef4444', fontFamily: 'system-ui, sans-serif' }}>
          <h2 style={{ color: '#ef4444', marginTop: 0 }}>Application Error</h2>
          <p style={{ color: '#6b7280' }}>An error occurred while rendering the page:</p>
          <pre style={{ background: '#fef2f2', padding: '1rem', borderRadius: '4px', overflow: 'auto', color: '#b91c1c', fontSize: '14px', whiteSpace: 'pre-wrap' }}>
            {this.state.error?.toString()}
          </pre>
          <button 
            onClick={() => window.location.href = '/'}
            style={{ padding: '0.6rem 1.2rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', marginTop: '1rem', fontWeight: 500 }}
          >
            ← Restart from Beginning
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </React.StrictMode>
);
