import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppContext'

import Login from './pages/Login'
import ComoFunciona from './pages/ComoFunciona'
import FormularioPublico from './pages/FormularioPublico'
import PaginaIndicacao from './pages/PaginaIndicacao'
import AppLayout from './components/layout/AppLayout'
import VisaoGeral from './pages/VisaoGeral'
import Leads from './pages/Leads'
import Indicacoes from './pages/Indicacoes'
import Retencao from './pages/Retencao'
import Gestao from './pages/Gestao'
import Disparos from './pages/Disparos'
import Captacao from './pages/Captacao'
import Configuracoes from './pages/Configuracoes'
import Mensagens from './pages/Mensagens'
import Atendimento from './pages/Atendimento'
import Admin from './pages/Admin'
import Agenda from './pages/Agenda'
import AgendarPublico from './pages/AgendarPublico'
import Isca from './pages/Isca'
import Loja from './pages/Loja'
import LojaPublica from './pages/LojaPublica'
import Followup from './pages/Followup'
import EstudioVerticais from './pages/EstudioVerticais'
import Planos from './pages/Planos'

// Detecta entrada via link de impersonação (admin "entrou como" um tenant)
if (new URLSearchParams(window.location.search).get('impersonado') === '1') {
  sessionStorage.setItem('lota_impersonado', '1')
}

// Guard de autenticação
function PrivateRoute({ children }) {
  const { isAuthenticated, authLoading } = useApp()
  // Aguarda a restauração da sessão (F5) antes de decidir redirecionar
  if (authLoading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: 'var(--bg-primary)',
        color: 'var(--text-muted)', fontSize: 14,
      }}>
        Carregando…
      </div>
    )
  }
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

// Rotas protegidas com layout
function AppRoutes() {
  return (
    <Routes>
      {/* Rotas públicas */}
      <Route path="/login" element={<Login />} />
      <Route path="/como-funciona" element={<ComoFunciona />} />
      <Route path="/f/:slug" element={<FormularioPublico />} />
      <Route path="/i/:token" element={<PaginaIndicacao />} />
      <Route path="/agendar/:slug" element={<AgendarPublico />} />
      <Route path="/loja/:slug" element={<LojaPublica />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <AppLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<VisaoGeral />} />
        <Route path="leads" element={<Leads />} />
        <Route path="followup" element={<Followup />} />
        <Route path="indicacoes" element={<Indicacoes />} />
        <Route path="retencao" element={<Retencao />} />
        <Route path="gestao" element={<Gestao />} />
        <Route path="disparos" element={<Disparos />} />
        <Route path="captacao" element={<Captacao />} />
        <Route path="configuracoes" element={<Configuracoes />} />
        <Route path="mensagens" element={<Mensagens />} />
        <Route path="atendimento" element={<Atendimento />} />
        <Route path="agenda" element={<Agenda />} />
        <Route path="isca" element={<Isca />} />
        <Route path="loja" element={<Loja />} />
        <Route path="admin" element={<Admin />} />
        <Route path="estudio" element={<EstudioVerticais />} />
        <Route path="planos" element={<Planos />} />
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppRoutes />
      </AppProvider>
    </BrowserRouter>
  )
}
