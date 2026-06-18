
import React, { useState, useEffect } from 'react';
import { IPedidoVenda } from '../../pedidos-venda.types';
import { CondicoesRecebimentoService } from '../../../cadastros/condicoes-recebimento/condicoes-recebimento.service';
import { ContasBancariasService } from '../../../ajustes/contas-bancarias/contas.service';
import { FinanceiroService } from '../../../financeiro/financeiro.service';

interface Props {
  pedido: IPedidoVenda;
  valorVendaEfetivo: number;
  onClose: () => void;
  onConfirm: (params: { condicao: any, contaId?: string }) => void;
  isLoading: boolean;
}

const ModalConfirmacaoVenda: React.FC<Props> = ({ pedido, valorVendaEfetivo, onClose, onConfirm, isLoading }) => {
  const [condicoes, setCondicoes] = useState<any[]>([]);
  const [contas, setContas] = useState<any[]>([]);
  const [selectedCondicaoId, setSelectedCondicaoId] = useState('');
  const [selectedContaId, setSelectedContaId] = useState('');
  const [parcelasPrevia, setParcelasPrevia] = useState<any[]>([]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  useEffect(() => {
    if (pedido.forma_pagamento_id) {
      CondicoesRecebimentoService.getByFormaPagamento(pedido.forma_pagamento_id).then(setCondicoes);
    }
    ContasBancariasService.getAll().then(data => {
      const active = data.filter((c: any) => c.ativo);
      setContas(active);
      if (active.length === 1) {
        setSelectedContaId(active[0].id);
      }
    });
  }, [pedido.forma_pagamento_id]);

  useEffect(() => {
    if (selectedCondicaoId && valorVendaEfetivo > 0) {
      FinanceiroService.previewCronograma({
        valorTotal: valorVendaEfetivo,
        condicaoId: selectedCondicaoId,
        tipo: 'VENDA'
      }).then(setParcelasPrevia);
    } else {
      setParcelasPrevia([]);
    }
  }, [selectedCondicaoId, valorVendaEfetivo]);

  const selectedCondicao = condicoes.find(c => c.id === selectedCondicaoId);

  // Normalize today's date for string comparison (YYYY-MM-DD)
  const hoje = new Date().toLocaleDateString('en-CA'); // en-CA gives YYYY-MM-DD

  // A bank account is required IF:
  // 1. The payment destination is 'CAIXA'
  // 2. AND (the payment method is by nature immediate [non-parcelable] OR there's an immediate/overdue installment)
  const isImmediate = !pedido.forma_pagamento?.permite_parcelamento || parcelasPrevia.some(p => p.data_vencimento <= hoje);
  const requiresAccount = pedido.forma_pagamento?.destino_lancamento === 'CAIXA' && isImmediate;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-8 bg-emerald-600 text-white flex justify-between items-center">
          <div>
            <h3 className="text-xl font-black uppercase tracking-tighter">Faturar Venda</h3>
            <p className="text-[10px] text-emerald-100 font-bold uppercase tracking-widest mt-1">Lançamento de Recebíveis</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 grid grid-cols-2 gap-4">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Preço de Venda</p>
              <p className="text-2xl font-black text-emerald-600">{formatCurrency(valorVendaEfetivo)}</p>
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Modalidade</p>
              <p className="text-lg font-black text-slate-900 uppercase">{pedido.forma_pagamento?.nome}</p>
            </div>
          </div>

          <div className="space-y-4">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Plano de Recebimento (Condição)</label>
            <select
              value={selectedCondicaoId}
              onChange={e => setSelectedCondicaoId(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 font-bold text-slate-800 outline-none focus:border-emerald-500 appearance-none cursor-pointer"
            >
              <option value="">Escolha a regra de recebimento...</option>
              {condicoes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>

            {requiresAccount && (
              <div className="bg-blue-50 border border-blue-100 p-6 rounded-3xl animate-in slide-in-from-right">
                <div className="flex items-start space-x-3 mb-4">
                  <div className="w-8 h-8 bg-blue-500 text-white rounded-lg flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <p className="text-[10px] text-blue-800 font-bold uppercase leading-relaxed">Entrada de Caixa: Selecione a conta de destino para o valor à vista.</p>
                </div>
                <select
                  value={selectedContaId}
                  onChange={e => setSelectedContaId(e.target.value)}
                  className="w-full bg-white border border-blue-200 rounded-xl px-4 py-3 text-xs font-black text-blue-700 outline-none"
                >
                  <option value="">Destino do Dinheiro...</option>
                  {contas.map(c => <option key={c.id} value={c.id}>{c.banco_nome} - {c.titular} | Saldo: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c.saldo_atual || 0)}</option>)}
                </select>
              </div>
            )}

            {parcelasPrevia.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Cronograma de Créditos</h4>
                <div className="grid grid-cols-1 gap-2">
                  {parcelasPrevia.map((p, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-emerald-50/30 border border-emerald-100 rounded-2xl">
                      <div className="flex items-center space-x-3">
                        <span className="w-6 h-6 rounded-lg bg-white border border-emerald-100 flex items-center justify-center text-[10px] font-black text-emerald-500 shadow-sm">{p.numero}</span>
                        <span className="text-xs font-bold text-slate-700">{new Date(p.data_vencimento).toLocaleDateString('pt-BR')}</span>
                      </div>
                      <span className="text-sm font-black text-emerald-600">{formatCurrency(p.valor)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-8 border-t border-slate-100 bg-slate-50">
          <button
            onClick={() => {
              if (!selectedCondicaoId) return alert('Selecione uma condição.');
              if (requiresAccount && !selectedContaId) return alert('Selecione a conta de destino.');
              onConfirm({ condicao: selectedCondicao!, contaId: selectedContaId });
            }}
            disabled={isLoading || !selectedCondicaoId}
            className="w-full py-5 bg-emerald-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-emerald-700 shadow-2xl transition-all active:scale-95 disabled:opacity-30"
          >
            {isLoading ? 'Faturando...' : 'Finalizar Venda e Gerar Recebíveis'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalConfirmacaoVenda;
