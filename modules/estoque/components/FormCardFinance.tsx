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

const FormCardFinance: React.FC<Props> = ({ formData, onChange, isConsignacao = false }) => {
  const [sociosDisponiveis, setSociosDisponiveis] = useState<ISocio[]>([]);
  const [custoRaw, setCustoRaw] = useState('');
  const [vendaRaw, setVendaRaw] = useState('');

  // Formata o valor inicial para o input
  useEffect(() => {
    if (formData.valor_custo !== undefined) {
      setCustoRaw(maskCurrency(formData.valor_custo));
    }
    if (formData.valor_venda !== undefined) {
      setVendaRaw(maskCurrency(formData.valor_venda));
    }
  }, [formData.valor_custo, formData.valor_venda]);

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
      onChange(isConsignacao ? { valor_venda: parsedVenda, valor_custo: 0 } : { valor_venda: parsedVenda });
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
        {!isConsignacao && venda > 0 && (
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
              <div className="p-5 bg-violet-50 rounded-[1.5rem] border border-violet-100">
                <p className="text-[9px] font-black text-violet-400 uppercase tracking-widest mb-2">Entrada por Consignação</p>
                <p className="text-xs font-bold text-violet-800 leading-relaxed">
                  Informe apenas o preço de venda do anúncio. A comissão ou lucro da loja será definido no pedido de venda consignado.
                </p>
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
          {!isConsignacao && venda > 0 && (
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
          {isConsignacao ? (
            <div className="h-full min-h-[260px] rounded-[2rem] border border-violet-100 bg-violet-50/60 p-8 flex flex-col justify-center">
              <p className="text-[10px] font-black text-violet-400 uppercase tracking-widest mb-3">Comissão na Venda</p>
              <h3 className="text-2xl font-black text-violet-950 uppercase tracking-tighter">Sem custo de aquisição neste cadastro</h3>
              <p className="text-sm font-semibold text-violet-700/80 leading-relaxed mt-3">
                Para consignação, o financeiro da loja será composto pelo lucro/comissão informado no pedido de venda.
              </p>
            </div>
          ) : (
            <EstoqueSocios
              sociosDisponiveis={sociosDisponiveis}
              sociosVinculados={formData.socios || []}
              valorCustoTotal={formData.valor_custo || 0}
              onChange={newSocios => onChange({ socios: newSocios })}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default FormCardFinance;
