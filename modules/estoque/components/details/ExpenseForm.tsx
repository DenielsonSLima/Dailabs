import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { FinanceiroService } from '../../../financeiro/financeiro.service';
import { TiposDespesasService } from '../../../cadastros/tipos-despesas/tipos-despesas.service';
import { FormasPagamentoService } from '../../../cadastros/formas-pagamento/formas-pagamento.service';
import { ContasBancariasService } from '../../../ajustes/contas-bancarias/contas.service';
import { ICategoriaFinanceira } from '../../../financeiro/financeiro.types';
import { IFormaPagamento } from '../../../cadastros/formas-pagamento/formas-pagamento.types';
import { IContaBancaria } from '../../../ajustes/contas-bancarias/contas.types';
import { IVeiculoDespesa } from '../../estoque.types';

interface IParcelaDespesa {
  id_temp: string;
  numero: number;
  vencimento: string;
  valor: number;
}

interface Props {
  onClose: () => void;
  onSubmit: (data: Partial<IVeiculoDespesa>[]) => void;
}

const ExpenseForm: React.FC<Props> = ({ onClose, onSubmit }) => {
  const [loading, setLoading] = useState(true);
  const [categorias, setCategorias] = useState<ICategoriaFinanceira[]>([]);
  const [formas, setFormas] = useState<IFormaPagamento[]>([]);
  const [contas, setContas] = useState<IContaBancaria[]>([]);

  // Estado Principal
  const [valorTotalStr, setValorTotalStr] = useState('R$ 0,00');
  const [qtdParcelas, setQtdParcelas] = useState(1);
  const [formaId, setFormaId] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [descricao, setDescricao] = useState('');
  const [contaId, setContaId] = useState('');
  const [dataOperacao, setDataOperacao] = useState(new Date().toISOString().split('T')[0]);

  // Lista de Parcelas Geradas
  const [parcelas, setParcelas] = useState<IParcelaDespesa[]>([]);

  useEffect(() => {
    async function loadInitial() {
      const [catData, fData, cData] = await Promise.all([
        FinanceiroService.getCategorias(),
        FormasPagamentoService.getAll(),
        ContasBancariasService.getAll()
      ]);
      setCategorias(catData.filter(c => c.natureza === 'SAIDA' && c.tipo === 'VARIAVEL'));
      setFormas(fData.filter(f => f.ativo && f.tipo_movimentacao !== 'RECEBIMENTO'));
      
      const activeContas = cData.filter(c => c.ativo);
      setContas(activeContas);
      if (activeContas.length === 1) {
        setContaId(activeContas[0].id);
      }
      
      setLoading(false);
    }
    loadInitial();
  }, []);

  const selectedForma = useMemo(() => formas.find(f => f.id === formaId), [formaId, formas]);

  const isPrazo = selectedForma?.destino_lancamento === 'CONTAS_PAGAR' || selectedForma?.destino_lancamento === 'CONSIGNACAO';
  const isCaixa = selectedForma?.destino_lancamento === 'CAIXA';

  // Lógica de Geração de Parcelas
  useEffect(() => {
    const valorNumerico = Number(valorTotalStr.replace(/\D/g, '')) / 100;
    if (valorNumerico <= 0 || !formaId) {
      setParcelas([]);
      return;
    }

    const novas: IParcelaDespesa[] = [];
    const valorBaseParcela = Number((valorNumerico / qtdParcelas).toFixed(2));
    const dataRef = new Date(dataOperacao);

    for (let i = 0; i < qtdParcelas; i++) {
      const vcto = new Date(dataRef);
      vcto.setMonth(vcto.getMonth() + i);

      novas.push({
        id_temp: Math.random().toString(36).substr(2, 9),
        numero: i + 1,
        vencimento: vcto.toISOString().split('T')[0],
        valor: i === qtdParcelas - 1
          ? Number((valorNumerico - (valorBaseParcela * (qtdParcelas - 1))).toFixed(2))
          : valorBaseParcela
      });
    }
    setParcelas(novas);
  }, [valorTotalStr, qtdParcelas, formaId, dataOperacao]);

  const handleCurrencyChange = (val: string) => {
    const numeric = Number(val.replace(/\D/g, '')) / 100;
    setValorTotalStr(new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numeric));
  };

  const updateParcelaDate = (id: string, date: string) => {
    setParcelas(prev => prev.map(p => p.id_temp === id ? { ...p, vencimento: date } : p));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (parcelas.length === 0 || !categoriaId || !descricao) {
      alert("Preencha todos os campos obrigatórios.");
      return;
    }

    if (isCaixa && !contaId) {
      alert("Selecione a conta de saída para o pagamento à vista.");
      return;
    }

    // Mapeia parcelas para o formato de persistência
    const payload: Partial<IVeiculoDespesa>[] = parcelas.map(p => ({
      data: dataOperacao,
      data_vencimento: p.vencimento,
      status_pagamento: isCaixa ? 'PAGO' : 'PENDENTE',
      tipo: 'VARIAVEL',
      categoria_id: categoriaId,
      descricao: parcelas.length > 1 ? `${descricao} (${p.numero}/${parcelas.length})` : descricao,
      quantidade: 1,
      valor_unitario: p.valor,
      valor_total: p.valor,
      forma_pagamento_id: formaId,
      conta_bancaria_id: isCaixa ? contaId : undefined
    }));

    onSubmit(payload);
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  // Travar scroll do body
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  const content = (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 border border-slate-100 flex flex-col max-h-[95vh]">

        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Lançamento de Despesa</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Gestão de custos integrada ao financeiro</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full text-slate-400 hover:text-rose-500 transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">

          {/* Identificação Básica */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">Descrição do Serviço / Compra</label>
              <input
                autoFocus
                value={descricao}
                onChange={e => setDescricao(e.target.value.toUpperCase())}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                placeholder="Ex: Troca de Pneus, Higienização, Martelinho..."
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">Data da Nota/Serviço</label>
              <input
                type="date"
                value={dataOperacao}
                onChange={e => setDataOperacao(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">Classificação (Categoria)</label>
              <select
                value={categoriaId}
                onChange={e => setCategoriaId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 font-bold outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer"
                required
              >
                <option value="">Selecione...</option>
                {categorias.map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="h-px bg-slate-100"></div>

          {/* Financeiro Estrutural */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-5">
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">Valor Total Negociado</label>
              <input
                type="text"
                value={valorTotalStr}
                onChange={e => handleCurrencyChange(e.target.value)}
                className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl px-5 py-4 text-2xl font-black text-emerald-400 outline-none focus:border-indigo-500 transition-all text-center shadow-inner"
              />
            </div>

            <div className="md:col-span-7">
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">Modalidade de Pagamento</label>
              <select
                value={formaId}
                onChange={e => { setFormaId(e.target.value); setQtdParcelas(1); }}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer"
                required
              >
                <option value="">Como será pago?</option>
                {formas.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </select>
            </div>
          </div>

          {/* Seção de Parcelamento */}
          {isPrazo && (
            <div className="space-y-6 animate-in slide-in-from-top-4 duration-500">
              <div className="flex items-center justify-between px-1">
                <label className="block text-[10px] font-black text-rose-500 uppercase tracking-widest">Parcelas / Vencimentos</label>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-bold text-slate-400">Dividir em:</span>
                  <select
                    value={qtdParcelas}
                    onChange={e => setQtdParcelas(Number(e.target.value))}
                    className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-black text-indigo-600 outline-none"
                  >
                    {[1, 2, 3, 4, 5, 6, 10, 12].map(n => <option key={n} value={n}>{n}x</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {parcelas.map((p) => (
                  <div key={p.id_temp} className="flex items-center gap-4 bg-slate-50 border border-slate-100 p-4 rounded-2xl hover:bg-white hover:border-indigo-200 transition-all group">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center font-black text-slate-400 text-xs shadow-sm">
                      {p.numero}º
                    </div>
                    <div className="flex-1">
                      <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Previsão Vencimento</p>
                      <input
                        type="date"
                        value={p.vencimento}
                        onChange={(e) => updateParcelaDate(p.id_temp, e.target.value)}
                        className="bg-transparent font-black text-slate-800 outline-none cursor-pointer focus:text-indigo-600 w-full"
                      />
                    </div>
                    <div className="text-right">
                      <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Valor Parcela</p>
                      <p className="text-sm font-black text-slate-900">{formatCurrency(p.valor)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Seção À Vista / Caixa */}
          {isCaixa && (
            <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-[2rem] space-y-4 animate-in slide-in-from-left duration-500">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-200 shrink-0">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div>
                  <h4 className="text-xs font-black text-emerald-800 uppercase tracking-widest mb-1">Baixa Imediata</h4>
                  <p className="text-[10px] text-emerald-600 font-medium leading-relaxed">Esta despesa será debitada agora do saldo da conta selecionada abaixo.</p>
                </div>
              </div>
              <select
                required
                value={contaId}
                onChange={e => setContaId(e.target.value)}
                className="w-full bg-white border-2 border-emerald-200 rounded-xl px-5 py-4 text-xs font-black text-emerald-700 outline-none shadow-sm"
              >
                <option value="">Selecione o Caixa de Saída...</option>
                {contas.map(c => <option key={c.id} value={c.id}>{c.banco_nome} - {c.titular} | Saldo: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c.saldo_atual || 0)}</option>)}
              </select>
            </div>
          )}

        </form>

        <div className="p-8 border-t border-slate-100 bg-slate-50 flex flex-col shrink-0">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={parcelas.length === 0}
            className="w-full py-5 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-indigo-600 shadow-2xl transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center space-x-3"
          >
            {isPrazo ? (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span>Agendar Títulos Financeiros</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M5 13l4 4L19 7" /></svg>
                <span>Efetivar Lançamento</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(content, document.body);
};

export default ExpenseForm;