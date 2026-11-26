import React from "react";

type ErrorBoundaryState = {
  hasError: boolean;
  message: string;
};

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || "An unexpected application error occurred.",
    };
  }

  componentDidCatch(error: Error) {
    console.error("Good Chat ErrorBoundary caught:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-dvh w-full flex-col items-center justify-center bg-[#F7F8FA] px-6 text-center text-slate-900 dark:bg-[#0B1117] dark:text-slate-100">
          <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#111821]">
            <h1 className="text-lg font-bold">Something went wrong</h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, message: "" })}
              className="mt-4 rounded-xl bg-[#0D7A5F] px-4 py-2 text-sm font-medium text-white hover:bg-[#0A624C]"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
