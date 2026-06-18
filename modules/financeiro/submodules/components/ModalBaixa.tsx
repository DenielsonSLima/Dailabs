import React, { useState, useEffect } from 'react';
import { ITitulo } from '../../financeiro.types';
import { FinanceiroService } from '../../financeiro.service';
import { ContasBancariasService } from '../../../ajustes/contas-bancarias/contas.service';
import { FormasPagamentoService } from '../../../cadastros/formas-pagamento/formas-pagamento.service';
import { maskCurrency, parseCurrencyToNumber } from '../../../../utils/currency';

interface Props {
  titulo: ITitulo;
  onClose: () => void;
  onSuccess: () => void;
}

const ModalBaixa: React.FC<Props> = ({ titulo, onClose, onSuccess }) => {
  const [contas, setContas] = useState<any[]>([]);
  const [formas, setFormas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const saldoDevedorOriginal = (titulo as any).valor_pendente ?? (titulo.valor_total + (titulo.valor_acrescimo || 0) - titulo.valor_pago - (titulo.valor_desconto || 0));

  // Form State
  const [valorDesconto, setValorDesconto] = useState(0);
  const [valorAcrescimo, setValorAcrescimo] = useState(0);
  const [valorPago, setValorPago] = useState(saldoDevedorOriginal);
  const [contaId, setContaId] = useState('');
  const [formaId, setFormaId] = useState('');
  const [dataPagamento, setDataPagamento] = useState(new Date().toISOString().split('T')[0]);

  // Raw states for masked inputs
  const [descontoRaw, setDescontoRaw] = useState('0,00');
  const [acrescimoRaw, setAcrescimoRaw] = useState('0,00');
  const [pagoRaw, setPagoRaw] = useState(maskCurrency(saldoDevedorOriginal));

  // Update valorPago automatically when acréscimo or desconto changes
  useEffect(() => {
    let newValor = saldoDevedorOriginal + valorAcrescimo - valorDesconto;
    if (newValor < 0) newValor = 0;
    setValorPago(newValor);
    setPagoRaw(maskCurrency(newValor));
  }, [valorDesconto, valorAcrescimo, saldoDevedorOriginal]);

  useEffect(() => {
    async function loadData() {
      const [cData, fData] = await Promise.all([
        ContasBancariasService.getAll(),
        FormasPagamentoService.getAll()
      ]);
      
      const activeContas = cData.filter(c => c.ativo);
      setContas(activeContas);
      if (activeContas.length === 1) {
        setContaId(activeContas[0].id);
      }

      // Filtrar apenas formas de movimento imediato (CAIXA) e que batam com o tipo do título
      const filteredFormas = fData.filter(f => {
        if (!f.ativo) return false;

        // Só queremos formas que representem movimento de caixa/banco imediato no momento da baixa
        // (A Prazo e Consignação não devem aparecer aqui pois são condições de origem, não de liquidação)
        if (f.destino_lancamento !== 'CAIXA') return false;

        if (titulo.tipo === 'PAGAR') {
          return f.tipo_movimentacao === 'PAGAMENTO' || f.tipo_movimentacao === 'AMBOS';
        }
        return f.tipo_movimentacao === 'RECEBIMENTO' || f.tipo_movimentacao === 'AMBOS';
      });

      setFormas(filteredFormas);
      setLoading(false);
    }
    loadData();
  }, [titulo.tipo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((valorPago > 0 && !contaId) || (valorPago > 0 && !formaId) || (valorPago === 0 && valorDesconto === 0)) {
      alert("Preencha todos os campos corretamente. Se o valor pago for maior que zero, é necessário informar conta e forma de movimentação.");
      return;
    }

    setIsSaving(true);
    try {
      // Passando valores de desconto e acrescimo pro backend
      // Se valorPago for 0 (ex: 100% de desconto), enviamos a data com contaId/formaId em branco pra RPC validar internamente
      await FinanceiroService.baixarTitulo(
        titulo,
        valorPago,
        contaId || '00000000-0000-0000-0000-000000000000',
        formaId || '00000000-0000-0000-0000-000000000000',
        valorDesconto,
        valorAcrescimo,
        dataPagamento
      );
      // O recálculo agora é 100% automático via TRIGGER no Postgres (fn_sync_titulo_totals)
      // Não é mais necessário chamar recalcularTitulo no Frontend. 🏛️🛡️
      onSuccess();
    } catch (e: any) {
      alert("Erro ao processar baixa: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-200 flex flex-col max-h-[90vh]">
        <div className={`p-6 text-white shrink-0 ${titulo.tipo === 'PAGAR' ? 'bg-rose-600' : 'bg-emerald-600'}`}>
          <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Confirmar Liquidação</p>
          <h3 className="text-xl font-black uppercase tracking-tighter mt-1">{titulo.descricao}</h3>
          <div className="mt-4 flex justify-between items-end">
            <div>
              <p className="text-[8px] font-black uppercase opacity-60">Saldo Devedor Original</p>
              <p className="text-lg font-black">{formatCurrency(saldoDevedorOriginal)}</p>
            </div>
            <p className="text-[10px] font-black bg-black/20 px-2 py-1 rounded-lg">PARCELA {titulo.parcela_numero}/{titulo.parcela_total}</p>
          </div>
        </div>

        <div className="overflow-y-auto shrink p-8">
          <form onSubmit={handleSubmit} className="space-y-6">

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-emerald-600 uppercase mb-2 tracking-widest ml-1">Desconto</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R$</span>
                  <input
                    type="text"
                    value={descontoRaw}
                    onChange={e => {
                      const masked = maskCurrency(e.target.value);
                      setDescontoRaw(masked);
                      setValorDesconto(parseCurrencyToNumber(masked));
                    }}
                    className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-3 pl-10 text-lg font-black text-[#111827] outline-none focus:border-emerald-500 transition-all text-right"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-rose-600 uppercase mb-2 tracking-widest ml-1">Acréscimo (Juros)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R$</span>
                  <input
                    type="text"
                    value={acrescimoRaw}
                    onChange={e => {
                      const masked = maskCurrency(e.target.value);
                      setAcrescimoRaw(masked);
                      setValorAcrescimo(parseCurrencyToNumber(masked));
                    }}
                    className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-3 pl-10 text-lg font-black text-[#111827] outline-none focus:border-rose-500 transition-all text-right"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest ml-1">Valor a ser Efetivamente {titulo.tipo === 'PAGAR' ? 'pago' : 'recebido'}</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R$</span>
                <input
                  type="text"
                  value={pagoRaw}
                  onChange={e => {
                    const masked = maskCurrency(e.target.value);
                    setPagoRaw(masked);
                    setValorPago(parseCurrencyToNumber(masked));
                  }}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 pl-12 text-2xl font-black text-[#111827] outline-none focus:border-indigo-500 transition-all"
                />
              </div>
              {valorPago > 0 && valorPago < (saldoDevedorOriginal + valorAcrescimo - valorDesconto) && (
                <p className="text-[9px] text-amber-600 font-bold uppercase mt-2 ml-1">💡 Atenção: Baixa menor que o saldo final (Liquidará Parcialmente).</p>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest ml-1">Data de Pagamento</label>
              <input
                type="date"
                required
                value={dataPagamento}
                onChange={e => setDataPagamento(e.target.value)}
                className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-3 text-lg font-black text-[#111827] outline-none focus:border-indigo-500 transition-all font-sans"
              />
            </div>

            {valorPago > 0 && (
              <div className="grid grid-cols-1 gap-4 bg-slate-50 p-4 rounded-3xl border border-slate-100">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest ml-1">Conta Bancária / Caixa</label>
                  <select
                    required={valorPago > 0}
                    value={contaId}
                    onChange={e => setContaId(e.target.value)}
                    className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-[#111827] outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"
                  >
                    <option value="">Selecione a conta...</option>
                    {contas.map(c => <option key={c.id} value={c.id}>{c.banco_nome} - {c.titular} | Saldo: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c.saldo_atual || 0)}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest ml-1">Forma de Movimentação</label>
                  <select
                    required={valorPago > 0}
                    value={formaId}
                    onChange={e => setFormaId(e.target.value)}
                    className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-[#111827] outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"
                  >
                    <option value="">Selecione a forma...</option>
                    {formas.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                  </select>
                </div>
              </div>
            )}

            <div className="flex space-x-3 pt-4 pb-2">
              <button type="button" onClick={onClose} className="flex-1 py-4 text-slate-500 font-black text-xs uppercase bg-slate-50 rounded-2xl hover:bg-slate-100 transition-all">Cancelar</button>
              <button
                type="submit"
                disabled={isSaving}
                className={`flex-1 py-4 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg transition-all active:scale-95 ${titulo.tipo === 'PAGAR' ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-200' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
                  }`}
              >
                {isSaving ? 'Processando...' : 'Confirmar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ModalBaixa;
