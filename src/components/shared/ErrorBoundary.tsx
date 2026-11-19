import { Component, type ErrorInfo, type ReactNode } from "react";

interface State {
  error: Error | null;
  componentStack: string | null;
}

/**
 * Shows the error and the component stack instead of a blank page, so a crash
 * (e.g. a render loop) points straight at the component that caused it.
 */
export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null, componentStack: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[app crash]", error, info.componentStack);
    this.setState({ componentStack: info.componentStack ?? null });
  }

  render() {
    const { error, componentStack } = this.state;
    if (!error) return this.props.children;
    return (
      <div role="alert" className="mx-auto max-w-2xl p-5">
        <div className="card stack">
          <p className="eyebrow">Erreur de l'application</p>
          <h1 className="text-2xl font-bold">L'interface s'est arrêtée</h1>
          <p className="break-words font-mono text-sm text-danger-ink">{error.message}</p>
          {componentStack && (
            <details open>
              <summary className="label cursor-pointer">Composants concernés</summary>
              <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap rounded-xl bg-surface-sunken p-3 font-mono text-xs">
                {componentStack.trim()}
              </pre>
            </details>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                const report = `${error.message}\n\n${error.stack ?? ""}\n\nComposants :${componentStack ?? ""}`;
                void navigator.clipboard?.writeText(report).catch((e) => console.error("[clipboard]", e));
              }}
              className="min-h-tap rounded-2xl border-2 border-foreground bg-surface px-5 font-semibold"
            >
              Copier le rapport
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="min-h-tap rounded-2xl border-2 border-foreground bg-primary px-5 font-semibold text-primary-foreground"
            >
              Recharger
            </button>
          </div>
        </div>
      </div>
    );
  }
}
