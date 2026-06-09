import React, { useState, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { DespesasVariaveisService } from './despesas-variaveis.service';
import { FinanceiroService } from '../../financeiro.service';
import { ITituloVariavel, VariaveisTab, IVariaveisFiltros, GroupByVariavel } from './despesas-variaveis.types';
import VariaveisFilters from './components/VariaveisFilters';
import VariaveisList from './components/VariaveisList';
import VariaveisKpis from './components/VariaveisKpis';
import DespesaVariavelForm from './components/DespesaVariavelForm';
import ModalBaixa from '../components/ModalBaixa';
import ConfirmModal from '../../../../components/ConfirmModal';

const DespesasVariaveisPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<VariaveisTab>('MES_ATUAL');
  const [titulos, setTitulos] = useState<ITituloVariavel[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupBy, setGroupBy] = useState<GroupByVariavel>('nenhum');
  const [kpis, setKpis] = useState<any>(null);

  const [filtros, setFiltros] = useState<IVariaveisFiltros>({
    busca: '',
    dataInicio: '',
    dataFim: '',
    categoriaId: '',
    status: ''
  });

  const [selectedTitulo, setSelectedTitulo] = useState<ITituloVariavel | null>(null);
  const [tituloEditando, setTituloEditando] = useState<ITituloVariavel | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // Sincroniza agrupamento padrão ao mudar de aba
  useEffect(() => {
    if (activeTab === 'TODOS') setGroupBy('mes');
    else setGroupBy('nenhum');
  }, [activeTab]);

  useEffect(() => {
    loadData();
    FinanceiroService.getCategorias().then(data =>
      setCategorias(data.filter(c => c.tipo === 'VARIAVEL'))
    );
    const sub = DespesasVariaveisService.subscribe(() => loadData(true));
    return () => { sub.unsubscribe(); };
  }, [activeTab, filtros]);

  async function loadData(silent = false) {
    if (!silent) setLoading(true);
    try {
      const results = await Promise.allSettled([
        DespesasVariaveisService.getAll(activeTab, filtros),
        DespesasVariaveisService.getKpis(activeTab, filtros)
      ]);

      if (results[0].status === 'fulfilled') {
        setTitulos(results[0].value);
      } else {
        console.error('Erro ao carregar despesas variáveis:', results[0].reason);
        setTitulos([]);
      }

      if (results[1].status === 'fulfilled') {
        setKpis(results[1].value);
      } else {
        console.error('Erro ao carregar KPIs de despesas variáveis:', results[1].reason);
        setKpis(null);
      }
    } catch (e) {
      console.error('Erro ao carregar dados:', e);
      setKpis(null);
    } finally {
      setLoading(false);
    }
  }

  const processedData = useMemo(() => {
    if (activeTab !== 'TODOS' && groupBy === 'nenhum') return titulos;

    if (activeTab === 'TODOS' && groupBy === 'nenhum') {
      return titulos.reduce((acc: any, t) => {
        const key = t.status === 'PAGO' ? 'PAGO' : 'EM ABERTO';
        if (!acc[key]) acc[key] = [];
        acc[key].push(t);
        return acc;
      }, {});
    }

    return titulos.reduce((acc: any, t) => {
      let key = 'DIVERSOS';
      if (groupBy === 'mes') {
        const d = new Date(t.data_vencimento);
        key = d.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase();
      } else if (groupBy === 'categoria') {
        key = t.categoria?.nome || 'SEM CATEGORIA';
      }

      if (!acc[key]) acc[key] = [];
      acc[key].push(t);
      return acc;
    }, {});
  }, [titulos, groupBy, activeTab]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await DespesasVariaveisService.delete(deleteId);
      setDeleteId(null);
      setToast({ type: 'success', message: 'Despesa estornada com sucesso!' });
      queryClient.invalidateQueries({ queryKey: ['caixa_dashboard'] });
      loadData(true);
    } catch (e) {
      setToast({ type: 'error', message: 'Erro ao estornar lançamento.' });
    } finally {
      setIsDeleting(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 relative">
      {toast && (
        <div className={`fixed top-6 right-6 z-[200] px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-right duration-300 border backdrop-blur-md ${toast.type === 'success' ? 'bg-slate-900/95 text-white border-emerald-500/50' : 'bg-rose-600 text-white'
          }`}>
          <span className="font-bold text-sm tracking-tight">{toast.message}</span>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none">Despesas Variáveis</h2>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-2">Gestão de gastos operacionais e eventuais</p>
        </div>
        <button
          onClick={() => setIsFormOpen(true)}
          className="px-8 py-4 bg-orange-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-700 transition-all shadow-xl active:scale-95 flex items-center shadow-orange-200"
        >
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Lançar Despesa
        </button>
      </div>

      <VariaveisKpis kpis={kpis} />

      <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 w-fit shadow-sm overflow-x-auto max-w-full gap-1">
        <button onClick={() => setActiveTab('MES_ATUAL')} className={`px-6 py-2.5 rounded-xl text-[10px] whitespace-nowrap font-black uppercase tracking-widest transition-all ${activeTab === 'MES_ATUAL' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Mês Atual</button>
        <button onClick={() => setActiveTab('FUTUROS')} className={`px-6 py-2.5 rounded-xl text-[10px] whitespace-nowrap font-black uppercase tracking-widest transition-all ${activeTab === 'FUTUROS' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Futuros</button>
        <button onClick={() => setActiveTab('PAGO')} className={`px-6 py-2.5 rounded-xl text-[10px] whitespace-nowrap font-black uppercase tracking-widest transition-all ${activeTab === 'PAGO' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Pago</button>
        <button onClick={() => setActiveTab('PENDENTES')} className={`px-6 py-2.5 rounded-xl text-[10px] whitespace-nowrap font-black uppercase tracking-widest transition-all ${activeTab === 'PENDENTES' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Pendentes</button>
        <button onClick={() => setActiveTab('TODOS')} className={`px-6 py-2.5 rounded-xl text-[10px] whitespace-nowrap font-black uppercase tracking-widest transition-all ${activeTab === 'TODOS' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Todos</button>
      </div>

      <VariaveisFilters
        filtros={filtros}
        onChange={setFiltros}
        categorias={categorias}
        groupBy={groupBy}
        setGroupBy={setGroupBy}
      />

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
        <VariaveisList
          items={processedData}
          loading={loading}
          isGrouped={groupBy !== 'nenhum' || activeTab === 'TODOS'}
          onPagar={(t) => setSelectedTitulo(t as any)}
          onEdit={(t) => { setTituloEditando(t); setIsFormOpen(true); }}
          onDelete={setDeleteId}
        />
      </div>

      {selectedTitulo && (
        <ModalBaixa
          titulo={selectedTitulo as any}
          onClose={() => setSelectedTitulo(null)}
          onSuccess={() => { 
            setSelectedTitulo(null); 
            queryClient.invalidateQueries({ queryKey: ['caixa_dashboard'] });
            loadData(true); 
            setToast({ type: 'success', message: 'Baixa realizada com sucesso!' }); 
          }}
        />
      )}

      {isFormOpen && (
        <DespesaVariavelForm
          tituloEditando={tituloEditando}
          onClose={() => { setIsFormOpen(false); setTituloEditando(null); }}
          onSuccess={() => { 
            setIsFormOpen(false); 
            setTituloEditando(null); 
            queryClient.invalidateQueries({ queryKey: ['caixa_dashboard'] });
            loadData(true); 
            setToast({ type: 'success', message: `Despesa variável ${tituloEditando ? 'atualizada' : 'lançada'} com sucesso!` }); 
          }}
        />
      )}

      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Estornar Despesa?"
        message="Tem certeza que deseja estornar esta despesa variável? Se houve pagamento, o valor será devolvido ao saldo da conta bancária automaticamente."
        confirmText="Sim, Estornar"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
};

export default DespesasVariaveisPage;
