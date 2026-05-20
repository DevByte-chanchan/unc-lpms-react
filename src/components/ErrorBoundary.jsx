import React from 'react'
import { logError } from '../utils/auditLogger'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo })
    logError(this.props.fallbackName || 'ErrorBoundary', error, {
      componentStack: errorInfo?.componentStack?.slice(0, 500)
    })
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
    if (this.props.onReset) {
      this.props.onReset()
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return typeof this.props.fallback === 'function'
          ? this.props.fallback({
              error: this.state.error,
              resetError: this.handleReset
            })
          : this.props.fallback
      }

      const isDev = import.meta.env?.DEV

      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: this.props.minHeight || '300px',
          padding: 24,
          fontFamily: "'Poppins', sans-serif"
        }}>
          <div style={{
            maxWidth: 480,
            textAlign: 'center',
            padding: 32,
            background: '#fff',
            borderRadius: 12,
            border: '1px solid #e5e7eb',
            boxShadow: '0 4px 16px rgba(0,0,0,0.06)'
          }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
            <h2 style={{
              margin: '0 0 8px 0',
              fontSize: 18,
              fontWeight: 600,
              color: '#2c3e50'
            }}>
              {this.props.title || 'Something went wrong'}
            </h2>
            <p style={{
              margin: '0 0 20px 0',
              fontSize: 14,
              color: '#7f8c8d',
              lineHeight: 1.5
            }}>
              {this.props.message || 'An unexpected error occurred. Please try again.'}
            </p>
            {isDev && this.state.error && (
              <details style={{
                marginBottom: 20,
                textAlign: 'left',
                background: '#f8f9fa',
                padding: 12,
                borderRadius: 6,
                fontSize: 12,
                color: '#e74c3c',
                maxHeight: 200,
                overflow: 'auto'
              }}>
                <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Error Details</summary>
                <pre style={{ margin: '8px 0 0', whiteSpace: 'pre-wrap' }}>
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                onClick={this.handleReset}
                style={{
                  padding: '10px 24px',
                  background: '#1e3a5f',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: "'Poppins', sans-serif"
                }}
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '10px 24px',
                  background: '#f3f4f6',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: "'Poppins', sans-serif"
                }}
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
