import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";

import RoleRouter from "./pages/RoleRouter";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import NotFound from "./pages/NotFound";

import BeneficiarioHome from "./pages/beneficiario/BeneficiarioHome";
import UsarVoucher from "./pages/beneficiario/UsarVoucher";
import BeneficiarioHistorico from "./pages/beneficiario/BeneficiarioHistorico";
import BeneficiarioPerfil from "./pages/beneficiario/BeneficiarioPerfil";

import LojistaHome from "./pages/lojista/LojistaHome";
import LojistaReceber from "./pages/lojista/LojistaReceber";
import LojistaExtrato from "./pages/lojista/LojistaExtrato";
import LojistaPerfil from "./pages/lojista/LojistaPerfil";

import EmissorDashboard from "./pages/emissor/EmissorDashboard";

const queryClient = new QueryClient();

function ProtectedRoute({ children, allowedRole }: { children: React.ReactNode; allowedRole?: string }) {
  const { user, loading, activeRole } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRole && activeRole !== allowedRole) return <Navigate to="/" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/registro" element={<RegisterPage />} />
            <Route path="/" element={<RoleRouter />} />

            {/* Beneficiário routes */}
            <Route path="/beneficiario" element={<ProtectedRoute allowedRole="beneficiario"><BeneficiarioHome /></ProtectedRoute>} />
            <Route path="/beneficiario/usar-voucher" element={<ProtectedRoute allowedRole="beneficiario"><UsarVoucher /></ProtectedRoute>} />
            <Route path="/beneficiario/historico" element={<ProtectedRoute allowedRole="beneficiario"><BeneficiarioHistorico /></ProtectedRoute>} />
            <Route path="/beneficiario/perfil" element={<ProtectedRoute allowedRole="beneficiario"><BeneficiarioPerfil /></ProtectedRoute>} />

            {/* Lojista routes */}
            <Route path="/lojista" element={<ProtectedRoute allowedRole="lojista"><LojistaHome /></ProtectedRoute>} />
            <Route path="/lojista/receber" element={<ProtectedRoute allowedRole="lojista"><LojistaReceber /></ProtectedRoute>} />
            <Route path="/lojista/extrato" element={<ProtectedRoute allowedRole="lojista"><LojistaExtrato /></ProtectedRoute>} />
            <Route path="/lojista/perfil" element={<ProtectedRoute allowedRole="lojista"><LojistaPerfil /></ProtectedRoute>} />

            {/* Emissor routes */}
            <Route path="/emissor" element={<ProtectedRoute allowedRole="emissor"><EmissorDashboard /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
