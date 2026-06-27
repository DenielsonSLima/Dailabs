import React, { useEffect, useState } from 'react';
import { AjustesCentralService } from '../../../ajustes/ajustes.service';

interface FinanceiroSettings {
   modo_despesa_unica?: boolean;
}

const AjustesFinanceiroPage: React.FC = () => {
   const [settings, setSettings] = useState<FinanceiroSettings>({});
   const [saving, setSaving] = useState(false);

   useEffect(() => {
      AjustesCentralService.getSettings('financeiro').then(data => {
         if (data) setSettings(data);
      });
   }, []);

   const handleToggleDespesaUnica = async () => {
      const nextSettings = {
         ...settings,
         modo_despesa_unica: !settings.modo_despesa_unica
      };

      setSaving(true);
      try {
         const saved = await AjustesCentralService.updateSettings('financeiro', nextSettings);
         setSettings(saved);
         window.dispatchEvent(new CustomEvent('dailabs-financeiro-settings-updated', { detail: saved }));
      } finally {
         setSaving(false);
      }
   };

   return (
      <div className="space-y-6">
         <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm">
            <div className="flex items-center space-x-4 mb-8">
               <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924-1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /></svg>
               </div>
               <div>
                  <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">Ajustes & Configurações</h2>
                  <p className="text-slate-500 text-xs mt-2 uppercase font-bold tracking-widest">Plano de Contas e Regras de Negócio</p>
               </div>
            </div>

            <div className="mb-8 rounded-[2rem] border border-slate-200 bg-slate-50 p-6 flex flex-col md:flex-row md:items-center justify-between gap-5">
               <div>
                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Despesa única no Financeiro</h4>
                  <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 leading-relaxed">Oculta a divisão visual entre despesas fixas e variáveis no menu financeiro.</p>
               </div>
               <button
                  type="button"
                  onClick={handleToggleDespesaUnica}
                  disabled={saving}
                  className={`relative w-16 h-9 rounded-full transition-all disabled:opacity-60 ${settings.modo_despesa_unica ? 'bg-indigo-600' : 'bg-slate-300'}`}
                  aria-label="Alternar despesa única no financeiro"
               >
                  <span className={`absolute top-1 h-7 w-7 rounded-full bg-white shadow-lg transition-all ${settings.modo_despesa_unica ? 'left-8' : 'left-1'}`}></span>
               </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {['Categorias de Despesa', 'Plano de Contas', 'Limites de Operação', 'Regras de Juros', 'Alertas de Vencimento'].map((cfg, i) => (
                  <div key={i} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:border-indigo-300 transition-all cursor-pointer group">
                     <h4 className="text-sm font-black text-slate-700 uppercase tracking-tight group-hover:text-indigo-600">{cfg}</h4>
                     <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Configurar Parâmetros</p>
                  </div>
               ))}
            </div>
         </div>
      </div>
   );
};

export default AjustesFinanceiroPage;
