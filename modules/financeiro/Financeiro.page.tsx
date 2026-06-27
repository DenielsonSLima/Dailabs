import React, { useState, useEffect } from 'react';
import { FinanceiroService } from './financeiro.service';
import { IFinanceiroKpis } from './financeiro.types';

// Importação dos Submódulos
import VisaoGeralPage from './submodules/visao-geral/VisaoGeral.page';
import ContasPagarPage from './submodules/contas-pagar/ContasPagar.page';
import ContasReceberPage from './submodules/contas-receber/ContasReceber.page';
import DespesasVariaveisPage from './submodules/despesas-variaveis/DespesasVariaveis.page';
import DespesasFixasPage from './submodules/despesas-fixas/DespesasFixas.page';
import OutrosCreditosPage from './submodules/outros-creditos/OutrosCreditos.page';
import OutrosDebitosPage from './submodules/outros-debitos/OutrosDebitos.page';
import RetiradasSociosPage from './submodules/retiradas-socios/RetiradasSocios.page';
import TransferenciasPage from './submodules/transferencias/Transferencias.page';
import ExtratoPage from './submodules/extrato/Extrato.page';
import AjustesFinanceiroPage from './submodules/ajustes/AjustesFinanceiro.page';
import { AjustesCentralService } from '../ajustes/ajustes.service';

type SubModule =
  | 'GERAL' | 'PAGAR' | 'RECEBER' | 'DESPESAS' | 'VARIAVEIS' | 'FIXAS'
  | 'CREDITOS' | 'DEBITOS' | 'RETIRADAS' | 'TRANSF' | 'HISTORICO' | 'AJUSTES';

