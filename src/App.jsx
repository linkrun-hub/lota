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
        <Route path="indicacoes" element={<Indicacoes />} />
        <Route path="retencao" element={<Retencao />} />
        <Route path="gestao" element={<Gestao />} />
        <Route path="disparos" element={<Disparos />} />
        <Route path="captacao" element={<Captacao />} />
        <Route path="configuracoes" element={<Configuracoes />} />
        <Route path="mensagens" element={<Mensagens />} />
        <Route path="atendimento" element={<Atendimento />} />
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
