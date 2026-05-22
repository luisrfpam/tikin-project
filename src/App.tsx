import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { IssuerScopeProvider } from "@/lib/issuerScope";

import Index from "./pages/Index";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import SolicitarOnboarding from "./pages/SolicitarOnboarding";
import RecuperarSenha from "./pages/RecuperarSenha";
import RedefinirSenha from "./pages/RedefinirSenha";
import AtivarCadastro from "./pages/AtivarCadastro";
import EmissorAguardandoAprovacao from "./pages/EmissorAguardandoAprovacao";
import NotFound from "./pages/NotFound";
import ScrollToTop from "./components/ScrollToTop";
import AdminLoginPage from "./pages/admin/AdminLoginPage";
import AdminEmittersPage from "./pages/admin/AdminEmittersPage";

import Landing from "./pages/site/Landing";
import HowItWorks from "./pages/site/HowItWorks";
import ForCompanies from "./pages/site/ForCompanies";
import ForBeneficiaries from "./pages/site/ForBeneficiaries";
import ForMerchants from "./pages/site/ForMerchants";
import Security from "./pages/site/Security";
import Faq from "./pages/site/Faq";
import Aplicativo from "./pages/site/Aplicativo";
import Privacidade from "./pages/site/Privacidade";
import Termos from "./pages/site/Termos";

import BeneficiarioHome from "./pages/beneficiario/BeneficiarioHome";
import UsarVoucher from "./pages/beneficiario/UsarVoucher";
import BeneficiarioHistorico from "./pages/beneficiario/BeneficiarioHistorico";
import BeneficiarioPerfil from "./pages/beneficiario/BeneficiarioPerfil";
import BeneficiarioOndeUsar from "./pages/beneficiario/BeneficiarioOndeUsar";
import BeneficiarioPagar from "./pages/beneficiario/BeneficiarioPagar";

import LojistaHome from "./pages/lojista/LojistaHome";
import LojistaReceber from "./pages/lojista/LojistaReceber";
import LojistaExtrato from "./pages/lojista/LojistaExtrato";
import LojistaPerfil from "./pages/lojista/LojistaPerfil";

import EmissorDashboard from "./pages/emissor/EmissorDashboard";
import EmissorBeneficiarios from "./pages/emissor/EmissorBeneficiarios";
import EmissorFundos from "./pages/emissor/EmissorFundos";
import EmissorBlockchain from "./pages/emissor/EmissorBlockchain";

const queryClient = new QueryClient();

function ProtectedRoute({ children, allowedRole }: { children: React.ReactNode; allowedRole?: string }) {
  const { user, loading, activeRole } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRole && activeRole !== allowedRole) return <Navigate to="/" replace />;
  if (allowedRole === 'beneficiario') {
    return <IssuerScopeProvider>{children}</IssuerScopeProvider>;
  }
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/registro" element={<RegisterPage />} />
            <Route path="/solicitar-onboarding" element={<SolicitarOnboarding />} />
            <Route path="/recuperar-senha" element={<RecuperarSenha />} />
            <Route path="/redefinir-senha" element={<RedefinirSenha />} />
            <Route path="/ativar-cadastro" element={<AtivarCadastro />} />
            <Route path="/emissor/aguardando-aprovacao" element={<EmissorAguardandoAprovacao />} />

            {/* Área administrativa oculta por URL */}
            <Route path="/tikin-admin/login" element={<AdminLoginPage />} />
            <Route path="/tikin-admin/emissores" element={<AdminEmittersPage />} />

            {/* Marketing site */}
            <Route path="/como-funciona" element={<HowItWorks />} />
            <Route path="/para-empresas" element={<ForCompanies />} />
            <Route path="/para-beneficiarios" element={<ForBeneficiaries />} />
            <Route path="/para-lojistas" element={<ForMerchants />} />
            <Route path="/aplicativo" element={<Aplicativo />} />
            <Route path="/seguranca" element={<Security />} />
            <Route path="/faq" element={<Faq />} />
            <Route path="/privacidade" element={<Privacidade />} />
            <Route path="/termos" element={<Termos />} />

            {/* Beneficiário */}
            <Route path="/beneficiario" element={<ProtectedRoute allowedRole="beneficiario"><BeneficiarioHome /></ProtectedRoute>} />
            <Route path="/beneficiario/pagar" element={<ProtectedRoute allowedRole="beneficiario"><BeneficiarioPagar /></ProtectedRoute>} />
            <Route path="/beneficiario/usar-voucher" element={<ProtectedRoute allowedRole="beneficiario"><UsarVoucher /></ProtectedRoute>} />
            <Route path="/beneficiario/onde-usar" element={<ProtectedRoute allowedRole="beneficiario"><BeneficiarioOndeUsar /></ProtectedRoute>} />
            <Route path="/beneficiario/historico" element={<ProtectedRoute allowedRole="beneficiario"><BeneficiarioHistorico /></ProtectedRoute>} />
            <Route path="/beneficiario/perfil" element={<ProtectedRoute allowedRole="beneficiario"><BeneficiarioPerfil /></ProtectedRoute>} />

            {/* Lojista */}
            <Route path="/lojista" element={<ProtectedRoute allowedRole="lojista"><LojistaHome /></ProtectedRoute>} />
            <Route path="/lojista/receber" element={<ProtectedRoute allowedRole="lojista"><LojistaReceber /></ProtectedRoute>} />
            <Route path="/lojista/extrato" element={<ProtectedRoute allowedRole="lojista"><LojistaExtrato /></ProtectedRoute>} />
            <Route path="/lojista/perfil" element={<ProtectedRoute allowedRole="lojista"><LojistaPerfil /></ProtectedRoute>} />

            {/* Emissor */}
            <Route path="/emissor" element={<ProtectedRoute allowedRole="emissor"><EmissorDashboard /></ProtectedRoute>} />
            <Route path="/emissor/beneficiarios" element={<ProtectedRoute allowedRole="emissor"><EmissorBeneficiarios /></ProtectedRoute>} />
            <Route path="/emissor/fundos" element={<ProtectedRoute allowedRole="emissor"><EmissorFundos /></ProtectedRoute>} />
            <Route path="/emissor/blockchain" element={<ProtectedRoute allowedRole="emissor"><EmissorBlockchain /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
