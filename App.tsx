
import React, { useEffect, useState, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import Layout from './components/Layout.tsx';
import { AuthService } from './modules/auth/auth.service.ts';
import { supabase } from './lib/supabase.ts';
import ScrollToTop from './components/ScrollToTop.tsx';


// Public Module
import SitePublicoPage from './modules/site-publico/SitePublico.page.tsx';
import PublicVehicleDetailsPage from './modules/site-publico/PublicVehicleDetails.page.tsx';
import EstoquePublicoPage from './modules/site-publico/estoque-publico/EstoquePublico.page.tsx';

// Auth Module
import AuthPage from './modules/auth/Auth.page.tsx';
import SessionTimeoutModal from './components/SessionTimeoutModal.tsx';
import ForcePasswordChangeModal from './components/ForcePasswordChangeModal.tsx';

// Importação das Páginas ERP
import InicioPage from './modules/inicio/Inicio.page.tsx';
import ParceirosPage from './modules/parceiros/Parceiros.page.tsx';
import CadastrosPage from './modules/cadastros/Cadastros.page.tsx';
import EstoquePage from './modules/estoque/Estoque.page.tsx';
import EstoqueFormPage from './modules/estoque/EstoqueForm.page.tsx';
import EstoqueDetalhesPage from './modules/estoque/EstoqueDetalhes.page.tsx';
import PedidoCompraPage from './modules/pedidos-compra/PedidoCompra.page.tsx';
import PedidoCompraFormPage from './modules/pedidos-compra/PedidoCompraForm.page.tsx';
import PedidoCompraDetalhesPage from './modules/pedidos-compra/PedidoCompraDetalhes.page.tsx';
import PedidoCompraVeiculoDetalhesPage from './modules/pedidos-compra/PedidoCompraVeiculoDetalhes.page.tsx';
import PedidoVendaPage from './modules/pedidos-venda/PedidoVenda.page.tsx';
import VendaFormPage from './modules/pedidos-venda/VendaForm.page.tsx';
import PedidoVendaDetalhesPage from './modules/pedidos-venda/PedidoVendaDetalhes.page.tsx';
import VendaVeiculoDetalhesPage from './modules/pedidos-venda/VendaVeiculoDetalhes.page.tsx';
import CaixaPage from './modules/caixa/Caixa.page.tsx';
import FinanceiroPage from './modules/financeiro/Financeiro.page.tsx';
// Corrected import casing to match 'Performance.page.tsx' and resolve casing mismatch error.
import PerformancePage from './modules/performance/Performance.page.tsx';
import RelatoriosPage from './modules/relatorios/Relatorios.page.tsx';

import AjustesPage from './modules/ajustes/Ajustes.page.tsx';
import StoryGeneratorPage from './modules/marketing/StoryGenerator.page.tsx';
import FeedGeneratorPage from './modules/marketing/FeedGenerator.page.tsx';
import MarketingPage from './modules/marketing/Marketing.page.tsx';

// Submódulos Relatórios
import RelatorioVendasPage from './modules/relatorios/pages/RelatorioVendas.page.tsx';
import RelatorioEstoquePage from './modules/relatorios/pages/RelatorioEstoque.page.tsx';
import RelatorioFinanceiroPage from './modules/relatorios/pages/RelatorioFinanceiro.page.tsx';
import RelatorioAuditoriaPage from './modules/relatorios/pages/RelatorioAuditoria.page.tsx';
import RelatorioComissoesPage from './modules/relatorios/pages/RelatorioComissoes.page.tsx';
import RelatorioServicosPage from './modules/relatorios/pages/RelatorioServicos.page.tsx';
import RelatorioExtratoBancarioPage from './modules/relatorios/pages/RelatorioExtratoBancario.page.tsx';
import RelatorioPatrimonioConciliacaoPage from './modules/relatorios/pages/RelatorioPatrimonioConciliacao.page.tsx';


// Submódulos Cadastros
const CidadesPage = lazy(() => import('./modules/cadastros/cidades/Cidades.page.tsx'));
const MontadorasPage = lazy(() => import('./modules/cadastros/montadoras/Montadoras.page.tsx'));
const TiposVeiculosPage = lazy(() => import('./modules/cadastros/tipos-veiculos/TiposVeiculos.page.tsx'));
const ModelosPage = lazy(() => import('./modules/cadastros/modelos/Modelos.page.tsx'));
const VersoesPage = lazy(() => import('./modules/cadastros/versoes/Versoes.page.tsx'));
const CaracteristicasPage = lazy(() => import('./modules/cadastros/caracteristicas/Caracteristicas.page.tsx'));
const OpcionaisPage = lazy(() => import('./modules/cadastros/opcionais/Opcionais.page.tsx'));
const CoresPage = lazy(() => import('./modules/cadastros/cores/Cores.page.tsx'));
const CondicoesPagamentoPage = lazy(() => import('./modules/cadastros/condicoes-pagamento/CondicoesPagamento.page.tsx'));
const CondicoesRecebimentoPage = lazy(() => import('./modules/cadastros/condicoes-recebimento/CondicoesRecebimento.page.tsx'));
const FormasPagamentoPage = lazy(() => import('./modules/cadastros/formas-pagamento/FormasPagamento.page.tsx'));
const MotorizacaoPage = lazy(() => import('./modules/cadastros/motorizacao/Motorizacao.page.tsx'));
const CombustivelPage = lazy(() => import('./modules/cadastros/combustivel/Combustivel.page.tsx'));
const TransmissaoPage = lazy(() => import('./modules/cadastros/transmissao/Transmissao.page.tsx'));
const CorretoresPage = lazy(() => import('./modules/cadastros/corretores/Corretores.page.tsx'));
const TiposDespesasPage = lazy(() => import('./modules/cadastros/tipos-despesas/TiposDespesas.page.tsx'));

// Submódulos Ajustes
import EmpresaPage from './modules/ajustes/empresa/Empresa.page.tsx';
import MarcaDaguaPage from './modules/ajustes/marca-dagua/MarcaDagua.page.tsx';
import LogsPage from './modules/ajustes/logs/Logs.page.tsx';
import SociosPage from './modules/ajustes/socios/Socios.page.tsx';
import UsuariosPage from './modules/ajustes/usuarios/Usuarios.page.tsx';
import BackupPage from './modules/ajustes/backup/Backup.page.tsx';
import ApiResetPage from './modules/ajustes/api-reset/ApiReset.page.tsx';
import ContasBancariasPage from './modules/ajustes/contas-bancarias/ContasBancarias.page.tsx';
import SaldoInicialPage from './modules/ajustes/saldo-inicial/SaldoInicial.page.tsx';

import { useAuthStore } from './store/auth.store.ts';

// Chave do timer de inatividade — movida para escopo global para acesso facilitado
const LAST_ACTIVITY_KEY = 'dailabs-drivercar-last-activity';

const App: React.FC = () => {
  const queryClient = useQueryClient();
  const { session, profile, loading, setSession, setProfile, setLoading } = useAuthStore();
  const [showTimeoutModal, setShowTimeoutModal] = useState(false);
  const [countdown, setCountdown] = useState(120);
  const showTimeoutModalRef = React.useRef(false);
  const inactivityTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
  // Ref estavél para o startInactivityTimer, atualizado pelo useEffect
  const startInactivityTimerRef = React.useRef<() => void>(() => { });

  const loadProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!error && data) {
        if (data.ativo === false) {
          await AuthService.signOut();
          alert("Sua conta foi desativada pelo administrador.");
          window.location.href = '/login';
          return;
        }
        setProfile(data);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

  useEffect(() => {
    // Busca sessão inicial
    AuthService.getSession().then(s => {
      setSession(s);
      if (s) {
        localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
      }
      if (s?.user) loadProfile(s.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      if (event === 'SIGNED_OUT') {
        setSession(null);
        setProfile(null);
        // Limpa todo o cache React Query para evitar dados stale na próxima sessão
        queryClient.clear();
        // Limpa o timer de inatividade para evitar interferência na próxima sessão
        localStorage.removeItem(LAST_ACTIVITY_KEY);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setSession(currentSession);
        // Reset vital do timer de inatividade ao logar para evitar o bug de reload imediato
        localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
        
        if (currentSession?.user) loadProfile(currentSession.user.id);
        // Invalida todas as queries para forçar refetch com a nova sessão autenticada
        queryClient.invalidateQueries();
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [setSession, setProfile, setLoading]);

  // Constantes de tempo
  const INACTIVITY_THRESHOLD = 29 * 60 * 1000; // 29 minutos para mostrar aviso
  const GRACE_PERIOD = 2 * 60 * 1000; // 2 minutos de countdown
  const TOTAL_TIMEOUT = INACTIVITY_THRESHOLD + GRACE_PERIOD; // 31 minutos total

  // Monitoramento de inatividade resiliente
  useEffect(() => {
    if (!session) {
      setShowTimeoutModal(false);
      showTimeoutModalRef.current = false;
      return;
    }

    const updateLastActivity = () => {
      const now = Date.now().toString();
      localStorage.setItem(LAST_ACTIVITY_KEY, now);
      // Se o modal estiver aberto e o usuário interagir, fecha o modal (extende a sessão)
      if (showTimeoutModalRef.current) {
        handleContinueSession();
      }
    };

    const doLogout = async () => {
      try {
        console.log('Executando logout por inatividade...');
        setShowTimeoutModal(false);
        showTimeoutModalRef.current = false;
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
        await AuthService.signOut();
      } catch (err) {
        console.error('Logout error during session timeout:', err);
        window.location.reload();
      }
    };

    const checkInactivity = () => {
      const lastActivity = parseInt(localStorage.getItem(LAST_ACTIVITY_KEY) || Date.now().toString());
      const now = Date.now();
      const elapsed = now - lastActivity;

      if (elapsed >= TOTAL_TIMEOUT) {
        // Tempo total expirado
        doLogout();
      } else if (elapsed >= INACTIVITY_THRESHOLD) {
        // Entrou no período de carência (countdown)
        if (!showTimeoutModalRef.current) {
          setShowTimeoutModal(true);
          showTimeoutModalRef.current = true;
          
          const expiresAt = lastActivity + TOTAL_TIMEOUT;
          
          if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
          
          countdownIntervalRef.current = setInterval(() => {
            const remaining = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
            setCountdown(remaining);
            if (remaining <= 0) {
              clearInterval(countdownIntervalRef.current!);
              countdownIntervalRef.current = null;
              doLogout();
            }
          }, 1000);
        } else {
          // Já está aberto, apenas garante que o countdown reflita o tempo real (caso de throttling)
          const expiresAt = lastActivity + TOTAL_TIMEOUT;
          const remaining = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
          setCountdown(remaining);
        }
      } else {
        // Ainda está dentro do tempo de atividade
        if (showTimeoutModalRef.current) {
          setShowTimeoutModal(false);
          showTimeoutModalRef.current = false;
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
        }
      }
    };

    // Inicializa a atividade se não existir
    if (!localStorage.getItem(LAST_ACTIVITY_KEY)) {
      updateLastActivity();
    }

    // Eventos de interação para resetar o timer
    const events = ['mousedown', 'mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(e => document.addEventListener(e, updateLastActivity));

    // Sentinel: Verifica a inatividade a cada 5 segundos (suficiente para o check principal)
    const sentinelInterval = setInterval(checkInactivity, 5000);

    // Visibility Change: Re-checa instantaneamente ao voltar para a aba
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkInactivity();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Storage: Sincroniza entre abas (se outra aba resetar a atividade)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === LAST_ACTIVITY_KEY) {
        checkInactivity();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // Executa check inicial
    checkInactivity();

    return () => {
      events.forEach(e => document.removeEventListener(e, updateLastActivity));
      clearInterval(sentinelInterval);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [session]);

  const handleContinueSession = () => {
    localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
    setShowTimeoutModal(false);
    showTimeoutModalRef.current = false;
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  };

  const handleManualLogout = () => {
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    setShowTimeoutModal(false);
    showTimeoutModalRef.current = false;
    AuthService.signOut().catch(console.error);
  };

  // Se estiver carregando, mostramos um loader apenas para rotas internas (via hash)
  const isPublicRoute = false;

  if (loading && !isPublicRoute) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-600 font-black text-[10px] uppercase tracking-[0.4em]">DAILABS DRIVERCAR</p>
        </div>
      </div>
    );
  }

  return (

    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        {/* Rotas Públicas (Inativadas) */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/estoque-publico" element={<Navigate to="/login" replace />} />
        <Route path="/veiculo/:id" element={<Navigate to="/login" replace />} />

        {/* Auth */}
        <Route path="/login" element={session ? <Navigate to={window.innerWidth < 768 ? '/caixa' : '/inicio'} /> : <AuthPage />} />

        {/* Módulos Administrativos (ERP) */}
        <Route path="/*" element={
          session ? (
            <Layout>
              <Suspense fallback={<div className="flex h-[80vh] w-full items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div></div>}>
                <Routes>
                  <Route path="/inicio" element={<InicioPage />} />
                  <Route path="/parceiros" element={<ParceirosPage />} />
                  <Route path="/cadastros" element={<CadastrosPage />} />
                  <Route path="/cadastros/cidades" element={<CidadesPage />} />
                  <Route path="/cadastros/montadoras" element={<MontadorasPage />} />
                  <Route path="/cadastros/tipos-veiculos" element={<TiposVeiculosPage />} />
                  <Route path="/cadastros/modelos" element={<ModelosPage />} />
                  <Route path="/cadastros/versoes" element={<VersoesPage />} />
                  <Route path="/cadastros/caracteristicas" element={<CaracteristicasPage />} />
                  <Route path="/cadastros/opcionais" element={<OpcionaisPage />} />
                  <Route path="/cadastros/cores" element={<CoresPage />} />
                  <Route path="/cadastros/motorizacao" element={<MotorizacaoPage />} />
                  <Route path="/cadastros/combustivel" element={<CombustivelPage />} />
                  <Route path="/cadastros/transmissao" element={<TransmissaoPage />} />
                  <Route path="/cadastros/formas-pagamento" element={<FormasPagamentoPage />} />
                  <Route path="/cadastros/condicoes-pagamento" element={<CondicoesPagamentoPage />} />
                  <Route path="/cadastros/condicoes-recebimento" element={<CondicoesRecebimentoPage />} />
                  <Route path="/cadastros/corretores" element={<CorretoresPage />} />
                  <Route path="/cadastros/tipos-despesas" element={<TiposDespesasPage />} />

                  <Route path="/estoque" element={<EstoquePage />} />
                  <Route path="/estoque/:id" element={<EstoqueDetalhesPage />} />
                  <Route path="/estoque/editar/:id" element={<EstoqueFormPage />} />

                  <Route path="/pedidos-compra" element={<PedidoCompraPage />} />
                  <Route path="/pedidos-compra/novo" element={<PedidoCompraFormPage />} />
                  <Route path="/pedidos-compra/:id" element={<PedidoCompraDetalhesPage />} />
                  <Route path="/pedidos-compra/:id/veiculo-detalhes/:veiculoId" element={<PedidoCompraVeiculoDetalhesPage />} />
                  <Route path="/pedidos-compra/editar/:id" element={<PedidoCompraFormPage />} />
                  <Route path="/pedidos-compra/:pedidoId/adicionar-veiculo" element={<EstoqueFormPage />} />
                  <Route path="/pedidos-compra/:pedidoId/veiculo/editar/:id" element={<EstoqueFormPage />} />

                  <Route path="/pedidos-venda" element={<PedidoVendaPage />} />
                  <Route path="/pedidos-venda/novo" element={<VendaFormPage />} />
                  <Route path="/pedidos-venda/editar/:id" element={<VendaFormPage />} />
                  <Route path="/pedidos-venda/:id" element={<PedidoVendaDetalhesPage />} />
                  <Route path="/pedidos-venda/:pedidoId/veiculo/editar/:id" element={<EstoqueFormPage />} />
                  <Route path="/pedidos-venda/:id/veiculo-detalhes/:veiculoId" element={<VendaVeiculoDetalhesPage />} />

                  <Route path="/caixa" element={<CaixaPage />} />
                  <Route path="/financeiro" element={<FinanceiroPage />} />
                  <Route path="/performance" element={<PerformancePage />} />

                  <Route path="/relatorios" element={<RelatoriosPage />} />
                  <Route path="/relatorios/vendas" element={<RelatorioVendasPage />} />
                  <Route path="/relatorios/estoque" element={<RelatorioEstoquePage />} />
                  <Route path="/relatorios/financeiro" element={<RelatorioFinanceiroPage />} />
                  <Route path="/relatorios/auditoria" element={<RelatorioAuditoriaPage />} />
                  <Route path="/relatorios/comissoes" element={<RelatorioComissoesPage />} />
                  <Route path="/relatorios/servicos" element={<RelatorioServicosPage />} />
                  <Route path="/relatorios/extrato-bancario" element={<RelatorioExtratoBancarioPage />} />
                  <Route path="/relatorios/conciliacao-patrimonial" element={<RelatorioPatrimonioConciliacaoPage />} />




                  <Route path="/ajustes" element={<AjustesPage />} />
                  <Route path="/ajustes/empresa" element={<EmpresaPage />} />
                  <Route path="/ajustes/marca-dagua" element={<MarcaDaguaPage />} />
                  <Route path="/ajustes/logs" element={<LogsPage />} />
                  <Route path="/ajustes/socios" element={<SociosPage />} />
                  <Route path="/ajustes/usuarios" element={<UsuariosPage />} />
                  <Route path="/ajustes/backup" element={<BackupPage />} />
                  <Route path="/ajustes/api-reset" element={<ApiResetPage />} />
                  <Route path="/ajustes/contas-bancarias" element={<ContasBancariasPage />} />
                  <Route path="/ajustes/saldo-inicial" element={<SaldoInicialPage />} />

                  <Route path="/marketing" element={<MarketingPage />} />
                  <Route path="/marketing/feed" element={<FeedGeneratorPage />} />
                  <Route path="/marketing/stories" element={<StoryGeneratorPage />} />

                  <Route path="*" element={<Navigate to={window.innerWidth < 768 ? '/caixa' : '/inicio'} />} />
                </Routes>
              </Suspense>
            </Layout>
          ) : (
            <Navigate to="/login" replace />
          )
        } />
      </Routes>

      {session && (
        <SessionTimeoutModal
          isOpen={showTimeoutModal && !profile?.force_password_change}
          countdown={countdown}
          onContinue={handleContinueSession}
          onLogout={handleManualLogout}
        />
      )}

      {session && profile?.force_password_change && (
        <ForcePasswordChangeModal
          onSuccess={() => loadProfile(session.user.id)}
          onLogout={handleManualLogout}
        />
      )}
    </BrowserRouter>
  );
};

export default App;
