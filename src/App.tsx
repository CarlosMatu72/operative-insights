import { useEffect, lazy, Suspense } from "react";
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
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);
export default App;
