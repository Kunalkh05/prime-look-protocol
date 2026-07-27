import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Without this, one throw anywhere in the results tree unmounts the whole app
 * and leaves a blank white page — with the user's answers still in memory and
 * no way to get at them.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Unhandled error in render:", error, info.componentStack);
  }

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="wrap">
        <div className="boundary">
          <div className="eyebrow">Something broke</div>
          <h2>That wasn't supposed to happen</h2>
          <p>
            The page hit an unexpected error. Your saved answers are still on this device — reloading
            should pick them back up.
          </p>
          <pre>{error.message}</pre>
          <div className="upload-buttons">
            <button type="button" className="btn btn-accent" onClick={() => location.reload()}>
              Reload the page
            </button>
            <button
              type="button"
              className="btn btn-ghost cam-ghost"
              onClick={() => this.setState({ error: null })}
            >
              Try to continue
            </button>
          </div>
        </div>
      </div>
    );
  }
}