const FinanceiroPage: React.FC = () => {
  const [activeSub, setActiveSub] = useState<SubModule>('GERAL');
  const [kpis, setKpis] = useState<IFinanceiroKpis | null>(null);
  const [loading, setLoading] = useState(true);
  const [modoDespesaUnica, setModoDespesaUnica] = useState(false);

  useEffect(() => {
    loadKpis();

    // Assinar múltiplas tabelas para garantir atualização em tempo real dos KPIs
    const subTitulos = FinanceiroService.subscribeToTable('fin_titulos', () => loadKpis(true));
    const subTransacoes = FinanceiroService.subscribeToTable('fin_transacoes', () => loadKpis(true));
    const subRetiradas = FinanceiroService.subscribeToTable('fin_retiradas', () => loadKpis(true));
    const subTransferencias = FinanceiroService.subscribeToTable('fin_transferencias', () => loadKpis(true));

    return () => {
      subTitulos.unsubscribe();
      subTransacoes.unsubscribe();
      subRetiradas.unsubscribe();
      subTransferencias.unsubscribe();
    };
  }, []);

  useEffect(() => {
    AjustesCentralService.getSettings('financeiro').then(data => {
      setModoDespesaUnica(!!data?.modo_despesa_unica);
    });

    const handleSettingsUpdated = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      setModoDespesaUnica(!!detail?.modo_despesa_unica);
    };

    window.addEventListener('dailabs-financeiro-settings-updated', handleSettingsUpdated);
    return () => window.removeEventListener('dailabs-financeiro-settings-updated', handleSettingsUpdated);
  }, []);

  useEffect(() => {
    if (modoDespesaUnica && (activeSub === 'FIXAS' || activeSub === 'VARIAVEIS')) {
      setActiveSub('DESPESAS');
    }
    if (!modoDespesaUnica && activeSub === 'DESPESAS') {
      setActiveSub('VARIAVEIS');
    }
  }, [modoDespesaUnica, activeSub]);

  async function loadKpis(silent = false) {
    if (!silent) setLoading(true);
    try {
      const data = await FinanceiroService.getKpis();
      setKpis(data);
    } finally {
      setLoading(false);
    }
  }

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const totalDespesas = (kpis?.despesas_fixas || 0) + (kpis?.despesas_variaveis || 0);

  // Definição do Menu conforme a ordem solicitada
  const line1: { id: SubModule; label: string; icon: string; color: string }[] = [
    { id: 'GERAL', label: 'Dashboard', icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z', color: 'indigo' },
    { id: 'PAGAR', label: 'Contas a Pagar', icon: 'M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z', color: 'rose' },
    { id: 'RECEBER', label: 'Contas a Receber', icon: 'M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z', color: 'emerald' },
    ...(modoDespesaUnica
      ? [{ id: 'DESPESAS' as SubModule, label: 'Despesas', icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9', color: 'orange' }]
      : [
        { id: 'VARIAVEIS' as SubModule, label: 'Despesas Variáveis', icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9', color: 'orange' },
        { id: 'FIXAS' as SubModule, label: 'Despesas Fixas', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16', color: 'slate' },
      ]),
  ];

  const line2: { id: SubModule; label: string; icon: string; color: string }[] = [
    { id: 'CREDITOS', label: 'Outros Créditos', icon: 'M12 8v13m0-13V6a2 2 0 112 2h-2z', color: 'teal' },
    { id: 'DEBITOS', label: 'Outros Débitos', icon: 'M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z', color: 'rose' },
    { id: 'RETIRADAS', label: 'Retiradas', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2', color: 'amber' },
    { id: 'TRANSF', label: 'Transferências entre Contas', icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4', color: 'blue' },
    { id: 'HISTORICO', label: 'Histórico Geral', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2', color: 'slate' },
    { id: 'AJUSTES', label: 'Ajustes', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35', color: 'indigo' },
  ];

  const renderMenuItem = (item: any) => (
    <button
      key={item.id}
      onClick={() => setActiveSub(item.id)}
      className={`flex items-center px-5 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${activeSub === item.id
        ? 'bg-slate-900 text-white shadow-2xl scale-105 z-10'
        : 'bg-white text-slate-400 hover:text-slate-600 hover:bg-slate-50 border border-slate-200'
        }`}
    >
      <svg className={`w-4 h-4 mr-2 ${activeSub === item.id ? 'text-white' : `text-${item.color}-500`}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
      </svg>
      {item.label}
    </button>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">

      {/* Dashboard de KPIs – 2 linhas x 3 colunas */}
      <div className="space-y-3">
        {/* Linha 1 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Saldo Disponível */}
          <div className="bg-slate-900 rounded-2xl px-5 py-4 text-white shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-500 rounded-full blur-[60px] opacity-20"></div>
            <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-0.5 relative z-10">Saldo Disponível</p>
            {loading ? (
              <div className="h-7 bg-slate-800 rounded animate-pulse w-32 relative z-10"></div>
            ) : (
              <h3 className="text-xl font-black tracking-tight relative z-10">{formatCurrency(kpis?.saldo_disponivel || 0)}</h3>
            )}
          </div>
          {/* Compra de Veículos */}
          <div className="bg-white rounded-2xl px-5 py-4 border border-slate-200 shadow-sm">
            <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest mb-0.5">Compra de Veículos</p>
            {loading ? (
              <div className="h-7 bg-slate-200 rounded animate-pulse w-32"></div>
            ) : (
              <h3 className="text-xl font-black text-slate-900 tracking-tight">{formatCurrency(kpis?.compra_veiculos || 0)}</h3>
            )}
          </div>
          {/* Despesas Fixas do Mês */}
          <div className="bg-white rounded-2xl px-5 py-4 border border-slate-200 shadow-sm">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-0.5">{modoDespesaUnica ? 'Despesas' : 'Despesas Fixas'}</p>
            {loading ? (
              <div className="h-7 bg-slate-200 rounded animate-pulse w-32"></div>
            ) : (
              <h3 className="text-xl font-black text-slate-900 tracking-tight">{formatCurrency(modoDespesaUnica ? totalDespesas : (kpis?.despesas_fixas || 0))}</h3>
            )}
          </div>
        </div>
        {/* Linha 2 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Despesas Variáveis do Mês */}
          {!modoDespesaUnica && (
            <div className="bg-white rounded-2xl px-5 py-4 border border-slate-200 shadow-sm">
              <p className="text-[9px] font-black text-orange-500 uppercase tracking-widest mb-0.5">Despesas Variáveis</p>
              {loading ? (
                <div className="h-7 bg-slate-200 rounded animate-pulse w-32"></div>
              ) : (
                <h3 className="text-xl font-black text-slate-900 tracking-tight">{formatCurrency(kpis?.despesas_variaveis || 0)}</h3>
              )}
            </div>
          )}
          {/* Outras Receitas */}
          <div className="bg-white rounded-2xl px-5 py-4 border border-slate-200 shadow-sm">
            <p className="text-[9px] font-black text-teal-500 uppercase tracking-widest mb-0.5">Outras Receitas</p>
            {loading ? (
              <div className="h-7 bg-slate-200 rounded animate-pulse w-32"></div>
            ) : (
              <h3 className="text-xl font-black text-slate-900 tracking-tight">{formatCurrency(kpis?.outras_receitas || 0)}</h3>
            )}
          </div>
          {/* Outros Débitos */}
          <div className="bg-white rounded-2xl px-5 py-4 border border-slate-200 shadow-sm">
            <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest mb-0.5">Outros Débitos</p>
            {loading ? (
              <div className="h-7 bg-slate-200 rounded animate-pulse w-32"></div>
            ) : (
              <h3 className="text-xl font-black text-slate-900 tracking-tight">{formatCurrency(kpis?.outros_debitos || 0)}</h3>
            )}
          </div>
          {/* Retiradas */}
          <div className="bg-white rounded-2xl px-5 py-4 border border-slate-200 shadow-sm">
            <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest mb-0.5">Retiradas</p>
            {loading ? (
              <div className="h-7 bg-slate-200 rounded animate-pulse w-32"></div>
            ) : (
              <h3 className="text-xl font-black text-slate-900 tracking-tight">{formatCurrency(kpis?.retiradas || 0)}</h3>
            )}
          </div>
        </div>
      </div>

      {/* Menu de Navegação em Duas Linhas */}
      <div className="space-y-4">
        {/* Linha 1 */}
        <div className="flex flex-wrap gap-3">
          {line1.map(renderMenuItem)}
        </div>
        {/* Linha 2 */}
        <div className="flex flex-wrap gap-3">
          {line2.map(renderMenuItem)}
        </div>
      </div>

      {/* Área Dinâmica de Submódulos */}
      <div className="min-h-[600px] animate-in slide-in-from-bottom-4 duration-500">
        {activeSub === 'GERAL' && <VisaoGeralPage />}
        {activeSub === 'PAGAR' && <ContasPagarPage />}
        {activeSub === 'RECEBER' && <ContasReceberPage />}
        {activeSub === 'DESPESAS' && <DespesasVariaveisPage modoUnificado />}
        {activeSub === 'VARIAVEIS' && <DespesasVariaveisPage />}
        {activeSub === 'FIXAS' && <DespesasFixasPage />}
        {activeSub === 'CREDITOS' && <OutrosCreditosPage />}
        {activeSub === 'DEBITOS' && <OutrosDebitosPage />}
        {activeSub === 'RETIRADAS' && <RetiradasSociosPage />}
        {activeSub === 'TRANSF' && <TransferenciasPage />}
        {activeSub === 'HISTORICO' && <ExtratoPage />}
        {activeSub === 'AJUSTES' && <AjustesFinanceiroPage />}
      </div>

    </div>
  );
};

export default FinanceiroPage;
