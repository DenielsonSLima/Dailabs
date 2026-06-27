import React from 'react';
import { IPedidoCompra } from '../../pedidos-compra.types';

interface Props {
  pedido: IPedidoCompra;
  onBack: () => void;
  onEdit: () => void;
  onConfirm: () => void;
  onReopen: () => void;
  onDelete: () => void;
  onPrintSupplier: () => void;
  onPrintInternal: () => void;
  loadingAction: boolean;
  canConfirm: boolean;
}

const HeaderPedido: React.FC<Props> = ({ 
  pedido, onBack, onEdit, onConfirm, onReopen, onDelete, 
  onPrintSupplier, onPrintInternal, loadingAction, canConfirm
}) => {
  const formatDate = (date: string) => new Date(date).toLocaleDateString('pt-BR');
  const isConcluido = pedido.status === 'CONCLUIDO';

  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm animate-in slide-in-from-top-4 duration-500">
      <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
        
        <div className="flex items-center space-x-6 w-full lg:w-auto">
          <button 
            onClick={onBack} 
            className="group p-4 bg-slate-100 border border-slate-200 rounded-2xl hover:bg-white hover:border-indigo-600 text-slate-500 hover:text-indigo-600 transition-all shrink-0 shadow-sm"
          >
            <svg className="w-6 h-6 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>

          <div className="min-w-0">
            <div className="flex items-center space-x-3 mb-2">
              <span className="px-3 py-1 rounded-lg bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest shadow-lg">
                PEDIDO #{pedido.numero_pedido || pedido.id.substring(0,6).toUpperCase()}
              </span>
              <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border ${
                isConcluido ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                'bg-amber-50 text-amber-600 border-amber-100'
              }`}>
                <div className={`w-2 h-2 rounded-full ${isConcluido ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></div>
                {isConcluido ? 'EFETIVADO' : 'RASCUNHO'}
              </span>
            </div>
            <h1 className="text-4xl font-[900] text-slate-900 uppercase tracking-tighter leading-none truncate">
              Dossiê de Aquisição
            </h1>
            <p className="text-xs font-bold text-slate-400 mt-2 flex items-center">
              <svg className="w-3.5 h-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
              Contrato firmado em {formatDate(pedido.data_compra)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end border-t lg:border-t-0 border-slate-50 pt-6 lg:pt-0">
          
          {/* BOTÕES DE PDF COM TEXTO (PEDIDO DO USUÁRIO) */}
          <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 mr-2 gap-2">
             <button 
               onClick={onPrintSupplier}
               className="flex items-center space-x-2 px-4 py-2.5 bg-white text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-xl transition-all shadow-sm group/btn"
               title="Gerar PDF para Fornecedor"
             >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                <span className="text-[10px] font-black uppercase tracking-widest">Pedido (PDF)</span>
             </button>
             <button 
               onClick={onPrintInternal}
               className="flex items-center space-x-2 px-4 py-2.5 bg-white text-slate-700 hover:bg-slate-900 hover:text-white rounded-xl transition-all shadow-sm group/btn"
               title="Análise de Compra Interna"
             >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span className="text-[10px] font-black uppercase tracking-widest">Análise de Ativo</span>
             </button>
          </div>

          <button 
            onClick={onDelete}
            disabled={loadingAction}
            className="p-4 text-rose-500 hover:bg-rose-50 rounded-2xl transition-all disabled:opacity-30"
            title="Excluir Pedido"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>

          {isConcluido && (
            <button 
              onClick={onReopen}
              disabled={loadingAction}
              className="px-6 py-4 bg-amber-50 text-amber-600 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-amber-100 transition-all shadow-sm flex items-center border border-amber-200"
            >
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              Reabrir
            </button>
          )}

          <button 
            onClick={onEdit}
            disabled={loadingAction}
            className="px-6 py-4 bg-white border border-slate-200 text-slate-700 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-slate-50 transition-all shadow-sm active:scale-95 flex items-center"
          >
            Editar Ficha
          </button>

          {!isConcluido && (
            <div className="relative">
              <button 
                onClick={onConfirm}
                disabled={loadingAction || !canConfirm}
                className={`px-8 py-4 text-white font-black text-xs uppercase tracking-[0.15em] rounded-xl shadow-2xl transition-all flex items-center active:scale-95 disabled:opacity-50 disabled:grayscale ${
                  canConfirm ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200' : 'bg-slate-400 shadow-none cursor-not-allowed'
                }`}
              >
                {loadingAction ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-3" />
                ) : (
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
                Confirmar Entrada
              </button>
            </div>
          )}

          {isConcluido && (
            <div className="px-8 py-4 bg-emerald-600 text-white font-black text-xs uppercase tracking-[0.15em] rounded-xl flex items-center border-2 border-emerald-500 shadow-xl shadow-emerald-100">
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              CONCLUÍDO
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default HeaderPedido;
