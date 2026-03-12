import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: { componentStack?: string | null }) {
    reportClientError({
      message: error.message,
      stack: error.stack,
      source: "react-error-boundary",
      route: window.location.pathname,
      metadata: {
        componentStack: errorInfo.componentStack?.slice(0, 2000),
      },
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-[400px] p-6">
          <Card className="max-w-md w-full">
            <CardContent className="p-8 text-center space-y-4">
              <div className="flex justify-center">
                <div className="p-3 rounded-full bg-destructive/10">
                  <AlertTriangle className="h-8 w-8 text-destructive" />
                </div>
              </div>
              <h2 className="text-xl font-bold" data-testid="heading-error-boundary">
                Something went wrong
              </h2>
              <p className="text-muted-foreground text-sm">
                An unexpected error occurred. The issue has been reported automatically.
                You can try again or navigate to a different page.
              </p>
              <div className="flex gap-3 justify-center pt-2">
                <Button
                  onClick={this.handleRetry}
                  data-testid="button-error-retry"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.location.href = "/"}
                  data-testid="button-error-home"
                >
                  Go Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export function reportClientError(data: {
  message: string;
  stack?: string;
  source?: string;
  route?: string;
  severity?: string;
  metadata?: any;
}) {
  try {
    const payload = {
      message: data.message,
      stack: data.stack,
      source: data.source || "client",
      route: data.route || window.location.pathname,
      severity: data.severity || "error",
      metadata: data.metadata,
    };

    fetch("/api/errors/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "include",
    }).catch(() => {});
  } catch {
  }
}

let globalErrorHandlersInstalled = false;

export function installGlobalErrorHandlers() {
  if (globalErrorHandlersInstalled) return;
  globalErrorHandlersInstalled = true;

  window.addEventListener("error", (event) => {
    if (event.error) {
      reportClientError({
        message: event.error.message || event.message,
        stack: event.error.stack,
        source: "window-onerror",
        route: window.location.pathname,
        metadata: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });
    }
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const message = reason?.message || String(reason);
    if (message.includes("401:") || message.includes("403:")) return;
    reportClientError({
      message: `Unhandled Promise Rejection: ${message}`,
      stack: reason?.stack,
      source: "unhandled-rejection",
      route: window.location.pathname,
    });
  });
}
