import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PedidosVendaService } from './pedidos-venda.service';
import { PedidosVendaRealtime } from './pedidos-venda.realtime';
import { invalidatePedidosVendaOverview } from './pedidos-venda.query-invalidation';
import { IVendaFiltros, VendaTab } from './pedidos-venda.types';
import PedidosVendaList from './components/PedidosVendaList';
import PedidosVendaFilters from './components/PedidosVendaFilters';
import PedidosVendaKpis from './components/PedidosVendaKpis';
import { CorretoresService } from '../cadastros/corretores/corretores.service';
import { SociosService } from '../ajustes/socios/socios.service';

const PedidoVendaPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Pagination & Filter States
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12;
  const [activeTab, setActiveTab] = useState<VendaTab>('MES_ATUAL');
  const [filtros, setFiltros] = useState<IVendaFiltros>({
    busca: '',
    dataInicio: '',
    dataFim: '',
    corretorId: '',
    socioId: ''
  });

  // Queries
  const { data: listData, isLoading: isLoadingList } = useQuery({
    queryKey: ['pedidos_venda_list', activeTab, filtros, currentPage],
    queryFn: () => PedidosVendaService.getAll({ ...filtros, page: currentPage, limit: ITEMS_PER_PAGE }, activeTab),
  });

  const { data: statsData } = useQuery({
    queryKey: ['pedidos_venda_stats', activeTab, filtros],
    queryFn: () => PedidosVendaService.getDashboardStats(filtros, activeTab),
  });

  const { data: draftCount = 0 } = useQuery({
    queryKey: ['pedidos_venda_draft_count'],
    queryFn: () => PedidosVendaService.getDraftCount(),
  });

  const { data: corretores = [] } = useQuery({
    queryKey: ['corretores'],
    queryFn: () => CorretoresService.getAll(),
  });

  const { data: socios = [] } = useQuery({
    queryKey: ['socios'],
    queryFn: () => SociosService.getAll(),
  });

  // Real-time Subscription
  useEffect(() => {
    const sub = PedidosVendaRealtime.subscribe(() => {
      invalidatePedidosVendaOverview(queryClient);
    });
    return () => {
      sub.unsubscribe();
    };
  }, [queryClient]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, filtros]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= (listData?.totalPages || 1)) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const pedidos = listData?.data || [];
  const totalPages = listData?.totalPages || 1;
  const totalCount = listData?.count || 0;
  const statsPedidos = statsData || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tighter">Pedidos de Venda</h1>
          <p className="text-slate-500 mt-1 uppercase text-[10px] font-black tracking-widest">Gestão comercial e saídas</p>
        </div>
        <button
          onClick={() => navigate('/pedidos-venda/novo')}
          className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg active:scale-95 flex items-center"
        >
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
          Nova Venda
        </button>
      </div>

      <PedidosVendaKpis pedidos={statsPedidos} />

      <div className="flex bg-slate-100 p-1 rounded-2xl w-fit">
        <button onClick={() => setActiveTab('MES_ATUAL')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'MES_ATUAL' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Mês Atual</button>
        <button onClick={() => setActiveTab('RASCUNHO')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'RASCUNHO' ? 'bg-white text-amber-500 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
          Rascunho
          {draftCount > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${activeTab === 'RASCUNHO' ? 'bg-amber-100 text-amber-600' : 'bg-slate-200 text-slate-500'}`}>
              {draftCount}
            </span>
          )}
        </button>
        <button onClick={() => setActiveTab('TODOS')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'TODOS' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Todas</button>
      </div>

      <PedidosVendaFilters
        filtros={filtros}
        corretores={corretores}
        socios={socios}
        onChange={setFiltros}
      />

      <PedidosVendaList pedidos={pedidos} loading={isLoadingList} onEdit={(p) => navigate(`/pedidos-venda/${p.id}`)} />

      {/* Pagination */}
      {!isLoadingList && totalPages > 1 && (
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
            Página <span className="text-slate-900">{currentPage}</span> de <span className="text-slate-900">{totalPages}</span>
            <span className="ml-2 opacity-50">({totalCount} vendas)</span>
          </p>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-3 rounded-2xl hover:bg-slate-50 text-slate-400 hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <button className="w-10 h-10 rounded-xl text-xs font-black bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-110 transition-all">
              {currentPage}
            </button>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-3 rounded-2xl hover:bg-slate-50 text-slate-400 hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PedidoVendaPage;
