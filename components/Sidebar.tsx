
import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { AuthService } from '../modules/auth/auth.service';
import ConfirmModal from './ConfirmModal';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  isMobileOpen?: boolean;
  setIsMobileOpen?: (isOpen: boolean) => void;
}

interface MenuItem {
  path: string;
  label: string;
  icon: string;
  children?: { path: string; label: string; icon?: string }[];
}

const menuItems: MenuItem[] = [
  { path: '/inicio', label: 'Início', icon: 'M 3 12 L 5 10 M 5 10 L 12 3 L 19 10 M 5 10 V 20 A 1 1 0 0 0 6 21 H 9 M 19 10 L 21 12 M 19 10 V 20 A 1 1 0 0 1 18 21 H 15 M 9 21 A 1 1 0 0 0 10 20 V 16 A 1 1 0 0 1 11 15 H 13 A 1 1 0 0 1 14 16 V 20 A 1 1 0 0 0 15 21 M 9 21 H 15' },
  { path: '/parceiros', label: 'Parceiros', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
  {
    path: '/cadastros',
    label: 'Cadastros',
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    children: [
      { path: '/cadastros/cidades', label: 'Cidades' },
      { path: '/cadastros/montadoras', label: 'Montadoras' },
      { path: '/cadastros/tipos-veiculos', label: 'Tipos de Veículos' },
      { path: '/cadastros/modelos', label: 'Modelos' },
      { path: '/cadastros/versoes', label: 'Versões' },
      { path: '/cadastros/caracteristicas', label: 'Características' },
      { path: '/cadastros/opcionais', label: 'Opcionais' },
      { path: '/cadastros/motorizacao', label: 'Motorização' },
      { path: '/cadastros/combustivel', label: 'Combustível' },
      { path: '/cadastros/transmissao', label: 'Transmissão' },
      { path: '/cadastros/cores', label: 'Cores' },
      { path: '/cadastros/corretores', label: 'Corretores' },
      { path: '/cadastros/tipos-despesas', label: 'Tipos de Despesas' },
      { path: '/cadastros/formas-pagamento', label: 'Formas de Pagamento' },
      { path: '/cadastros/condicoes-pagamento', label: 'Condição de Pagamento' },
      { path: '/cadastros/condicoes-recebimento', label: 'Condição de Recebimento' },
    ]
  },
  { path: '/estoque', label: 'Estoque', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
  { path: '/pedidos-compra', label: 'Entrada de Veículos', icon: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z' },
  { path: '/pedidos-venda', label: 'Saída de Veículos', icon: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z' },
  { path: '/caixa', label: 'Caixa PDV', icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z' },
  { path: '/financeiro', label: 'Financeiro', icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z' },
  { path: '/performance', label: 'Performance', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
  { path: '/relatorios', label: 'Relatórios', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { path: '/marketing', label: 'Marketing', icon: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z' },
  { path: '/ajustes', label: 'Ajustes', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924-1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },

];

import { useAuthStore } from '../store/auth.store';

const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen, isMobileOpen, setIsMobileOpen }) => {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useAuthStore();

  const toggleExpand = (label: string) => {
    if (!isOpen) setIsOpen(true);
    setExpanded(expanded === label ? null : label);
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      // 1. Realiza o sign out no Supabase
      await AuthService.signOut();

      // 2. Redireciona para a raiz pública e recarrega para limpar estados
      window.location.href = '/';
    } catch (err) {
      console.error('Erro ao sair:', err);
      // Fallback radical para garantir a saída
      window.location.href = '/';
    } finally {
      setIsLoggingOut(false);
      setShowLogoutConfirm(false);
    }
  };

  return (
    <>
      {/* Overlay Mobile */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] md:hidden"
          onClick={() => setIsMobileOpen?.(false)}
        />
      )}
      
      <aside
        className={`fixed left-0 top-0 h-full bg-slate-900 text-white transition-all duration-300 z-[70] flex flex-col 
          ${isOpen ? 'w-64' : 'w-20'}
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
      <div className="p-4 flex items-center justify-between border-b border-slate-800">
        <div className={`flex items-center space-x-3 overflow-hidden transition-all ${isOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0'}`}>
          <div className="flex-shrink-0">
            <img
              src="/logos/dailabs_logo.png"
              alt="Dailabs Logo"
              className="w-10 h-10 object-contain"
            />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-xl tracking-tight leading-none text-white">Dailabs</span>
            <span className="text-[9px] text-slate-400 font-medium whitespace-nowrap">Creative AI & Softwares</span>
          </div>
        </div>
        <button
          onClick={() => {
            if (window.innerWidth < 768) {
              setIsMobileOpen?.(false);
            } else {
              setIsOpen(!isOpen);
              if (isOpen) setExpanded(null);
            }
          }}
          className="p-1 hover:bg-slate-800 rounded-md"
        >
          <svg className="w-6 h-6 md:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          <svg className="w-6 h-6 hidden md:block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {isOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7m0 0l7-7m-7 7h18" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            )}
          </svg>
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1 custom-scrollbar">
        {menuItems.map((item) => {
          const hasChildren = item.children && item.children.length > 0;
          const isExpanded = expanded === item.label;
          const isActive = location.pathname.startsWith(item.path);

          return (
            <div key={item.path} className="flex flex-col">
              {hasChildren ? (
                <button
                  onClick={() => toggleExpand(item.label)}
                  className={`flex items-center p-3 rounded-xl transition-colors duration-200 group w-full text-left ${isActive ? 'bg-[#004691]/10 text-[#004691]' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                >
                  <svg className={`w-6 h-6 shrink-0 ${isOpen ? 'mr-3' : 'mx-auto'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                  </svg>
                  <span className={`whitespace-nowrap font-medium transition-all duration-300 flex-1 ${isOpen ? 'opacity-100 w-auto block' : 'opacity-0 w-0 hidden'}`}>
                    {item.label}
                  </span>
                  {isOpen && (
                    <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                  {!isOpen && (
                    <div className="absolute left-16 px-3 py-2 bg-slate-800 text-white text-xs font-bold rounded-lg shadow-xl border border-slate-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-[100] pointer-events-none flex items-center">
                      {item.label}
                      <div className="absolute w-2 h-2 bg-slate-800 border-l border-b border-slate-700 transform rotate-45 -left-1 top-1/2 -translate-y-1/2"></div>
                    </div>
                  )}
                </button>
              ) : (
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center p-3 rounded-xl transition-colors duration-200 group ${isActive ? 'bg-[#004691] text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`
                  }
                >
                  <svg className={`w-6 h-6 shrink-0 ${isOpen ? 'mr-3' : 'mx-auto'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                  </svg>
                  <span className={`whitespace-nowrap font-medium transition-all duration-300 ${isOpen ? 'opacity-100 w-auto block' : 'opacity-0 w-0 hidden'}`}>
                    {item.label}
                  </span>
                  {!isOpen && (
                    <div className="absolute left-16 px-3 py-2 bg-slate-800 text-white text-xs font-bold rounded-lg shadow-xl border border-slate-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-[100] pointer-events-none flex items-center">
                      {item.label}
                      <div className="absolute w-2 h-2 bg-slate-800 border-l border-b border-slate-700 transform rotate-45 -left-1 top-1/2 -translate-y-1/2"></div>
                    </div>
                  )}
                </NavLink>
              )}

              {hasChildren && isExpanded && isOpen && (
                <div className="ml-9 mt-1 space-y-1 animate-in slide-in-from-left-2 duration-200">
                  {item.children?.map((child) => (
                    <NavLink
                      key={child.path}
                      to={child.path}
                      className={({ isActive }) =>
                        `block p-2 text-xs font-medium rounded-md transition-colors ${isActive ? 'text-white bg-[#004691]/50' : 'text-slate-500 hover:text-white hover:bg-slate-800/50'
                        }`
                      }
                    >
                      {child.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800 space-y-4">
        <div className={`flex items-center ${isOpen ? 'space-x-3' : 'justify-center'}`}>
          <div className="w-8 h-8 rounded-full bg-[#004691] flex items-center justify-center text-[10px] font-black shadow-lg ring-2 ring-slate-800 uppercase">
            {profile?.nome?.charAt(0) || 'U'}
          </div>
          {isOpen && (
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold truncate text-white">{profile?.nome || 'Usuário'}</span>
              <span className="text-[9px] text-emerald-500 font-black uppercase tracking-wider">{profile?.role || 'Online'}</span>
            </div>
          )}
        </div>

        <button
          onClick={() => setShowLogoutConfirm(true)}
          className={`w-full flex items-center p-3 rounded-xl transition-all group ${isOpen
            ? 'bg-slate-800/40 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 border border-transparent hover:border-rose-500/20'
            : 'justify-center text-slate-400 hover:text-rose-400 hover:bg-rose-500/10'
            }`}
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          {isOpen && (
            <span className="ml-3 text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap">
              Sair
            </span>
          )}
          {!isOpen && (
            <div className="absolute left-16 px-3 py-2 bg-rose-600 text-white text-xs font-bold rounded-lg shadow-xl border border-rose-500 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-[100] pointer-events-none flex items-center">
              Sair do Sistema
              <div className="absolute w-2 h-2 bg-rose-600 border-l border-b border-rose-500 transform rotate-45 -left-1 top-1/2 -translate-y-1/2"></div>
            </div>
          )}
        </button>
      </div>

      <ConfirmModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
        title="Encerrar Sessão?"
        message="Deseja realmente sair do sistema?"
        confirmText="Sim, Sair agora"
        cancelText="Continuar logado"
        variant="danger"
        isLoading={isLoggingOut}
      />
    </aside>
    </>
  );
};

export default Sidebar;
