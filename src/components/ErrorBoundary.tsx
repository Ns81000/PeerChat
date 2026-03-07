import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
          <div className="flex flex-col items-center gap-6 text-center animate-fade-in max-w-md">
            <h1 className="text-2xl font-light text-foreground">Something went wrong</h1>
            <p className="text-sm text-muted-foreground">
              An unexpected error occurred. Your chat session may have been lost.
            </p>
            {this.state.error && (
              <pre className="w-full rounded-lg bg-surface p-4 text-left text-xs text-muted-foreground overflow-auto max-h-32 border border-border">
                {this.state.error.message}
              </pre>
            )}
            <Button variant="hero" onClick={this.handleReset}>
              Return Home
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
