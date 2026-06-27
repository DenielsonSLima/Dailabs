
import React from 'react';
import { IPedidoVenda } from '../../pedidos-venda.types';

interface Props {
  pedido: IPedidoVenda;
  onBack: () => void;
  onEdit: () => void;
  onConfirm: () => void;
  onDelete: () => void;
  loadingAction: boolean;
  canConfirm?: boolean;
}

const HeaderVenda: React.FC<Props> = ({ pedido, onBack, onEdit, onConfirm, onDelete, loadingAction, canConfirm }) => {
  const isConcluido = pedido.status === 'CONCLUIDO';
  const isCancelado = pedido.status === 'CANCELADO';
  const isRascunho = pedido.status === 'RASCUNHO';

  return (
    <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm animate-in slide-in-from-top-4 duration-500">
      <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
        <div className="flex items-center space-x-6 w-full lg:w-auto">
          <button
            onClick={onBack}
            className="group p-3.5 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-emerald-50 hover:text-emerald-600 text-slate-400 transition-all shrink-0 shadow-sm"
          >
            <svg className="w-6 h-6 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>

          <div>
            <div className="flex items-center space-x-3 mb-1">
              <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest border border-slate-200">
                VENDA #{pedido.numero_venda}
              </span>
              <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 ${isConcluido ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'
                }`}>
                <div className={`w-1.5 h-1.5 rounded-full ${isConcluido ? 'bg-emerald-500' : pedido.status === 'CANCELADO' ? 'bg-rose-500' : 'bg-amber-500 animate-pulse'}`}></div>
                {isConcluido ? 'FATURADA' : pedido.status === 'CANCELADO' ? 'CANCELADA' : 'RASCUNHO'}
              </span>
            </div>
            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none">
              {pedido.cliente?.nome || 'CLIENTE NÃO INFORMADO'}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full lg:w-auto justify-end border-t lg:border-t-0 border-slate-50 pt-4 lg:pt-0">
          <button
            onClick={onDelete}
            disabled={loadingAction}
            className="px-6 py-4 text-rose-500 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-rose-50 transition-all disabled:opacity-50"
          >
            Excluir
          </button>

          {isRascunho && (
            <>
              <button
                onClick={onEdit}
                disabled={loadingAction}
                className="px-6 py-4 bg-white border border-slate-200 text-slate-600 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-slate-50 hover:text-indigo-600 transition-all flex items-center shadow-sm disabled:opacity-50"
              >
                Editar Pedido
              </button>

              <button
                onClick={onConfirm}
                disabled={loadingAction || !canConfirm}
                className={`px-8 py-4 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center ${canConfirm ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' : 'bg-slate-300 cursor-not-allowed'
                  }`}
              >
                {loadingAction && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />}
                Faturar Venda
              </button>
            </>
          )}

          {isConcluido && (
            <div className="px-8 py-4 bg-emerald-50 text-emerald-600 font-black text-xs uppercase tracking-widest rounded-xl border border-emerald-100 flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M5 13l4 4L19 7" /></svg>
              Venda Concluída
            </div>
          )}

          {isCancelado && (
            <div className="px-8 py-4 bg-rose-50 text-rose-600 font-black text-xs uppercase tracking-widest rounded-xl border border-rose-100 flex items-center text-center">
              Venda Cancelada
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HeaderVenda;
