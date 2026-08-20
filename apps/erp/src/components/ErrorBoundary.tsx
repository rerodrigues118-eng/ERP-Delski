import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    showDetails: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, showDetails: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary capturou uma falha não tratada:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, showDetails: false });
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null, showDetails: false });
    window.location.href = "/";
  };

  public render() {
    if (this.state.hasError) {
      const title = this.props.fallbackTitle || "Ocorreu uma instabilidade nesta seção";
      const message =
        this.props.fallbackMessage ||
        "A aplicação interceptou uma falha de execução de forma segura para proteger seus dados. Tente recarregar a visualização.";

      return (
        <div className="min-h-[400px] w-full flex items-center justify-center p-6 antialiased">
          <div className="max-w-md w-full bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-3xl p-8 shadow-sm text-center space-y-6">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center mx-auto text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                {title}
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed font-normal">
                {message}
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={this.handleGoHome}
                className="text-xs font-semibold rounded-xl border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 gap-1.5 h-9"
              >
                <Home className="w-3.5 h-3.5" />
                Início
              </Button>

              <Button
                size="sm"
                onClick={this.handleReset}
                className="text-xs font-semibold rounded-xl bg-slate-900 hover:bg-black text-white gap-1.5 h-9 shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Recarregar Página
              </Button>
            </div>

            {this.state.error && (
              <div className="pt-4 border-t border-slate-100 dark:border-zinc-800 text-left">
                <button
                  type="button"
                  onClick={() => this.setState((prev) => ({ showDetails: !prev.showDetails }))}
                  className="flex items-center justify-between w-full text-[11px] font-semibold text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <span>Detalhes do incidente (para suporte)</span>
                  {this.state.showDetails ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                </button>

                {this.state.showDetails && (
                  <pre className="mt-2 p-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800 rounded-xl text-[10px] text-slate-600 dark:text-zinc-400 overflow-x-auto whitespace-pre-wrap font-mono">
                    {this.state.error.name}: {this.state.error.message}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
