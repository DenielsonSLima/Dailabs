import React, { useState, useEffect } from 'react';
import { IVeiculo } from '../estoque.types';
import { SociosService } from '../../ajustes/socios/socios.service';
import { ISocio } from '../../ajustes/socios/socios.types';
import EstoqueSocios from './EstoqueSocios';
import { maskCurrency, parseCurrencyToNumber } from '../../../utils/currency';

interface Props {
  formData: Partial<IVeiculo>;
  onChange: (updates: Partial<IVeiculo>) => void;
  onNotification: (msg: string, type: any) => void;
  isConsignacao?: boolean;
}

const FormCardFinance: React.FC<Props> = ({ formData, onChange, onNotification, isConsignacao = false }) => {
  const [sociosDisponiveis, setSociosDisponiveis] = useState<ISocio[]>([]);
  const [custoRaw, setCustoRaw] = useState('');
  const [vendaRaw, setVendaRaw] = useState('');

  // Consignment helper states
  const [consignacaoTipo, setConsignacaoTipo] = useState<'valor_minimo' | 'margem' | 'porcentagem'>('valor_minimo');
  const [porcentagemRaw, setPorcentagemRaw] = useState('90');
  const [margemRaw, setMargemRaw] = useState('');
  const [valorMinimoRaw, setValorMinimoRaw] = useState('');

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // Formata o valor inicial para o input
  useEffect(() => {
    if (formData.valor_custo !== undefined) {
      setCustoRaw(maskCurrency(formData.valor_custo));
    }
    if (formData.valor_venda !== undefined) {
      setVendaRaw(maskCurrency(formData.valor_venda));
    }
  }, [formData.valor_custo, formData.valor_venda]);

  // Sincroniza estados auxiliares de consignação quando o custo/venda mudam externamente
  useEffect(() => {
    if (isConsignacao) {
      if (formData.valor_custo !== undefined) {
        setValorMinimoRaw(maskCurrency(formData.valor_custo));
      }
      if (formData.valor_venda !== undefined && formData.valor_custo !== undefined) {
        const diff = Math.max(0, formData.valor_venda - formData.valor_custo);
        setMargemRaw(maskCurrency(diff));
        
        if (formData.valor_venda > 0) {
          const pct = (formData.valor_custo / formData.valor_venda) * 100;
          setPorcentagemRaw(prev => {
            const parsedPrev = parseFloat(prev) || 0;
            if (Math.abs(parsedPrev - pct) > 0.05) {
              return pct.toFixed(1);
            }
            return prev;
          });
        }
      }
    }
  }, [formData.valor_custo, formData.valor_venda, isConsignacao]);

  useEffect(() => {
    SociosService.getAll().then(data => {
      const ativos = data.filter(s => s.ativo);
      setSociosDisponiveis(ativos);

      // Auto-preenchimento: Se houver apenas 1 sócio ativo e for um cadastro novo sem sócios vinculados
      if (ativos.length === 1 && !formData.id && (!formData.socios || formData.socios.length === 0)) {
        const socio = ativos[0];
        onChange({
          socios: [{
            socio_id: socio.id!,
            nome: socio.nome,
            porcentagem: 100,
            valor: formData.valor_custo || 0
          }]
        });
      }
    });
  }, [formData.id]); // Adicionado formData.id para garantir o contexto correto

  const handleCurrencyChange = (val: string, field: 'valor_custo' | 'valor_venda') => {
    const masked = maskCurrency(val);
    if (field === 'valor_custo') {
      setCustoRaw(masked);
      const parsed = parseCurrencyToNumber(masked);
      onChange({ valor_custo: parsed });
    } else {
      setVendaRaw(masked);
      const parsedVenda = parseCurrencyToNumber(masked);
      
      let parsedCusto = formData.valor_custo || 0;
      if (isConsignacao) {
        if (consignacaoTipo === 'porcentagem') {
          const pct = parseFloat(porcentagemRaw) || 0;
          parsedCusto = parsedVenda * (pct / 100);
        } else if (consignacaoTipo === 'margem') {
          const margemNum = parseCurrencyToNumber(margemRaw);
          parsedCusto = Math.max(0, parsedVenda - margemNum);
        }
      }
      onChange({ valor_venda: parsedVenda, valor_custo: parsedCusto });
    }
  };

  // Cálculo de Margem em Tempo Real
  const custo = formData.valor_custo || 0;
  const venda = formData.valor_venda || 0;
  const servicos = formData.valor_custo_servicos || 0;
  const investimento = isConsignacao ? servicos : (custo + servicos);
  const lucro = venda - custo - servicos;
  const margem = investimento > 0 ? (lucro / investimento * 100) : 0;

  return (
    <div className={`bg-white rounded-[2.5rem] border shadow-sm overflow-hidden animate-in slide-in-from-bottom-3 ${isConsignacao ? 'border-violet-200' : 'border-slate-200'}`}>
      <div className={`${isConsignacao ? 'bg-violet-900' : 'bg-slate-900'} p-8 text-white flex items-center justify-between transition-colors`}>
        <div className="flex items-center space-x-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg border ${isConsignacao ? 'bg-white/20 border-white/20 text-violet-100' : 'bg-white/10 border-white/10 text-indigo-400'}`}>2</div>
          <h2 className="text-xl font-black uppercase tracking-tighter">Financeiro & Investimento</h2>
        </div>

        {/* Badge de Lucro Rápido */}
        {venda > 0 && (
          <div className={`flex items-center space-x-4 px-6 py-3 rounded-2xl backdrop-blur-md border animate-in zoom-in-95 duration-500 ${lucro >= 0 ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-100' : 'bg-rose-500/20 border-rose-500/30 text-rose-100'}`}>
            <div className="text-right">
              <p className="text-[9px] font-black uppercase tracking-widest opacity-70">Resultado Previsto</p>
              <p className="text-lg font-black leading-none">{lucro.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
            </div>
            <div className="h-8 w-[1px] bg-white/20" />
            <div className="text-center">
              <p className="text-[9px] font-black uppercase tracking-widest opacity-70">Margem</p>
              <p className="text-lg font-black leading-none">{margem.toFixed(1)}%</p>
            </div>
          </div>
        )}
      </div>
      <div className="p-8 grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-5 space-y-6">
          {isConsignacao ? (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div>
                <label className="block text-[10px] font-black text-violet-500 uppercase mb-3 ml-1 tracking-widest">
                  Modalidade de Repasse (Consignação)
                </label>
                <div className="grid grid-cols-3 gap-2 bg-slate-50 p-1 rounded-2xl border border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setConsignacaoTipo('porcentagem');
                      const pct = parseFloat(porcentagemRaw) || 0;
                      const valCusto = (formData.valor_venda || 0) * (pct / 100);
                      onChange({ valor_custo: valCusto });
                    }}
                    className={`py-2 text-[10px] font-bold uppercase rounded-xl transition-all ${consignacaoTipo === 'porcentagem' ? 'bg-violet-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    % Repasse
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setConsignacaoTipo('margem');
                      const margemNum = parseCurrencyToNumber(margemRaw);
                      const valCusto = Math.max(0, (formData.valor_venda || 0) - margemNum);
                      onChange({ valor_custo: valCusto });
                    }}
                    className={`py-2 text-[10px] font-bold uppercase rounded-xl transition-all ${consignacaoTipo === 'margem' ? 'bg-violet-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    Margem Loja
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setConsignacaoTipo('valor_minimo');
                      const valNum = parseCurrencyToNumber(valorMinimoRaw);
                      onChange({ valor_custo: valNum });
                    }}
                    className={`py-2 text-[10px] font-bold uppercase rounded-xl transition-all ${consignacaoTipo === 'valor_minimo' ? 'bg-violet-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    Valor Mínimo
                  </button>
                </div>
              </div>

              {consignacaoTipo === 'porcentagem' && (
                <div className="animate-in slide-in-from-top-2 duration-300">
                  <label className="block text-[10px] font-black text-violet-400 uppercase mb-3 ml-1 tracking-widest">
                    Porcentagem de Repasse (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={porcentagemRaw}
                      onChange={e => {
                        setPorcentagemRaw(e.target.value);
                        const pct = parseFloat(e.target.value) || 0;
                        const valCusto = (formData.valor_venda || 0) * (pct / 100);
                        onChange({ valor_custo: valCusto });
                      }}
                      className="w-full bg-white border-2 border-slate-100 rounded-3xl px-6 py-5 pr-14 text-2xl font-black text-[#111827] outline-none focus:border-violet-500 transition-all shadow-inner"
                    />
                    <span className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xl">%</span>
                  </div>
                </div>
              )}

              {consignacaoTipo === 'margem' && (
                <div className="animate-in slide-in-from-top-2 duration-300">
                  <label className="block text-[10px] font-black text-violet-400 uppercase mb-3 ml-1 tracking-widest">
                    Margem Mínima da Loja (Lucro da Loja)
                  </label>
                  <div className="relative">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xl">R$</span>
                    <input
                      type="text"
                      value={margemRaw}
                      onChange={e => {
                        const masked = maskCurrency(e.target.value);
                        setMargemRaw(masked);
                        const margemNum = parseCurrencyToNumber(masked);
                        const valCusto = Math.max(0, (formData.valor_venda || 0) - margemNum);
                        onChange({ valor_custo: valCusto });
                      }}
                      className="w-full bg-white border-2 border-slate-100 rounded-3xl px-6 py-5 pl-14 text-2xl font-black text-[#111827] outline-none focus:border-violet-500 transition-all shadow-inner"
                    />
                  </div>
                </div>
              )}

              {consignacaoTipo === 'valor_minimo' && (
                <div className="animate-in slide-in-from-top-2 duration-300">
                  <label className="block text-[10px] font-black text-violet-400 uppercase mb-3 ml-1 tracking-widest">
                    Valor Mínimo de Repasse (Fixo Proprietário)
                  </label>
                  <div className="relative">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xl">R$</span>
                    <input
                      type="text"
                      value={valorMinimoRaw}
                      onChange={e => {
                        const masked = maskCurrency(e.target.value);
                        setValorMinimoRaw(masked);
                        const valNum = parseCurrencyToNumber(masked);
                        onChange({ valor_custo: valNum });
                      }}
                      className="w-full bg-white border-2 border-slate-100 rounded-3xl px-6 py-5 pl-14 text-2xl font-black text-[#111827] outline-none focus:border-violet-500 transition-all shadow-inner"
                    />
                  </div>
                </div>
              )}

              {/* Resultado do Cálculo */}
              <div className="p-5 bg-violet-50 rounded-[1.5rem] border border-violet-100 space-y-2">
                <p className="text-[9px] font-black text-violet-400 uppercase tracking-widest">Resumo do Repasse Calculado</p>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-violet-700">Valor de Repasse (Custo):</span>
                  <span className="text-lg font-black text-violet-900">
                    {formatCurrency(formData.valor_custo || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[10px] text-violet-600/80">
                  <span>Preço de Venda: {formatCurrency(formData.valor_venda || 0)}</span>
                  <span>Lucro Bruto: {formatCurrency(Math.max(0, (formData.valor_venda || 0) - (formData.valor_custo || 0)))}</span>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1 tracking-widest">
                Custo de Compra
              </label>
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xl">R$</span>
                <input
                  type="text"
                  value={custoRaw}
                  onChange={e => handleCurrencyChange(e.target.value, 'valor_custo')}
                  className="w-full bg-white border-2 border-slate-100 rounded-3xl px-6 py-5 pl-14 text-2xl font-black text-[#111827] outline-none focus:border-indigo-500 transition-all shadow-inner"
                />
              </div>
            </div>
          )}
          <div>
            <label className="block text-[10px] font-black text-emerald-600 uppercase mb-3 ml-1 tracking-widest">Preço de Venda (Anúncio)</label>
            <div className="relative">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-emerald-500 font-bold text-xl">R$</span>
              <input
                type="text"
                value={vendaRaw}
                onChange={e => handleCurrencyChange(e.target.value, 'valor_venda')}
                className="w-full bg-white border-2 border-emerald-100 rounded-3xl px-6 py-5 pl-14 text-2xl font-black text-[#111827] outline-none focus:border-emerald-500 transition-all shadow-sm"
              />
            </div>
          </div>

          {/* Card Detalhado de Performance */}
          {venda > 0 && (
            <div className={`mt-8 p-6 rounded-3xl border-2 animate-in slide-in-from-top-4 duration-500 ${lucro >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
              <div className="flex justify-between items-end">
                <div>
                  <h3 className={`text-[10px] font-black uppercase tracking-widest mb-1 ${lucro >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>Performance de Venda</h3>
                  <p className={`text-3xl font-black tracking-tighter ${lucro >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {lucro.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>
                <div className={`px-4 py-2 rounded-2xl font-black text-lg ${lucro >= 0 ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'bg-rose-500 text-white shadow-lg shadow-rose-200'}`}>
                  {margem.toFixed(1)}%
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-black/5 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Investimento Total</p>
                  <p className="text-sm font-black text-slate-700 uppercase">{investimento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                </div>
                {servicos > 0 && (
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Custo de Serviços</p>
                    <p className="text-sm font-black text-slate-700 uppercase">{servicos.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="lg:col-span-7">
          <EstoqueSocios
            sociosDisponiveis={sociosDisponiveis}
            sociosVinculados={formData.socios || []}
            valorCustoTotal={formData.valor_custo || 0}
            onChange={newSocios => onChange({ socios: newSocios })}
          />
        </div>
      </div>
    </div>
  );
};

export default FormCardFinance;
