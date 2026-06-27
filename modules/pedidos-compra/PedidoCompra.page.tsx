import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PedidosCompraService } from './pedidos-compra.service';
import { PedidosCompraRealtime } from './pedidos-compra.realtime';
import { invalidatePedidosCompraOverview } from './pedidos-compra.query-invalidation';
import { IPedidoFiltros } from './pedidos-compra.types';
import PedidosList from './components/PedidosList';
import PedidosFilters from './components/PedidosFilters';
import PedidosKpis from './components/PedidosKpis';
import { CorretoresService } from '../cadastros/corretores/corretores.service';
import { SociosService } from '../ajustes/socios/socios.service';

const PedidoCompraPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Pagination & Filter States
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12;
  const [activeTab, setActiveTab] = useState<'EFETIVADOS' | 'RASCUNHO' | 'TODOS'>('EFETIVADOS');
  const [filtros, setFiltros] = useState<IPedidoFiltros>({
    busca: '',
    dataInicio: '',
    dataFim: '',
    corretorId: '',
    socioId: ''
  });

  // Queries
  const { data: listData, isLoading: isLoadingList } = useQuery({
    queryKey: ['pedidos_compra_list', activeTab, filtros, currentPage],
    queryFn: () => PedidosCompraService.getAll({ ...filtros, page: currentPage, limit: ITEMS_PER_PAGE }, activeTab),
  });

  const { data: statsData } = useQuery({
    queryKey: ['pedidos_compra_stats', activeTab, filtros],
    queryFn: () => PedidosCompraService.getDashboardStats(filtros, activeTab),
  });

  const { data: draftCount = 0 } = useQuery({
    queryKey: ['pedidos_compra_draft_count'],
    queryFn: () => PedidosCompraService.getDraftCount(),
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
    const sub = PedidosCompraRealtime.subscribe(() => {
      invalidatePedidosCompraOverview(queryClient);
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
          <h1 className="text-3xl font-bold text-slate-900 tracking-tighter">Pedidos de Compra</h1>
          <p className="text-slate-500 mt-1 uppercase text-[10px] font-black tracking-widest">Gestão de aquisições de frota</p>
        </div>
        <button
          onClick={() => navigate('/pedidos-compra/novo')}
          className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg active:scale-95 flex items-center"
        >
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
          Novo Pedido
        </button>
      </div>

      <PedidosKpis pedidos={statsPedidos} />

      <div className="flex bg-slate-100 p-1 rounded-2xl w-fit">
        {(['EFETIVADOS', 'RASCUNHO', 'TODOS'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === tab ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            {tab === 'EFETIVADOS' ? 'Efetivados' : tab === 'RASCUNHO' ? 'Rascunhos' : 'Ver Todos'}
            {tab === 'RASCUNHO' && draftCount > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${activeTab === 'RASCUNHO' ? 'bg-amber-100 text-amber-600' : 'bg-slate-200 text-slate-500'}`}>
                {draftCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'RASCUNHO' && (
        <div className="animate-in fade-in slide-in-from-left-4 duration-500">
          <p className="text-[11px] text-slate-400 mt-2 ml-2 font-medium flex items-center gap-1.5 opacity-80 hover:opacity-100 transition-opacity cursor-help" title="Política de retenção de dados">
            <svg className="w-3.5 h-3.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Os rascunhos serão apagados automaticamente depois de 60 dias
          </p>
        </div>
      )}

      <PedidosFilters
        filtros={filtros}
        corretores={corretores}
        socios={socios}
        onChange={setFiltros}
      />

      <PedidosList pedidos={pedidos} loading={isLoadingList} onEdit={(p) => navigate(`/pedidos-compra/${p.id}`)} />

      {/* Pagination */}
      {!isLoadingList && totalPages > 1 && (
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
            Página <span className="text-slate-900">{currentPage}</span> de <span className="text-slate-900">{totalPages}</span>
            <span className="ml-2 opacity-50">({totalCount} pedidos)</span>
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

export default PedidoCompraPage;
