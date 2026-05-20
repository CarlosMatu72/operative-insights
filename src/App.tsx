import { Component, type ErrorInfo, type ReactNode, useEffect, lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import Index from "./pages/Index";
import PreRegistro from "./pages/PreRegistro";
import Glosa from "./pages/Glosa";
import NotFound from "./pages/NotFound";

const Usuarios = lazy(() => import("./pages/Usuarios"));
const Catalogos = lazy(() => import("./pages/Catalogos"));
const Gafetes = lazy(() => import("./pages/Gafetes"));
const HistoricoAdmin = lazy(() => import("./pages/HistoricoAdmin"));
const Reportes = lazy(() => import("./pages/Reportes"));

const queryClient = new QueryClient();

const DYNAMIC_IMPORT_ERROR_RE = /error loading dynamically imported module|Failed to fetch dynamically imported module|Importing a module script failed/i;

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error ?? "");
}

function isDynamicImportError(error: unknown) {
  return DYNAMIC_IMPORT_ERROR_RE.test(getErrorMessage(error));
}

function getDynamicImportReloadKey(error: unknown) {
  return `lovable:dynamic-import-reload:${getErrorMessage(error)}`;
}

class LazyRouteErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, _errorInfo: ErrorInfo) {
    if (typeof window === "undefined" || !isDynamicImportError(error)) return;

    const reloadKey = getDynamicImportReloadKey(error);
    if (window.sessionStorage.getItem(reloadKey)) return;

    window.sessionStorage.setItem(reloadKey, "1");
    window.location.reload();
  }

  private handleRetry = () => {
    if (typeof window === "undefined") return;

    if (this.state.error) {
      window.sessionStorage.removeItem(getDynamicImportReloadKey(this.state.error));
    }

    window.location.reload();
  };

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    const isChunkError = isDynamicImportError(this.state.error);

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <h1 className="text-lg font-semibold text-foreground">
          {isChunkError ? "Actualizando aplicación…" : "No se pudo cargar esta vista"}
        </h1>
        <p className="max-w-md text-sm text-muted-foreground">
          {isChunkError
            ? "Se detectó una versión anterior en caché. Recarga esta pantalla para abrir la versión más reciente."
            : "Ocurrió un error inesperado al cargar esta página."}
        </p>
        <button
          type="button"
          onClick={this.handleRetry}
          className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          Recargar
        </button>
      </div>
    );
  }
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <AuthProvider>
          <LazyRouteErrorBoundary>
            <Suspense fallback={
              <div className="flex min-h-screen items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            }>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                <Route path="/usuarios" element={<ProtectedRoute requiredRole="admin"><Usuarios /></ProtectedRoute>} />
                <Route path="/catalogos" element={<ProtectedRoute><Catalogos /></ProtectedRoute>} />
                <Route path="/pre-registro" element={<ProtectedRoute><PreRegistro /></ProtectedRoute>} />
                <Route path="/glosa" element={<ProtectedRoute><Glosa /></ProtectedRoute>} />
                <Route path="/gafetes" element={<ProtectedRoute requiredRole="juridico"><Gafetes /></ProtectedRoute>} />
                <Route path="/historico-admin" element={<ProtectedRoute requiredRole="admin"><HistoricoAdmin /></ProtectedRoute>} />
                <Route path="/reportes" element={<ProtectedRoute requiredRole="admin"><Reportes /></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </LazyRouteErrorBoundary>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);
export default App;
