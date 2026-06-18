
import React, { useState, useEffect } from 'react';
import { IPedidoCompra } from '../../pedidos-compra.types';
import { CondicoesPagamentoService } from '../../../cadastros/condicoes-pagamento/condicoes-pagamento.service';
import { ContasBancariasService } from '../../../ajustes/contas-bancarias/contas.service';
import { FinanceiroService } from '../../../financeiro/financeiro.service';

interface Props {
  pedido: IPedidoCompra;
  onClose: () => void;
  onConfirm: (params: { condicao: any, contaId?: string }) => void;
  isLoading: boolean;
}

const ModalConfirmacaoFinanceira: React.FC<Props> = ({ pedido, onClose, onConfirm, isLoading }) => {
  const [condicoes, setCondicoes] = useState<any[]>([]);
  const [contas, setContas] = useState<any[]>([]);
  const [selectedCondicaoId, setSelectedCondicaoId] = useState('');
  const [selectedContaId, setSelectedContaId] = useState('');
  const [parcelasPrevia, setParcelasPrevia] = useState<any[]>([]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // Condição virtual "À VISTA" para formas sem condições cadastradas (ex: PIX, Dinheiro)  
  const CONDICAO_AVISTA_AUTO = {
    id: '__auto_avista__',
    nome: 'À VISTA (Automático)',
    qtd_parcelas: 1,
    dias_primeira_parcela: 0,
    dias_entre_parcelas: 0,
    ativo: true,
  };

  useEffect(() => {
    if (pedido.forma_pagamento_id) {
      CondicoesPagamentoService.getByFormaPagamento(pedido.forma_pagamento_id).then(data => {
        if (data.length === 0) {
          // Nenhuma condição cadastrada → gera opção "À VISTA" automática
          setCondicoes([CONDICAO_AVISTA_AUTO as any]);
          setSelectedCondicaoId(CONDICAO_AVISTA_AUTO.id);
        } else {
          setCondicoes(data);

          // Se já houver um pagamento lançado com uma condição, tenta pré-selecionar ela
          if (pedido.pagamentos && pedido.pagamentos.length > 0) {
            const firstPaymentWithCond = pedido.pagamentos.find(p => p.condicao_id);
            if (firstPaymentWithCond) {
              setSelectedCondicaoId(firstPaymentWithCond.condicao_id);
            }
          }
        }
      });
    }
    ContasBancariasService.getAll().then(data => {
      const active = data.filter((c: any) => c.ativo);
      setContas(active);
      if (active.length === 1) {
        setSelectedContaId(active[0].id);
      }
    });
  }, [pedido.forma_pagamento_id, pedido.pagamentos]);

  useEffect(() => {
    if (selectedCondicaoId && pedido.valor_negociado > 0) {
      const isAuto = selectedCondicaoId.startsWith('__auto');
      const cond = condicoes.find(c => c.id === selectedCondicaoId);

      FinanceiroService.previewCronograma({
        valorTotal: pedido.valor_negociado,
        condicaoId: isAuto ? undefined : selectedCondicaoId,
        tipo: 'COMPRA',
        qtdParcelas: isAuto ? CONDICAO_AVISTA_AUTO.qtd_parcelas : undefined,
        diasPrimeira: isAuto ? CONDICAO_AVISTA_AUTO.dias_primeira_parcela : undefined,
        diasEntre: isAuto ? CONDICAO_AVISTA_AUTO.dias_entre_parcelas : undefined
      }).then(setParcelasPrevia);
    } else {
      setParcelasPrevia([]);
    }
  }, [selectedCondicaoId, pedido.valor_negociado, condicoes]);

  const selectedCondicao = condicoes.find(c => c.id === selectedCondicaoId);

  const requiresAccount = parcelasPrevia.some(p => p.data_vencimento === new Date().toISOString().split('T')[0]) &&
    pedido.forma_pagamento?.destino_lancamento === 'CAIXA';

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
          <div>
            <h3 className="text-xl font-black uppercase tracking-tighter">Finalizar Compra</h3>
            <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest mt-1">Geração de Obrigações Financeiras</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 grid grid-cols-2 gap-4">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Valor Negociado</p>
              <p className="text-2xl font-black text-slate-900">{formatCurrency(pedido.valor_negociado)}</p>
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Forma de Pagamento</p>
              <p className="text-lg font-black text-indigo-600 uppercase">{pedido.forma_pagamento?.nome}</p>
            </div>
          </div>

          <div className="space-y-4">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Regra de Parcelamento (Condição)</label>
            <select
              value={selectedCondicaoId}
              onChange={e => setSelectedCondicaoId(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 font-bold text-slate-800 outline-none focus:border-indigo-500 appearance-none cursor-pointer"
            >
              <option value="">Escolha a condição de pagamento...</option>
              {condicoes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>

            {requiresAccount && (
              <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-3xl animate-in slide-in-from-left">
                <div className="flex items-start space-x-3 mb-4">
                  <div className="w-8 h-8 bg-emerald-500 text-white rounded-lg flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <p className="text-[10px] text-emerald-800 font-bold uppercase leading-relaxed">Pagamento à Vista: Selecione de qual conta sairá o saldo para a primeira parcela hoje.</p>
                </div>
                <select
                  value={selectedContaId}
                  onChange={e => setSelectedContaId(e.target.value)}
                  className="w-full bg-white border border-emerald-200 rounded-xl px-4 py-3 text-xs font-black text-emerald-700 outline-none"
                >
                  <option value="">Selecione a Conta Bancária...</option>
                  {contas.map(c => <option key={c.id} value={c.id}>{c.banco_nome} - {c.titular} | Saldo: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c.saldo_atual || 0)}</option>)}
                </select>
              </div>
            )}

            {parcelasPrevia.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Prévia dos Lançamentos</h4>
                <div className="grid grid-cols-1 gap-2">
                  {parcelasPrevia.map((p, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                      <div className="flex items-center space-x-3">
                        <span className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-[10px] font-black text-slate-400">{p.numero}</span>
                        <span className="text-xs font-bold text-slate-700">{new Date(p.data_vencimento).toLocaleDateString('pt-BR')}</span>
                      </div>
                      <span className="text-sm font-black text-slate-900">{formatCurrency(p.valor)}</span>
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
              if (requiresAccount && !selectedContaId) return alert('Selecione a conta bancária.');
              // Se for condição virtual "À VISTA", envia o objeto diretamente (sem ID fake)
              const condicaoParaEnviar = selectedCondicaoId === '__auto_avista__'
                ? { nome: 'À VISTA', qtd_parcelas: 1, dias_primeira_parcela: 0, dias_entre_parcelas: 0 }
                : selectedCondicao!;
              onConfirm({ condicao: condicaoParaEnviar, contaId: selectedContaId });
            }}
            disabled={isLoading || !selectedCondicaoId}
            className="w-full py-5 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 shadow-2xl transition-all disabled:opacity-30 flex items-center justify-center"
          >
            {isLoading ? 'Confirmando Operação...' : 'Gerar Títulos e Confirmar Pedido'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalConfirmacaoFinanceira;
