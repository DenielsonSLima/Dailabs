
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { IPedidoCompra } from '../../pedidos-compra.types';
import VehicleInOrderCard from './vehicle-card/VehicleInOrderCard';

interface Props {
  pedido: IPedidoCompra;
  onUnlink: (veiculoId: string) => void;
  isConcluido: boolean;
}

const VeiculosPedidoList: React.FC<Props> = ({ pedido, onUnlink, isConcluido }) => {
  const navigate = useNavigate();
  const veiculosList = pedido.veiculos || [];

  return (
    <div className="space-y-8">
      {/* Header Interno do Bloco de Veículos */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-50 pb-6">
        <div>
          <h3 className="text-xl font-[900] text-slate-900 uppercase tracking-tighter flex items-center">
            Inventário do Pedido
            <span className="ml-3 px-3 py-1 bg-indigo-600 text-white text-xs rounded-full font-black shadow-lg shadow-indigo-100">
              {veiculosList.length}
            </span>
          </h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Ativos vinculados a este contrato</p>
        </div>
        
        {!isConcluido && (
          <button 
            onClick={() => navigate(`/pedidos-compra/${pedido.id}/adicionar-veiculo`)}
            className="px-6 py-4 bg-indigo-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.15em] hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center active:scale-95 group"
          >
            <div className="w-5 h-5 bg-white/20 rounded-lg flex items-center justify-center mr-3 group-hover:rotate-90 transition-transform">
               <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
               </svg>
            </div>
            Adicionar Veículos
          </button>
        )}
      </div>

      {veiculosList.length === 0 ? (
        <div 
          onClick={() => !isConcluido && navigate(`/pedidos-compra/${pedido.id}/adicionar-veiculo`)}
          className="rounded-[2rem] border-4 border-dashed border-slate-100 p-20 text-center group hover:border-indigo-200 hover:bg-indigo-50/10 transition-all cursor-pointer"
        >
          <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-all shadow-sm">
             <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
               <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
             </svg>
          </div>
          <h4 className="text-xl font-black text-slate-400 uppercase tracking-tighter group-hover:text-slate-900 transition-colors">Vincule um Ativo</h4>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2 opacity-60">Aguardando inclusão do veículo para composição do lote.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8">
          {veiculosList.map((v) => (
            <VehicleInOrderCard 
              key={v.id} 
              veiculo={v} 
              pedidoId={pedido.id}
              isConcluido={isConcluido} 
              onUnlink={onUnlink} 
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default VeiculosPedidoList;
