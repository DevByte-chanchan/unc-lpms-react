import React from 'react'
import { planLazyImportRecovery } from '../utils/lazyImportRecovery'
import Mascot from './Mascot.jsx'

const LAZY_IMPORT_RECOVERY_KEY = 'lpms:lazy-import-recovery'

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
    console.error(`[${this.props.fallbackName || 'ErrorBoundary'}]`, error, errorInfo?.componentStack?.slice(0, 500))
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // React.lazy caches a rejected import promise, so merely resetting the
    // boundary cannot recover after Vite invalidates an HMR module URL or a
    // deployment replaces a chunk. Reload once for that exact failed module;
    // the stored signature prevents a persistent network failure from looping.
    try {
      const previousSignature = window.sessionStorage.getItem(LAZY_IMPORT_RECOVERY_KEY)
      const recovery = planLazyImportRecovery(error, window.location.href, previousSignature)
      if (recovery.shouldReload) {
        window.sessionStorage.setItem(LAZY_IMPORT_RECOVERY_KEY, recovery.signature)
        window.location.reload()
      }
    } catch {
      // Storage can be unavailable in restricted browser modes. In that case
      // retain the normal error screen and its explicit Reload Page action.
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

      // A plain, friendly page: the greyhound looking worried, what happened in everyday words, and two ways out.
      // The real error is only shown while developing; users never see a stack trace.
      return (
        <div role="alert" style={{ display: 'grid', placeItems: 'center', minHeight: this.props.minHeight || 300, padding: 24 }}>
          <div style={{ maxWidth: 440, textAlign: 'center', padding: '28px 32px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm, 0 4px 16px rgb(0 0 0 / 0.06))' }}>
            <Mascot pose="worried" size={88} />
            <h2 style={{ margin: '12px 0 6px', fontSize: 'var(--fs-lg)', fontWeight: 600, color: 'var(--ink)' }}>
              {this.props.title || 'This page hit a snag'}
            </h2>
            <p style={{ margin: '0 0 20px', fontSize: 'var(--fs-md)', lineHeight: 1.5, color: 'var(--ink-muted)', textWrap: 'pretty' }}>
              {this.props.message || 'Something on this page did not load properly. Your saved work is safe. Try again, or reload the page.'}
            </p>
            {isDev && this.state.error && (
              <details style={{ marginBottom: 20, textAlign: 'left', background: 'var(--surface-sunken)', padding: 12, borderRadius: 'var(--radius-sm, 6px)', fontSize: 12, color: 'var(--ink-soft)', maxHeight: 200, overflow: 'auto' }}>
                <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Details (shown only while developing)</summary>
                <pre style={{ margin: '8px 0 0', whiteSpace: 'pre-wrap' }}>
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button type="button" className="btn btn-primary" onClick={this.handleReset}>Try again</button>
              <button type="button" className="btn btn-secondary" onClick={() => window.location.reload()}>Reload page</button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
