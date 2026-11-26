import { Component, type ErrorInfo, type ReactNode } from 'react'

/**
 * If one screen throws while rendering, show a calm message with a way out instead of letting the interface
 * silently vanish. The data is stored locally and is not affected.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Screen failed to render', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <section className="page">
        <div className="card empty" role="alert">
          <h2>Something went wrong on this screen</h2>
          <p className="muted">Your progress is saved on this device and is not affected.</p>
          <p className="small muted">{this.state.error.message}</p>
          <button className="btn primary" onClick={() => window.location.reload()}>Reload</button>
        </div>
      </section>
    )
  }
}
