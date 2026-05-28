import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  errorType: "generic" | "security";
}

export class SecurityErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorType: "generic",
  };

  public static getDerivedStateFromError(error: Error): State {
    // Check if it's a security-related error
    if (error.message.toLowerCase().includes("security") || 
        error.message.toLowerCase().includes("unauthorized") ||
        error.message.toLowerCase().includes("forbidden")) {
      return { hasError: true, errorType: "security" };
    }
    return { hasError: true, errorType: "generic" };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, errorType: "generic" });
    window.location.href = "/";
  };

  public render() {
    if (this.state.hasError) {
      if (this.state.errorType === "security") {
        return (
          <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-destructive/10">
            <div className="max-w-md w-full bg-card p-8 rounded-3xl border-2 border-destructive shadow-2xl text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-destructive/20 mb-6">
                <ShieldAlert className="w-10 h-10 text-destructive" />
              </div>
              <h2 className="text-3xl font-bold mb-4">Security Boundary</h2>
              <p className="text-muted-foreground mb-8">
                A potential security anomaly was detected. Access has been restricted to protect your account and the platform.
              </p>
              <Button 
                variant="destructive" 
                size="lg" 
                className="w-full rounded-xl font-bold"
                onClick={this.handleReset}
              >
                Return to Safety
              </Button>
            </div>
          </div>
        );
      }

      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
          <div className="max-w-md w-full bg-card p-8 rounded-3xl border border-border shadow-xl text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-accent/20 mb-6">
              <AlertTriangle className="w-10 h-10 text-accent-foreground" />
            </div>
            <h2 className="text-3xl font-bold mb-4">Something went wrong</h2>
            <p className="text-muted-foreground mb-8">
              We encountered an unexpected error. Don't worry, your data is safe.
            </p>
            <Button 
              variant="default" 
              size="lg" 
              className="w-full rounded-xl font-bold"
              onClick={this.handleReset}
            >
              Try Again
            </Button>
          </div>
        </div>
      );
    }

    return this.children;
  }
}

export default SecurityErrorBoundary;
