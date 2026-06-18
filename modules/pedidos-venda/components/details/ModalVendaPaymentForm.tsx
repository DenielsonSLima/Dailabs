import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { IFormaPagamento } from '../../../cadastros/formas-pagamento/formas-pagamento.types';
import { ICondicaoRecebimento } from '../../../cadastros/condicoes-recebimento/condicoes-recebimento.types';
import { IContaBancaria } from '../../../ajustes/contas-bancarias/contas.types';
import { FormasPagamentoService } from '../../../cadastros/formas-pagamento/formas-pagamento.service';
import { CondicoesRecebimentoService } from '../../../cadastros/condicoes-recebimento/condicoes-recebimento.service';
import { ContasBancariasService } from '../../../ajustes/contas-bancarias/contas.service';
import { IPedidoVenda, IVendaPagamento } from '../../pedidos-venda.types';

interface IParcelaGerada {
  id_temporario: string;
  numero: number;
  data_vencimento: string;
  valor: number;
}

interface Props {
  pedido: IPedidoVenda;
  onClose: () => void;
  onSubmit: (data: Partial<IVendaPagamento>[]) => void;
  isSaving: boolean;
}

const ModalVendaPaymentForm: React.FC<Props> = ({ pedido, onClose, onSubmit, isSaving }) => {
  const [formas, setFormas] = useState<IFormaPagamento[]>([]);
  const [condicoes, setCondicoes] = useState<ICondicaoRecebimento[]>([]);
  const [contas, setContas] = useState<IContaBancaria[]>([]);
  const [loadingCondicoes, setLoadingCondicoes] = useState(false);

  const [valorTotalACompor, setValorTotalACompor] = useState('R$ 0,00');
  const [formaId, setFormaId] = useState(pedido.forma_pagamento_id || '');
  const [condicaoId, setCondicaoId] = useState('');
  const [contaBancariaId, setContaBancariaId] = useState('');
  const [observacao, setObservacao] = useState('');

  const [parcelas, setParcelas] = useState<IParcelaGerada[]>([]);

  useEffect(() => {
    async function loadInitial() {
      const [fData, cData] = await Promise.all([
        FormasPagamentoService.getAll(),
        ContasBancariasService.getAll()
      ]);
      // Filtra apenas recebimentos ou ambos
      setFormas(fData.filter(f => (f.tipo_movimentacao !== 'PAGAMENTO') && f.ativo));
      
      const activeContas = cData.filter(c => c.ativo);
      setContas(activeContas);
      if (activeContas.length === 1) {
        setContaBancariaId(activeContas[0].id);
      }
    }
    loadInitial();

    // Define o valor total da venda como valor inicial sugerido
    const totalVenda = pedido.valor_venda || 0;
    const totalJaEstruturado = (pedido.pagamentos || []).reduce((acc, p) => acc + p.valor, 0);
    const saldo = Math.max(0, totalVenda - totalJaEstruturado);

    setValorTotalACompor(new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(saldo));
  }, [pedido]);

  useEffect(() => {
    if (formaId) {
      setLoadingCondicoes(true);
      CondicoesRecebimentoService.getByFormaPagamento(formaId).then(data => {
        setCondicoes(data.filter(c => c.ativo));
        setLoadingCondicoes(false);
      });
    } else {
      setCondicoes([]);
    }
    setCondicaoId('');
    setParcelas([]);
  }, [formaId]);

  useEffect(() => {
    const condicao = condicoes.find(c => c.id === condicaoId);
    const valorNumerico = Number(valorTotalACompor.replace(/\D/g, '')) / 100;

    if (condicao && valorNumerico > 0) {
      const novasParcelas: IParcelaGerada[] = [];
      const valorParcela = valorNumerico / condicao.qtd_parcelas;
      const hoje = new Date();

      for (let i = 0; i < condicao.qtd_parcelas; i++) {
        const dataVenc = new Date();
        const diasAdicionais = condicao.dias_primeira_parcela + (i * condicao.dias_entre_parcelas);
        dataVenc.setDate(hoje.getDate() + diasAdicionais);

        novasParcelas.push({
          id_temporario: Math.random().toString(36).substr(2, 9),
          numero: i + 1,
          data_vencimento: dataVenc.toISOString().split('T')[0],
          valor: valorParcela
        });
      }
      setParcelas(novasParcelas);
    } else {
      setParcelas([]);
    }
  }, [condicaoId, valorTotalACompor, condicoes]);

  const hasRecebimentoHoje = useMemo(() => {
    const hoje = new Date().toISOString().split('T')[0];
    return parcelas.some(p => p.data_vencimento <= hoje);
  }, [parcelas]);

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    const numericValue = Number(value) / 100;
    const formatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numericValue);
    setValorTotalACompor(formatted);
  };

  const updateParcelaDate = (id: string, newDate: string) => {
    setParcelas(prev => prev.map(p => p.id_temporario === id ? { ...p, data_vencimento: newDate } : p));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (parcelas.length === 0) return;

    if (hasRecebimentoHoje && !contaBancariaId) {
      alert("Para recebimentos à vista ou retroativos, selecione a conta bancária de destino.");
      return;
    }

    const payload: Partial<IVendaPagamento>[] = parcelas.map(p => ({
      pedido_id: pedido.id,
      data_recebimento: p.data_vencimento,
      forma_pagamento_id: formaId,
      condicao_id: condicaoId,
      conta_bancaria_id: p.data_vencimento <= new Date().toISOString().split('T')[0] ? contaBancariaId : undefined,
      valor: p.valor,
      observacao: parcelas.length > 1 ? `Recebimento Parcela ${p.numero}/${parcelas.length} - ${observacao}` : observacao
    }));

    onSubmit(payload);
  };
  // Travar scroll do body
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  const content = (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 border border-slate-100 flex flex-col max-h-[95vh]">

        <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Estruturar Recebimento</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Configurar cronograma de entrada financeira</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full text-slate-400 hover:text-rose-500 transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-4">
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">Valor do Lote</label>
              <input
                type="text"
                value={valorTotalACompor}
                onChange={handleCurrencyChange}
                className="w-full bg-white border-2 border-emerald-100 rounded-2xl px-4 py-3 text-xl font-black text-emerald-600 outline-none focus:border-emerald-500 transition-all text-center shadow-sm hover:shadow-md"
              />
            </div>

            <div className="md:col-span-4">
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">Modalidade</label>
              <select
                required
                value={formaId}
                onChange={e => setFormaId(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3.5 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 appearance-none shadow-sm hover:shadow-md transition-all"
              >
                <option value="">Selecione...</option>
                {formas.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </select>
            </div>

            <div className="md:col-span-4">
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest flex justify-between">
                Regra / Prazo
                {loadingCondicoes && <div className="w-3 h-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>}
              </label>
              <select
                required
                disabled={!formaId}
                value={condicaoId}
                onChange={e => setCondicaoId(e.target.value)}
                className="w-full bg-white border border-indigo-100 rounded-2xl px-4 py-3.5 text-xs font-bold text-indigo-700 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 appearance-none shadow-sm hover:shadow-md transition-all disabled:opacity-30"
              >
                <option value="">{loadingCondicoes ? 'Buscando...' : 'Escolha a regra...'}</option>
                {condicoes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
          </div>

          {parcelas.length > 0 && (
            <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between px-1">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Cronograma de Entradas</h4>
                <span className="text-[8px] font-black bg-emerald-500 text-white px-2 py-0.5 rounded uppercase shadow-sm">Estrutura de {parcelas.length}x</span>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {parcelas.map((p) => (
                  <div key={p.id_temporario} className="flex items-center gap-4 bg-white border border-slate-100 p-4 rounded-3xl hover:border-emerald-200 transition-all group shadow-sm hover:shadow-md">
                    <div className="w-10 h-10 rounded-2xl bg-white border border-slate-100 flex items-center justify-center font-black text-slate-400 text-xs shadow-sm">
                      {p.numero}º
                    </div>
                    <div className="flex-1">
                      <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Previsão de Crédito</p>
                      <input
                        type="date"
                        value={p.data_vencimento}
                        onChange={(e) => updateParcelaDate(p.id_temporario, e.target.value)}
                        className="bg-transparent font-black text-slate-800 outline-none cursor-pointer focus:text-emerald-600"
                      />
                    </div>
                    <div className="text-right">
                      <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Valor</p>
                      <p className="text-sm font-black text-slate-900">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.valor)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {hasRecebimentoHoje && (
            <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-3xl space-y-4 animate-in slide-in-from-left duration-500">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-200 shrink-0">
                  {/* Fixed malformed SVG tag on line 231 */}
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-xs font-black text-emerald-800 uppercase tracking-widest leading-none mb-1">Crédito Imediato</h4>
                  <p className="text-[10px] text-emerald-600 font-medium">Lançamentos à vista ou com data retroativa alimentarão o saldo da conta selecionada abaixo.</p>
                </div>
              </div>
              <select
                required
                value={contaBancariaId}
                onChange={e => setContaBancariaId(e.target.value)}
                className="w-full bg-white border-2 border-emerald-200 rounded-2xl px-5 py-4 text-xs font-black text-emerald-700 outline-none focus:ring-2 focus:ring-emerald-500 appearance-none cursor-pointer shadow-sm"
              >
                <option value="">Onde o dinheiro cairá?</option>
                {contas.map(c => <option key={c.id} value={c.id}>{c.banco_nome} - {c.titular} | Saldo: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c.saldo_atual || 0)}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">Observações do Recebimento</label>
            <textarea
              value={observacao}
              onChange={e => setObservacao(e.target.value)}
              placeholder="Ex: Entrada via PIX efetuada no ato da assinatura..."
              rows={2}
              className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-xs font-medium text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none shadow-sm hover:shadow-md transition-all"
            />
          </div>
        </form>

        <div className="p-8 border-t border-slate-100 bg-slate-50">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving || parcelas.length === 0}
            className="w-full py-5 bg-emerald-600 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-emerald-700 shadow-2xl shadow-emerald-100 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center space-x-3"
          >
            {isSaving ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M5 13l4 4L19 7" /></svg>
            )}
            <span>{isSaving ? 'Gravando Recebimento...' : 'Finalizar Lançamento'}</span>
          </button>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(content, document.body);
};

export default ModalVendaPaymentForm;